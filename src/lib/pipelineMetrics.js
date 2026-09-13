// Derived readings for the Hiring Pipeline board.
//
// Every figure here is computed from fields the `/api/candidates` list payload
// already carries — `status`, `stageHistory`, `ats`, `offer`, `skills`,
// `hostility`, `createdAt`. Nothing is fetched, nothing is estimated, and
// nothing is invented: a reading this module cannot source from a stored field
// is not returned at all, so the board can never show a confident number that
// no record stands behind.
//
// Pure functions over plain documents, so the arithmetic is testable without a
// DOM (see admin/test/pipelineMetrics.test.js).

import { STAGES, isTerminal, normalizeStage } from "./pipeline.js";

const DAY_MS = 86_400_000;

/**
 * Whether the ATS actually scored this candidate.
 *
 * This is the load-bearing check on the whole board, because `ats.overallScore`
 * DEFAULTS TO 0 in the schema (backend/models/Candidate.js — atsResultSchema).
 * A `!= null` test therefore passes for every candidate who was never screened,
 * and the board renders them as a confident "0%" — which is a measurement claim
 * about someone the engine never looked at. `scoredAt` is only written when a
 * scoring run completes, so it is the honest gate; `decision` moving off
 * "pending" is the fallback for documents written before it was stamped.
 */
export function isScored(candidate) {
  const ats = candidate?.ats;
  if (!ats) return false;
  return Boolean(ats.scoredAt) || (Boolean(ats.decision) && ats.decision !== "pending");
}

/** The ATS score, or null when there is no measurement to report. */
export function scoreOf(candidate) {
  return isScored(candidate) ? (candidate.ats.overallScore ?? null) : null;
}

/**
 * When the candidate entered the stage they are sitting in now.
 *
 * `stageHistory` is append-only, so the last entry naming the current stage is
 * the moment they arrived. Falling back to `createdAt` covers the candidate who
 * has never moved: they entered "applied" when they applied.
 */
export function stageEnteredAt(candidate) {
  const history = candidate?.stageHistory || [];
  const current = normalizeStage(candidate?.status);
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (normalizeStage(history[i].stage) === current && history[i].at) return history[i].at;
  }
  return candidate?.createdAt || null;
}

/** Whole days the candidate has been in their current stage, or null. */
export function daysInStage(candidate, now = Date.now()) {
  const at = stageEnteredAt(candidate);
  if (!at) return null;
  const ms = now - new Date(at).getTime();
  return Number.isFinite(ms) && ms >= 0 ? Math.floor(ms / DAY_MS) : null;
}

/** Whole days since the application arrived, or null. */
export function daysSinceApplied(candidate, now = Date.now()) {
  if (!candidate?.createdAt) return null;
  const ms = now - new Date(candidate.createdAt).getTime();
  return Number.isFinite(ms) && ms >= 0 ? Math.floor(ms / DAY_MS) : null;
}

/**
 * The furthest point along the ORDERED pipeline this candidate ever reached,
 * as an index into STAGES, or -1 for someone who only ever held the off-ramp.
 *
 * Read from the history rather than the current stage, because a rejected
 * candidate who got as far as Shortlisted did pass through Shortlisted — and a
 * pass-through rate that forgets them understates the funnel it is describing.
 */
export function furthestStageIndex(candidate) {
  let max = STAGES.indexOf(normalizeStage(candidate?.status));
  for (const entry of candidate?.stageHistory || []) {
    const i = STAGES.indexOf(normalizeStage(entry.stage));
    if (i > max) max = i;
  }
  return max;
}

/** Whether the candidate ever reached `stage` (or anything beyond it). */
export function reached(candidate, stage) {
  const target = STAGES.indexOf(normalizeStage(stage));
  return target !== -1 && furthestStageIndex(candidate) >= target;
}

export function isActive(candidate) {
  return !isTerminal(candidate?.status);
}

/**
 * Résumé-defense signals worth a recruiter's eye (resumeDefenseService, Phase 4).
 *
 * Reported as a COUNT and nothing more. The model's own contract is "flags,
 * never decides": these may not drive an adverse action, so the board states
 * that something was flagged and sends the reader to the record to judge it.
 */
export function resumeFlagCount(candidate) {
  const h = candidate?.hostility;
  if (!h || h.clean) return 0;
  return (h.signals || []).filter((s) => s.severity === "critical" || s.severity === "warning").length;
}

/**
 * The score's provenance, when it is not the engine we want to be trusted.
 *
 * `fallback-legacy` means the evidence engine failed and the keyword engine
 * answered in its place — CLAUDE.md's rule is that a degraded reading is never
 * dressed as a measurement, so the card has to be able to say so. `evidence` is
 * the good path and returns null: a caveat on every card is a caveat nobody
 * reads.
 */
export function scoreCaveat(candidate) {
  if (!isScored(candidate)) return null;
  const engine = candidate.ats?.engine;
  if (engine === "fallback-legacy") return "legacy fallback";
  if (engine === "legacy") return "legacy ATS";
  return null;
}

function mean(values) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * The KPI tape above the board.
 *
 * Each tile returns its own denominator alongside its figure, because a tile
 * that cannot say what it was measured over is not ready to be on screen
 * (Panels.jsx § HeroStat makes the same demand of `basis`). Where there is
 * nothing to measure the value is null and the tile renders an em dash rather
 * than a zero.
 */
export function pipelineKpis(candidates, now = Date.now()) {
  const active = candidates.filter(isActive);
  const weekAgo = now - 7 * DAY_MS;

  const newThisWeek = candidates.filter(
    (c) => c.createdAt && new Date(c.createdAt).getTime() >= weekAgo
  ).length;

  const underReview = candidates.filter((c) => normalizeStage(c.status) === "under_review").length;

  const aiCompleted = candidates.filter(
    (c) => normalizeStage(c.status) === "ai_interview_completed"
  );

  // Averaged over the SCORED subset only, and the tile states that subset — an
  // average that silently folds in schema-default zeros is not an average of
  // anything.
  const scoredAll = candidates.filter(isScored);
  const avgScore = mean(scoredAll.map((c) => c.ats.overallScore || 0));

  const offersOut = candidates.filter((c) => normalizeStage(c.status) === "offer_sent");
  const offerAges = offersOut
    .map((c) => c.offer?.sentAt && Math.floor((now - new Date(c.offer.sentAt).getTime()) / DAY_MS))
    .filter((d) => Number.isFinite(d) && d >= 0);

  const stageAges = active.map((c) => daysInStage(c, now)).filter((d) => d != null);
  const avgDaysInStage = mean(stageAges);

  // Applied → Shortlisted, over every application on record. Counted from the
  // furthest stage each candidate ever held, so someone rejected after being
  // shortlisted still counts as having passed through.
  const shortlisted = candidates.filter((c) => reached(c, "shortlisted")).length;

  return {
    total: candidates.length,
    active: active.length,
    newThisWeek,
    underReview,
    aiCompleted: aiCompleted.length,
    scoredCount: scoredAll.length,
    avgScore: avgScore == null ? null : Math.round(avgScore),
    offersOut: offersOut.length,
    longestOfferDays: offerAges.length ? Math.max(...offerAges) : null,
    avgDaysInStage: avgDaysInStage == null ? null : Math.round(avgDaysInStage * 10) / 10,
    stageAgeSample: stageAges.length,
    shortlisted,
    passThroughPct: candidates.length ? Math.round((shortlisted / candidates.length) * 100) : null,
  };
}

