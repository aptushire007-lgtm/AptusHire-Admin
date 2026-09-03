// admin/src/lib/pipeline.js is a hand-maintained MIRROR of backend/utils/pipeline.js.
// Its own header says "keep the stage keys and order in sync with the backend"
// and canTransition's says "keep the rules identical so the UI only offers moves
// the server will accept" — two rules that, until this file existed, nothing
// enforced. The failure they describe is silent in both directions: add a stage
// server-side and the admin board renders a raw `snake_case` key as a candidate's
// status; change a transition rule server-side and the UI keeps offering a move
// that now fails on submit, with the recruiter blamed for the error.
//
// So this loads the real backend module across the boundary and diffs the two.
// The backend file is CommonJS and lives outside this app's Vite root, so it is
// pulled in with createRequire — that hands it straight to Node and never asks
// Vite to resolve a path outside the project.

import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import * as ui from "../src/lib/pipeline.js";

const require = createRequire(import.meta.url);
const server = require("../../backend/utils/pipeline.js");

// Every stage either side can name, plus the legacy aliases still stored on old
// Candidate documents. The legacy keys matter: they are the inputs most likely
// to be normalised differently on one side of the boundary.
const LEGACY_KEYS = Object.keys(server.LEGACY_STAGE_MAP);
const EVERY_INPUT = [...server.STAGES, server.REJECTED, ...LEGACY_KEYS];

describe("pipeline mirror — the frontend copy agrees with the backend", () => {
  it("has the same stages in the same order", () => {
    // Order is not cosmetic: it is what `canTransition` compares to decide
    // whether a move is forward, and what stageStep numbers the board with.
    expect(ui.STAGES).toEqual(server.STAGES);
    expect(ui.REJECTED).toBe(server.REJECTED);
    expect(ui.ALL_STAGES).toEqual([...server.STAGES, server.REJECTED]);
  });

  it("labels every stage identically", () => {
    expect(ui.STAGE_LABELS).toEqual(server.STAGE_LABELS);
  });

  it("agrees on which stages are terminal and which are interview rounds", () => {
    expect(ui.TERMINAL_STAGES).toEqual(server.TERMINAL_STAGES);
    expect(ui.ROUND_STAGES).toEqual(server.ROUND_STAGES);
  });

  it("normalises legacy statuses the same way", () => {
    for (const input of EVERY_INPUT) {
      expect(ui.normalizeStage(input)).toBe(server.normalizeStage(input));
      expect(ui.stageLabel(input)).toBe(server.stageLabel(input));
      expect(ui.isTerminal(input)).toBe(server.isTerminal(input));
    }
  });

  it("agrees on EVERY transition, not a sampled few", () => {
    // 17 × 17 = 289 pairs. Exhaustive on purpose — a drift in one cell of this
    // matrix is exactly one wrong menu entry on one screen, which is precisely
    // the kind of thing a spot-check misses.
    const disagreements = [];
    for (const from of EVERY_INPUT) {
      for (const to of EVERY_INPUT) {
        const mine = ui.canTransition(from, to);
        const theirs = server.canTransition(from, to);
        if (mine !== theirs) disagreements.push(`${from} → ${to}: ui=${mine} server=${theirs}`);
      }
    }
    expect(disagreements).toEqual([]);
  });

  it("offers exactly the destinations the server would accept", () => {
    for (const from of EVERY_INPUT) {
      expect(ui.allowedNextStages(from), `from ${from}`).toEqual(server.allowedNextStages(from));
    }
  });
});

describe("pipeline rules the UI owns", () => {
  it("gives every stage a badge tone, so a new stage cannot render silently grey", () => {
    // stageTone falls back to "slate" for anything unmapped. That fallback is
    // correct for junk input and wrong for a real stage — "Rejected" quietly
    // losing its red is not a crash, it is a misread. Adding a stage to the
    // array without a tone should fail here, not ship.
    const untoned = ui.ALL_STAGES.filter((s) => ui.stageTone(s) === "slate" && s !== "applied");
    expect(untoned).toEqual([]);
  });

  it("numbers stages along the pipeline and refuses to number the off-ramp", () => {
    expect(ui.stageStep("applied")).toBe(1);
    expect(ui.stageStep("ats_passed")).toBe(2);
    // `rejected` is a terminal off-ramp deliberately kept out of the ordered
    // progression — giving it a step number would imply it is a stage you pass
    // through on the way to being hired.
    expect(ui.stageStep("rejected")).toBeNull();
    expect(ui.stageStep("nonsense")).toBeNull();
    // Legacy statuses are numbered by what they normalise to, not skipped.
    expect(ui.stageStep("interview_queue")).toBe(ui.stageStep("interview_scheduled"));
  });

  it("warns before the click when a stage move puts mail in the candidate's inbox", () => {
    // The point of this list is that moving someone is not internal bookkeeping
    // when it ends with a rejection letter.
    expect(ui.notifiesCandidate("rejected")).toBe(true);
    expect(ui.notifiesCandidate("interview_scheduled")).toBe(true);
    expect(ui.notifiesCandidate("assessment_scheduled")).toBe(true);
    // Internal-only moves must not claim to send anything.
    expect(ui.notifiesCandidate("under_review")).toBe(false);
    expect(ui.notifiesCandidate("ai_interview_completed")).toBe(false);
    // Legacy aliases resolve before the lookup, or an old record silently loses
    // its warning.
    expect(ui.notifiesCandidate("interview_queue")).toBe(true);
  });
});
