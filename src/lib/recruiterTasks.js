import { normalizeStage } from "./pipeline.js";

// Actionable recorded states, not inferred deadlines or AI recommendations.
export function recruiterTasks(candidates = [], jobs = []) {
  const jobMap = new Map(jobs.map((job) => [String(job._id), job]));
  const tasks = [];
  for (const candidate of candidates) {
    const jobId = String(candidate.job?._id || candidate.job || "");
    const job = jobMap.get(jobId);
    if (!job || candidate.pipelineExit?.at || ["closed", "filled", "archived"].includes(job.status)) continue;
    const stage = normalizeStage(candidate.status);
    let action;
    if (candidate.pendingInterviewReviews?.length) action = "Review interview evidence";
    else if (stage === "under_review") action = "Review application";
    else if (stage === "ai_interview_completed" && !candidate.pendingInterviewReviews) action = "Review interview evidence";
    else if (stage === "ats_passed" && !candidate.assessmentDecision?.action) action = "Choose assessment next step";
    if (action) tasks.push({
      key: `application:${candidate._id}`, action,
      title: candidate.basicDetails?.name || "Unnamed applicant", detail: job.title,
      href: candidate.pendingInterviewReviews?.length ? `/candidates/${candidate._id}/interview-report?attempt=${candidate.pendingInterviewReviews[0].attempt}` : `/candidates/${candidate._id}`, kind: "application",
    });
  }
  for (const job of jobs) {
    if (job.status === "published" && job.rubricStatus !== "approved") tasks.push({
      key: `rubric:${job._id}`, action: "Review evaluation rubric", title: job.title,
      detail: "Published job without an approved rubric", href: `/jobs?jobId=${job._id}&tab=rubric`, kind: "rubric",
    });
  }
  return tasks;
}
