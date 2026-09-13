import { ShieldCheck } from "lucide-react";
import { Card, Badge } from "../ui/Card.jsx";

function formatWhen(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// A3.5 — the skills-assessment leg of the pipeline, given its own section
// (separate from ATS Evaluation and the AI Report) so a recruiter reads it as
// its own instrument rather than as a subsection buried inside the interview
// record. Mirrors the PDF section: a skip renders as a recorded human
// decision, a live session as its status, and a result with full provenance.
const ASSESSMENT_VERDICT_META = {
  verified: { label: "Verified by assessment", tone: "green" },
  contradicted: { label: "Contradicted by assessment", tone: "red" },
  inconclusive: { label: "Inconclusive", tone: "amber" },
};
const ASSESSMENT_TIER_SOURCE = {
  claim_derived: "derived from résumé claims",
  recruiter_override: "set by the recruiter",
  paper_fixed: "fixed for this paper",
};

export default function AssessmentCard({ assessment, criterionLabels }) {
  if (!assessment) return null;
  const { decision, session } = assessment;
  const result = session?.result;
  // A recruiter must never be shown "c5: 1/3". The rubric has real labels; use them.
  const labelFor = (id) => criterionLabels?.[id] || id;
  return (
    <Card>
      <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <ShieldCheck className="h-4 w-4 text-brand-600" /> Skills assessment
      </h3>
      {decision?.action === "skipped" ? (
        <p className="mt-2 text-sm text-slate-600">
          Skipped by <strong>{decision.byName || "a recruiter"}</strong> on {formatWhen(decision.at)} — sent directly to the AI
          interview. A recorded human decision, not missing data.
        </p>
      ) : !session ? (
        <p className="mt-2 text-sm text-slate-500">An assessment decision was recorded but no session exists yet.</p>
      ) : (
        <>
          {session.difficultyTier && (
            <p className="mt-2 text-xs text-slate-500">
              Difficulty <strong className="uppercase">{session.difficultyTier.value}</strong> —{" "}
              {ASSESSMENT_TIER_SOURCE[session.difficultyTier.source] || session.difficultyTier.source}
              {session.difficultyTier.basis ? ` (${session.difficultyTier.basis})` : ""}
            </p>
          )}
          {!result ? (
            <p className="mt-2 text-sm text-slate-500">Status: {session.status}. No scored result yet.</p>
          ) : (
            <>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {result.totalCorrect}/{result.totalItems} items correct{" "}
                {result.completedBy === "expiry" && <Badge tone="amber">partial — closed by expiry</Badge>}
                {result.completedBy === "integrity_violation" && <Badge tone="amber">auto-submitted — integrity flags</Badge>}
              </p>
              <div className="mt-3 space-y-1.5">
                {(result.perCriterion || []).map((c) => (
                  <div key={c.criterionId} className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="text-slate-600">{labelFor(c.criterionId)}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-slate-800">
                      {c.correctCount}/{c.itemCount}
                    </span>
                  </div>
                ))}
              </div>
              {(result.claimVerdicts || []).length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                  {result.claimVerdicts.map((v) => {
                    const meta = ASSESSMENT_VERDICT_META[v.verdict] || ASSESSMENT_VERDICT_META.inconclusive;
                    return (
                      <p key={v.claimId} className="text-xs text-slate-500">
                        <Badge tone={meta.tone}>{meta.label}</Badge>{" "}
                        <span className="text-slate-600">{labelFor(v.criterionId)}</span> — {v.correctCount}/{v.itemCount} targeted
                        items
                      </p>
                    );
                  })}
                </div>
              )}
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                Scored {formatWhen(result.scoredAt)} · scorer {result.scorerVersion || "—"} · reproducibility{" "}
                {(result.reproducibilityHash || "").slice(0, 16)}… — computed deterministically by code from the frozen key; no AI in
                the scoring path.
              </p>
            </>
          )}
        </>
      )}
    </Card>
  );
}
