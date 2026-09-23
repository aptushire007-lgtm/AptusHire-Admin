import { describe, expect, it } from "vitest";
import { criterionMatrix, keyPoints } from "../src/lib/reportInsights.js";

const findings = [
  { criterionId: "c1", label: "Build web apps", kind: "must_have", weight: 0.2, status: "absent", criterionScore: 0, evidence: [] },
  { criterionId: "c2", label: "Fix bugs", kind: "must_have", weight: 0.2, status: "partial", criterionScore: 0.32,
    evidence: [{ quote: "Supported bug tracking", verificationStatus: "contradicted_in_assessment" }] },
  { criterionId: "c3", label: "Git", kind: "important", weight: 0.1, status: "satisfied", criterionScore: 0.9, evidence: [] },
];
const perCriterion = [
  { criterionId: "c2", itemCount: 4, correctCount: 0 },
  { criterionId: "c3", itemCount: 2, correctCount: 2 },
  { criterionId: "c9", itemCount: 0, correctCount: 0 },
];

describe("report insights", () => {
  const matrix = criterionMatrix(findings, perCriterion, new Map());

  it("puts CV evidence and test result side by side, leaving untested criteria empty", () => {
    expect(matrix.map((r) => [r.id, r.cv, r.test])).toEqual([["c1", 0, null], ["c2", 32, 0], ["c3", 90, 100]]);
    expect(matrix[0].cvNone).toBe(true);
    expect(matrix[1]).toMatchObject({ testDetail: "0 of 4", tag: "Must have" });
    expect(matrix[1].quotes[0].quote).toBe("Supported bug tracking");
  });

  it("never lists one criterion as both a strength and a gap, and ignores a lone test question", () => {
    const m = criterionMatrix(
      [{ criterionId: "c1", label: "Web basics", kind: "must_have", status: "absent", criterionScore: 0 }],
      [{ criterionId: "c1", itemCount: 1, correctCount: 1 }],
      new Map()
    );
    const k = keyPoints({ matrix: m });
    expect(k.strengths).toEqual([]);
    expect(k.gaps).toEqual([expect.objectContaining({ text: "Web basics", detail: "Must have — no evidence in the CV · test 1 of 1 correct" })]);
  });

  it("writes short, sourced bullets and nothing from missing readings", () => {
    const k = keyPoints({
      matrix,
      claimRows: [{ label: "Fix bugs", verdict: "contradicted", detail: "0 of 4 related questions correct" }],
      missingSkills: ["React", "Node", "SQL", "AWS"],
      timelineGaps: [{ from: "2025-09", to: "2026-03", months: 6 }],
      integrity: { band: "low", events: 2 },
      interview: { withheld: true, reason: "Ended early" },
    });
    expect(k.strengths).toHaveLength(1);
    expect(k.strengths[0]).toMatchObject({ text: "Git", detail: "Clear evidence in the CV · test 2 of 2 correct" });
    expect(k.gaps.map((g) => g.text)).toEqual(["Build web apps", "Fix bugs", "Missing skills: React, Node, SQL +1"]);
    expect(k.gaps[0]).toMatchObject({ detail: "Must have — no evidence in the CV" });
    expect(k.gaps.at(-1).text).toBe("Missing skills: React, Node, SQL +1");
    expect(k.watch.map((w) => w.text)).toEqual([
      "CV claim not backed by the test: Fix bugs",
      "6-month gap in work history",
      "AI interview needs your review",
    ]);
    expect(k.watch[1].detail).toBe("Sep 2025 – Mar 2026");
  });
});
