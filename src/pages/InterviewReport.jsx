import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Bot, User, Cpu, Clock, CheckCircle2, AlertTriangle, Download, Loader2, Mic, ShieldCheck, ShieldAlert, ScanFace, Eye } from "lucide-react";
import api from "../api/client.js";
import { getSocket } from "../lib/socket.js";
import { Card, Badge, Skeleton, EmptyState } from "../components/ui/Card.jsx";
import { Input, Label, FormGroup } from "../components/ui/Field.jsx";
import Button from "../components/ui/Button.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { stageLabel, stageTone } from "../lib/pipeline.js";
import ReportBreadcrumb from "../components/report/ReportBreadcrumb.jsx";
import ReportRail from "../components/report/ReportRail.jsx";
import InstrumentScoreCard from "../components/report/InstrumentScoreCard.jsx";
import RubricAccordion from "../components/report/RubricAccordion.jsx";
import InsightPanel from "../components/report/InsightPanel.jsx";
import CvAnalysisCards from "../components/report/CvAnalysisCards.jsx";
import InterviewPlayback from "../components/report/InterviewPlayback.jsx";
import ProvenanceLine from "../components/report/ProvenanceLine.jsx";
// The single-series magnitude mark, shared with every other chart on the report
// so a competency bar and a score bar cannot end up two different blues.
import { BRAND_MARK } from "../components/report/marks.js";

const RECOMMENDATION = {
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
function ScoreBar({ label, value }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-[#6B6B6B]">{label}</span>
        <span className="font-semibold tabular-nums text-[#1A1A1A]">{value != null ? `${value}/100` : "—"}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#F5F5F0]">
        <div
          className={`h-full rounded-full ${value == null ? "bg-[#F5F5F0]-deep" : BRAND_MARK}`}
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
  // `fill` is the pastel segment + verdict-hue ring; `swatch` is the saturated
  // legend key that has to hold a white glyph at 9px. Same split as BUCKET_MARK.
  {
    key: "proven",
    label: "Proven",
    glyph: "✓",
    fill: "bg-chart-positive ring-1 ring-inset ring-verdict-positive/70",
    swatch: "bg-verdict-positive",
  },
  {
    key: "insufficient",
    label: "Not tested",
    glyph: "?",
    fill: "bg-chart-neutral ring-1 ring-inset ring-slate-400/70",
    swatch: "bg-slate-400",
  },
  {
    key: "failed",
    label: "Failed",
    glyph: "✗",
    fill: "bg-chart-negative ring-1 ring-inset ring-verdict-negative/70",
    swatch: "bg-verdict-negative",
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
      <dt className="text-[11px] font-semibold text-[#6B6B6B]">{label}</dt>
      <dd className="mt-1">
        <span className="font-display block text-2xl font-bold tabular-nums tracking-tight text-[#1A1A1A]">{value}</span>
        {basis && <span className="mt-1 block text-[11px] leading-snug text-[#6B6B6B]">{basis}</span>}
        {flag && (
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-[#FFE8DC] px-1.5 py-0.5 text-[10px] font-bold text-[#FF6B2C]">
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
function InstrumentScores({ report, interview, ev, coverage, quality, id, only = "all", interviewReadable = true }) {
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
    .map((r) => `In the next round, ask for one specific example of ${r.label}.`);

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
                <p className="mb-3 flex items-start gap-2 rounded-xl border border-verdict-pending/30 bg-[#FFE8DC] px-3 py-2 text-xs font-semibold text-[#FF6B2C]">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {placeholder
                    ? "Scoring didn't run. There's no result here yet."
                    : "The audio broke. This interview doesn't count."}
                </p>
              )}
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Figure
                  label="Questions answered"
                  value={answered != null && asked != null ? `${answered}/${asked}` : "—"}
                  basis={
                    declined
                      ? `${declined} declined — asked, could not answer`
                      : interview?.substance
                        ? `${interview.substance.responsiveCount} of ${interview.substance.totalAnswers} actually answered the question`
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

function Headline({ report, interview, coverage, quality, onResend, resending, showAnyway, onToggleShowAnyway }) {
  const firstName = String(report.candidate?.name || "").trim().split(/\s+/)[0] || "The candidate";
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
      </div>
    );
  }

  // A working session: the finding in counts a hiring huddle can quote without translation.
  const buckets = coverage?.buckets;
  const criteria = coverage?.totals?.criteria;
  const proven = buckets?.proven?.rows?.length ?? 0;
  const failed = buckets?.failed?.rows?.length ?? 0;
  const missed = buckets?.insufficient?.rows?.length ?? 0;
  const sentence = buckets
    ? proven + failed > 0
      ? [
          `${firstName} proved ${proven} of the ${criteria} things this job needs.`,
          failed > 0 ? `${failed} didn't hold up.` : null,
          missed > 0 ? `${missed} we never got to.` : null,
        ]
          .filter(Boolean)
          .join(" ")
      : `We couldn't test any of the ${criteria} things this job needs in this interview.`
    : `The interview finished — ${interview?.substance?.responsiveCount ?? 0} of ${interview?.substance?.totalAnswers ?? 0} answers actually answered the question.`;

  return (
    <Card>
      <p className="font-display text-xl font-bold tracking-tight text-[#1A1A1A] text-balance">{sentence}</p>
      {interview?.status === "ended_early" && (
        <p className="mt-1.5 text-sm text-[#6B6B6B]">
          {firstName} ended the interview early, so most of it never ran — a person needs to make this call.
        </p>
      )}
      {/* Readable, but flagged. These sessions used to be hidden behind "This interview didn't
          work" — which overstated it — and now show their evidence with the caveat attached and
          the recommendation withheld (RecommendedActionCard renders the suppression). Rule 5:
          uncertainty is visible wherever the measurement is. */}
      {!broken && quality?.degraded && quality?.reasons?.length > 0 && (
        <div className="mt-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-sm font-semibold text-amber-900">Read this with a caveat — the recommendation is withheld.</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-amber-800">
            {quality.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => document.getElementById("decision-card")?.scrollIntoView({ behavior: "smooth", block: "center" })}
        >
          Record a decision
        </Button>
      </div>
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

const RISK_BAND = {
  low: { label: "Low risk", tone: "green", ring: "text-emerald-600", bg: "bg-emerald-500" },
  medium: { label: "Medium risk", tone: "amber", ring: "text-amber-600", bg: "bg-amber-500" },
  high: { label: "High risk", tone: "red", ring: "text-red-600", bg: "bg-red-500" },
};
const SEVERITY_TONE = { low: "slate", medium: "amber", high: "red" };

// Phase 8: the Claim → Probe → Verdict loop, closed. Each probed résumé claim
// with its verdict and BOTH quotes (résumé vs transcript) side by side, plus the
// pre→post score delta the verdicts produced. A contradicted claim is evidence
// for a human — never an automatic rejection.
const PROBE_VERDICT_META = {
  verified: { label: "Verified in interview", tone: "green", border: "border-emerald-200 bg-emerald-50/60" },
  contradicted: { label: "Contradicted in interview", tone: "red", border: "border-red-200 bg-red-50/60" },
  inconclusive: { label: "Inconclusive", tone: "amber", border: "border-amber-200 bg-amber-50/50" },
};

function ClaimVerificationCard({ cv }) {
  if (!cv || !cv.probes?.length) return null;
  const d = cv.scoreDelta;
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-semibold text-[#1A1A1A]">
          <ShieldCheck className="h-4 w-4 text-brand-600" /> Claim verification
        </h3>
        {d && (
          <Badge tone={d.delta > 0 ? "green" : d.delta < 0 ? "red" : "slate"}>
            Score {d.pre.overallScore} → {d.post.overallScore} ({d.delta > 0 ? "+" : ""}{d.delta})
          </Badge>
        )}
      </div>
      <p className="mt-1 text-xs text-[#6B6B6B]">
        These questions tested résumé claims the screening couldn&apos;t verify. Verdicts changed the evidence score through the
        verification multiplier{d ? "" : " (rescore pending)"}.
      </p>
      <div className="mt-4 space-y-3">
        {cv.probes.map((p) => {
          const meta = p.verdict ? PROBE_VERDICT_META[p.verdict] : null;
          return (
            <div key={p.claimId} className={`rounded-xl border p-3 ${meta ? meta.border : "border-[#E8E8E4] bg-[#FFE8DC]/60"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge tone={meta ? meta.tone : "slate"}>
                  {meta ? meta.label : p.status === "asked" ? "Asked — verdict pending" : "Not covered in this interview"}
                </Badge>
              </div>
              {p.resumeQuote && (
                <p className="mt-2 text-xs text-[#6B6B6B]">
                  <span className="font-semibold text-[#6B6B6B]">Résumé:</span> &ldquo;{p.resumeQuote}&rdquo;
                </p>
              )}
              <p className="mt-1 text-sm text-[#1A1A1A]">
                <span className="text-xs font-semibold text-[#6B6B6B]">Asked:</span> {p.question}
              </p>
              {p.answerQuote && (
                <p className="mt-1 text-xs text-[#6B6B6B]">
                  <span className="font-semibold text-[#6B6B6B]">Answer:</span> &ldquo;{p.answerQuote}&rdquo;
                </p>
              )}
              {p.verdictReasoning && <p className="mt-1.5 text-xs italic text-[#6B6B6B]">{p.verdictReasoning}</p>}
            </div>
          );
        })}
      </div>
      <p className="mt-4 border-t border-[#E8E8E4] pt-3 text-xs text-[#6B6B6B]">
        A contradicted claim is evidence for your judgement — both quotes are shown so you can read the exchange yourself. It never
        auto-rejects.
      </p>
    </Card>
  );
}

// A3.5 — the skills-assessment leg of the pipeline, in the same report as the
// interview it fed. Mirrors the PDF section: a skip renders as a recorded human
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

function AssessmentCard({ assessment, criterionLabels }) {
  if (!assessment) return null;
  const { decision, session } = assessment;
  const result = session?.result;
  // A recruiter must never be shown "c5: 1/3". The rubric has real labels; use them.
  const labelFor = (id) => criterionLabels?.[id] || id;
  return (
    <Card>
      <h3 className="flex items-center gap-2 text-base font-semibold text-[#1A1A1A]">
        <ShieldCheck className="h-4 w-4 text-brand-600" /> Skills assessment
      </h3>
      {decision?.action === "skipped" ? (
        <p className="mt-2 text-sm text-[#6B6B6B]">
          Skipped by <strong>{decision.byName || "a recruiter"}</strong> on {formatWhen(decision.at)} — sent directly to the AI
          interview. A recorded human decision, not missing data.
        </p>
      ) : !session ? (
        <p className="mt-2 text-sm text-[#6B6B6B]">An assessment decision was recorded but no session exists yet.</p>
      ) : (
        <>
          {session.difficultyTier && (
            <p className="mt-2 text-xs text-[#6B6B6B]">
              Difficulty <strong className="uppercase">{session.difficultyTier.value}</strong> —{" "}
              {ASSESSMENT_TIER_SOURCE[session.difficultyTier.source] || session.difficultyTier.source}
              {session.difficultyTier.basis ? ` (${session.difficultyTier.basis})` : ""}
            </p>
          )}
          {!result ? (
            <p className="mt-2 text-sm text-[#6B6B6B]">Status: {session.status}. No scored result yet.</p>
          ) : (
            <>
              <p className="mt-2 text-lg font-bold text-[#1A1A1A]">
                {result.totalCorrect}/{result.totalItems} items correct{" "}
                {result.completedBy === "expiry" && <Badge tone="amber">partial — closed by expiry</Badge>}
                {result.completedBy === "integrity_violation" && <Badge tone="amber">auto-submitted — integrity flags</Badge>}
              </p>
              <div className="mt-3 space-y-1.5">
                {(result.perCriterion || []).map((c) => (
                  <div key={c.criterionId} className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="text-[#6B6B6B]">{labelFor(c.criterionId)}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-[#1A1A1A]">
                      {c.correctCount}/{c.itemCount}
                    </span>
                  </div>
                ))}
              </div>
              {(result.claimVerdicts || []).length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-[#E8E8E4] pt-3">
                  {result.claimVerdicts.map((v) => {
                    const meta = ASSESSMENT_VERDICT_META[v.verdict] || ASSESSMENT_VERDICT_META.inconclusive;
                    return (
                      <p key={v.claimId} className="text-xs text-[#6B6B6B]">
                        <Badge tone={meta.tone}>{meta.label}</Badge>{" "}
                        <span className="text-[#6B6B6B]">{labelFor(v.criterionId)}</span> — {v.correctCount}/{v.itemCount} targeted
                        items
                      </p>
                    );
                  })}
                </div>
              )}
              <p className="mt-4 border-t border-[#E8E8E4] pt-3 text-xs text-[#6B6B6B]">
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

// §5: explicit action verb + one-line justification — the report's final word.
function RecommendedActionCard({ action }) {
  if (!action) return null;
  // A withheld recommendation must not wear the same confident styling as a real
  // one — the point is that the signal was too poor to make the call.
  if (action.suppressed) {
    return (
      <Card className="border-2 border-dashed border-verdict-pending/50 bg-[#FFE8DC]">
        <p className="text-xs font-medium text-[#FF6B2C]">Recommendation withheld</p>
        <p className="mt-1 text-lg font-bold text-[#FF6B2C]">{action.action}</p>
        <p className="mt-1 text-sm text-[#FF6B2C]">{action.justification}</p>
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
    <Card className="relative overflow-hidden border-[#FFCAAF] bg-[#F5F5F0]-deep">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-brand-600" />
      <p className="text-[11px] font-semibold tracking-[0.08em] text-brand-700 uppercase">Recommended action</p>
      <p className="font-display mt-2 text-2xl font-extrabold tracking-[-0.02em] text-[#1A1A1A] text-balance sm:text-[1.75rem] sm:leading-[1.15]">
        {action.action}
      </p>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-[#6B6B6B]">{action.justification}</p>
    </Card>
  );
}

function IdentityRow({ identityMatch }) {
  const s = identityMatch?.status || "unknown";
  const map = {
    match: { icon: ShieldCheck, cls: "text-emerald-600", text: "Face matched the identity photo" },
    mismatch: { icon: ShieldAlert, cls: "text-red-600", text: "The face on camera didn't match their photo" },
    unknown: { icon: ScanFace, cls: "text-[#6B6B6B]", text: "Identity not checked during the interview" },
  };
  const { icon: Icon, cls, text } = map[s] || map.unknown;
  return (
    <div className="flex items-center gap-2 text-sm text-[#6B6B6B]">
      <Icon className={`h-4 w-4 shrink-0 ${cls}`} /> {text}
      {identityMatch?.distance != null && <span className="text-xs text-[#6B6B6B]">(distance {identityMatch.distance})</span>}
    </div>
  );
}

// Phase 14.5 — inline player for an event-anchored evidence clip. The bytes
// stream through an authenticated endpoint (a bare <video src> can't send the
// bearer token), and every fetch is audit-logged server-side.
function EvidenceClip({ clip }) {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => () => src && URL.revokeObjectURL(src), [src]);

  async function loadClip() {
    setLoading(true);
    setFailed(false);
    try {
      const res = await api.get(`/interview-sessions/evidence/${clip._id}`, { responseType: "blob" });
      setSrc(URL.createObjectURL(res.data));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  const label = `${new Date(clip.capturedAt).toLocaleTimeString()} · ${clip.source === "phone" ? "phone cam" : "laptop cam"}`;
  const t = clip.trigger;
  return (
    <div className="rounded-xl border border-[#E8E8E4] bg-[#FFE8DC] p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-[#6B6B6B]">
        <span className="font-medium text-[#1A1A1A]">{clip.eventType.replace(/_/g, " ")}</span>
        <span>{label}</span>
      </div>

      {/* The measurement that caused this capture, shown ABOVE the footage on purpose. A clip is
          here to let you overturn the flag, not to prove it — so you should read what the machine
          claims and then watch whether the video actually shows it. A clip that contradicts its own
          label is the single most important thing this panel can surface. */}
      {t && (
        <div className="mb-2 rounded-lg border border-[#E8E8E4] bg-white px-2.5 py-2 text-[11px] leading-relaxed text-[#6B6B6B]">
          {t.rule && <p className="font-medium text-[#6B6B6B]">Triggered by: {t.rule}</p>}
          <p className="mt-0.5 flex flex-wrap gap-x-3">
            {t.direction && <span>direction: looking {t.direction === "down" ? "down" : "to the side"}</span>}
            {t.faceCount != null && <span>faces detected: {t.faceCount}</span>}
            {t.distance != null && <span>face distance: {t.distance}{t.threshold != null && ` (match under ${t.threshold})`}</span>}
            {t.lastDetectorScore != null && <span>detector confidence beforehand: {t.lastDetectorScore}</span>}
            {t.lastFaceFrameRatio != null && <span>face filled {(t.lastFaceFrameRatio * 100).toFixed(1)}% of frame</span>}
            {t.lastFaceAtEdge === true && <span>face was cropped by the frame edge</span>}
          </p>
        </div>
      )}
      {clip.scored === false && (
        <p className="mb-2 rounded-lg bg-[#F5F5F0] px-2.5 py-1.5 text-[11px] text-[#6B6B6B]">
          This clip records <span className="font-medium text-[#6B6B6B]">our camera view quality</span>, not the
          candidate&apos;s conduct. It carries no risk score and is not a flag against them.
        </p>
      )}

      {src ? (
        <video src={src} controls className="w-full rounded-lg bg-[#F5F5F0]" />
      ) : (
        <button
          onClick={loadClip}
          disabled={loading}
          className="w-full rounded-lg border border-dashed border-[#E8E8E4]-mid bg-white py-3 text-xs font-semibold text-[#6B6B6B] hover:bg-[#F5F5F0] disabled:opacity-60"
        >
          {loading ? "Loading clip…" : failed ? "Could not load — try again" : "▶ Load clip (view is audit-logged)"}
        </button>
      )}
    </div>
  );
}

function IntegrityCard({ proctoring, evidenceClips, candidateId }) {
  const band = RISK_BAND[proctoring.displayRiskBand] || RISK_BAND.low;
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-semibold text-[#1A1A1A]">
          <Eye className="h-4 w-4 text-brand-600" /> Integrity & Proctoring
        </h3>
        {/* B1: no band over a broken recording — a risk level computed while our own pipeline
            was failing is not a measurement of the candidate. */}
        {proctoring.bandWithheld ? <Badge tone="slate">Band withheld</Badge> : <Badge tone={band.tone}>{band.label}</Badge>}
      </div>

      {proctoring.bandWithheldReason && (
        <p className="mt-3 rounded-lg bg-[#FFE8DC] px-3 py-2 text-xs font-medium text-[#6B6B6B]">{proctoring.bandWithheldReason}</p>
      )}

      {proctoring.identityGateNote && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">{proctoring.identityGateNote}</p>
      )}

      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#FF6B2C] text-white">
          <span className="text-2xl font-bold">{proctoring.displayRiskScore ?? 0}</span>
          <span className="text-[10px] text-white/80">Risk</span>
        </div>
        <div className="flex-1 space-y-2">
          <IdentityRow identityMatch={proctoring.identityMatch} />
          <div className="flex items-center gap-2 text-sm text-[#6B6B6B]">
            {proctoring.visionEnabled ? (
              <><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> Camera monitoring was active</>
            ) : (
              <><AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" /> Camera monitoring off — browser signals only</>
            )}
          </div>
          <div className="text-xs text-[#6B6B6B]">
            {proctoring.totalEvents} flag{proctoring.totalEvents === 1 ? "" : "s"} recorded
            {proctoring.consent?.given ? " · candidate consented" : proctoring.consent?.declined ? " · candidate declined proctoring" : ""}
          </div>
        </div>
      </div>

      {proctoring.breakdown?.length > 0 && (
        <div className="mt-4 space-y-2">
          {/* §10.4 — the collapse is labelled: a count that silently shrinks between two
              viewings of the same session reads as tampering in an audit. */}
          {proctoring.collapsedNote && <p className="text-[11px] text-[#6B6B6B]">{proctoring.collapsedNote}</p>}
          {proctoring.breakdown.map((row) => (
            <div key={row.type} className="flex flex-wrap items-baseline gap-2">
              {/* Recording-condition rows are shown but visually demoted and explicitly marked
                  unscored. They must appear — "we could not see" rendered as silence reads as
                  "nothing happened" — but they are not findings about the candidate. */}
              <Badge tone={row.scored === false || row.attributedToFault ? "slate" : SEVERITY_TONE[row.severity] || "slate"}>
                {row.label} · {row.count}×
              </Badge>
              {row.scored === false && (
                <span className="text-xs font-semibold text-[#6B6B6B]">Not scored</span>
              )}
              {row.attributedToFault && (
                <span className="text-xs font-semibold text-[#6B6B6B]">Attributed to the technical fault, not the candidate</span>
              )}
              {row.benignExplanation && <span className="text-xs text-[#6B6B6B]">{row.benignExplanation}</span>}
            </div>
          ))}
        </div>
      )}

      {evidenceClips?.length > 0 && (
        <div className="mt-4 border-t border-[#E8E8E4] pt-4">
          <p className="mb-2 text-sm font-semibold text-[#1A1A1A]">Evidence clips ({evidenceClips.length})</p>
          <p className="mb-3 text-xs text-[#6B6B6B]">
            Short clips captured only when a high-severity flag fired — consent-gated, never continuous recording. For
            human review only; they never enter any scoring path.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {evidenceClips.map((clip) => (
              <EvidenceClip key={clip._id} clip={clip} />
            ))}
          </div>
        </div>
      )}

      {/* Phase 7 (default-off): most sessions have no recording — this tenant never turned the
          flag on, or the session predates it, or Egress failed to start. CandidateRecording
          renders nothing at all in that case rather than an empty/broken player. */}
      <CandidateRecording candidateId={candidateId} />

      <p className="mt-4 border-t border-[#E8E8E4] pt-3 text-xs text-[#6B6B6B]">
        Worth a look, not proof — never on their own a reason to reject. The full advisory note is in the PDF.
      </p>
    </Card>
  );
}

// Candidate video recording (Phase 7). Fetched on demand, same click-to-load posture as
// TurnAudio/EvidenceClip below — a recruiter opens a report to read a decision, not to
// auto-stream video, and every view is audit-logged server-side the moment the URL is requested.
function CandidateRecording({ candidateId }) {
  const [state, setState] = useState({ status: "unknown", url: null });
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  // A quiet existence check on mount — status only, no `mint` — so this is never logged as a
  // "view" (see the controller comment). Whether the section renders at all depends on this,
  // since most sessions have no recording and the card should not show a dead button.
  useEffect(() => {
    let cancelled = false;
    if (!candidateId) return undefined;
    api
      .get(`/interview-sessions/candidate/${candidateId}/recording`)
      .then((res) => {
        if (!cancelled) setState({ status: res.data?.status || "none", url: null });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "none", url: null });
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  if (!checked || state.status === "none" || state.status === "unknown") return null;

  async function loadVideo() {
    setLoading(true);
    try {
      const res = await api.get(`/interview-sessions/candidate/${candidateId}/recording?mint=1`);
      setState({ status: res.data?.status, url: res.data?.url });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 border-t border-[#E8E8E4] pt-4">
      <p className="mb-2 text-sm font-semibold text-[#1A1A1A]">Candidate recording</p>
      {state.status === "completed" ? (
        state.url ? (
        <video src={state.url} controls className="w-full max-w-md rounded-lg bg-[#F5F5F0]" />
        ) : (
          <button
            type="button"
            onClick={loadVideo}
            disabled={loading}
            className="rounded-lg bg-[#FFE8DC] px-3 py-1.5 text-xs font-semibold text-[#FF6B2C] hover:bg-[#FFE8DC] disabled:opacity-60"
          >
            {loading ? "Loading…" : "▶ Play interview recording (audit-logged)"}
          </button>
        )
      ) : state.status === "recording" ? (
        <p className="text-xs text-[#6B6B6B]">Recording in progress — check back once the interview has finished.</p>
      ) : (
        <p className="text-xs text-[#6B6B6B]">The recording could not be captured for this session.</p>
      )}
    </div>
  );
}

// `delivery` is deliberately not a prop any more. Every spoken answer used to carry
// "Delivery: 64/100" right next to its answer score, which put a number on how the candidate
// SOUNDED — pace, hesitation, filler words — beside a number on what they said, in the same
// type, on the same line. See backend/utils/prosody.js for why that had to go.
function Bubble({ role, text, score, spoken, wordCount, durationSec, responsive, hasAudio, candidateId, turnIndex }) {
  const isAi = role === "ai";
  return (
    <div className={`flex gap-2.5 ${isAi ? "" : "flex-row-reverse"}`}>
      <div
        className={
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full " +
          (isAi ? "bg-[#FFE8DC] text-brand-700" : "bg-[#F5F5F0]-deep text-[#6B6B6B]")
        }
      >
        {isAi ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${isAi ? "bg-[#FFE8DC] text-[#1A1A1A]" : "bg-brand-600 text-white"}`}>
        <p>{text}</p>
        {/* The readout below sits on the violet bubble at white/90, not brand-100:
            on this ramp brand-100 over brand-600 lands at 4.49:1, and this is an
            11px score figure — the smallest number in the report and the one most
            likely to be quoted back in a dispute. */}
        {!isAi && score != null && (
          <p className="mt-1 text-[11px] font-semibold text-white/90">Answer score: {score}/100</p>
        )}
        {!isAi && wordCount != null && (
          <p className="mt-0.5 text-[11px] text-white/90">
            {wordCount} word{wordCount === 1 ? "" : "s"} · {durationSec != null ? `${durationSec}s` : "duration unknown"} ·{" "}
            <span className={responsive ? "" : "font-semibold text-amber-200"}>{responsive ? "Responsive" : "Non-responsive"}</span>
          </p>
        )}
        {!isAi && hasAudio && <TurnAudio candidateId={candidateId} turnIndex={turnIndex} />}
      </div>
    </div>
  );
}

// The candidate's own recorded answer, played back next to the text it transcribes — not a
// standalone recording room, so it lives on the turn it belongs to rather than in its own
// section. Same auth+audit posture as EvidenceClip below: the bytes stream through an
// authenticated endpoint (a bare <audio src> can't send the bearer token), and every fetch is
// audit-logged server-side.
function TurnAudio({ candidateId, turnIndex }) {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => () => src && URL.revokeObjectURL(src), [src]);

  async function loadAudio() {
    setLoading(true);
    setFailed(false);
    try {
      const res = await api.get(`/interview-sessions/candidate/${candidateId}/turn-audio/${turnIndex}`, {
        responseType: "blob",
      });
      setSrc(URL.createObjectURL(res.data));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      {src ? (
        <audio src={src} controls className="h-8 w-full max-w-[240px]" />
      ) : (
        <button
          type="button"
          onClick={loadAudio}
          disabled={loading}
          className="rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/90 hover:bg-white/25 disabled:opacity-60"
        >
          {loading ? "Loading audio…" : failed ? "Could not load — try again" : "▶ Play answer audio (audit-logged)"}
        </button>
      )}
    </div>
  );
}

// The full evaluation — every number with the sentence that qualifies it.
// It used to live behind the single "See the detailed report" expander along
// with claim verification, the assessment, integrity and the transcript. That
// expander is gone: all five are now their own section, each reachable from the
// rail, each carrying its own figure there. The markup here is unchanged.
function EvaluationCard({ interview, ev, rec }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-[#1A1A1A]">Evaluation</h3>
        {rec && <Badge tone={rec.tone}>Recommendation: {rec.label}</Badge>}
      </div>

      {ev ? (
        <>
          {interview.substance && (
            <p className="mt-3 text-sm font-medium text-[#6B6B6B]">
              Responsive answers: {interview.substance.responsiveCount} / {interview.substance.totalAnswers}
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
            <p className="mt-2 text-sm font-medium text-[#6B6B6B]">
              Declined: {ev.questionsDeclined} of {ev.questionsAsked} question
              {ev.questionsAsked === 1 ? "" : "s"} — the candidate was asked and said they could not answer.
              Scores below cover only the {ev.questionsAnswered} answered.
            </p>
          )}

          <div className="mt-4 flex items-center gap-4">
            <div className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl text-white ${ev.generatedBy === "fallback" ? "bg-text-faint" : "bg-[#FF6B2C]"}`}>
              <span className="text-2xl font-bold">{ev.overallScore ?? "—"}</span>
              <span className="text-[10px] text-white/80">{ev.generatedBy === "fallback" ? "Placeholder" : "Overall"}</span>
            </div>
            {interview.competencyTriplet ? (
              <div className="grid flex-1 gap-3 sm:grid-cols-3">
                <ScoreBar label="Communication" value={interview.competencyTriplet.communication} />
                <ScoreBar label="Technical" value={interview.competencyTriplet.technicalKnowledge} />
                <ScoreBar label="Problem Solving" value={interview.competencyTriplet.problemSolving} />
              </div>
            ) : (
              <p className="flex-1 text-sm text-[#6B6B6B]">
                Communication / Technical / Problem solving:{" "}
                {ev.generatedBy === "fallback" ? "PLACEHOLDER — not a real evaluation." : "not separately measured for this interview."}
              </p>
            )}
          </div>

          {ev.summary && <p className="mt-4 rounded-xl bg-[#FFE8DC] p-3 text-sm text-[#6B6B6B]">{ev.summary}</p>}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {ev.strengths?.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-[#6B6B6B]">Strengths</p>
                <ul className="space-y-1">
                  {ev.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm text-[#6B6B6B]">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {ev.weaknesses?.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-[#6B6B6B]">Weaknesses</p>
                <ul className="space-y-1">
                  {ev.weaknesses.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm text-[#6B6B6B]">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {ev.missingSkills?.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-[#6B6B6B]">Skills to probe</p>
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
            <div className="mt-4 border-t border-[#E8E8E4] pt-3">
              <p className="mb-2 text-xs font-medium text-[#6B6B6B]">
                Spoken communication — assessed for this role
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <ScoreBar label="Clarity" value={ev.delivery} />
                <ScoreBar label="Calibration" value={ev.confidence} />
              </div>
              <p className="mt-2 text-xs text-[#6B6B6B]">
                Measured from the transcript only — never from pace, accent, hesitation or
                filler words. <strong>Clarity</strong>: did the answer address the question,
                concretely and followably. <strong>Calibration</strong>: did they distinguish
                what they knew from what they didn't — saying so counts in their favour.
                {ev.spokenCommunication?.answersScored != null && (
                  <> Over {ev.spokenCommunication.answersScored} answer
                    {ev.spokenCommunication.answersScored === 1 ? "" : "s"}.</>
                )}
              </p>
              {ev.spokenCommunication?.justification && (
                <p className="mt-2 rounded-lg bg-[#FFE8DC] p-2 text-xs text-[#6B6B6B]">
                  <span className="font-medium">Why this role assesses it: </span>
                  {ev.spokenCommunication.justification}
                </p>
              )}
              <p className="mt-2 text-xs text-[#6B6B6B]">
                Not part of the overall score. It cannot decline a candidate on its own.
              </p>
            </div>
          )}

          <p className="mt-4 border-t border-[#E8E8E4] pt-3 text-xs text-[#6B6B6B]">
            Generated by {ev.generatedBy === "fallback" ? "deterministic fallback (AI provider not configured)" : "AI"}
            {ev.generatedAt ? ` · ${formatWhen(ev.generatedAt)}` : ""}
            {interview.startedAt ? ` · interview ${formatWhen(interview.startedAt)}` : ""}
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-[#6B6B6B]">Evaluation not available yet.</p>
      )}
    </Card>
  );
}

export default function InterviewReport() {
  const { id } = useParams();
  const toast = useToast();
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [movingTo, setMovingTo] = useState("");
  const [downloading, setDownloading] = useState(false);
  // C1/C2 — a broken session hides every figure until explicitly asked for.
  const [showAnyway, setShowAnyway] = useState(false);
  const [resending, setResending] = useState(false);
  // §3.1 — null means "latest", which is also what the backend defaults to when no attempt is
  // given. Kept as local state rather than a URL param: this is a recruiter glancing between a
  // candidate's attempts on one visit, not a link anyone needs to bookmark.
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/candidates/${id}/interview-report`, { params: { attempt: selectedAttempt || undefined } });
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load the interview report.");
    }
  }, [id, selectedAttempt]);

  useEffect(() => {
    load();
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

  async function moveStage(stage) {
    setMovingTo(stage);
    try {
      await api.patch(`/candidates/${id}/stage`, { stage, note: note || undefined });
      toast.success(`Moved to ${stageLabel(stage)}`);
      setNote("");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not move candidate");
    } finally {
      setMovingTo("");
    }
  }

  if (!report) {
    return (
      <div className="space-y-4">
        {error ? (
          <Card className="text-center text-sm font-medium text-red-600">{error}</Card>
        ) : (
          <>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-48 w-full" />
          </>
        )}
      </div>
    );
  }

  const { candidate, job, interview, allowedNextStages = [], stage, decisionTrail, coverage } = report;
  const ev = interview?.evaluation;
  const rec = ev?.recommendation ? RECOMMENDATION[ev.recommendation] : null;
  const quality = interview?.sessionQuality;
  // One source of criterion labels for every card on the page, so nothing renders
  // a bare "c5" at the recruiter.
  const criterionLabels = Object.fromEntries((coverage?.rows || []).map((r) => [r.criterionId, r.label]));

  // Which evidence sources exist for this candidate. Used only to decide whether
  // a section renders at all — the scope SWITCHER that used to sit above the rail
  // is gone. It let a reader narrow the page to "interview only" or "CV only",
  // which sounded useful and in practice did two bad things: it made the same
  // candidate's report look different depending on a control nobody remembered
  // setting, and its whole purpose was to support a cross-instrument comparison
  // this page no longer invites. Every section that has data now simply renders.
  const available = {
    resume: Boolean(coverage?.resumeEvaluation),
    assessment: Boolean(report.assessment?.session?.result),
    interview: Boolean(report.hasInterview),
  };
  const hasInterviewSections = report.hasInterview;
  const broken = sessionUnreadable(interview, quality);
  const figuresVisible = !broken || showAnyway;
  // The two rated panels. `communication` arrives already null when the role's
  // rubric never declared it assesses how someone communicates — that gate runs
  // at finalisation, so it cannot be re-opened from here.
  const insights = interview?.insights;

  // ---------------------------------------------------------------------------
  // The rail's rows, each carrying the ONE figure that section resolves to.
  // ---------------------------------------------------------------------------
  // This is what replaced the single `DetailDisclosure` that used to wrap
  // Evaluation, claim verification, assessment, integrity and the transcript
  // behind one toggle. Under that arrangement a recruiter asking "did the camera
  // flag anything" had to open the entire report to find out whether there was
  // anything worth opening it for. Now the answer is in the rail before the
  // first click, and every section is one click from every other.
  //
  // A section with nothing in it is not listed at all. A row that scrolls to an
  // empty card is worse than a missing row, because the reader has to go and
  // check before they can rule it out.
  const flagCount = report.proctoring ? (report.proctoring.distinctFindings ?? report.proctoring.totalEvents ?? 0) : null;
  // Everything `sec-summary` can hold is interview-derived, so under a CV-only
  // reading the row is dropped rather than pointed at an empty anchor.
  const hasSummary = hasInterviewSections;
  const sections = [
    hasSummary
      ? {
          id: "sec-summary",
          group: "Finding",
          label: "Summary",
          figure: report.hasInterview ? interview?.verdictChip?.label || null : "No interview",
        }
      : null,
    available.interview
      ? {
          id: "sec-scores",
          group: "Finding",
          label: "Overall score",
          figure: figuresVisible ? ev?.overallScore ?? null : null,
        }
      : null,
    coverage?.rows?.length
      ? {
          id: "sec-requirements",
          group: "Finding",
          label: "Rubrics",
          figure: coverage.totals?.criteria ? `${coverage.totals.criteria}` : null,
        }
      : null,
    allowedNextStages.length > 0 ? { id: "decision-card", group: "Finding", label: "Decision", figure: stageLabel(stage) } : null,

    // The two rated panels. Each is listed only when it actually has axes: the
    // communication panel is absent for any role whose rubric never declared it
    // assesses how someone communicates, and a rail row pointing at a card that
    // explains its own absence is a row that wastes a click.
    hasInterviewSections && insights?.cognitive?.length
      ? {
          id: "sec-cognitive",
          group: "Insights",
          label: "Cognitive insights",
          figure: `${insights.cognitive.filter((a) => a.score != null).length}/${insights.cognitive.length}`,
        }
      : null,
    hasInterviewSections && insights?.communication?.length
      ? {
          id: "sec-communication",
          group: "Insights",
          label: "Communication",
          figure: `${insights.communication.filter((a) => a.score != null).length}/${insights.communication.length}`,
        }
      : null,

    hasInterviewSections && report.claimVerification?.probes?.length
      ? {
          id: "sec-claims",
          group: "Evidence",
          label: "Claims probed",
          figure: `${report.claimVerification.probes.length}`,
        }
      : null,
    available.resume
      ? {
          id: "sec-cv",
          group: "Evidence",
          label: "CV screening",
          figure: coverage?.resumeEvaluation?.overallScore ?? null,
        }
      : null,
    coverage?.cvAnalysis
      ? {
          id: "sec-cv-analysis",
          group: "Evidence",
          label: "CV analysis",
          // The one number worth carrying here is how many things the document
          // contradicts about itself. Gaps are excluded on purpose — they are
          // recorded, never scored, and a rail figure that counted them would
          // reintroduce exactly the judgement the engine refuses to make.
          figure: (() => {
            const flagged = (coverage.cvAnalysis.redFlags?.rows || []).filter((r) => r.tone === "flag").length;
            return flagged ? `${flagged} flag${flagged === 1 ? "" : "s"}` : "Clear";
          })(),
          tone: (coverage.cvAnalysis.redFlags?.rows || []).some((r) => r.tone === "flag") ? "flag" : undefined,
        }
      : null,
    report.assessment
      ? {
          id: "sec-assessment",
          group: "Evidence",
          label: "Skills test",
          figure: report.assessment.session?.result
            ? `${report.assessment.session.result.totalCorrect}/${report.assessment.session.result.totalItems}`
            : "—",
        }
      : null,

    hasInterviewSections ? { id: "sec-evaluation", group: "The session", label: "Evaluation", figure: ev?.overallScore ?? null } : null,
    hasInterviewSections && report.proctoring
      ? {
          id: "sec-integrity",
          group: "The session",
          label: "Integrity",
          figure: flagCount ? `${flagCount}` : "Clear",
          tone: flagCount ? "flag" : undefined,
        }
      : null,
    hasInterviewSections
      ? {
          id: "sec-playback",
          group: "The session",
          label: "Recording",
          figure: `${(interview?.transcript || []).filter((t) => t.role === "ai" && t.kind === "question").length} Qs`,
        }
      : null,
    hasInterviewSections
      ? {
          id: "sec-transcript",
          group: "The session",
          label: "Full log",
          figure: `${interview?.conversationLog?.length || interview?.transcript?.length || 0}`,
        }
      : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <ReportBreadcrumb
        candidateId={id}
        candidateName={candidate?.name}
        title={report.hasInterview ? "AI interview report" : "Candidate report"}
        at={interview?.completedAt ? formatWhen(interview.completedAt) : null}
      />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[#1A1A1A] [overflow-wrap:anywhere]">
              <Cpu className="h-5 w-5 text-brand-600" /> AI Interview Report
            </h1>
            <p className="mt-1 text-sm text-[#6B6B6B]">
              {candidate?.name} · <span className="font-medium text-[#1A1A1A]">{job?.title || <span className="italic">No role on file</span>}</span>
            </p>
            {decisionTrail && (
              <p className="mt-1 text-xs text-[#6B6B6B]">
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
                <span className="inline-flex items-center rounded-md bg-[#F5F5F0] px-2 py-0.5 text-[11px] font-bold text-[#1A1A1A]">
                  Attempt {interview?.attempt ?? report.attempts[report.attempts.length - 1].attempt} of {report.attempts.length}
                </span>
                <label htmlFor="attempt-select" className="sr-only">
                  Attempt
                </label>
                <select
                  id="attempt-select"
                  value={interview?.attempt ?? report.attempts[report.attempts.length - 1].attempt}
                  onChange={(e) => setSelectedAttempt(Number(e.target.value))}
                  className="rounded-lg border border-[#E8E8E4] px-2 py-1 text-xs font-medium text-[#1A1A1A]"
                >
                  {report.attempts.map((a) => (
                    <option key={a.attempt} value={a.attempt}>
                      Attempt {a.attempt} — {a.status}
                      {a.completedAt ? ` (${formatWhen(a.completedAt)})` : ""}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-[#6B6B6B]">Every attempt is kept and readable — none is overwritten.</span>
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
            {interview?.status && <Badge tone={interview.status === "completed" ? "green" : "slate"}>{interview.status}</Badge>}
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

        {/* §4: identity + duration flags surfaced immediately, not buried in Integrity */}
        {report.hasInterview && (
          <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-[#E8E8E4] pt-3">
            <IdentityRow identityMatch={report.proctoring?.identityMatch} />
            {interview?.durationFlag?.abnormallyShort && (
              <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0" /> Abnormally short session — averaging {interview.durationFlag.secondsPerQuestion}s/question
              </div>
            )}
          </div>
        )}
      </Card>

      {/* The rail and the report, side by side. Below `lg` the rail collapses to
          a plain block above the content rather than disappearing: on a phone it
          is still the fastest way to reach the transcript, and it is still the
          only place every section's figure appears together. */}
      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside>
          <ReportRail sections={sections} />
        </aside>

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
                report={report}
                interview={interview}
                coverage={coverage}
                quality={quality}
                onResend={resendLink}
                resending={resending}
                showAnyway={showAnyway}
                onToggleShowAnyway={() => setShowAnyway((v) => !v)}
              />
            )}

            {/* A live interview is not a report yet. Said outright, because the figures below are
                legitimately blank right now and a blank rendered without this sentence reads as
                "a finished interview found nothing" — which is a claim, and a false one. */}
            {interview?.status === "in_progress" && (
              <Card>
                <p className="flex items-start gap-2 text-sm text-[#6B6B6B]">
                  <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-brand-600" aria-hidden="true" />
                  <span>
                    <span className="font-semibold text-[#1A1A1A]">This interview is still open.</span> The candidate
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
          <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
            <InstrumentScores
              id="sec-scores"
              only="interview"
              report={report}
              interview={interview}
              ev={ev}
              coverage={coverage}
              quality={quality}
              interviewReadable={figuresVisible}
            />

            {coverage?.rows?.length > 0 && (
              <RubricAccordion
                id="sec-requirements"
                coverage={coverage}
                provenance={
                  <ProvenanceLine
                    basis="every evidence source"
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

          {figuresVisible && hasInterviewSections && <RecommendedActionCard action={interview.recommendedAction} />}

          {/* The decision stays OUT of any expander. Everything else on this page is
              reading; this is the act. Burying the control that moves a person
              through the pipeline behind a toggle is how a report becomes
              something recruiters skim and then decide from memory. */}
          {allowedNextStages.length > 0 && (
            <Card id="decision-card" className="scroll-mt-32">
              <h3 className="mb-3 text-base font-semibold text-[#1A1A1A]">Decision</h3>
              <FormGroup className="mb-3">
                <Label>Note (optional)</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason / internal note recorded on the timeline" />
              </FormGroup>
              <div className="flex flex-wrap gap-2">
                {allowedNextStages.map((s) => (
                  <Button
                    key={s.stage}
                    variant={s.stage === "rejected" ? "outline" : "primary"}
                    size="sm"
                    loading={movingTo === s.stage}
                    onClick={() => moveStage(s.stage)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </Card>
          )}

          {/* ---- The two rated panels -------------------------------------- */}
          {/* Radar on the left, expandable ratings on the right. The layout is
              the reference's; what fills it is not. Every star was computed in
              code from observations the model had to quote and that were then
              checked against the transcript, so a row opens onto the candidate's
              own words rather than onto a paragraph restating the rating.
              See backend/utils/interviewInsights.js. */}
          {figuresVisible && hasInterviewSections && (
            <>
              <InsightPanel
                id="sec-cognitive"
                title="Cognitive Insights"
                axes={insights?.cognitive}
                note="Read from what the candidate said about the work, never from how they said it. Expand any row to see the exact spans it was scored on."
              />
              <InsightPanel
                id="sec-communication"
                title="Communication Skills"
                axes={insights?.communication}
                // Absent, and said so, rather than quietly missing. Assessing how
                // someone communicates is legitimate when the job requires it and
                // indefensible when it does not — so it is off unless a human
                // declared it on this role's rubric and wrote down why.
                unavailable={
                  insights && !insights.communication
                    ? insights.communicationReason === "excluded_at_candidate_request"
                      ? "Not assessed — this candidate asked to be excluded from communication scoring, and that request was honoured."
                      : "Not assessed. This role's rubric doesn't declare that it assesses spoken communication, so it wasn't scored. A hiring manager can turn it on for the role, with a written reason."
                    : null
                }
                note="Scored from the transcript only — never from pace, hesitation or accent. Grammar is counted only where the transcription was reliable enough to attribute to the candidate rather than to the transcriber."
              />
            </>
          )}

          {!report.hasInterview && (
            <Card>
              <EmptyState icon={Bot} title="No interview yet" description="This page fills in when it's done." />
            </Card>
          )}

          {/* ---- The other evidence, each in its own section ---------------- */}
          {/* The weighted role map and the three-leg evidence grid used to sit
              here. Both were removed: they existed to let a reader compare the
              résumé, the assessment and the interview cell by cell, and that
              comparison is the clutter this page was asked to lose. What each
              instrument found is still on the page — below, one section each, on
              its own terms. Nothing was deleted from the payload, so the PDF and
              the coverage API are unchanged. */}
          <InstrumentScores
            id="sec-cv"
            only="resume"
            report={report}
            interview={interview}
            ev={ev}
            coverage={coverage}
            quality={quality}
          />

          {/* The three CV cards. Every row is a join over the claim graph and the
              hostility scan, both of which already ran — no model call was added
              for these, and each row expands to the span it was computed from. */}
          <CvAnalysisCards id="sec-cv-analysis" analysis={coverage?.cvAnalysis} />

          {hasInterviewSections && (
            <div id="sec-evaluation" className="scroll-mt-32">
              <EvaluationCard interview={interview} ev={ev} rec={rec} />
            </div>
          )}

          {hasInterviewSections && report.claimVerification?.probes?.length > 0 && (
            <div id="sec-claims" className="scroll-mt-32">
              <ClaimVerificationCard cv={report.claimVerification} />
            </div>
          )}

          {report.assessment && (
            <div id="sec-assessment" className="scroll-mt-32">
              <AssessmentCard assessment={report.assessment} criterionLabels={criterionLabels} />
            </div>
          )}

          {hasInterviewSections && report.proctoring && (
            <div id="sec-integrity" className="scroll-mt-32">
              <IntegrityCard proctoring={report.proctoring} evidenceClips={report.evidenceClips} candidateId={id} />
            </div>
          )}

          {/* The interview itself: questions on the left, the recording on the
              right, transcript underneath with timestamps that seek. The raw
              conversation log stays below as the audit record — this is the
              reading surface, that is the evidence. */}
          {hasInterviewSections && (
            <InterviewPlayback
              id="sec-playback"
              candidateId={id}
              transcript={interview.conversationLog?.length ? interview.conversationLog : interview.transcript}
              startedAt={interview.startedAt}
            />
          )}

          {hasInterviewSections && (
            <Card id="sec-transcript" className="scroll-mt-32">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-[#1A1A1A]">
                  Transcript{" "}
                  <span className="font-normal text-[#6B6B6B]">
                    ({interview.conversationLog?.length || interview.transcript?.length || 0})
                  </span>
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B6B6B]">
                  {interview.substance && (
                    <span>Responsive: {interview.substance.responsiveCount}/{interview.substance.totalAnswers}</span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {interview.questionCount}/{interview.maxQuestions} questions
                  </span>
                </div>
              </div>
              {/* THE CONVERSATION, AS SPOKEN, IS THE TRANSCRIPT. For realtime interviews the
                  engine's question→answer segmentation (kept below, collapsed) is a derived
                  artefact: it pairs answers to questions for scoring, and when a session goes
                  wrong it silently drops exactly the exchanges that explain what went wrong —
                  the repeated question, the "I did not answer the previous question", the
                  goodbye that was never part of any answer. The raw both-sides record is the
                  only honest default, and it is explicitly unscored: how often someone asks for
                  a repeat measures their connection, not their ability. Turn-based interviews
                  have no room recording, so there the engine's turns ARE the conversation and
                  render as before. */}
              {interview.conversationLog?.length > 0 ? (
                <>
                  <p className="mb-3 text-xs text-[#6B6B6B]">
                    Everything said in the room, in order, exactly as recorded — including the parts
                    that were not answers. <span className="font-semibold">Not scored, and never
                    used in scoring.</span> It is here so an interview that went wrong can be told
                    apart from a candidate who did badly.
                    {interview.agentPromptVersion && (
                      <> Interviewer instructions: <code>{interview.agentPromptVersion}</code>.</>
                    )}
                  </p>
                  <div className="overflow-hidden rounded-xl border border-[#E8E8E4]">
                    {interview.conversationLog.map((u, i) => {
                      const prev = interview.conversationLog[i - 1];
                      const isCandidate = u.role === "candidate";
                      const sameSpeaker = Boolean(prev && prev.role === u.role);
                      const at = u.at ? new Date(u.at) : null;
                      return (
                        <div
                          key={i}
                          className={`flex gap-3 px-4 pb-2.5 ${
                            sameSpeaker ? "pt-0" : "border-t border-[#E8E8E4] pt-2.5 first:border-t-0"
                          } ${isCandidate ? "bg-teal-50/50" : "bg-white"}`}
                        >
                          <div className="w-28 shrink-0">
                            {!sameSpeaker && (
                              <span
                                className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${
                                  isCandidate ? "text-teal-700" : "text-[#6B6B6B]"
                                }`}
                              >
                                {isCandidate ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                                {isCandidate ? "Candidate" : "Interviewer"}
                              </span>
                            )}
                          </div>
                          <p className="min-w-0 flex-1 text-sm leading-relaxed text-[#1A1A1A]">{u.text}</p>
                          <span className="w-16 shrink-0 text-right text-[10px] tabular-nums text-[#9B9B9B]">
                            {!sameSpeaker && at && !Number.isNaN(at.getTime())
                              ? at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                              : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {(interview.transcript || []).length > 0 && (
                    <details className="mt-6 border-t border-[#E8E8E4] pt-4">
                      <summary className="cursor-pointer text-sm font-semibold text-[#1A1A1A]">
                        Scored answers — the engine's question-by-question segmentation (
                        {(interview.transcript || []).length} turns)
                      </summary>
                      <p className="mt-1.5 text-xs text-[#6B6B6B]">
                        The same conversation as the scores read it: each answer paired to the
                        question it was recorded against, with its score and audio measurements.
                      </p>
                      <div className="mt-4 space-y-4">
                        {(interview.transcript || []).map((t, i) => (
                          <Bubble
                            key={i}
                            role={t.role}
                            text={t.text}
                            score={t.answerScore}
                            spoken={t.inputMode === "voice"}
                            wordCount={t.wordCount}
                            durationSec={t.durationSec}
                            responsive={t.responsive}
                            hasAudio={t.hasAudio}
                            candidateId={id}
                            turnIndex={i}
                          />
                        ))}
                      </div>
                    </details>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  {(interview.transcript || []).map((t, i) => (
                    <Bubble
                      key={i}
                      role={t.role}
                      text={t.text}
                      score={t.answerScore}
                      spoken={t.inputMode === "voice"}
                      wordCount={t.wordCount}
                      durationSec={t.durationSec}
                      responsive={t.responsive}
                      hasAudio={t.hasAudio}
                      candidateId={id}
                      turnIndex={i}
                    />
                  ))}
                  {(!interview.transcript || interview.transcript.length === 0) && (
                    <p className="text-sm text-[#6B6B6B] italic">No transcript recorded.</p>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
