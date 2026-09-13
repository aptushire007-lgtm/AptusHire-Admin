import { normalizeStage } from "./pipeline.js";

// Stage order is not evidence: optional stages may have been skipped.
export function recordedStages(history = []) {
  return new Set(history.map((entry) => normalizeStage(entry.stage)).filter(Boolean));
}

export function safeCandidateReturn(value, fallback = "/candidates") {
  if (value === "/") return value;
  if (typeof value !== "string" || !/^\/(?:candidates|pipeline|jobs|dashboard)(?:[/?#]|$)/.test(value) || /[\\\r\n]/.test(value)) return fallback;
  return value;
}

export function candidateHref(id, location) {
  const current = `${location.pathname}${location.search || ""}`;
  const inherited = new URLSearchParams(location.search).get("returnTo");
  const returnTo = safeCandidateReturn(inherited || current);
  return `/candidates/${id}?${new URLSearchParams({ returnTo })}`;
}
