import { useState } from "react";
import {
  Eye,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ShieldCheck,
  ShieldAlert,
  ScanFace,
} from "lucide-react";
import { Card, Badge } from "../ui/Card.jsx";
import InstrumentScoreCard from "../recruitment-ai-report/InstrumentScoreCard.jsx";
import ProvenanceLine from "../recruitment-ai-report/ProvenanceLine.jsx";
import { BRAND_MARK } from "../recruitment-ai-report/marks.js";

export const RECOMMENDATION = {
  strong_hire: { label: "Strong Hire", tone: "green" },
  hire: { label: "Hire", tone: "green" },
  maybe: { label: "Maybe", tone: "amber" },
  no_hire: { label: "No Hire", tone: "red" },
};

export const RISK_BAND = {
  low: { label: "Low risk", tone: "green", ring: "text-emerald-600", bg: "bg-emerald-500" },
  medium: { label: "Medium risk", tone: "amber", ring: "text-amber-600", bg: "bg-amber-500" },
  high: { label: "High risk", tone: "red", ring: "text-red-600", bg: "bg-red-500" },
};

export const SEVERITY_TONE = { low: "slate", medium: "amber", high: "red" };

export function formatWhen(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ScoreBar({ label, value }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-500">{label}</span>
        <span className="font-semibold tabular-nums text-slate-800">
          {value != null ? `${value}/100` : "—"}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${value == null ? "bg-slate-200" : BRAND_MARK}`}
          style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }}
        />
      </div>
    </div>
  );
}

export function Figure({ label, value, basis, flag }) {
  return (
    <div className="min-w-0 lg:px-5 lg:first:pl-0">
      <dt className="text-[11px] font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1">
        <span className="font-display block text-2xl font-bold tabular-nums tracking-tight text-slate-900">
          {value}
        </span>
        {basis && <span className="mt-1 block text-[11px] leading-snug text-slate-500">{basis}</span>}
        {flag && (
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-verdict-pending-tint px-1.5 py-0.5 text-[10px] font-bold text-verdict-pending">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" /> {flag}
          </span>
        )}
      </dd>
    </div>
  );
}

export function IdentityRow({ identityMatch }) {
  const s = identityMatch?.status || "unknown";
  const map = {
    match: { icon: ShieldCheck, cls: "text-emerald-600", text: "Face matched the identity photo" },
    mismatch: { icon: ShieldAlert, cls: "text-red-600", text: "The face on camera didn't match their photo" },
    unknown: { icon: ScanFace, cls: "text-slate-500", text: "Identity not checked during the interview" },
  };
  const { icon: Icon, cls, text } = map[s] || map.unknown;
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <Icon className={`h-4 w-4 shrink-0 ${cls}`} /> {text}
      {identityMatch?.distance != null && (
        <span className="text-xs text-slate-500">(distance {identityMatch.distance})</span>
      )}
    </div>
  );
}

export function RecommendedActionCard({ action }) {
  if (!action) return null;
  if (action.suppressed) {
    return (
      <Card className="border-2 border-dashed border-verdict-pending/50 bg-verdict-pending-tint">
        <p className="text-xs font-medium text-verdict-pending">Recommendation withheld</p>
        <p className="mt-1 text-lg font-bold text-verdict-pending">{action.action}</p>
        <p className="mt-1 text-sm text-verdict-pending">{action.justification}</p>
      </Card>
    );
  }
  return (
    <Card className="relative overflow-hidden border-brand-200 bg-canvas-deep">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-brand-600" />
      <p className="text-[11px] font-semibold tracking-[0.08em] text-brand-700 uppercase">Recommended action</p>
      <p className="font-display mt-2 text-2xl font-extrabold tracking-[-0.02em] text-slate-900 text-balance sm:text-[1.75rem] sm:leading-[1.15]">
        {action.action}
      </p>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-600">{action.justification}</p>
    </Card>
  );
}

// A proctoring run that produced no risk reading used to default to `0` and to
// RISK_BAND.low — a black "0 / Risk" tile under a green "Low risk" badge, which
// is an exoneration assembled out of two missing fields. An unscored session
// says so; only a real number is shown as a number.
export function IntegrityCard({ proctoring, candidateId }) {
  const rawBand = proctoring?.displayRiskBand || proctoring?.riskBand;
  const band = RISK_BAND[rawBand] || null;
  const riskScore = proctoring?.displayRiskScore ?? proctoring?.riskScore ?? null;
  const bandBadge = proctoring?.bandWithheld ? (
    <Badge tone="slate">Band withheld</Badge>
  ) : band ? (
    <Badge tone={band.tone}>{band.label}</Badge>
  ) : (
    <Badge tone="slate">Risk not scored</Badge>
  );
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Eye className="h-4 w-4 text-brand-600" /> Integrity & Proctoring
        </h3>
        {bandBadge}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        {/* Left: Score Visual */}
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-gradient-to-b from-slate-50 to-white p-5 ring-1 ring-slate-100 lg:sticky lg:top-32 lg:self-start">
          <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl bg-slate-900 text-white">
            <span className={riskScore != null ? "text-3xl font-bold" : "text-2xl font-bold text-slate-400"}>
              {riskScore != null ? riskScore : "—"}
            </span>
            <span className="text-[10px] text-slate-300">Risk</span>
          </div>
          {bandBadge}
          {proctoring?.breakdown?.length > 0 && (
            <div className="mt-1 w-full space-y-1.5">
              {proctoring.breakdown.map((row) => (
                <div key={row.type} className="flex items-center gap-2 text-[11px]">
                  <span className="w-16 shrink-0 truncate text-slate-500" title={row.label}>
                    {row.label}
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className={`block h-full rounded-full ${
                        row.scored === false || row.attributedToFault
                          ? "bg-slate-300"
                          : row.severity === "high"
                            ? "bg-red-500"
                            : row.severity === "medium"
                              ? "bg-amber-500"
                              : "bg-slate-400"
                      }`}
                      style={{ width: `${Math.min(100, row.count * 20)}%` }}
                    />
                  </span>
                  <span className="w-4 shrink-0 text-right font-semibold tabular-nums text-slate-700">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Telemetry & Details */}
        <div className="min-w-0 space-y-3">
          {proctoring?.bandWithheldReason && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
              {proctoring.bandWithheldReason}
            </p>
          )}

          {proctoring?.identityGateNote && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              {proctoring.identityGateNote}
            </p>
          )}

          <IdentityRow identityMatch={proctoring?.identityMatch} />
          <div className="flex items-center gap-2 text-sm text-slate-600">
            {proctoring?.visionEnabled ? (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> Camera monitoring was active
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" /> Camera monitoring off — browser signals only
              </>
            )}
          </div>
          <div className="text-xs text-slate-500">
            {proctoring?.totalEvents || 0} flag{(proctoring?.totalEvents || 0) === 1 ? "" : "s"} recorded
            {proctoring?.consent?.given
              ? " · candidate consented"
              : proctoring?.consent?.declined
                ? " · candidate declined proctoring"
                : ""}
          </div>

          {proctoring?.breakdown?.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              {proctoring.collapsedNote && (
                <p className="mb-2 text-[11px] text-slate-500">{proctoring.collapsedNote}</p>
              )}
              <div className="divide-y divide-slate-100">
                {proctoring.breakdown.map((row) => (
                  <details key={row.type} className="group py-2">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
                      <Badge
                        tone={
                          row.scored === false || row.attributedToFault
                            ? "slate"
                            : SEVERITY_TONE[row.severity] || "slate"
                        }
                      >
                        {row.label} · {row.count}×
                      </Badge>
                      {row.scored === false && (
                        <span className="text-xs font-semibold text-slate-500">Not scored</span>
                      )}
                      {row.attributedToFault && (
                        <span className="text-xs font-semibold text-slate-500">
                          Attributed to the technical fault, not the candidate
                        </span>
                      )}
                      <ChevronDown
                        className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <p className="mt-1.5 pl-1 text-xs text-slate-500">
                      {row.benignExplanation || "No further detail recorded for this flag type."}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          )}

          {proctoring?.signals?.length > 0 && (!proctoring?.breakdown || proctoring.breakdown.length === 0) && (
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-700 mb-2">Recorded Signals</p>
              <div className="space-y-1.5">
                {proctoring.signals.map((sig, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 p-2 text-xs flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{sig.type || "Signal"}</span>
                    <span className="text-slate-600">{sig.message || sig.detail || "Recorded"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
            Worth a look, not proof — never on their own a reason to reject. The full advisory note is in the PDF.
          </p>
        </div>
      </div>
    </Card>
  );
}

export function CommunicationCompetencyCard({ interview, ev }) {
  const commScore = interview?.competencyTriplet?.communication;
  const delivery = ev?.delivery;
  const confidence = ev?.confidence;
  const spoken = ev?.spokenCommunication;

  if (commScore == null && delivery == null && confidence == null && !spoken) {
    return null;
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          Communication Competency & Delivery
        </h4>
        {commScore != null && (
          <Badge tone="brand">Competency: {commScore}/100</Badge>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {commScore != null && <ScoreBar label="Communication Competency" value={commScore} />}
        {delivery != null && <ScoreBar label="Delivery" value={delivery} />}
        {confidence != null && <ScoreBar label="Confidence" value={confidence} />}
      </div>
      {spoken?.justification && (
        <p className="mt-3 text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          &ldquo;{spoken.justification}&rdquo;
        </p>
      )}
      {spoken?.answersScored != null && (
        <p className="mt-2 text-xs text-slate-500">
          Derived across {spoken.answersScored} answered question{spoken.answersScored === 1 ? "" : "s"} from transcript language choice and structure — not accent, speech rate or volume.
        </p>
      )}
    </Card>
  );
}

export function EvaluationCard({ interview, ev, rec }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">Evaluation</h3>
        {rec && <Badge tone={rec.tone}>Recommendation: {rec.label}</Badge>}
      </div>

      {ev ? (
        <>
          {interview?.substance && (
            <p className="mt-3 text-sm font-medium text-slate-500">
              Answer segments meeting the word-count check: {interview.substance.responsiveCount} / {interview.substance.totalAnswers}
            </p>
          )}

          {ev.generatedBy === "fallback" && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              Deterministic fallback — every score below is a PLACEHOLDER from answer-completeness heuristics, not a real evaluation.
            </p>
          )}

          {/* The status only. The REASON is already the headline of the
              interview summary directly above this card (it renders first on
              every surface that shows this card), and printing it again here —
              then a third time as the summary paragraph below — told the
              recruiter the same sentence three times in one screen. */}
          {ev.reviewReason && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              Recommendation withheld. This interview needs human review before any decision.
            </p>
          )}

          {interview?.haltedBy && (
            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-xs font-bold text-red-800">
                Interview stopped automatically — our fault, not the candidate&apos;s
              </p>
              <p className="mt-1 text-xs text-red-700">
                The AI interviewer {interview.haltedBy.label || "went outside its approved script"}, so this
                interview was ended after {interview.haltedBy.questionsAsked ?? 0} question
                {interview.haltedBy.questionsAsked === 1 ? "" : "s"}. Nothing here is a measurement of this
                candidate, and this must not count against them.
              </p>
              {interview.haltedBy.utterance && (
                <p className="mt-1.5 rounded bg-white/60 px-2 py-1 text-xs italic text-red-900">
                  “{interview.haltedBy.utterance}”
                </p>
              )}
            </div>
          )}

          {interview?.abandoned && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs font-bold text-amber-800">This interview was never finished</p>
              <p className="mt-1 text-xs text-amber-900">
                The link expired after {interview.abandoned.questionsAsked ?? 0} question
                {interview.abandoned.questionsAsked === 1 ? "" : "s"} ({interview.abandoned.questionsAnswered ?? 0}{" "}
                answered). The figures below cover only what was answered.
              </p>
            </div>
          )}

          {interview?.integrityTerminated && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs font-bold text-amber-800">Auto-submitted — integrity flags</p>
              <p className="mt-1 text-xs text-amber-900">
                This interview was ended automatically after {interview.integrityTerminated.triggerCount ?? "repeated"}{" "}
                proctoring integrity flags. Review the flagged signals alongside the transcript.
              </p>
            </div>
          )}

          {typeof ev.questionsDeclined === "number" && ev.questionsDeclined > 0 && (
            <p className="mt-2 text-sm font-medium text-slate-500">
              Declined: {ev.questionsDeclined} of {ev.questionsAsked} question
              {ev.questionsAsked === 1 ? "" : "s"} — the candidate was asked and said they could not answer.
            </p>
          )}

          {/* Visualization: Overall Score + Competency Triplet */}
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-b from-slate-50 to-white p-5 ring-1 ring-slate-100">
              <div
                className={`flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl text-white ${
                  ev.generatedBy === "fallback" ? "bg-slate-400" : "bg-slate-900"
                }`}
              >
                <span className="text-3xl font-bold">{ev.overallScore ?? "—"}</span>
                <span className="text-[10px] text-slate-300">
                  {ev.generatedBy === "fallback" ? "Placeholder" : "Overall"}
                </span>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-3">
              {interview?.competencyTriplet ? (
                <div className="grid gap-3">
                  <ScoreBar label="Communication" value={interview.competencyTriplet.communication} />
                  <ScoreBar label="Technical" value={interview.competencyTriplet.technicalKnowledge} />
                  <ScoreBar label="Problem Solving" value={interview.competencyTriplet.problemSolving} />
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Communication / Technical / Problem solving:{" "}
                  {ev.generatedBy === "fallback"
                    ? "PLACEHOLDER — not a real evaluation."
                    : "not separately measured for this interview."}
                </p>
              )}
            </div>
          </div>

          {/* No second copy of `ev.summary`: <InterviewSummary> above prints it. */}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {ev.strengths?.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-slate-600">Strengths</p>
                <ul className="space-y-1">
                  {ev.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm text-slate-600">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {ev.weaknesses?.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-slate-600">Weaknesses</p>
                <ul className="space-y-1">
                  {ev.weaknesses.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm text-slate-600">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {ev.missingSkills?.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-slate-600">Skills to probe</p>
              <div className="flex flex-wrap gap-1.5">
                {ev.missingSkills.map((s) => (
                  <Badge key={s} tone="red">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          {(ev.delivery != null || ev.confidence != null) && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="mb-2 text-xs font-medium text-slate-600">
                Spoken communication — assessed for this role
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {ev.delivery != null && <ScoreBar label="Delivery" value={ev.delivery} />}
                {ev.confidence != null && <ScoreBar label="Confidence" value={ev.confidence} />}
              </div>
              {ev.spokenCommunication?.justification && (
                <p className="mt-1 text-xs text-slate-600 italic">
                  &ldquo;{ev.spokenCommunication.justification}&rdquo;
                </p>
              )}
            </div>
          )}

          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
            Computed by {ev.model || "automated evaluation"}
            {ev.promptVersion ? ` (${ev.promptVersion})` : ""}
            {ev.generatedAt ? ` · ${formatWhen(ev.generatedAt)}` : ""}
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Evaluation not available yet.</p>
      )}
    </Card>
  );
}

export function InstrumentScores({
  report,
  interview,
  ev,
  coverage,
  quality,
  id,
  only = "all",
  interviewReadable = true,
}) {
  const placeholder = ev?.generatedBy === "fallback";
  const notMeasurable = placeholder || quality?.degraded;
  const asked = ev?.questionsAsked ?? interview?.questionCount;
  const answered = ev?.questionsAnswered;
  const declined = ev?.questionsDeclined;
  // No `|| RISK_BAND.low` fallback: a proctoring record that never produced a
  // band is not a low-risk one, and this Figure is simply omitted instead.
  const band = report?.proctoring ? RISK_BAND[report.proctoring.displayRiskBand] || null : null;
  const assessResult = report?.assessment?.session?.result;
  const resumeEval = coverage?.resumeEvaluation;

  const showInterview = (only === "all" || only === "interview") && (report?.hasInterview || Boolean(interview)) && interviewReadable;
  const showResume = (only === "all" || only === "resume") && Boolean(resumeEval);
  const showAssessment = only === "all" && Boolean(assessResult);

  const nextProbes = (coverage?.buckets?.insufficient?.rows || [])
    .slice(0, 3)
    .map((r) => `Follow up on this unassessed requirement: ${r.label}. Request relevant evidence; do not treat missing assessment as a failure.`);

  const interviewTabs = [
    {
      key: "rec",
      label: "Recommendations",
      tone: "recommend",
      items: [
        interview?.recommendedAction
          ? `${interview.recommendedAction.action} — ${interview.recommendedAction.justification}`
          : null,
        ...nextProbes,
      ].filter(Boolean),
      empty: "No recommendation was produced for this interview.",
    },
    { key: "str", label: "Strengths", tone: "positive", items: ev?.strengths || [], empty: "None recorded." },
    {
      key: "gap",
      label: "Gaps",
      tone: "negative",
      items: [...(ev?.weaknesses || []), ...(ev?.missingSkills || []).map((m) => `Not evidenced: ${m}`)],
      empty: "None recorded.",
    },
  ];

  if (!showInterview && !showResume && !showAssessment) return null;

  return (
    <section id={id} aria-label="Scores" className="scroll-mt-32 space-y-6">
      {showInterview && (
        <InstrumentScoreCard
          title="AI interview"
          gauge={{
            value: notMeasurable ? null : ev?.overallScore,
            max: 100,
            display: notMeasurable ? "—" : ev?.overallScore ?? "—",
            verdict: interview?.verdictChip || null,
            caption: answered != null && asked != null ? `over ${answered} answered of ${asked} asked` : "not scored yet",
          }}
          narrative={notMeasurable ? null : ev?.summary}
          tabs={notMeasurable ? [] : interviewTabs}
          provenance={
            <ProvenanceLine
              basis="the interview"
              computedBy={ev?.summary ? "model" : undefined}
              details={[
                { label: "Scored", value: ev?.generatedAt ? formatWhen(ev.generatedAt) : null },
                { label: "Model", value: ev?.model },
                { label: "Prompt", value: ev?.promptVersion },
                { label: "Interviewer script", value: interview?.agentPromptVersion },
              ]}
            />
          }
          footer={
            <>
              {notMeasurable && (
                <p className="mb-3 flex items-start gap-2 rounded-xl border border-verdict-pending/30 bg-verdict-pending-tint px-3 py-2 text-xs font-semibold text-verdict-pending">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {placeholder
                    ? "Scoring didn't run. There's no result here yet."
                    : "The audio broke. This interview doesn't count."}
                </p>
              )}
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Figure
                  label="Answer segments"
                  value={answered != null && asked != null ? `${answered}/${asked}` : "—"}
                  basis={
                    declined
                      ? `${declined} declined — asked, could not answer`
                      : interview?.substance
                        ? `${interview.substance.responsiveCount} of ${interview.substance.totalAnswers} met the word-count check`
                        : "as asked in the interview"
                  }
                />
                {report?.proctoring?.bandWithheld ? (
                  <Figure label="Integrity" value="Withheld" basis="a technical fault on our side — detail below" />
                ) : band ? (
                  <Figure
                    label="Integrity"
                    value={band.label}
                    basis={
                      report.proctoring.totalEvents
                        ? `camera noticed ${report.proctoring.distinctFindings ?? report.proctoring.totalEvents} thing${(report.proctoring.distinctFindings ?? report.proctoring.totalEvents) === 1 ? "" : "s"} — worth a look, not proof`
                        : "nothing flagged"
                    }
                  />
                ) : null}
              </dl>
            </>
          }
        />
      )}
    </section>
  );
}
