import { useEffect, useState, useCallback } from "react";
import { useRef } from "react";
import { reviewReport } from "../lib/recruiterReview.js";
import { useParams, useSearchParams } from "react-router-dom";
import InterviewWorkspace, { InterviewSummary } from "../components/candidate/InterviewWorkspace.jsx";
import { Bot, Cpu, CheckCircle2, AlertTriangle, Download, Loader2, Mic, ShieldCheck, ShieldAlert, ScanFace, Eye, ChevronDown } from "lucide-react";
import api from "../api/client.js";
import { getSocket } from "../lib/socket.js";
import { Card, Badge, Skeleton, EmptyState } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { stageLabel, stageTone } from "../lib/pipeline.js";
import ReportBreadcrumb from "../components/report/ReportBreadcrumb.jsx";
import InstrumentScoreCard from "../components/recruitment-ai-report/InstrumentScoreCard.jsx";
import RubricAccordion from "../components/report/RubricAccordion.jsx";
import InsightPanel from "../components/recruitment-ai-report/InsightPanel.jsx";
import InterviewPlayback from "../components/report/InterviewPlayback.jsx";
import ProvenanceLine from "../components/recruitment-ai-report/ProvenanceLine.jsx";
// The single-series magnitude mark, shared with every other chart on the report
// so a competency bar and a score bar cannot end up two different blues.
import { BRAND_MARK } from "../components/recruitment-ai-report/marks.js";

// Temporary — flip to true to bring "Assessment Rubrics" back. Hidden 2026-09-01
// at the user's request while the probe-verdict "no verdict reached" gap
// (see backend/services/probeService.js assessVerdicts) is looked at.
const SHOW_RUBRIC_ACCORDION = false;

export const RECOMMENDATION = {
  strong_hire: { label: "Strong Hire", tone: "green" },
  hire: { label: "Hire", tone: "green" },
  maybe: { label: "Maybe", tone: "amber" },
  no_hire: { label: "No Hire", tone: "red" },
};

function formatWhen(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * A competency bar is a single-series MAGNITUDE mark, so it takes one ink hue —
 * not a green/amber/red band by threshold, which is what it used to do.
 *
 * That change is a product rule, not a palette preference. Colouring a 74 amber
 * and a 76 green asserts a global cutoff for "good", which is exactly the
 * generic prior CLAUDE.md forbids: nothing is scored against an abstract
 * standard, only against this role's approved rubric. The threshold was also
 * spending the reserved verdict channel on a raw sub-score, so a competency bar
 * out-shouted the actual hire/no-hire call three cards above it. The number is
 * printed beside the bar and says everything the colour was pretending to.
 */
export function ScoreBar({ label, value }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-500">{label}</span>
        <span className="font-semibold tabular-nums text-slate-800">{value != null ? `${value}/100` : "—"}</span>
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

// ---------------------------------------------------------------------------
// Performance summary — the report's opening section
// ---------------------------------------------------------------------------
//
// The report used to open with eleven stacked cards of prose and land the
// recruiter in "What we actually know" before they had a single number. This
// section answers "how did this go" in one screen — figures, then charts — and
// everything that was here before is intact behind the disclosure below it.
//
// The chart palette, the diverging-scale argument and the deuteranopia measurement
// that constrains it now live with the marks themselves — see
// components/report/marks.js. They moved when the rubric accordion started
// drawing the same verdicts this file does.

// Ordered positive → neutral → negative, which is both the diverging convention
// and the order a recruiter reads the bar in.
const EVIDENCE_SEGMENTS = [
  // `fill` is the chart mark + a one-step-darker edge ring; `swatch` is the
  // legend key that has to hold a white glyph at 9px. Same split as BUCKET_MARK.
  //
  // These fills used to be empty. `chart-positive` / `-neutral` / `-negative`
  // named tokens that index.css never declared, so Tailwind emitted no rule and
  // every segment of this bar was a transparent box with a faint outline. The
  // tokens are declared now (index.css § Chart marks) and the fills are solid,
  // which also collapses the old pastel-fill / saturated-swatch split: the
  // legend key and the segment it explains are finally the same colour.
  {
    key: "proven",
    label: "Proven",
    glyph: "✓",
    fill: "bg-chart-positive ring-1 ring-inset ring-emerald-700/50",
    swatch: "bg-chart-positive",
  },
  {
    key: "insufficient",
    label: "Not tested",
    glyph: "?",
    fill: "bg-chart-neutral ring-1 ring-inset ring-slate-500/50",
    swatch: "bg-chart-neutral",
  },
  {
    key: "failed",
    label: "Failed",
    glyph: "✗",
    fill: "bg-chart-negative ring-1 ring-inset ring-red-600/50",
    swatch: "bg-chart-negative",
  },
];

/**
 * One headline figure. `basis` is required in spirit for the same reason it is
 * required on <HeroStat>: a number this size is the most persuasive thing on the
 * page and does not get to be the least accountable. `flag` is where a degraded
 * or placeholder reading says so, in the tile, rather than in a footnote.
 *
 * These are borderless cells in a ruled strip, not bordered tiles. A bordered
 * tile inside <Card> is a nested card, and four of them across the top is the
 * hero-metric template — big number, small label, supporting stats — which is
 * the shape every dashboard reaches for and the reason this page read as generic
 * before the role map took the lead. The figures annotate the chart now; they do
 * not compete with it.
 */
function Figure({ label, value, basis, flag }) {
  return (
    // Gutters only at `lg`, where the cells actually sit side by side as a ruled
    // strip. Carrying `px-4 first:pl-0` down to the stacked layout indented every
    // cell except the first against the card's own left edge.
    <div className="min-w-0 lg:px-5 lg:first:pl-0">
      <dt className="text-[11px] font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1">
        <span className="font-display block text-2xl font-bold tabular-nums tracking-tight text-slate-900">{value}</span>
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

// ---------------------------------------------------------------------------
// The role map — the report's hero chart
// ---------------------------------------------------------------------------
//
// One bar per rubric criterion, width = that criterion's WEIGHT IN THE ROLE,
// sorted heaviest first, coloured by what the evidence supports. `coverage.rows`
// arrives from the backend already sorted by weight, so the ordering is the
// rubric's own and not a display choice.
//
// This is the chart the product exists to draw. Every competitor can render "78%
// match"; none can render "40% of what this role actually requires is the one
// thing we could not prove". The aggregate stack above it answers *how much* we
// know; this answers *what* we know, and about which requirement — which is the
// question a recruiter has to answer to a hiring manager, and the one an
// employer has to answer to a tribunal.
//
// The bars deliberately do NOT normalise to the widest criterion. Width is share
// of the rubric, so a 40% requirement fills 40% of the track and the empty
// remainder is the rest of the role. Normalising would make every role look
// equally concentrated and destroy the only comparison that matters.

/**
 * ---------------------------------------------------------------------------
 * The instrument cards
 * ---------------------------------------------------------------------------
 *
 * One card per evidence source — the interview, the CV, the skills assessment —
 * all rendered from the SAME component with different props. That sameness is
 * the point and it is what changed here: this section used to be a single
 * "Performance summary" card that folded the interview's score, the assessment's
 * item count and a coverage figure into one undifferentiated strip of tiles, so
 * "Interview score: 10" sat beside "0 of 10 testable" and read as a
 * contradiction rather than as two separate, both-true facts about two different
 * instruments.
 *
 * Side by side, in identical frames, the comparison a recruiter actually wants
 * is a glance: what did the paper promise, and what did the room show.
 *
 * WHAT DID *NOT* MOVE HERE. "What we could test" is a coverage figure spanning
 * all three legs, so it belongs to the role map and stays there (C3: coverage
 * and performance never fuse into one number). The degraded/placeholder strip
 * moved INTO the interview card rather than sitting above all three, because
 * rule 5 puts uncertainty on the measurement it qualifies — the CV's score is
 * not less trustworthy because the microphone failed.
 */
export function InstrumentScores({ report, interview, ev, coverage, quality, id, only = "all", interviewReadable = true }) {
  const placeholder = ev?.generatedBy === "fallback";
  // C2 — a figure the reader would have to be told to ignore is not rendered as a number.
  const notMeasurable = placeholder || quality?.degraded;
  const asked = ev?.questionsAsked ?? interview?.questionCount;
  const answered = ev?.questionsAnswered;
  const declined = ev?.questionsDeclined;
  const band = report.proctoring ? RISK_BAND[report.proctoring.displayRiskBand] || RISK_BAND.low : null;
  const assessResult = report.assessment?.session?.result;
  const resumeEval = coverage?.resumeEvaluation;

  // `interviewReadable` is the broken-session gate (C1/C2) and it is scoped to
  // the INTERVIEW card alone. It used to hide this whole section, which meant a
  // dead microphone also took the CV screening score off the page — and the CV
  // score is not less trustworthy because the audio path failed. The rule is
  // that a number the reader must be told to ignore should not be on screen;
  // that is a statement about which number, not about the page.
  //
  // `only` splits this template across the page rather than narrowing it. The
  // interview card is the page's headline and sits beside the rubric list, the
  // way the reference lays its result pages out; the CV and assessment cards are
  // the same template rendered lower down as their own sections. They are NOT
  // stacked beside the interview any more — three gauges in a row invited a
  // comparison between instruments that measure different things on different
  // scales, which is exactly the reading this report should not encourage.
  const showInterview = (only === "all" || only === "interview") && report.hasInterview && interviewReadable;
  const showResume = (only === "all" || only === "resume") && Boolean(resumeEval);
  // The skills paper has its own section further down with per-item detail, so a
  // second gauge for it here would be the same number twice.
  const showAssessment = only === "all" && Boolean(assessResult);

  // Forward-looking, and named. The reference deck's best idea on this card is
  // that a recommendation is an instruction to the next human — "explore B2C
  // sales experience", not "candidate is strong". Ours can go further because we
  // know exactly which requirements went untested, so the probes are generated
  // from the coverage gaps rather than from a model's impression.
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

  const resumeTabs = resumeEval
    ? [
        {
          key: "rec",
          label: "Recommendations",
          tone: "recommend",
          items: resumeEval.recommendations || [],
          empty: "Nothing outstanding to probe.",
        },
        {
          key: "str",
          label: "Strengths",
          tone: "positive",
          items: resumeEval.strengths || [],
          empty: "The CV satisfied no requirement outright.",
        },
        {
          key: "gap",
          label: "Gaps",
          tone: "negative",
          items: resumeEval.gaps || [],
          empty: "No requirement is unmentioned or contradicted.",
        },
      ]
    : [];

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
                {report.proctoring?.bandWithheld ? (
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

      {showResume && (
        <InstrumentScoreCard
          title="CV screening"
          gauge={{
            value: resumeEval.overallScore,
            max: 100,
            display: resumeEval.overallScore ?? "—",
            verdict: resumeEval.verdict,
            caption: "against this role's frozen rubric",
          }}
          narrative={resumeEval.narrative}
          tabs={resumeTabs}
          provenance={
            <ProvenanceLine
              basis="the CV"
              computedBy="code"
              details={[
                {
                  label: "Screened",
                  value: resumeEval.provenance?.scoredAt ? formatWhen(resumeEval.provenance.scoredAt) : null,
                },
                { label: "Rubric version", value: resumeEval.provenance?.rubricVersion },
                { label: "Scorer", value: resumeEval.provenance?.scorerVersion },
                {
                  label: "Reproducibility",
                  value: (resumeEval.provenance?.reproducibilityHash || "").slice(0, 16) || null,
                },
              ]}
            />
          }
        />
      )}

      {showAssessment && (
        <InstrumentScoreCard
          title="Skills assessment"
          gauge={{
            value: assessResult.totalItems ? (assessResult.totalCorrect / assessResult.totalItems) * 100 : null,
            max: 100,
            display: assessResult.totalItems
              ? `${Math.round((assessResult.totalCorrect / assessResult.totalItems) * 100)}%`
              : "—",
            // NO VERDICT CHIP, DELIBERATELY. There is no approved pass mark on a
            // skills paper, and inventing one would assert a global cutoff for
            // "good" — the exact thing this product refuses to do. `verdictFor`
            // returns null for this instrument for the same reason; the item
            // count below is a measurement rather than a judgement.
            verdict: null,
            caption: `${assessResult.totalCorrect} of ${assessResult.totalItems} items correct`,
          }}
          provenance={
            <ProvenanceLine
              basis="the assessment"
              computedBy="code"
              details={[
                { label: "Scored", value: assessResult.scoredAt ? formatWhen(assessResult.scoredAt) : null },
                { label: "Scorer", value: assessResult.scorerVersion },
                { label: "Reproducibility", value: (assessResult.reproducibilityHash || "").slice(0, 16) || null },
                {
                  label: "Closed by",
                  value:
                    assessResult.completedBy === "expiry"
                      ? "expiry — partial"
                      : assessResult.completedBy === "integrity_violation"
                        ? "auto-submit — integrity flags"
                        : "candidate submitted",
                },
              ]}
            />
          }
        />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Evidence coverage
// ---------------------------------------------------------------------------
// This used to also carry a "What we actually know" card that re-grouped the
// same `coverage` object by verdict bucket instead of by weight — a second,
// wordier read of the identical data the role map (above, on every report)
// already shows sorted, coloured and citation-backed. It was removed as
// confusing duplication; what it had that the role map didn't (the untested
// -cause sentence, the copy-to-clipboard hand-off) moved onto RoleMap itself,
// just above, rather than being lost.

// C1 — the finding as one plain sentence, then the actions. This is the whole above-fold:
// on a broken session no score, no bars and no risk band render until "Show me anyway", because
// a number the reader must be told to ignore should not be on screen at all (rule 5, applied
// harder than a caveat ever could). The old degraded-session banner and verdict banner both
// folded into this: their reasons render here, their defence copy lives in the detail and PDF.
// Can this record speak about the candidate at all?
//
// Defined ONCE, here, because it was previously written out twice — in Headline and again at the
// section gate — and both copies read `quality.degraded`, which is the wrong test. `degraded` is
// the broad "should this report carry a warning" flag, and the backend deliberately raises it on
// things that say nothing about whether we heard the candidate. Asking for a question to be
// repeated is the clearest case: it tracks accent, hearing and connection quality, so
// `audioUnreliableFrom` excludes it by name, and `computeVerdict` can still return ADVANCE.
//
// The result was a session the PDF headed "VERDICT: ADVANCE" while this screen said "This
// interview didn't work. Nothing here says anything about this candidate." One payload, one
// button, two opposite answers. `audioUnreliable` is the flag the verdict itself reads, so it is
// the flag this gate reads too.
//
// A degraded-but-heard session is NOT unreadable: it shows its figures with the recommendation
// withheld, which is exactly what `recommendedAction.suppressed` already carries.
function sessionUnreadable(interview, quality) {
  return Boolean(
    quality?.audioUnreliable ||
      interview?.haltedBy ||
      interview?.abandoned ||
      interview?.integrityTerminated
  );
}

function Headline({
  interview,
  quality,
  onResend,
  resending,
  onReschedule,
  rescheduling,
  rescheduleAt,
  onRescheduleAtChange,
  showAnyway,
  onToggleShowAnyway,
}) {
  const broken = sessionUnreadable(interview, quality);

  if (broken) {
    // The cause has to be the cause. This used to fall through to a hardcoded sentence about
    // audio for every non-halt, non-abandon case, so a session flagged for repeat requests was
    // reported as an audio failure — and since that flag leaves `degradedCount` at zero, it could
    // render "the audio failed on 0 of the 8 answers" directly above the bullets giving the real
    // reason. Prefer the engine's own words; only claim audio when audio is what went wrong.
    const cause = interview?.haltedBy
      ? "We stopped it — the AI interviewer went outside its approved script."
      : interview?.abandoned
        ? "The link expired before it was finished."
        : interview?.integrityTerminated
          ? "It was stopped automatically — the camera and device checks crossed a hard threshold."
          : quality?.degradedCount > 0
            ? `The audio failed on ${quality.degradedCount} of the ${quality?.total ?? ""} answers, so much of what they said was never recorded.`
            : quality?.reasons?.[0]
              ? `${quality.reasons[0][0].toUpperCase()}${quality.reasons[0].slice(1)}.`
              : "Too much of this session was never recorded to read anything from it.";
    return (
      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" /> This interview didn&apos;t work.
        </h2>
        <p className="mt-1.5 text-sm text-amber-900">{cause}</p>
        <p className="mt-1 text-sm font-semibold text-amber-900">Nothing here says anything about this candidate.</p>
        {quality?.reasons?.length > 0 && (
          <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs text-amber-800">
            {quality.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" loading={resending} onClick={onResend}>
            Send a new interview link
          </Button>
          <Button variant="outline" size="sm" onClick={onToggleShowAnyway}>
            {showAnyway ? "Hide the figures again" : "Show me anyway"}
          </Button>
        </div>

        {/* Resending issues a link that is good from now; rescheduling moves the
            interview to a stated time and tells the candidate when it is. They
            are different answers to "the link expired" and to "they could not
            make it", so both are offered rather than one standing in for the
            other. The server rejects a past time, so the input is floored at
            now — the rejection arrives before the request does. */}
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-amber-200 pt-3">
          <label className="text-xs font-semibold text-amber-900">
            Or set a new time
            <input
              type="datetime-local"
              value={rescheduleAt}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
              onChange={(event) => onRescheduleAtChange(event.target.value)}
              className="mt-1 block rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </label>
          <Button
            variant="outline"
            size="sm"
            loading={rescheduling}
            disabled={!rescheduleAt}
            onClick={onReschedule}
          >
            Reschedule &amp; notify
          </Button>
        </div>
      </div>
    );
  }

  // The opening "X proved N of M things this job wanted" summary was removed on
  // instruction — it read as boilerplate ahead of the actual evidence, which is
  // already the role map and the rubric list directly below. A working session
  // still needs its own caveat surfaced somewhere, so a degraded-but-readable one
  // keeps its warning; only the narrative sentence itself is gone.
  if (!quality?.degraded || !quality?.reasons?.length) return null;

  return (
    <Card>
      {/* Readable, but flagged. These sessions used to be hidden behind "This interview didn't
          work" — which overstated it — and now show their evidence with the caveat attached and
          the recommendation withheld (RecommendedActionCard renders the suppression). Rule 5:
          uncertainty is visible wherever the measurement is. */}
      <p className="text-sm font-semibold text-amber-900">Read this with a caveat — the recommendation is withheld.</p>
      <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-amber-800">
        {quality.reasons.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
    </Card>
  );
}

// One cell per answer, in order. Height = answer score; a marked cell is a turn
// whose audio signature was degraded. This is the view that makes "eight
// near-silent answers in a row" visible at a glance instead of averaged away.
// Every label here describes the RECORDING, not the candidate. "very low delivery" used to sit
// in this list and it read as a verdict on the person; what it actually meant was that almost no
// audio came through. `low_delivery` is kept as a key so sessions recorded before the rename
// still render a label instead of a raw flag name.
const TURN_FLAG_LABEL = {
  stalled: "long recording, almost no words",
  mostly_silence: "mostly silence",
  unusable_audio: "audio too poor to assess",
  low_delivery: "audio too poor to assess",
  asked_to_repeat: "asked for the question again",
  connection_dropped: "connection dropped — part of this answer was never recorded",
};

export const RISK_BAND = {
  low: { label: "Low risk", tone: "green", ring: "text-emerald-600", bg: "bg-emerald-500" },
  medium: { label: "Medium risk", tone: "amber", ring: "text-amber-600", bg: "bg-amber-500" },
  high: { label: "High risk", tone: "red", ring: "text-red-600", bg: "bg-red-500" },
};
export const SEVERITY_TONE = { low: "slate", medium: "amber", high: "red" };

// §5: explicit action verb + one-line justification — the report's final word.
export function RecommendedActionCard({ action }) {
  if (!action) return null;
  // A withheld recommendation must not wear the same confident styling as a real
  // one — the point is that the signal was too poor to make the call.
  if (action.suppressed) {
    return (
      <Card className="border-2 border-dashed border-verdict-pending/50 bg-verdict-pending-tint">
        <p className="text-xs font-medium text-verdict-pending">Recommendation withheld</p>
        <p className="mt-1 text-lg font-bold text-verdict-pending">{action.action}</p>
        <p className="mt-1 text-sm text-verdict-pending">{action.justification}</p>
      </Card>
    );
  }
  // A ledger entry, not a slab.
  //
  // This was a full-bleed dark petrol gradient, and once the charts went pastel
  // it was the only heavy dark object left on a page of warm paper — it out-shouted
  // the verdict banner at the top, which is the actual headline call, and it read
  // as a component borrowed from a different product.
  //
  // Emphasis now comes from weight, size and space, which is what the craft floor
  // asks for and what the Evidence Ledger north star implies: the report's final
  // word should look STAMPED on the record rather than pasted over it. A greige
  // ground separates it from the white cards around it, a 3px petrol rule across
  // the top is the ledger mark, and the action itself carries display weight.
  //
  // The rule is on the TOP edge deliberately. A coloured left border above 1px is
  // the callout cliché the floor bans; a top rule is a different device and reads
  // as an underscore on a record.
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
      {identityMatch?.distance != null && <span className="text-xs text-slate-500">(distance {identityMatch.distance})</span>}
    </div>
  );
}

// Two columns: the risk visualization on the left, everything a reviewer reads
// — identity, consent, the flag breakdown and the recording — on the right.
// The breakdown rows are `<details>` disclosures rather than a flat list, so a
// row's explanation is there on demand instead of crowding the summary line.
export function IntegrityCard({ proctoring, candidateId }) {
  const band = RISK_BAND[proctoring.displayRiskBand] || RISK_BAND.low;
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Eye className="h-4 w-4 text-brand-600" /> Integrity & Proctoring
        </h3>
        {/* B1: no band over a broken recording — a risk level computed while our own pipeline
            was failing is not a measurement of the candidate. */}
        {proctoring.bandWithheld ? <Badge tone="slate">Band withheld</Badge> : <Badge tone={band.tone}>{band.label}</Badge>}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        {/* ---- Left: the visualization -------------------------------------- */}
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-gradient-to-b from-slate-50 to-white p-5 ring-1 ring-slate-100 lg:sticky lg:top-32 lg:self-start">
          <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl bg-slate-900 text-white">
            <span className="text-3xl font-bold">{proctoring.displayRiskScore ?? 0}</span>
            <span className="text-[10px] text-slate-300">Risk</span>
          </div>
          {proctoring.bandWithheld ? (
            <Badge tone="slate">Band withheld</Badge>
          ) : (
            <Badge tone={band.tone}>{band.label}</Badge>
          )}
          {proctoring.breakdown?.length > 0 && (
            <div className="mt-1 w-full space-y-1.5">
              {proctoring.breakdown.map((row) => (
                <div key={row.type} className="flex items-center gap-2 text-[11px]">
                  <span className="w-16 shrink-0 truncate text-slate-500" title={row.label}>{row.label}</span>
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
                  <span className="w-4 shrink-0 text-right font-semibold tabular-nums text-slate-700">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---- Right: the text and the dropdown detail ---------------------- */}
        <div className="min-w-0 space-y-3">
          {proctoring.bandWithheldReason && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">{proctoring.bandWithheldReason}</p>
          )}

          {proctoring.identityGateNote && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">{proctoring.identityGateNote}</p>
          )}

          <IdentityRow identityMatch={proctoring.identityMatch} />
          <div className="flex items-center gap-2 text-sm text-slate-600">
            {proctoring.visionEnabled ? (
              <><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> Camera monitoring was active</>
            ) : (
              <><AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" /> Camera monitoring off — browser signals only</>
            )}
          </div>
          <div className="text-xs text-slate-500">
            {proctoring.totalEvents} flag{proctoring.totalEvents === 1 ? "" : "s"} recorded
            {proctoring.consent?.given ? " · candidate consented" : proctoring.consent?.declined ? " · candidate declined proctoring" : ""}
          </div>

          {proctoring.breakdown?.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              {/* §10.4 — the collapse is labelled: a count that silently shrinks between two
                  viewings of the same session reads as tampering in an audit. */}
              {proctoring.collapsedNote && <p className="mb-2 text-[11px] text-slate-500">{proctoring.collapsedNote}</p>}
              <div className="divide-y divide-slate-100">
                {proctoring.breakdown.map((row) => (
                  <details key={row.type} className="group py-2">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
                      {/* Recording-condition rows are shown but visually demoted and explicitly marked
                          unscored. They must appear — "we could not see" rendered as silence reads as
                          "nothing happened" — but they are not findings about the candidate. */}
                      <Badge tone={row.scored === false || row.attributedToFault ? "slate" : SEVERITY_TONE[row.severity] || "slate"}>
                        {row.label} · {row.count}×
                      </Badge>
                      {row.scored === false && (
                        <span className="text-xs font-semibold text-slate-500">Not scored</span>
                      )}
                      {row.attributedToFault && (
                        <span className="text-xs font-semibold text-slate-500">Attributed to the technical fault, not the candidate</span>
                      )}
                      <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <p className="mt-1.5 pl-1 text-xs text-slate-500">
                      {row.benignExplanation || "No further detail recorded for this flag type."}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* Keep recording playback beside the transcript in one shared section. */}
          <a href="#sec-playback" className="mt-4 inline-flex text-sm font-semibold text-brand-700 underline">View interview recording</a>

          <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
            Worth a look, not proof — never on their own a reason to reject. The full advisory note is in the PDF.
          </p>
        </div>
      </div>
    </Card>
  );
}

// The full evaluation — every number with the sentence that qualifies it.
// It used to live behind the single "See the detailed report" expander along
// with claim verification, the assessment, integrity and the transcript. That
// expander is gone: all five are now their own section, each reachable from the
// rail, each carrying its own figure there. The markup here is unchanged.
export function EvaluationCard({ interview, ev, rec }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">Evaluation</h3>
        {rec && <Badge tone={rec.tone}>Recommendation: {rec.label}</Badge>}
      </div>

      {ev ? (
        <>
          {interview.substance && (
            <p className="mt-3 text-sm font-medium text-slate-500">
              Answer segments meeting the word-count check: {interview.substance.responsiveCount} / {interview.substance.totalAnswers}
            </p>
          )}

          {ev.generatedBy === "fallback" && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              Deterministic fallback — every score below is a PLACEHOLDER from answer-completeness heuristics, not a real evaluation.
            </p>
          )}

          {/* What the score is a score OF.
              An overall of 72 over eight answered questions and an overall of 72 over two
              answered and six declined are entirely different findings, and the number
              alone cannot tell them apart. The count travels with the score so a reviewer
              cannot read one without the other — and `reviewReason` states, in code's
              words rather than the model's, why an automated recommendation was withheld
              (the candidate ended the interview early, or declined most of it). */}
          {ev.reviewReason && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              Recommendation withheld — {ev.reviewReason}. This interview needs human review before any decision.
            </p>
          )}

          {/* The interviewer went off-script and we stopped the interview. Shown above
              everything else and in the strongest available tone, because the single most
              likely misreading of a short transcript is "this candidate gave up" — and the
              truth is the opposite. The offending sentence is quoted verbatim: a reviewer
              deciding what to do about this needs to see what was actually said, not a
              rule name. */}
          {interview.haltedBy && (
            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-xs font-bold text-red-800">
                Interview stopped automatically — our fault, not the candidate&apos;s
              </p>
              <p className="mt-1 text-xs text-red-700">
                The AI interviewer {interview.haltedBy.label || "went outside its approved script"}, so this
                interview was ended after {interview.haltedBy.questionsAsked ?? 0} question
                {interview.haltedBy.questionsAsked === 1 ? "" : "s"}. Nothing here is a measurement of this
                candidate, and this must not count against them. Please contact them directly about next steps.
              </p>
              {interview.haltedBy.utterance && (
                <p className="mt-1.5 rounded bg-white/60 px-2 py-1 text-xs italic text-red-900">
                  “{interview.haltedBy.utterance}”
                </p>
              )}
            </div>
          )}

          {/* The interview was left unfinished and its link expired. Stated in the same place
              and for the same reason as the halt banner: a short transcript with no explanation
              reads exactly like someone who gave up, and this record cannot say that — a broken
              voice pipeline and a candidate walking away leave the identical trace. */}
          {interview.abandoned && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs font-bold text-amber-800">This interview was never finished</p>
              <p className="mt-1 text-xs text-amber-900">
                The link expired after {interview.abandoned.questionsAsked ?? 0} question
                {interview.abandoned.questionsAsked === 1 ? "" : "s"} ({interview.abandoned.questionsAnswered ?? 0}{" "}
                answered). The figures below cover only what was answered — whether the candidate stopped or a
                technical problem stopped them is not knowable from this record, so it must not count against them.
                You can re-issue the interview link from the candidate&apos;s page; their answers so far are kept.
              </p>
            </div>
          )}

          {/* The candidate's OWN proctoring signals (camera/identity/device) crossed a hard
              threshold and the session was ended automatically. Amber, not red — unlike the halt
              banner above, this is not "our fault", but it's also not the abandoned banner's
              "must not count against them" framing either: this may genuinely be conduct-relevant,
              so it's stated neutrally and routed to review rather than pre-judged either way. */}
          {interview.integrityTerminated && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs font-bold text-amber-800">Auto-submitted — integrity flags</p>
              <p className="mt-1 text-xs text-amber-900">
                This interview was ended automatically after {interview.integrityTerminated.triggerCount ?? "repeated"}{" "}
                proctoring integrity flags, at {interview.integrityTerminated.questionsAsked ?? 0} question
                {interview.integrityTerminated.questionsAsked === 1 ? "" : "s"} (
                {interview.integrityTerminated.questionsAnswered ?? 0} answered). The figures below cover only what was
                answered. Review the flagged signals alongside the transcript before making any decision.
              </p>
            </div>
          )}

          {/* Off-script speech that did not warrant stopping the interview — an invented
              question, or feedback given to the candidate's face. Not a halt, but a real
              finding: an unapproved question means this candidate did not sit quite the same
              instrument as everyone else. */}
          {interview.guardrailHits?.length > 0 && !interview.haltedBy && (
            <details className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <summary className="cursor-pointer text-xs font-semibold text-amber-800">
                {interview.guardrailHits.length} interviewer utterance
                {interview.guardrailHits.length === 1 ? "" : "s"} flagged as off-script
              </summary>
              <ul className="mt-2 space-y-1.5">
                {interview.guardrailHits.map((h, i) => (
                  <li key={i} className="text-xs text-amber-900">
                    <span className="font-semibold">{h.label || h.ruleId}</span>
                    {h.utterance && <span className="italic"> — “{h.utterance}”</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {typeof ev.questionsDeclined === "number" && ev.questionsDeclined > 0 && (
            <p className="mt-2 text-sm font-medium text-slate-500">
              Declined: {ev.questionsDeclined} of {ev.questionsAsked} question
              {ev.questionsAsked === 1 ? "" : "s"} — the candidate was asked and said they could not answer.
              Scores below cover only the {ev.questionsAnswered} answered.
            </p>
          )}

          {/* Equal left/right split — same pattern as the Integrity card: a
              visualization on the left, its supporting figures on the right,
              each given half the card rather than a fixed-size box crowded by
              a wide flex-1 sibling. */}
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-b from-slate-50 to-white p-5 ring-1 ring-slate-100">
              <div className={`flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl text-white ${ev.generatedBy === "fallback" ? "bg-slate-400" : "bg-slate-900"}`}>
                <span className="text-3xl font-bold">{ev.overallScore ?? "—"}</span>
                <span className="text-[10px] text-slate-300">{ev.generatedBy === "fallback" ? "Placeholder" : "Overall"}</span>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-3">
              {interview.competencyTriplet ? (
                <div className="grid gap-3">
                  <ScoreBar label="Communication" value={interview.competencyTriplet.communication} />
                  <ScoreBar label="Technical" value={interview.competencyTriplet.technicalKnowledge} />
                  <ScoreBar label="Problem Solving" value={interview.competencyTriplet.problemSolving} />
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Communication / Technical / Problem solving:{" "}
                  {ev.generatedBy === "fallback" ? "PLACEHOLDER — not a real evaluation." : "not separately measured for this interview."}
                </p>
              )}
            </div>
          </div>

          {ev.summary && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{ev.summary}</p>}

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

          {/* Spoken communication. Present only when this role's approved rubric declared
              that it is assessed AND a human wrote down why — the justification is shown
              here, next to the number, because a score whose job-relatedness lives on
              another screen is a score nobody checks the basis of.

              These bars existed before and were removed: they were computed from pace,
              filler rate and hesitation, which are accent, nervousness and speech-difference
              proxies. The names came back; the inputs did not. Both are now derived from the
              transcript alone (backend/utils/communication.js). */}
          {(ev.delivery != null || ev.confidence != null) && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="mb-2 text-xs font-medium text-slate-600">
                Spoken communication — assessed for this role
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {ev.delivery != null && <ScoreBar label="Delivery" value={ev.delivery} />}
                {ev.confidence != null && <ScoreBar label="Confidence" value={ev.confidence} />}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {ev.spokenCommunication?.answersScored != null && (
                  <> Over {ev.spokenCommunication.answersScored} answer
                    {ev.spokenCommunication.answersScored === 1 ? "" : "s"}.</>
                )}
                {" "}Derived from language choice and structure — not accent, speech rate or volume.
              </p>
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
            {interview.startedAt ? ` · interview ${formatWhen(interview.startedAt)}` : ""}
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Evaluation not available yet.</p>
      )}
    </Card>
  );
}

export default function InterviewReport({ candidateId: propCandidateId, hideBreadcrumbs = false }) {
  const { id: paramId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const id = propCandidateId || paramId || searchParams.get("candidateId");
  const toast = useToast();
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  // C1/C2 — a broken session hides every figure until explicitly asked for.
  const [showAnyway, setShowAnyway] = useState(false);
  const [resending, setResending] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleAt, setRescheduleAt] = useState("");
  // §3.1 — null means "latest", which is also what the backend defaults to when no attempt is
  // given. Kept as local state rather than a URL param: this is a recruiter glancing between a
  // candidate's attempts on one visit, not a link anyone needs to bookmark.
  const parsedAttempt = Number(searchParams.get("attempt"));
  const selectedAttempt = Number.isInteger(parsedAttempt) && parsedAttempt > 0 ? parsedAttempt : null;
  const setSelectedAttempt = (attempt) => setSearchParams(current => { const next = new URLSearchParams(current); if (attempt) next.set("attempt", attempt); else next.delete("attempt"); return next; });

  const requestVersion = useRef(0);
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const res = await api.get(`/candidates/${id}/interview-report`, { params: { attempt: selectedAttempt || undefined } });
      if (version !== requestVersion.current) return;
      setReport(reviewReport(res.data));
      setError("");
    } catch (err) {
      if (version === requestVersion.current) setError(err.response?.data?.error || "Could not load the interview report.");
    }
  }, [id, selectedAttempt]);

  useEffect(() => {
    setReport(null);
    setError("");
    setShowAnyway(false);
    load();
    return () => { requestVersion.current += 1; };
  }, [load]);

  // Live-refresh if the candidate's stage changes elsewhere.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function onStage(payload) {
      if (payload?.candidateId === id) load();
    }
    socket.on("candidate:stage", onStage);
    return () => socket.off("candidate:stage", onStage);
  }, [id, load]);

  async function downloadPdf() {
    setDownloading(true);
    try {
      const res = await api.get(`/candidates/${id}/interview-report/pdf`, {
        responseType: "blob",
        params: { attempt: selectedAttempt || undefined },
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const slug = (report?.candidate?.name || "candidate").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "candidate";
      const a = document.createElement("a");
      a.href = url;
      a.download = `interview-report-${slug}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not generate the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  // The C1 recovery action — same endpoint the candidate page uses; the interview
  // resumes where it stopped (transcript kept), so resending costs the candidate nothing.
  async function resendLink() {
    setResending(true);
    try {
      await api.post(`/interview-sessions/candidate/${id}/resend`, {});
      toast.success("A fresh interview link is on its way to the candidate.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not resend the interview link");
    } finally {
      setResending(false);
    }
  }

  // Moving the interview to a stated time. The server may decide the previous
  // attempt is unusable and start a fresh one — that changes what the candidate
  // is walked through, so it is reported rather than folded into "rescheduled".
  async function rescheduleInterview() {
    if (!rescheduleAt) return;
    setRescheduling(true);
    try {
      const { data } = await api.post(`/interview-sessions/candidate/${id}/reschedule`, {
        interviewAt: new Date(rescheduleAt).toISOString(),
      });
      toast.success(
        data?.freshStart
          ? "Rescheduled — the candidate starts a new attempt and a link is on its way."
          : "Rescheduled — a new link is on its way to the candidate."
      );
      setRescheduleAt("");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not reschedule the interview");
    } finally {
      setRescheduling(false);
    }
  }

  if (!report) {
    return (
      <div className="space-y-4">
        {error ? (
          <Card role="alert" className="text-center text-sm font-medium text-red-600">{error}<Button variant="outline" onClick={load}>Retry report</Button></Card>
        ) : (
          <>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-48 w-full" />
          </>
        )}
      </div>
    );
  }

  const { candidate, job, interview, stage, decisionTrail, coverage } = report;
  const ev = interview?.evaluation;
  const rec = ev?.recommendation ? RECOMMENDATION[ev.recommendation] : null;
  const quality = interview?.sessionQuality;

  const hasInterviewSections = report.hasInterview;
  const broken = sessionUnreadable(interview, quality);
  const figuresVisible = !broken || showAnyway;
  // The two rated panels. `communication` arrives already null when the role's
  // rubric never declared it assesses how someone communicates — that gate runs
  // at finalisation, so it cannot be re-opened from here.
  const insights = interview?.insights;

  return (
    <div className="space-y-6">
      {error && <Card role="alert">{error} Showing the previously loaded report. <Button variant="outline" onClick={load}>Retry report</Button></Card>}
      {!hideBreadcrumbs && (
        <ReportBreadcrumb
          candidateId={id}
          candidateName={candidate?.name}
          title={report.hasInterview ? "AI interview report" : "Candidate report"}
          at={interview?.completedAt ? formatWhen(interview.completedAt) : null}
        />
      )}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-[-0.025em] text-slate-900 [overflow-wrap:anywhere]">
              <Cpu className="h-5 w-5 text-brand-600" /> AI Interview Report
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {candidate?.name} · <span className="font-medium text-slate-700">{job?.title || <span className="italic">No role on file</span>}</span>
            </p>
            {decisionTrail && (
              <p className="mt-1 text-xs text-slate-500">
                Moved to &ldquo;{decisionTrail.stageLabel}&rdquo; by {decisionTrail.by || "system"} · {formatWhen(decisionTrail.at)}
                {decisionTrail.note ? ` — ${decisionTrail.note}` : ""}
              </p>
            )}
            {/* §3.1 — a redo no longer overwrites the first attempt's report; this is how a
                recruiter reaches it once there's more than one.

                AND IT IS STATED, NOT MERELY AVAILABLE. The market leader we tore down charges
                candidates per answer retake and tells them, in writing, that the employer "will
                not be shown the number of retakes" — so the buyer believes they are reading a
                live interview when they are reading a paid, rehearsed, multi-take edit. Our
                answer is the opposite and it costs one sentence: how many attempts there were,
                on the report, before the score. */}
            {report.attempts?.length > 1 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                  Attempt {interview?.attempt ?? report.attempts[report.attempts.length - 1].attempt} of {report.attempts.length}
                </span>
                <label htmlFor="attempt-select" className="sr-only">
                  Attempt
                </label>
                <select
                  id="attempt-select"
                  value={interview?.attempt ?? report.attempts[report.attempts.length - 1].attempt}
                  onChange={(e) => setSelectedAttempt(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
                >
                  {report.attempts.map((a) => (
                    <option key={a.attempt} value={a.attempt}>
                      Attempt {a.attempt} — {a.status}
                      {a.completedAt ? ` (${formatWhen(a.completedAt)})` : ""}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500">Every attempt is kept and readable — none is overwritten.</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={stageTone(stage)}>{stageLabel(stage)}</Badge>
            {interview?.engine === "fallback" && (
              <Badge tone="amber">
                <AlertTriangle className="mr-1 h-3 w-3" /> Fallback engine — placeholder scores
              </Badge>
            )}
            {interview?.status && <Badge tone={interview.status === "completed" ? "green" : "slate"}>{interview.status.replaceAll("_", " ")}</Badge>}
            {interview?.modality === "voice" && (
              <Badge tone="brand">
                <Mic className="mr-1 h-3 w-3" /> Voice
              </Badge>
            )}
            {report.hasInterview && (
              <Button variant="outline" size="sm" loading={downloading} onClick={downloadPdf}>
                <Download className="h-3.5 w-3.5" /> Download PDF
              </Button>
            )}
          </div>
        </div>

        {interview?.recruiterReview?.eligible && <p className="mt-3 text-sm text-slate-700">{interview.recruiterReview.required ? "Recruiter evidence review is pending." : "Recruiter evidence review is recorded."} <a href="#sec-review" className="font-medium text-brand-700 underline">Read evidence and review note</a></p>}
        {/* §4: identity + duration flags surfaced immediately, not buried in Integrity */}
        {report.hasInterview && (
          <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3">
            <IdentityRow identityMatch={report.proctoring?.identityMatch} />
            {interview?.durationFlag?.abnormallyShort && (
              <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0" /> Abnormally short session — averaging {interview.durationFlag.secondsPerQuestion}s/question
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="min-w-0 space-y-6">
          {/* C1 — the finding leads. One sentence, then the actions; figures come after,
              and on a broken session not at all (until asked for). */}
          <div id="sec-summary" className="scroll-mt-32 space-y-6">
            {/* Gated on the SCOPE, not just on there being an interview. Every
                sentence this headline can produce is about the interview ("they
                ended it early", "the audio broke", "we couldn't test any of
                the N things this job needs in this interview"), so under a
                CV-only reading it would be answering a question the reader did
                not ask. The CV card carries its own narrative instead. */}
            {hasInterviewSections && interview?.status !== "in_progress" && (
              <Headline
                interview={interview}
                quality={quality}
                onResend={resendLink}
                resending={resending}
                onReschedule={rescheduleInterview}
                rescheduling={rescheduling}
                rescheduleAt={rescheduleAt}
                onRescheduleAtChange={setRescheduleAt}
                showAnyway={showAnyway}
                onToggleShowAnyway={() => setShowAnyway((v) => !v)}
              />
            )}

            {/* A live interview is not a report yet. Said outright, because the figures below are
                legitimately blank right now and a blank rendered without this sentence reads as
                "a finished interview found nothing" — which is a claim, and a false one. */}
            {interview?.status === "in_progress" && (
              <Card>
                <p className="flex items-start gap-2 text-sm text-slate-600">
                  <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-brand-600" aria-hidden="true" />
                  <span>
                    <span className="font-semibold text-slate-900">This interview is still open.</span> The candidate
                    has answered {interview?.substance?.totalAnswers ?? 0} question
                    {(interview?.substance?.totalAnswers ?? 0) === 1 ? "" : "s"} so far. Scores, verdicts and the
                    requirement map fill in once it finishes — nothing below is a result yet.
                  </span>
                </p>
              </Card>
            )}

          </div>

          {/* ---- The headline pair ----------------------------------------- */}
          {/* The score and the rubric list, side by side — the reference's best
              structural idea and the one worth taking wholesale. The gauge alone
              answers "how did they do"; the rubric list answers "at what", and a
              reader who has to scroll between the two ends up carrying one of
              them in their head.

              On a broken session the interview figures are not rendered at all
              until "Show me anyway" — a number the reader must be told to ignore
              should not be on screen. Same predicate as the Headline's, from one
              function, so the two cannot drift apart or away from the verdict the
              PDF prints. */}
          {/* Assessment Rubrics temporarily hidden — SHOW_RUBRIC_ACCORDION toggles
              it back on. Coverage data and the component are untouched; only the
              render is skipped, so re-enabling is a one-line flip. */}
          <div className={SHOW_RUBRIC_ACCORDION ? "grid gap-6 xl:grid-cols-2 xl:items-start" : "grid gap-6"}>
            {ev?.overallScore == null || ev?.generatedBy === "fallback" || quality?.degraded ? <InterviewSummary interview={interview} /> : <InstrumentScores
              id="sec-scores"
              only="interview"
              report={report}
              interview={interview}
              ev={ev}
              coverage={coverage}
              quality={quality}
              interviewReadable={figuresVisible}
            />}

            {SHOW_RUBRIC_ACCORDION && coverage?.rows?.length > 0 && (
              <RubricAccordion
                id="sec-requirements"
                coverage={coverage}
                provenance={
                  <ProvenanceLine
                    basis="the AI interview transcript"
                    computedBy="code"
                    details={[
                      { label: "Rubric version", value: coverage.rubricVersion },
                      { label: "Screened", value: coverage.screenedAt ? formatWhen(coverage.screenedAt) : null },
                    ]}
                  />
                }
              />
            )}
          </div>

          {hasInterviewSections && <InterviewWorkspace key={`${id}:${interview.attempt}`} candidateId={id} interview={interview} onReload={load} onRecorded={(review) => setReport(current => ({ ...current, interview: { ...current.interview, recruiterReview: review } }))} />}
          {figuresVisible && hasInterviewSections && ev?.overallScore != null && <RecommendedActionCard action={interview.recommendedAction} />}

          {/* ---- The two rated panels -------------------------------------- */}
          {/* Radar on the left, expandable ratings on the right. Every star was computed in
              code from observations the model had to quote and that were then
              checked against the transcript, so a row opens onto the candidate's
              own words rather than onto a paragraph restating the rating.
              See backend/utils/interviewInsights.js. */}
          {figuresVisible && hasInterviewSections && insights?.communication && (
            <InsightPanel
              id="sec-communication"
              title="Communication Skills"
              axes={insights?.communication}
              // Communication scoring is always on as of 2026-09-01 (backend/utils/communication.js
              // isEnabled, interviewInsights.js communicationEnabled) — no rubric declaration and no
              // candidate exclusion can turn it off any more. The two "not assessed" messages below
              // only ever fire for interviews scored BEFORE that change, whose stored evaluation
              // still carries the old gate's null/reason.
              unavailable={
                !insights
                  ? "Not available — this interview has no scored answers to compute insights from."
                  : !insights.communication
                    ? insights.communicationReason === "excluded_at_candidate_request"
                      ? "Not assessed at the time — this candidate's exclusion request was honoured under the rules in effect for this older interview."
                      : "Not assessed at the time — this role's rubric hadn't declared it under the rules in effect for this older interview."
                    : null
              }
              note="Scored from the transcript only — never from pace, hesitation or accent. Grammar is counted only where the transcription was reliable enough to attribute to the candidate rather than to the transcriber."
            />
          )}

          {!report.hasInterview && (
            <Card>
              <EmptyState icon={Bot} title="No interview yet" description="This page fills in when it's done." />
            </Card>
          )}

          {/* ---- The other evidence, each in its own section ---------------- */}
          {/* CV / résumé screening and the skills assessment no longer live on this page —
              each has its own report, reachable from the candidate page (ATS Evaluation and
              Assessment, beside AI Report). This page is the AI interview's own record. */}

          {hasInterviewSections && (
            <div id="sec-evaluation" className="scroll-mt-32">
              <details className="rounded-lg border border-slate-200 bg-white p-4" open>
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">Evaluation details and provenance</summary>
                <EvaluationCard interview={interview} ev={ev} rec={rec} />
              </details>
            </div>
          )}

          {hasInterviewSections && report.proctoring && (
            <details id="sec-integrity" className="scroll-mt-32 rounded-lg border border-slate-200 bg-white p-4" open><summary className="cursor-pointer font-semibold text-sm">Monitoring observations — not proof of misconduct</summary>
              <IntegrityCard proctoring={report.proctoring} candidateId={id} />
            </details>
          )}

      </div>
    </div>
  );
}
