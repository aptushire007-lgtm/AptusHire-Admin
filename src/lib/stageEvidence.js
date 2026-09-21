// What actually happened to one application, stage by stage.
//
// The board used to publish ONE number per candidate — the ATS score — and
// nothing about which steps had run. Two candidates showing "Not scored" could
// be an applicant nobody has screened yet and an applicant who finished an AI
// interview but whose CV the engine never read, and the card said the same
// thing about both.
//
// This returns one row per stage, each carrying its own STATE. The state is the
// point: a reader has to be able to tell a measurement from a step that has not
// happened from a step waiting on a human, and those are three different
// things, not one "empty". That is PRODUCT.md's rule — a withheld or missing
// score must never read as a measured zero — applied per stage instead of only
// to the headline figure.
//
// Pure over a plain application document, so it is testable without a DOM and
// so the card, the drawer and the pool cannot drift into three vocabularies.
//
// SCOPE, deliberately: assessment and interview SCORES live in their own
// collections (AssessmentSession, InterviewSession) and the pipeline list does
// not join them — two more $lookups on every board page is a real cost for a
// figure that is one click away in the drawer. So those rows report state and
// not a number, and they never guess one.

import { normalizeStage } from "./pipeline.js";
import { isScored, scoreOf, scoreCaveat } from "./pipelineMetrics.js";

/**
 * The six states any piece of evidence can be in.
 *
 * `absent` and `withheld` are separate on purpose: "nobody ran this" and "this
 * ran but the result is not reportable" are different facts about the
 * candidate, and collapsing them is how a gap in the process starts looking
 * like a gap in the person.
 */
export const EVIDENCE_STATES = ["measured", "recorded", "pending", "absent", "withheld", "negative"];

/** Did this application ever reach `stage`? Read from history, not the current stage. */
export function hasReached(candidate, stage) {
  if (normalizeStage(candidate?.status) === stage) return true;
  return (candidate?.stageHistory || []).some((entry) => normalizeStage(entry?.stage) === stage);
}

// `pass | fail | review` — the ATS's VERDICT, which is a different fact from
// its score. The row deliberately does not repeat the headline figure: the card
// already prints it once, and the same number twice on one card is noise that
// reads as two separate readings agreeing.
const ATS_VERDICTS = {
  pass: { state: "measured", note: "Passed screening" },
  fail: { state: "negative", note: "Did not pass" },
  review: { state: "pending", note: "Flagged for review" },
};

function cvRow(candidate) {
  const base = { key: "cv", label: "CV screening", value: null, action: null };
  if (!isScored(candidate)) {
    return { ...base, state: "absent", note: "Not run" };
  }
  if (scoreOf(candidate) == null) {
    // Scored, but the figure itself is missing — that is withheld, not zero.
    return { ...base, state: "withheld", note: "Score unavailable" };
  }
  const verdict = ATS_VERDICTS[candidate?.ats?.decision];
  const caveat = scoreCaveat(candidate);
  if (!verdict) {
    // Scored with no recognised verdict: say that, rather than picking one.
    return { ...base, state: "recorded", note: caveat || "Scored" };
  }
  // The caveat outranks the verdict in the label, because "this reading came
  // from the legacy fallback" qualifies the verdict itself.
  return { ...base, state: verdict.state, note: caveat || verdict.note };
}

function assessmentRow(candidate) {
  const base = { key: "assessment", label: "Skills assessment", value: null, action: null };
  const decision = candidate?.assessmentDecision;

  // A recruiter's explicit "skip" is a RECORDED decision, not missing data —
  // and it names who made it, so the row is answerable later.
  if (decision?.action === "skipped") {
    return { ...base, state: "recorded", note: decision.byName ? `Skipped by ${decision.byName}` : "Skipped" };
  }
  if (hasReached(candidate, "assessment_completed")) {
    return { ...base, state: "recorded", note: "Completed" };
  }
  if (decision?.action === "sent" || hasReached(candidate, "assessment_scheduled")) {
    return { ...base, state: "pending", note: "Sent — awaiting the candidate" };
  }
  return { ...base, state: "absent", note: "Not run" };
}

function interviewRow(candidate) {
  const base = { key: "interview", label: "AI interview", value: null, action: null };
  const pending = candidate?.pendingInterviewReviews?.length || 0;

  // A finished interview that still needs a human decision is the one row on
  // this card that is actually waiting on the RECRUITER, so it outranks the
  // plain "completed" reading below it.
  if (pending > 0) {
    return { ...base, state: "pending", note: `${pending} review${pending === 1 ? "" : "s"} waiting on you` };
  }
  if (hasReached(candidate, "ai_interview_completed")) {
    return { ...base, state: "recorded", note: "Completed" };
  }
  if (hasReached(candidate, "interview_scheduled")) {
    return { ...base, state: "pending", note: "Scheduled" };
  }
  return { ...base, state: "absent", note: "Not run" };
}

/**
 * The three evidence rows for one application, in pipeline order.
 *
 * Always three rows, always in the same order, even when all three are absent:
 * a card whose rows appear and disappear cannot be scanned down a column, and
 * the absent rows are exactly the ones a recruiter is looking for.
 */
export function stageEvidence(candidate) {
  if (!candidate) return [];
  return [cvRow(candidate), assessmentRow(candidate), interviewRow(candidate)];
}
