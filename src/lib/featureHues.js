/**
 * One hue per screening step, used everywhere that step appears.
 *
 * Colour earns its place only when it MEANS something, and here it means
 * "which step is this". AI interview is violet wherever it shows up — in job
 * creation, in a job's sidebar — so a recruiter learns the mapping once and
 * then reads it without thinking. A step never borrows another's hue.
 *
 *   interview   violet  — this design system's existing AI voice (--color-ai-*)
 *   cv          sky     — the résumé screen
 *   assessment  rose    — the skills test
 *   review      amber   — a human settles it; amber already means "a human owes
 *                         this something" across the product
 *   neutral     slate   — always-included items, which are not choices
 *
 * Kept deliberately OFF the status chips on the pipeline board, where green,
 * amber and red mean an outcome. Identity and verdict must not share a mark.
 *
 * Every class is written out in full, because Tailwind only emits classes it
 * can see as literal strings in the source.
 *
 * Number-marker fills are chosen for contrast, not by rote shade: white on each
 * clears 4.5:1 (sky-700 and amber-700 rather than their 600s, which do not).
 */
export const HUES = {
  violet: {
    tile: "bg-violet-100 text-violet-700",
    text: "text-violet-700",
    icon: "text-violet-600",
    selected: "border-violet-300 bg-violet-50/70 ring-1 ring-violet-200",
    pill: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200",
    marker: "bg-violet-600 text-white",
    rail: "bg-violet-200",
    wash: "from-violet-50/80",
    check: "accent-violet-600",
    hoverRow: "hover:bg-violet-50/60",
  },
  sky: {
    tile: "bg-sky-100 text-sky-700",
    text: "text-sky-700",
    icon: "text-sky-600",
    selected: "border-sky-300 bg-sky-50/70 ring-1 ring-sky-200",
    pill: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
    marker: "bg-sky-700 text-white",
    rail: "bg-sky-200",
    wash: "from-sky-50/80",
    check: "accent-sky-700",
    hoverRow: "hover:bg-sky-50/60",
  },
  rose: {
    tile: "bg-rose-100 text-rose-700",
    text: "text-rose-700",
    icon: "text-rose-600",
    selected: "border-rose-300 bg-rose-50/70 ring-1 ring-rose-200",
    pill: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
    marker: "bg-rose-600 text-white",
    rail: "bg-rose-200",
    wash: "from-rose-50/80",
    check: "accent-rose-600",
    hoverRow: "hover:bg-rose-50/60",
  },
  amber: {
    tile: "bg-amber-100 text-amber-800",
    text: "text-amber-800",
    icon: "text-amber-700",
    selected: "border-amber-300 bg-amber-50/70 ring-1 ring-amber-200",
    pill: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
    marker: "bg-amber-700 text-white",
    rail: "bg-amber-200",
    wash: "from-amber-50/80",
    check: "accent-amber-700",
    hoverRow: "hover:bg-amber-50/60",
  },
  slate: {
    tile: "bg-slate-100 text-slate-600",
    text: "text-slate-600",
    icon: "text-slate-500",
    selected: "border-slate-300 bg-slate-50 ring-1 ring-slate-200",
    pill: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
    marker: "bg-slate-600 text-white",
    rail: "bg-slate-200",
    wash: "from-slate-50",
    check: "accent-slate-600",
    hoverRow: "hover:bg-slate-50",
  },
};

/** Which hue each screening step owns. */
export const STEP_HUE = {
  interview: "violet",
  cv: "sky",
  assessment: "rose",
  review: "amber",
};
