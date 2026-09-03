// §1.3 — maps a notification's (type, meta) to the admin route it's actually about.
//
// Both NotificationBell.jsx and dashboard/Notifications.jsx call this — one function, so the
// routing can never drift between the two surfaces the way the bell and the full list would if
// each hand-rolled its own. Returns `{ to }` for a notification with a real destination, or `null`
// for one that doesn't have one (a handful of account/billing events that aren't about a specific
// record) — `null` is a deliberate, explicit answer, not a gap.
//
// `candidateController.js:257` writes `meta: { candidateId, jobId }` on apply, and every stage
// transition (`pipelineService.js` `applyTransition`) writes `meta: { candidateId, stage }` — so
// every candidate-scoped type below can rely on `meta.candidateId` being present. Types that write
// no meta at all (password_changed, payment_success, payment_failed, email_verified,
// workspace_ready) route to a fixed destination by type instead — there's nothing instance-specific
// to link to, but "where does this kind of notification belong" still has one right answer.

const CANDIDATE_DETAIL_TYPES = new Set([
  "new_candidate_applied",
  "ats_completed",
  "assessment_decision_needed",
  "assessment_contradiction",
  "assessment_softlock",
  "assessment_completed",
  "scorecard_submitted",
  "scorecard_contradiction",
  "scorecard_disagreement",
  "candidate_shortlisted",
  "candidate_rejected",
  "candidate_stage_changed",
  "candidate_selected",
  "candidate_joined",
  "offer_accepted",
]);

// These two are specifically about the AI interview report, not the general candidate record —
// a recruiter clicking "AI interview report ready" wants the report, not one more click to reach it.
const INTERVIEW_REPORT_TYPES = new Set(["interview_completed", "ai_report_ready", "interview_integrity_terminated"]);

const STATIC_TARGETS = {
  email_verified: "/settings",
  password_changed: "/settings",
  workspace_ready: "/subscription",
  payment_success: "/subscription",
  payment_failed: "/subscription",
  invoice_generated: "/subscription",
  subscription_renewal: "/subscription",
};

export function targetFor(notification) {
  const type = notification?.type;
  const meta = notification?.meta || {};
  if (!type) return null;

  if (INTERVIEW_REPORT_TYPES.has(type) && meta.candidateId) {
    return { to: `/candidates/${meta.candidateId}/interview-report` };
  }
  if (CANDIDATE_DETAIL_TYPES.has(type) && meta.candidateId) {
    return { to: `/candidates/${meta.candidateId}` };
  }
  // system_alert covers several different underlying situations (screening/rescore failure, score
  // drift, a failed candidate email, an evidence-engine fallback) that don't share one meta shape —
  // route by whichever identifying field is actually present, most specific first.
  if (type === "system_alert") {
    if (meta.candidateId) return { to: `/candidates/${meta.candidateId}` };
    if (meta.jobId) return { to: `/jobs/${meta.jobId}/candidates` };
    return null;
  }
  if (STATIC_TARGETS[type]) return { to: STATIC_TARGETS[type] };
  return null;
}
