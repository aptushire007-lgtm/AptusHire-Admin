// The data rules behind a candidate's report, kept pure so they are testable
// without a DOM and so every report surface reads them the same way.

/**
 * A job's rubric criteria, by id: { label, importance, weight, order }.
 *
 * The assessment result keys everything by criterion id ("c1", "c10"), and the
 * report printed those ids to the recruiter — sorted as text, so c10 came
 * before c2. The names were always available, in the job's rubric; nothing
 * looked them up.
 */
export function criterionIndex(rubric) {
  const criteria = rubric?.active?.criteria || rubric?.criteria || [];
  return new Map(
    criteria.map((c, order) => [
      c.id,
      { label: c.label || c.id, importance: c.importance || null, weight: c.weight ?? null, order },
    ])
  );
}

/** Rubric order, then id — never lexical order on "c1", "c10", "c2". */
function byRubricOrder(index) {
  return (a, b) => {
    const oa = index.get(a.criterionId)?.order ?? Infinity;
    const ob = index.get(b.criterionId)?.order ?? Infinity;
    if (oa !== ob) return oa - ob;
    return String(a.criterionId).localeCompare(String(b.criterionId), undefined, { numeric: true });
  };
}

const IMPORTANCE_TAG = { must_have: "Must have", important: "Important", nice_to_have: "Nice to have" };

/**
 * One named row per criterion the test covered: share correct, and the counts
 * in words. A criterion the paper asked nothing about has no row — it was not
 * tested, which is not the same as a score of zero.
 */
export function assessmentCriterionRows(perCriterion, index) {
  return [...(perCriterion || [])]
    .filter((c) => c.itemCount > 0)
    .sort(byRubricOrder(index))
    .map((c) => {
      const meta = index.get(c.criterionId);
      // A label the result already carries wins (the backend enriches some
      // payloads); then the rubric's; only then the id, said plainly.
      const named = c.label || meta?.label;
      return {
        key: c.criterionId,
        label: named || `Criterion ${c.criterionId}`,
        unnamed: !named,
        tag: IMPORTANCE_TAG[meta?.importance] || null,
        value: Math.round((c.correctCount / c.itemCount) * 100),
        detail: `${c.correctCount} of ${c.itemCount}`,
      };
    });
}

/**
 * Résumé claims the test checked, named. `verified` / `contradicted` /
 * `inconclusive` come straight from the scorer.
 */
export function claimCheckRows(claimVerdicts, index) {
  return [...(claimVerdicts || [])].sort(byRubricOrder(index)).map((v) => ({
    key: v.claimId || v.criterionId,
    label: v.label || index.get(v.criterionId)?.label || `Criterion ${v.criterionId}`,
    unnamed: !(v.label || index.get(v.criterionId)?.label),
    verdict: v.verdict,
    detail: `${v.correctCount} of ${v.itemCount} related questions correct`,
  }));
}

/** Right, wrong and never answered — three separate facts. */
export function itemTally(perItem) {
  const items = perItem || [];
  return {
    correct: items.filter((i) => i.answered !== false && i.correct).length,
    incorrect: items.filter((i) => i.answered !== false && !i.correct).length,
    unanswered: items.filter((i) => i.answered === false).length,
  };
}

/**
 * Integrity events in plain words, with the benign reading beside each.
 *
 * Mirrors backend utils/proctoring.js — its labels and its "why this may be
 * innocent" notes — so the admin and the scorer never describe one event two
 * ways. Two labels there say "interview"; they are made context-neutral here
 * because the same events are recorded during skills tests.
 */
export const PROCTORING_EVENTS = {
  tab_switch: { label: "Switched away from the tab", note: "May be checking notes or a brief distraction, not necessarily cheating." },
  window_blur: { label: "Window lost focus", note: "May be a notification or another window briefly stealing focus." },
  fullscreen_exit: { label: "Exited fullscreen", note: "May be an accidental key press (Esc) or an OS prompt." },
  copy: { label: "Copied text from the page", note: "May be copying their own answer to review it, not lifting external content." },
  paste: { label: "Pasted text into an answer", note: "Could be pasting their own earlier notes rather than external material." },
  context_menu: { label: "Opened the right-click menu", note: "Often accidental (right-click) — low signal on its own." },
  face_absent: { label: "Away from camera (4s+)", note: "May be webcam angle, lighting, or looking at notes — not necessarily absence." },
  multi_face: { label: "More than one person on camera", note: "Could be a reflection, poster, or someone briefly passing behind the candidate." },
  gaze_away: { label: "Looked away from the screen (7s+)", note: "May be glancing at notes or a second monitor, not disengagement." },
  identity_mismatch: { label: "Face did not match the identity photo", note: "Lighting or camera angle can affect the match — treat as a prompt to verify, not a conclusion." },
  camera_lost: { label: "Camera feed stopped", note: "Often a transient webcam/driver hiccup rather than an intentional camera-off." },
  phone_cam_lost: { label: "Secondary phone camera disconnected", note: "Phones lock their screen or drop Wi-Fi easily — usually connectivity, not intent." },
  multi_display_detected: { label: "Second display detected", note: "A second monitor is common and unremarkable on its own." },
  bandwidth_anomaly: { label: "Connection quality dropped", note: "Home wifi and ISP variance explain most of this — a weak signal on its own." },
  devtools_open: { label: "Developer tools opened", note: "Opened for many innocent reasons — approximate and easily false-positive." },
};

/** Event counts as named rows, most frequent first. Unknown types keep their raw name rather than vanishing. */
export function integrityRows(counts) {
  return Object.entries(counts || {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type,
      count,
      label: PROCTORING_EVENTS[type]?.label || type.replaceAll("_", " "),
      note: PROCTORING_EVENTS[type]?.note || null,
    }));
}
