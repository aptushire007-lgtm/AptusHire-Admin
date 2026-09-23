import { describe, expect, it } from "vitest";
import {
  criterionIndex,
  assessmentCriterionRows,
  claimCheckRows,
  itemTally,
  integrityRows,
} from "../src/lib/reportData.js";

const rubric = {
  active: {
    criteria: [
      { id: "c1", label: "Build web applications", importance: "must_have" },
      { id: "c2", label: "Fix bugs", importance: "must_have" },
      { id: "c10", label: "Communication", importance: "nice_to_have" },
    ],
  },
};
const index = criterionIndex(rubric);

describe("report data", () => {
  it("names criteria instead of printing their ids, in rubric order — not c1, c10, c2", () => {
    const rows = assessmentCriterionRows(
      [
        { criterionId: "c1", itemCount: 1, correctCount: 0 },
        { criterionId: "c10", itemCount: 2, correctCount: 1 },
        { criterionId: "c2", itemCount: 4, correctCount: 3 },
      ],
      index
    );
    expect(rows.map((r) => r.label)).toEqual(["Build web applications", "Fix bugs", "Communication"]);
    expect(rows[1]).toMatchObject({ value: 75, detail: "3 of 4", tag: "Must have" });
  });

  it("gives an untested criterion no row, rather than a 0", () => {
    const rows = assessmentCriterionRows([{ criterionId: "c1", itemCount: 0, correctCount: 0 }], index);
    expect(rows).toEqual([]);
  });

  it("names the résumé claims the test checked", () => {
    const [row] = claimCheckRows([{ claimId: "k15", criterionId: "c2", verdict: "contradicted", correctCount: 0, itemCount: 4 }], index);
    expect(row).toMatchObject({ label: "Fix bugs", verdict: "contradicted", detail: "0 of 4 related questions correct" });
  });

  it("keeps unanswered separate from incorrect", () => {
    expect(
      itemTally([
        { correct: true, answered: true },
        { correct: false, answered: true },
        { correct: false, answered: false },
      ])
    ).toEqual({ correct: 1, incorrect: 1, unanswered: 1 });
  });

  it("describes integrity events in plain words with their innocent reading", () => {
    const rows = integrityRows({ window_blur: 1, tab_switch: 3, paste: 0 });
    expect(rows.map((r) => r.type)).toEqual(["tab_switch", "window_blur"]);
    expect(rows[0].label).toBe("Switched away from the tab");
    expect(rows[0].note).toMatch(/not necessarily cheating/);
  });
});
