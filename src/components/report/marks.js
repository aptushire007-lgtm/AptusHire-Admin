/**
 * The report's chart vocabulary, in one place.
 *
 * These constants were defined inside `InterviewReport.jsx` and are now shared
 * with the rubric accordion, the rail and the evidence panels that came out of
 * that file. Moving them was not tidying: two surfaces drawing the same verdict
 * with two copies of the same colour map is precisely how a "proven" cell ends
 * up a different green from the legend that explains it.
 *
 * Chart palette — the system's own chart marks (index.css § Chart marks):
 *   proven #2FBE62 · untested #8FA396 · failed #D4534A
 * The values quoted here previously were #047857 / #9c9384 / #b91c1c, which are
 * from no palette this product owns and were not what these classes resolved to
 * either — the `--color-chart-*` tokens they name did not exist at all, so every
 * `mark` below painted a transparent box behind its ring. Both halves of that
 * are fixed: the tokens are declared, and the numbers above are the real ones.
 *
 * This is a DIVERGING scale, so the grey midpoint is correct rather than a
 * chroma failure: "too little evidence" is genuinely the middle — the absence of
 * a finding, not a middling one. Colour is never the sole encoding, so every
 * segment and every legend row carries a glyph AND a word AND its number. Do
 * not "simplify" those away.
 */

export const pctOf = (w) => Math.round((w || 0) * 100);

// `mark` is the chart fill plus a one-step-darker edge ring; `chip` is the
// legend key, which carries a glyph and must hold white at 9px.
//
// `mark` and `chip` are now the SAME colour, and that is a fix rather than a
// simplification. The split existed because `mark` was meant to be a pastel
// that could not hold a white glyph — but the pastel never rendered (the
// `chart-*` tokens were undeclared), so in practice the segment was empty and
// the legend swatch beside it was solid. A legend whose key is a different
// colour from the thing it explains is the one failure this file's own header
// warns about.
export const BUCKET_MARK = {
  proven: {
    label: "Proven",
    glyph: "✓",
    mark: "bg-chart-positive ring-1 ring-inset ring-emerald-700/50",
    chip: "bg-chart-positive",
    text: "text-verdict-positive",
  },
  failed: {
    label: "Failed",
    glyph: "✗",
    mark: "bg-chart-negative ring-1 ring-inset ring-red-600/50",
    chip: "bg-chart-negative",
    text: "text-verdict-negative",
  },
  insufficient: {
    label: "Not tested",
    glyph: "?",
    mark: "bg-chart-neutral ring-1 ring-inset ring-slate-500/50",
    chip: "bg-chart-neutral",
    text: "text-slate-500",
  },
};

// The single-series magnitude mark: competency bars, the answer run, the score
// movement. The accent teal — the system's "this was computed" voice — so a
// magnitude bar is never mistaken for a verdict. Deliberately NOT a green: it
// sits in the same charts as `proven`, and two greens in one figure is
// unreadable.
export const BRAND_MARK = "bg-chart-brand ring-1 ring-inset ring-teal-600/50";

// The three evidence legs, in the order the loop runs them. `absent` and
// `untested` render as an empty outline rather than a filled neutral: an unfilled
// cell reads as "we have no reading here", which is exactly what it means, and it
// keeps the row's ink proportional to the evidence actually on record.
export const LEG_MARK = {
  verified: { glyph: "✓", cls: "bg-verdict-positive text-white", says: "supports" },
  contradicted: { glyph: "✗", cls: "bg-verdict-negative text-white", says: "contradicts" },
  partial: { glyph: "~", cls: "bg-slate-400 text-white", says: "partial" },
  absent: { glyph: "", cls: "border border-slate-300", says: "nothing on record" },
  untested: { glyph: "", cls: "border border-slate-300", says: "not tested" },
};

export const LEG_ORDER = [
  ["resume", "Résumé"],
  ["assessment", "Assessment"],
  ["interview", "Interview"],
];

// C5 — why a requirement went untested, in the words a recruiter would say out loud. Every one
// of these is a statement about our instrument or the CV's silence, never about the candidate.
export const UNTESTED_CAUSE_COPY = {
  resume_silent: "Their CV didn't mention it, so there was no claim to test.",
  no_probe_slot: "We ran out of interview questions before we got to it.",
  asked_audio_failed: "We asked, but the audio broke on the answer.",
  asked_unresolved: "We asked, but the answer didn't settle it.",
  anchor_only: "It came up when we asked about their CV, but wasn't formally tested.",
};

/**
 * What the interview did to the CV's claim on one requirement.
 *
 * Mirrors `interviewReportEngine.MOVEMENT` — the values arrive on the row from
 * the server (`coverage.rows[].movement`), computed there so the PDF prints the
 * same reading. This map is presentation only: the words, the arrow and the ink.
 *
 * `held` is deliberately neutral ink. A requirement that came out of the
 * interview exactly as the CV claimed it is not a positive finding or a negative
 * one — it is a confirmation, and colouring it green would inflate every
 * unremarkable row into an achievement.
 */
export const MOVEMENT_MARK = {
  stronger: { arrow: "↑", label: "Stronger than the CV claimed", text: "text-verdict-positive" },
  weaker: { arrow: "↓", label: "Weaker than the CV claimed", text: "text-verdict-negative" },
  held: { arrow: "=", label: "Matched the CV", text: "text-slate-500" },
  undemonstrated: { arrow: "·", label: "Not demonstrated in the interview", text: "text-slate-400" },
};

// Order the rubric reads in. Weight already encodes importance and the rows
// arrive sorted by it, but a nice-to-have at 20% must never sort above a
// must-have at 15%: a 9 on a must-have and a 9 on a nice-to-have are not the
// same result, and the reader has to meet the must-haves first.
export const KIND_ORDER = { disqualifier: 0, must_have: 1, nice_to_have: 2 };

export const KIND_MARK = {
  disqualifier: { label: "Disqualifier", bar: "bg-verdict-negative", badge: "red" },
  must_have: { label: "Must have", bar: "bg-brand-600", badge: "brand" },
  nice_to_have: { label: "Nice to have", bar: "bg-slate-300", badge: null },
};
