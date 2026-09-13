import { describe, expect, it } from "vitest";
import { matchesReportCohort, reviewInterview } from "../src/lib/recruiterReview.js";

describe("report cohort drill-down", () => {
  const application = { createdAt: "2026-09-01", status: "joined", stageHistory: [{ stage: "interview_queue" }, { stage: "joined" }] };
  it("includes historical stages even after the candidate advances", () => {
    expect(matchesReportCohort(application, { reached: "interview_scheduled", from: "2026-09-01", to: "2026-09-09" })).toBe(true);
  });
  it("excludes applications outside the report period or missing the stage", () => {
    expect(matchesReportCohort(application, { reached: "applied" })).toBe(false);
    expect(matchesReportCohort(application, { reached: "joined", from: "2026-09-02" })).toBe(false);
  });
});

describe("withheld interview presentation", () => {
  it("does not repeat adverse model conclusions or scores from incomplete evidence", () => {
    const raw = { status: "ended_early", evaluation: { summary: "Recommend against hiring.", overallScore: 20, communication: 10, weaknesses: ["Poor communication"] } };
    const shown = reviewInterview(raw);
    expect(shown.evaluation.summary).not.toContain("against hiring");
    expect(shown.evaluation.overallScore).toBeNull();
    expect(shown.evaluation.communication).toBeNull();
    expect(shown.competencyTriplet).toBeNull();
    expect(shown.evaluation.weaknesses).toEqual([]);
    expect(raw.evaluation.overallScore).toBe(20);
  });
  it("preserves a completed measurable evaluation", () => {
    const raw = { status: "completed", evaluation: { overallScore: 80, summary: "Evidence recorded" } };
    expect(reviewInterview(raw)).toBe(raw);
  });
  it("also honors explicit recommendation suppression", () => {
    expect(reviewInterview({ recommendedAction: { suppressed: true }, evaluation: { overallScore: 70 } }).evaluation.overallScore).toBeNull();
  });
});
