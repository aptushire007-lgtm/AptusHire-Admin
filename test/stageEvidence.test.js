import { describe, expect, it } from "vitest";
import { stageEvidence, hasReached } from "../src/lib/stageEvidence.js";

// The whole point of this module is that "no number" is not one state. These
// tests exist to stop a future change collapsing them back into one.
const row = (candidate, key) => stageEvidence(candidate).find((r) => r.key === key);

describe("stageEvidence", () => {
  it("always returns the three stages in pipeline order, even when nothing has run", () => {
    const rows = stageEvidence({ status: "applied" });
    expect(rows.map((r) => r.key)).toEqual(["cv", "assessment", "interview"]);
    expect(rows.every((r) => r.state === "absent")).toBe(true);
  });

  it("reports a CV verdict only when the ATS actually scored", () => {
    // ats.overallScore DEFAULTS TO 0 in the schema, so an unscored application
    // carries a 0 that is not a measurement. It must not surface as one.
    expect(row({ ats: { overallScore: 0, decision: "pending" } }, "cv")).toMatchObject({
      state: "absent",
      note: "Not run",
    });
    // The row carries the VERDICT, never a second copy of the headline score.
    expect(row({ ats: { overallScore: 0, decision: "fail", scoredAt: "2026-01-01" } }, "cv")).toMatchObject({
      state: "negative",
      note: "Did not pass",
      value: null,
    });
    expect(row({ ats: { overallScore: 82, decision: "pass", scoredAt: "2026-01-01" } }, "cv")).toMatchObject({
      state: "measured",
      note: "Passed screening",
    });
    expect(row({ ats: { overallScore: 82, decision: "review", scoredAt: "2026-01-01" } }, "cv")).toMatchObject({
      state: "pending",
    });
  });

  it("lets a degraded engine's caveat outrank the verdict it qualifies", () => {
    expect(
      row({ ats: { overallScore: 78, decision: "pass", scoredAt: "2026-01-01", engine: "fallback-legacy" } }, "cv")
    ).toMatchObject({ note: "legacy fallback" });
  });

  it("keeps a scored-but-figureless application distinct from an unscored one", () => {
    expect(row({ ats: { overallScore: null, scoredAt: "2026-01-01" } }, "cv")).toMatchObject({
      state: "withheld",
      note: "Score unavailable",
    });
  });

  it("records a recruiter's skip as a decision with a name, not as missing data", () => {
    expect(row({ assessmentDecision: { action: "skipped", byName: "Asha" } }, "assessment")).toMatchObject({
      state: "recorded",
      note: "Skipped by Asha",
    });
    expect(row({ assessmentDecision: { action: "sent" } }, "assessment")).toMatchObject({ state: "pending" });
  });

  it("ranks an interview waiting on the recruiter above one merely completed", () => {
    const candidate = {
      status: "ai_interview_completed",
      pendingInterviewReviews: [{ _id: "a" }, { _id: "b" }],
    };
    expect(row(candidate, "interview")).toMatchObject({
      state: "pending",
      note: "2 reviews waiting on you",
    });
    expect(row({ status: "ai_interview_completed" }, "interview")).toMatchObject({
      state: "recorded",
      note: "Completed",
    });
  });

  it("reads history, so a rejected candidate still shows the stages they passed", () => {
    const candidate = {
      status: "rejected",
      stageHistory: [{ stage: "applied" }, { stage: "assessment_completed" }],
    };
    expect(hasReached(candidate, "assessment_completed")).toBe(true);
    expect(row(candidate, "assessment")).toMatchObject({ state: "recorded", note: "Completed" });
    expect(row(candidate, "interview")).toMatchObject({ state: "absent" });
  });
});
