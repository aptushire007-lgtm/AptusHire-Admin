// A colour per department, so "Mobile Engineering" is the same teal on every
// row and card and a recruiter can scan the list by team.
//
// The palette deliberately avoids violet, sky, rose and amber — those belong to
// the screening steps (featureHues.js) — and green/red, which mean outcomes.
// "General" and a missing department stay neutral slate: no team, no colour.
// Full class strings, because Tailwind only emits classes it can see.

const PALETTE = [
  { chip: "bg-teal-50 text-teal-800 ring-teal-200", dot: "bg-teal-500", tile: "bg-teal-100 text-teal-800", edge: "border-l-teal-400", stripe: "bg-teal-400" },
  { chip: "bg-indigo-50 text-indigo-800 ring-indigo-200", dot: "bg-indigo-500", tile: "bg-indigo-100 text-indigo-800", edge: "border-l-indigo-400", stripe: "bg-indigo-400" },
  { chip: "bg-orange-50 text-orange-800 ring-orange-200", dot: "bg-orange-500", tile: "bg-orange-100 text-orange-800", edge: "border-l-orange-400", stripe: "bg-orange-400" },
  { chip: "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200", dot: "bg-fuchsia-500", tile: "bg-fuchsia-100 text-fuchsia-800", edge: "border-l-fuchsia-400", stripe: "bg-fuchsia-400" },
  { chip: "bg-cyan-50 text-cyan-800 ring-cyan-200", dot: "bg-cyan-500", tile: "bg-cyan-100 text-cyan-800", edge: "border-l-cyan-400", stripe: "bg-cyan-400" },
  { chip: "bg-lime-50 text-lime-800 ring-lime-200", dot: "bg-lime-600", tile: "bg-lime-100 text-lime-800", edge: "border-l-lime-500", stripe: "bg-lime-500" },
  { chip: "bg-blue-50 text-blue-800 ring-blue-200", dot: "bg-blue-500", tile: "bg-blue-100 text-blue-800", edge: "border-l-blue-400", stripe: "bg-blue-400" },
  { chip: "bg-pink-50 text-pink-800 ring-pink-200", dot: "bg-pink-500", tile: "bg-pink-100 text-pink-800", edge: "border-l-pink-400", stripe: "bg-pink-400" },
];

const NEUTRAL = { chip: "bg-slate-100 text-slate-700 ring-slate-200", dot: "bg-slate-400", tile: "bg-slate-100 text-slate-600", edge: "border-l-slate-300", stripe: "bg-slate-300" };

const keyOf = (name) => String(name || "").trim().toLowerCase();
const isNeutral = (key) => !key || key === "general";

/**
 * A colour lookup for a company's departments. Colours are handed out in
 * alphabetical order, so every department gets a DIFFERENT one (up to eight —
 * a hash put three of five teams on the same pink) and the mapping only moves
 * when a department is added or removed.
 */
export function departmentPalette(names) {
  const keys = [...new Set((names || []).map(keyOf).filter((k) => !isNeutral(k)))].sort();
  const index = new Map(keys.map((k, i) => [k, PALETTE[i % PALETTE.length]]));
  return (name) => index.get(keyOf(name)) || (isNeutral(keyOf(name)) ? NEUTRAL : PALETTE[0]);
}

/** Two letters for a job's tile: "Mobile Application Engineer" → "MA". */
export function initials(title) {
  const words = String(title || "").replace(/\(.*?\)/g, "").split(/\s+/).filter((w) => /^[A-Za-z0-9]/.test(w));
  return (words.slice(0, 2).map((w) => w[0]).join("") || "?").toUpperCase();
}
