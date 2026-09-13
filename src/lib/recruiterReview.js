import { normalizeStage } from "./pipeline.js";

// Reports count applications that reached a stage, not people currently in it.
export function matchesReportCohort(candidate, { reached, from, to }) {
  const created = new Date(candidate.createdAt).getTime();
  if (from && created < new Date(from).getTime()) return false;
  if (to && created > new Date(to).getTime()) return false;
  if ((from || to) && !Number.isFinite(created)) return false;
  return !reached || (candidate.stageHistory || []).some(
    (entry) => normalizeStage(entry.stage) === normalizeStage(reached)
  );
}

// Presentation only: preserve stored evidence, but do not repeat a model's
// adverse narrative when the interview explicitly withholds a recommendation.
export function reviewInterview(interview) {
  if (!interview) return interview;
  const ev = interview.evaluation;
  const withheld = interview.status === "ended_early" || Boolean(ev?.reviewReason)
    || interview.recommendedAction?.suppressed === true;
  if (!withheld || !ev) return interview;
  const rawReason = (ev.reviewReason || "The interview ended before enough evidence was collected").replace("most of the instrument was never run", "most interview criteria were not assessed");
  const reason = rawReason.charAt(0).toUpperCase() + rawReason.slice(1).replace(/[.!?]+$/, "") + ".";
  return {
    ...interview,
    competencyTriplet: null,
    verdictChip: { ...interview.verdictChip, label: "Needs human review", tone: "amber" },
    evaluation: {
      ...ev,
      summary: `Human review required. ${reason} Review the transcript and untested criteria before deciding the next step.`,
      recommendation: "review",
      reviewReason: ev.reviewReason || "The interview ended before enough evidence was collected",
      overallScore: null,
      communication: null,
      technicalKnowledge: null,
      problemSolving: null,
      confidence: null,
      delivery: null,
      strengths: [],
      weaknesses: [],
      missingSkills: [],
    },
  };
}

export function reviewReport(report) {
  return report ? { ...report, interview: reviewInterview(report.interview) } : report;
}
