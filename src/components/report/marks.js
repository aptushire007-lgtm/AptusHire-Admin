/**
 * The report's chart vocabulary, in one place.
 *
 * These constants were defined inside `InterviewReport.jsx` and are now shared
 * with the rubric accordion, the rail and the evidence panels that came out of
 * that file. Moving them was not tidying: two surfaces drawing the same verdict
 * with two copies of the same colour map is precisely how a "proven" cell ends
 * up a different green from the legend that explains it.
 *
 * Chart palette, run through the dataviz validator (light, surface #ffffff):
 *   proven #047857 · untested #9c9384 · failed #b91c1c
 * This is a DIVERGING scale, so the grey midpoint is correct rather than a
 * chroma failure: "too little evidence" is genuinely the middle — the absence of
 * a finding, not a middling one. The green↔red pair separates at ΔE 8.4 under
 * deuteranopia, which clears the floor of 8 but only on the condition that
 * colour is never the sole encoding. So every segment and every legend row
 * carries a glyph AND a word AND its number. Do not "simplify" those away.
 */

export const pctOf = (w) => Math.round((w || 0) * 100);

// `mark` is the pastel chart fill plus its 1px verdict-hue ring — see the
// --color-chart-* note in index.css for why both halves are required. `chip` is
// the saturated key: small, carries a glyph, and must hold white at 9px, which a
// pastel cannot. Same hue, three weights — chip, ring, fill.
export const BUCKET_MARK = {
  proven: {
    label: "Proven",
    glyph: "✓",
    mark: "bg-chart-positive ring-1 ring-inset ring-verdict-positive/70",
    chip: "bg-verdict-positive",
    text: "text-[#176B45]",
  },
  failed: {
    label: "Failed",
    glyph: "✗",
    mark: "bg-chart-negative ring-1 ring-inset ring-verdict-negative/70",
    chip: "bg-verdict-negative",
    text: "text-[#C95C5C]",
  },
  insufficient: {
    label: "Not tested",
    glyph: "?",
    mark: "bg-chart-neutral ring-1 ring-inset ring-slate-400/70",
    chip: "bg-slate-400",
    text: "text-[#64736A]",
  },
};

// The single-series magnitude mark: competency bars, the answer run, the score
// movement. Pastel sky over a petrol ring, so it reads as the same brand family
// as the buttons without being their weight.
export const BRAND_MARK = "bg-chart-brand ring-1 ring-inset ring-brand-600/60";

// The three evidence legs, in the order the loop runs them. `absent` and
// `untested` render as an empty outline rather than a filled neutral: an unfilled
// cell reads as "we have no reading here", which is exactly what it means, and it
// keeps the row's ink proportional to the evidence actually on record.
export const LEG_MARK = {
  verified: { glyph: "✓", cls: "bg-verdict-positive text-white", says: "supports" },
  contradicted: { glyph: "✗", cls: "bg-verdict-negative text-white", says: "contradicts" },
  partial: { glyph: "~", cls: "bg-slate-400 text-white", says: "partial" },
  absent: { glyph: "", cls: "border border-[#E5EBE7]-mid", says: "nothing on record" },
  untested: { glyph: "", cls: "border border-[#E5EBE7]-mid", says: "not tested" },
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
  stronger: { arrow: "↑", label: "Stronger than the CV claimed", text: "text-[#176B45]" },
  weaker: { arrow: "↓", label: "Weaker than the CV claimed", text: "text-[#C95C5C]" },
  held: { arrow: "=", label: "Matched the CV", text: "text-[#64736A]" },
  undemonstrated: { arrow: "·", label: "Not demonstrated in the interview", text: "text-[#9BAAA1]" },
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
