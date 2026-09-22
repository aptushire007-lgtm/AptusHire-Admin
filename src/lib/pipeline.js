// Frontend mirror of backend/utils/pipeline.js. Keep the stage keys and order
// in sync with the backend — this drives the pipeline board columns, the
// candidate stage selector, and status badges across the admin app.

export const STAGES = [
  "applied",
  "ats_passed",
  // Opt-in assessment stages: only entered when a recruiter assigns an
  // assessment; the skip path goes ats_passed → interview_scheduled directly.
  "assessment_scheduled",
  "assessment_completed",
  "interview_scheduled",
  "ai_interview_completed",
  "under_review",
  "shortlisted",
  "hr_interview",
  "technical_interview",
  "manager_interview",
  "selected",
  "offer_sent",
  "offer_accepted",
  "joined",
];

export const REJECTED = "rejected";

// All selectable stages including the terminal off-ramp.
export const ALL_STAGES = [...STAGES, REJECTED];

export const STAGE_LABELS = {
  applied: "Applied",
  ats_passed: "ATS Passed",
  assessment_scheduled: "Assessment Sent",
  assessment_completed: "Assessment Completed",
  interview_scheduled: "Interview Scheduled",
  ai_interview_completed: "AI Interview Completed",
  under_review: "Under Review",
  shortlisted: "Shortlisted",
  hr_interview: "HR Interview",
  technical_interview: "Technical Interview",
  manager_interview: "Manager Interview",
  selected: "Selected",
  offer_sent: "Offer Sent",
  offer_accepted: "Offer Accepted",
  joined: "Joined",
  rejected: "Rejected",
};

const LEGACY_STAGE_MAP = { interview_queue: "interview_scheduled", next_round: "shortlisted" };

// Badge tone per stage (tones defined in components/ui/Card Badge).
const STAGE_TONES = {
  applied: "slate",
  ats_passed: "brand",
  assessment_scheduled: "brand",
  assessment_completed: "brand",
  interview_scheduled: "brand",
  ai_interview_completed: "brand",
  under_review: "amber",
  shortlisted: "green",
  hr_interview: "brand",
  technical_interview: "brand",
  manager_interview: "brand",
  selected: "green",
  offer_sent: "amber",
  offer_accepted: "green",
  joined: "green",
  rejected: "red",
};

export function normalizeStage(stage) {
  return LEGACY_STAGE_MAP[stage] || stage;
}

export function stageLabel(stage) {
  const s = normalizeStage(stage);
  return STAGE_LABELS[s] || s;
}

export function stageTone(stage) {
  return STAGE_TONES[normalizeStage(stage)] || "slate";
}

export const ROUND_STAGES = ["hr_interview", "technical_interview", "manager_interview"];
export const TERMINAL_STAGES = ["joined", "rejected"];

// Stages whose transition puts an EMAIL in the candidate's inbox, as opposed to
// only writing an in-app notification. Mirrors
// backend/services/pipelineService.js — `STAGE_NOTIFICATIONS[stage].candidate.email`
// for the eight direct ones, plus the two whose invitation mail is minted by a
// service instead of the notification config (`ensureInterviewInvite` →
// interview_scheduled, `ensureAssessmentInvite` → assessment_scheduled).
//
// This exists so the stage menu can say, before the click, that a move reaches
// the candidate. Moving someone is not an internal bookkeeping act when it ends
// with a rejection letter, and a recruiter should not have to know the
// notification matrix by heart to find that out.
//
// Two nuances the UI deliberately does not spell out, because they change
// nothing about what the recruiter is deciding: the invite mails are idempotent
// (a candidate who already holds a live interview link is not re-sent one), and
// every send still passes the recipient's NotificationPreference.
//
// Keep in sync with the backend. A stage listed here that no longer mails is a
// promise the UI cannot keep.
const CANDIDATE_EMAIL_STAGES = new Set([
  "assessment_scheduled",
  "interview_scheduled",
  "shortlisted",
  "hr_interview",
  "technical_interview",
  "manager_interview",
  "selected",
  "offer_sent",
  "joined",
  "rejected",
]);

export function notifiesCandidate(stage) {
  return CANDIDATE_EMAIL_STAGES.has(normalizeStage(stage));
}

// Where a stage sits in the pipeline, 1-indexed, or null for the off-ramp.
// Surfaced next to a stage name so a list of twelve destinations reads as an
// ordered pipeline rather than an arbitrary menu.
export function stageStep(stage) {
  const i = STAGES.indexOf(normalizeStage(stage));
  return i === -1 ? null : i + 1;
}

export function isTerminal(stage) {
  return TERMINAL_STAGES.includes(normalizeStage(stage));
}

// Mirror of backend canTransition — keep the rules identical so the UI only
// offers moves the server will accept.
export function canTransition(fromStage, toStage) {
  const from = normalizeStage(fromStage);
  const to = normalizeStage(toStage);
  if (from === to) return false;
  if (isTerminal(from)) return false;
  if (to === REJECTED) return true;
  const fromIdx = STAGES.indexOf(from);
  const toIdx = STAGES.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return false;
  if (toIdx > fromIdx) return true;
  if (ROUND_STAGES.includes(from) && ROUND_STAGES.includes(to)) return true;
  return false;
}

export function allowedNextStages(fromStage) {
  return ALL_STAGES.filter((s) => canTransition(fromStage, s));
}

// ── Recruiter decisions ───────────────────────────────────────────────────────
//
// The stage list above has sixteen entries because the backend automates off
// each one. But four of them are RECORDS of something that happened, not
// decisions anyone makes: a candidate reaches "ATS passed" when the screen
// scores them, "Assessment completed" when they submit the test, "AI interview
// completed" when the interview ends. Offering those as manual moves let a
// recruiter mark an interview as completed that never took place — which is
// exactly what PRODUCT.md forbids ("a stage is only recorded when supported by
// history").
//
// The move menu used to list EVERY later stage by its internal name — up to
// fourteen entries from "ATS passed", including "Advance to AI Interview
// Completed" — beside a board that groups the same stages into four phases.
// These tables are what a recruiter actually decides, named as the action, and
// grouped under the board's own phase names.
export const EVENT_STAGES = new Set(["applied", "ats_passed", "assessment_completed", "ai_interview_completed"]);

export const DECISIONS = {
  assessment_scheduled: { label: "Send skills assessment", short: "Send test", phase: "Assessments" },
  interview_scheduled: { label: "Invite to AI interview", short: "Invite to interview", phase: "Interviews" },
  under_review: { label: "Hold for review", short: "Hold", phase: "Interviews" },
  shortlisted: { label: "Shortlist", short: "Shortlist", phase: "Interviews" },
  hr_interview: { label: "Schedule HR interview", short: "HR round", phase: "Interviews" },
  technical_interview: { label: "Schedule technical interview", short: "Tech round", phase: "Interviews" },
  manager_interview: { label: "Schedule manager interview", short: "Manager round", phase: "Interviews" },
  selected: { label: "Select for offer", short: "Select", phase: "Offers & Hires" },
  offer_sent: { label: "Send offer", short: "Send offer", phase: "Offers & Hires" },
  offer_accepted: { label: "Mark offer accepted", short: "Offer accepted", phase: "Offers & Hires" },
  joined: { label: "Mark as joined", short: "Joined", phase: "Offers & Hires" },
};

// The two to four decisions that make sense from here, most likely first. A
// recruiter at "ATS passed" is choosing between a test, an interview and a
// shortlist — not between those and "Offer accepted".
const NEXT_DECISIONS = {
  applied: ["assessment_scheduled", "interview_scheduled", "shortlisted"],
  ats_passed: ["assessment_scheduled", "interview_scheduled", "shortlisted"],
  assessment_scheduled: ["interview_scheduled", "shortlisted"],
  assessment_completed: ["interview_scheduled", "shortlisted", "under_review"],
  interview_scheduled: ["shortlisted", "under_review"],
  ai_interview_completed: ["shortlisted", "under_review", "hr_interview"],
  under_review: ["shortlisted", "hr_interview", "technical_interview"],
  shortlisted: ["hr_interview", "technical_interview", "manager_interview", "selected"],
  hr_interview: ["technical_interview", "manager_interview", "selected"],
  technical_interview: ["hr_interview", "manager_interview", "selected"],
  manager_interview: ["hr_interview", "technical_interview", "selected"],
  selected: ["offer_sent"],
  offer_sent: ["offer_accepted"],
  offer_accepted: ["joined"],
};

/**
 * What a recruiter can decide for a candidate at `stage`.
 *
 *   next   — the likely next decisions, most likely first (the button offers
 *            the first one)
 *   other  — every other decision the server would still accept, for the
 *            unusual case, kept out of the way
 *
 * Both are filtered through canTransition, so the menu never offers a move the
 * server would refuse, and neither ever contains an event stage.
 */
export function stageDecisions(stage) {
  const from = normalizeStage(stage);
  const legal = (to) => canTransition(from, to) && !EVENT_STAGES.has(to) && DECISIONS[to];
  const next = (NEXT_DECISIONS[from] || []).filter(legal);
  const other = ALL_STAGES.filter((to) => to !== REJECTED && legal(to) && !next.includes(to));
  return { next, other, canReject: canTransition(from, REJECTED) };
}
