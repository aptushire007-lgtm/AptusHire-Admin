// What the report SAYS, derived from what was measured — pure, so it is
// testable and so the summary never states more than the data holds.
//
// Every bullet names its source (CV, test, interview, integrity) and links to
// the tab that proves it. Nothing is inferred from a missing reading: an
// untested criterion yields no test bullet, a withheld interview yields a
// "review it" bullet, not a weakness.

const IMPORTANCE = { must_have: "Must have", important: "Important", nice_to_have: "Nice to have" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(ym) {
  const [y, m] = String(ym || "").split("-").map(Number);
  return y && m ? `${MONTHS[m - 1]} ${y}` : ym;
}

/**
 * One row per rubric criterion: the CV's evidence strength next to how the
 * candidate did on test questions for it.
 *
 *   cv      0–100 evidence strength, or null when the CV was not assessed on it
 *   cvNone  true when the engine looked and found NO evidence ("absent")
 *   test    0–100 share correct, or null when the test asked nothing about it
 */
export function criterionMatrix(findings, perCriterion, index, topEvidence = []) {
  const tests = new Map((perCriterion || []).filter((c) => c.itemCount > 0).map((c) => [c.criterionId, c]));
  const rows = (findings || []).map((f, i) => {
    const t = tests.get(f.criterionId);
    const meta = index?.get?.(f.criterionId);
    return {
      id: f.criterionId,
      label: f.label || meta?.label || `Criterion ${f.criterionId}`,
      importance: f.kind || meta?.importance || null,
      tag: IMPORTANCE[f.kind || meta?.importance] || null,
      weight: f.weight ?? meta?.weight ?? null,
      order: meta?.order ?? i,
      status: f.status || null,
      cv: f.status === "absent" ? 0 : f.criterionScore != null ? Math.round(f.criterionScore * 100) : null,
      cvNone: f.status === "absent",
      test: t ? Math.round((t.correctCount / t.itemCount) * 100) : null,
      testDetail: t ? `${t.correctCount} of ${t.itemCount}` : null,
      testItems: t ? t.itemCount : 0,
      reasoning: f.reasoning || "",
      // The finding's own evidence, else the run's top citations for it.
      quotes: (f.evidence?.length ? f.evidence : (topEvidence || []).filter((e) => e.criterionId === f.criterionId))
        .map((e) => ({ quote: e.quote, status: e.verificationStatus }))
        .filter((e) => e.quote),
    };
  });
  return rows.sort((a, b) => a.order - b.order);
}

/**
 * Three short lists — strengths, gaps, things to check — each item a line of
 * text, a smaller detail, and the tab that backs it. At most four per list.
 */
export function keyPoints({ matrix = [], claimRows = [], missingSkills = [], timelineGaps = [], integrity = null, interview = null }) {
  const strengths = [];
  const gaps = [];
  const watch = [];
  const byWeight = [...matrix].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));

  // One bullet per criterion, reading the CV and the test together — never a
  // strength and a gap for the same thing. A single test question is too
  // little to call anything a strength or a gap on its own.
  const TEST_MIN = 2;
  for (const r of byWeight) {
    const testStrong = r.test != null && r.testItems >= TEST_MIN && r.test >= 70;
    const testWeak = r.test != null && r.testItems >= TEST_MIN && r.test < 40;
    const cvGood = r.status === "satisfied";
    const cvMissing = ["absent", "unmet"].includes(r.status);
    const testWords = r.test != null ? `test ${r.testDetail} correct` : null;
    if (cvGood && !testWeak) {
      strengths.push({ text: r.label, detail: `Clear evidence in the CV${testStrong ? ` · ${testWords}` : ""}`, source: "cv", tab: "ats-breakdown" });
    } else if (testStrong) {
      strengths.push({ text: r.label, detail: `Test: ${r.testDetail} correct${cvMissing ? " · not mentioned in the CV" : ""}`, source: "test", tab: "assessments" });
    } else if (cvMissing && r.importance === "must_have") {
      gaps.push({ text: r.label, detail: `Must have — ${r.cvNone ? "no evidence in the CV" : "not met in the CV"}${testWords ? ` · ${testWords}` : ""}`, source: "cv", tab: "ats-breakdown" });
    } else if (testWeak && !cvGood) {
      gaps.push({ text: r.label, detail: `Test: ${r.testDetail} correct`, source: "test", tab: "assessments" });
    }
  }
  for (const s of (interview?.strengths || []).slice(0, 2)) {
    strengths.push({ text: s, detail: "From the AI interview", source: "interview", tab: "ai-interview" });
  }

  for (const w of (interview?.weaknesses || []).slice(0, 1)) {
    gaps.push({ text: w, detail: "From the AI interview", source: "interview", tab: "ai-interview" });
  }
  if (missingSkills.length) {
    gaps.push({
      text: `Missing skills: ${missingSkills.slice(0, 3).join(", ")}${missingSkills.length > 3 ? ` +${missingSkills.length - 3}` : ""}`,
      detail: "Asked for by the job, not found in the CV",
      source: "cv",
      tab: "ats-breakdown",
    });
  }

  for (const c of claimRows.filter((c) => c.verdict === "contradicted").slice(0, 2)) {
    watch.push({ text: `CV claim not backed by the test: ${c.label}`, detail: c.detail, source: "test", tab: "assessments" });
  }
  for (const g of (timelineGaps || []).filter((g) => g.months >= 3).slice(0, 1)) {
    watch.push({ text: `${g.months}-month gap in work history`, detail: `${monthLabel(g.from)} – ${monthLabel(g.to)}`, source: "cv", tab: "profile-cv" });
  }
  if (integrity && (integrity.band === "medium" || integrity.band === "high")) {
    watch.push({ text: `${integrity.band === "high" ? "High" : "Medium"} integrity risk on the test`, detail: `${integrity.events} event${integrity.events === 1 ? "" : "s"} recorded — each has an innocent reading`, source: "integrity", tab: "assessments" });
  }
  if (interview?.withheld) {
    const reason = interview.reason ? interview.reason[0].toUpperCase() + interview.reason.slice(1) : "No reliable score was produced";
    watch.push({ text: "AI interview needs your review", detail: reason, source: "interview", tab: "ai-interview" });
  }

  return { strengths: strengths.slice(0, 4), gaps: gaps.slice(0, 4), watch: watch.slice(0, 4) };
}
