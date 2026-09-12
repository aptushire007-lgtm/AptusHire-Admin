import { expect, it } from "vitest";
import { recruiterTasks } from "../src/lib/recruiterTasks.js";
const job = { _id: "j", title: "Engineer", status: "published", rubricStatus: "approved" };
it("keeps interview review open beyond its stage, and removes explicitly resolved reviews", () => {
  const tasks = recruiterTasks([{ _id: "a", job: "j", status: "shortlisted", pendingInterviewReviews: [{ attempt: 2 }] }, { _id: "b", job: "j", status: "ai_interview_completed", pendingInterviewReviews: [] }], [job]);
  expect(tasks).toHaveLength(1);
  expect(tasks[0].href).toBe("/candidates/a/interview-report?attempt=2");
});
it("surfaces recorded recruiter actions without inventing deadlines", () => {
  const tasks = recruiterTasks([{ _id: "a", job: "j", status: "under_review" }, { _id: "b", job: "j", status: "ats_passed" }], [job]);
  expect(tasks.map((task) => task.action)).toEqual(["Review application", "Choose assessment next step"]);
  expect(tasks.every((task) => !task.deadline)).toBe(true);
});
it("does not resurrect terminal or removed applications", () => {
  expect(recruiterTasks([{ _id: "a", job: "j", status: "joined" }, { _id: "b", job: "missing", status: "under_review" }, { _id: "c", job: "j", status: "under_review", pipelineExit: { at: "2026-01-01" } }], [job])).toEqual([]);
});
it("does not repeat an assessment decision or hide a pending rubric", () => {
  const tasks = recruiterTasks([{ _id: "a", job: "j", status: "ats_passed", assessmentDecision: { action: "sent" } }], [{ ...job, rubricStatus: "draft" }]);
  expect(tasks).toHaveLength(1);
  expect(tasks[0].kind).toBe("rubric");
});
