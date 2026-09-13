// The Hiring Pipeline board's arithmetic.
//
// These exist because every figure on that board is a CLAIM about a candidate,
// and the two ways a claim goes wrong here are both silent: a schema default
// rendered as a measurement, and a rate whose denominator quietly excludes the
// people it should count. Both are asserted directly below.

import { describe, it, expect } from "vitest";
import {
  daysInStage,
  daysSinceApplied,
  furthestStageIndex,
  isScored,
  pipelineKpis,
  reached,
  resumeFlagCount,
  scoreCaveat,
  scoreOf,
  stageEnteredAt,
} from "../src/lib/pipelineMetrics.js";

const DAY = 86_400_000;
const NOW = new Date("2026-09-03T12:00:00Z").getTime();
const ago = (days) => new Date(NOW - days * DAY).toISOString();

/** A candidate document shaped like the /api/candidates list payload. */
function candidate(overrides = {}) {
  return {
    _id: Math.random().toString(36).slice(2),
    basicDetails: { name: "Test Person" },
    status: "applied",
    skills: [],
    stageHistory: [],
    ats: {},
    offer: {},
    createdAt: ago(10),
    ...overrides,
  };
}

describe("isScored — a schema default is not a measurement", () => {
  it("refuses the default 0/pending ATS block", () => {
    // This is the exact shape Candidate.atsResultSchema writes on creation:
    // overallScore 0, decision "pending", no scoredAt. A `!= null` test passes
    // here, which is what used to render an unscreened applicant as "0%".
    const c = candidate({ ats: { overallScore: 0, decision: "pending" } });
    expect(isScored(c)).toBe(false);
    expect(scoreOf(c)).toBeNull();
  });

  it("accepts a genuine zero once a scoring run stamped it", () => {
    const c = candidate({ ats: { overallScore: 0, decision: "fail", scoredAt: ago(1) } });
    expect(isScored(c)).toBe(true);
    // A real measured 0 must survive — the point is telling it apart from the
    // default, not suppressing low scores.
    expect(scoreOf(c)).toBe(0);
  });

  it("accepts a decided score written before scoredAt was stamped", () => {
    expect(isScored(candidate({ ats: { overallScore: 71, decision: "pass" } }))).toBe(true);
  });

  it("treats a missing ats block as unscored rather than throwing", () => {
    const c = candidate();
    delete c.ats;
    expect(isScored(c)).toBe(false);
    expect(scoreOf(c)).toBeNull();
  });
});

describe("scoreCaveat — a degraded reading says so", () => {
  it("names the legacy fallback, which is the one that must never pass as evidence", () => {
    const c = candidate({ ats: { overallScore: 60, decision: "pass", scoredAt: ago(1), engine: "fallback-legacy" } });
    expect(scoreCaveat(c)).toBe("legacy fallback");
  });

  it("stays quiet on the evidence engine, so the caveat keeps its meaning", () => {
    const c = candidate({ ats: { overallScore: 60, decision: "pass", scoredAt: ago(1), engine: "evidence" } });
    expect(scoreCaveat(c)).toBeNull();
  });

  it("says nothing at all about an unscored candidate", () => {
    expect(scoreCaveat(candidate({ ats: { engine: "legacy" } }))).toBeNull();
  });
});

describe("time in stage", () => {
  it("measures from the last history entry naming the current stage", () => {
    const c = candidate({
      status: "under_review",
      createdAt: ago(30),
      stageHistory: [
        { stage: "applied", at: ago(30) },
        { stage: "ats_passed", at: ago(20) },
        { stage: "under_review", at: ago(4) },
      ],
    });
    expect(stageEnteredAt(c)).toBe(ago(4));
    expect(daysInStage(c, NOW)).toBe(4);
    expect(daysSinceApplied(c, NOW)).toBe(30);
  });

  it("falls back to the application date for a candidate who never moved", () => {
    const c = candidate({ status: "applied", createdAt: ago(6), stageHistory: [] });
    expect(daysInStage(c, NOW)).toBe(6);
  });

  it("reads the LAST visit to a stage, not the first, for a round-to-round move back", () => {
    const c = candidate({
      status: "hr_interview",
      stageHistory: [
        { stage: "hr_interview", at: ago(12) },
        { stage: "technical_interview", at: ago(8) },
        { stage: "hr_interview", at: ago(2) },
      ],
    });
    expect(daysInStage(c, NOW)).toBe(2);
  });

  it("normalises a legacy stage key in the history", () => {
    // interview_queue → interview_scheduled (LEGACY_STAGE_MAP in pipeline.js).
    const c = candidate({
      status: "interview_scheduled",
      stageHistory: [{ stage: "interview_queue", at: ago(3) }],
    });
    expect(daysInStage(c, NOW)).toBe(3);
  });

  it("returns null rather than a number it cannot source", () => {
    const c = candidate({ createdAt: null, stageHistory: [] });
    expect(daysInStage(c, NOW)).toBeNull();
    expect(daysSinceApplied(c, NOW)).toBeNull();
  });
});

describe("furthest stage reached — a rejection does not erase the journey", () => {
  it("counts a candidate rejected AFTER being shortlisted as having reached it", () => {
    const c = candidate({
      status: "rejected",
      stageHistory: [
        { stage: "applied", at: ago(20) },
        { stage: "shortlisted", at: ago(8) },
        { stage: "rejected", at: ago(1) },
      ],
    });
    expect(reached(c, "shortlisted")).toBe(true);
    // …and not as having reached anything past it.
    expect(reached(c, "hr_interview")).toBe(false);
  });

  it("gives a candidate who only ever held the off-ramp no position at all", () => {
    expect(furthestStageIndex(candidate({ status: "rejected", stageHistory: [] }))).toBe(-1);
    expect(reached(candidate({ status: "rejected", stageHistory: [] }), "applied")).toBe(false);
  });

  it("counts the current stage even when the history is empty", () => {
    expect(reached(candidate({ status: "shortlisted" }), "ats_passed")).toBe(true);
  });
});

describe("resumeFlagCount — flags, never decides", () => {
  it("is zero on a clean report", () => {
    expect(resumeFlagCount(candidate({ hostility: { clean: true, signals: [{ severity: "critical" }] } }))).toBe(0);
  });

  it("counts critical and warning signals and ignores advisories", () => {
    const c = candidate({
      hostility: {
        clean: false,
        signals: [{ severity: "critical" }, { severity: "warning" }, { severity: "advisory" }],
      },
    });
    expect(resumeFlagCount(c)).toBe(2);
  });

  it("is zero when no report was ever run", () => {
    expect(resumeFlagCount(candidate())).toBe(0);
  });
});

describe("pipelineKpis — every figure carries its denominator", () => {
  const roster = [
    // Unscored, brand new, still active.
    candidate({ status: "applied", createdAt: ago(2), ats: { overallScore: 0, decision: "pending" } }),
    // Scored, awaiting a human.
    candidate({
      status: "under_review",
      createdAt: ago(15),
      ats: { overallScore: 80, decision: "review", scoredAt: ago(14) },
      stageHistory: [{ stage: "under_review", at: ago(5) }],
    }),
    // AI interview done, scored.
    candidate({
      status: "ai_interview_completed",
      createdAt: ago(12),
      ats: { overallScore: 60, decision: "pass", scoredAt: ago(11) },
      stageHistory: [{ stage: "ai_interview_completed", at: ago(3) }],
    }),
    // Offer outstanding, and shortlisted on the way there.
    candidate({
      status: "offer_sent",
      createdAt: ago(40),
      ats: { overallScore: 90, decision: "pass", scoredAt: ago(38) },
      offer: { status: "sent", sentAt: ago(9) },
      stageHistory: [{ stage: "shortlisted", at: ago(20) }, { stage: "offer_sent", at: ago(9) }],
    }),
    // Rejected after being shortlisted — terminal, so not "active", but it
    // still passed through Shortlisted.
    candidate({
      status: "rejected",
      createdAt: ago(50),
      ats: { overallScore: 40, decision: "fail", scoredAt: ago(45) },
      stageHistory: [{ stage: "shortlisted", at: ago(30) }, { stage: "rejected", at: ago(25) }],
    }),
  ];

  const k = pipelineKpis(roster, NOW);

  it("separates the active pipeline from the applications on record", () => {
    expect(k.total).toBe(5);
    expect(k.active).toBe(4);
  });

  it("counts only the last seven days as new", () => {
    expect(k.newThisWeek).toBe(1);
  });

  it("averages the score over the scored subset, not over everyone", () => {
    expect(k.scoredCount).toBe(4);
    // (80 + 60 + 90 + 40) / 4 — the unscored applicant's schema-default 0 is
    // absent, which is the whole point.
    expect(k.avgScore).toBe(68);
  });

  it("reports the oldest outstanding offer rather than an expiry it cannot know", () => {
    expect(k.offersOut).toBe(1);
    expect(k.longestOfferDays).toBe(9);
  });

  it("measures stage age over active candidates only", () => {
    expect(k.stageAgeSample).toBe(4);
    // 2 (applied, no history → createdAt) + 5 + 3 + 9, over 4.
    expect(k.avgDaysInStage).toBe(4.8);
  });

  it("counts everyone who ever reached Shortlisted, including the rejected one", () => {
    expect(k.shortlisted).toBe(2);
    expect(k.passThroughPct).toBe(40);
  });

  it("returns nulls, not zeros, for an empty roster", () => {
    const empty = pipelineKpis([], NOW);
    expect(empty.total).toBe(0);
    expect(empty.avgScore).toBeNull();
    expect(empty.avgDaysInStage).toBeNull();
    expect(empty.passThroughPct).toBeNull();
    expect(empty.longestOfferDays).toBeNull();
  });
});

