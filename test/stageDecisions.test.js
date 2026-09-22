import { describe, expect, it } from "vitest";
import { stageDecisions, EVENT_STAGES, canTransition } from "../src/lib/pipeline.js";

describe("stageDecisions", () => {
  it("offers a handful of decisions, not every later stage", () => {
    const { next, other } = stageDecisions("ats_passed");
    expect(next).toEqual(["assessment_scheduled", "interview_scheduled", "shortlisted"]);
    // The long tail is still reachable, just not in the way.
    expect(other).toContain("joined");
  });

  it("never offers an event stage — you cannot decide an interview happened", () => {
    for (const stage of ["applied", "ats_passed", "assessment_scheduled", "interview_scheduled", "shortlisted"]) {
      const { next, other } = stageDecisions(stage);
      for (const to of [...next, ...other]) expect(EVENT_STAGES.has(to)).toBe(false);
    }
  });

  it("only offers moves the server would accept", () => {
    for (const stage of ["ats_passed", "shortlisted", "technical_interview", "offer_sent"]) {
      const { next, other } = stageDecisions(stage);
      for (const to of [...next, ...other]) expect(canTransition(stage, to)).toBe(true);
    }
  });

  it("keeps interview rounds reachable from one another", () => {
    expect(stageDecisions("technical_interview").next).toEqual(["hr_interview", "manager_interview", "selected"]);
  });

  it("has nothing to offer at a terminal stage", () => {
    expect(stageDecisions("joined")).toEqual({ next: [], other: [], canReject: false });
    expect(stageDecisions("rejected")).toEqual({ next: [], other: [], canReject: false });
  });
});
