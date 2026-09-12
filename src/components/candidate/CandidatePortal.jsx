import { useMemo, useRef, useState } from "react";
import InterviewWorkspace, { InterviewSummary } from "./InterviewWorkspace.jsx";
import { activityLabel, interviewDate } from "../../lib/interviewEvidence.js";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { recordedStages } from "../../lib/candidateJourney.js";
import { isScored } from "../../lib/pipelineMetrics.js";
import { reviewInterview } from "../../lib/recruiterReview.js";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileSearch,
  FileText,
  GraduationCap,
  ListChecks,
  Mail,
  MapPin,
  Mic2,
  Phone,
  PlayCircle,
  ShieldAlert,
  Sparkles,
  UserRound,
} from "lucide-react";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import { Badge } from "../ui/Card.jsx";
import { STAGES, normalizeStage, stageLabel, stageTone } from "../../lib/pipeline.js";
import InterviewPlayback from "../report/InterviewPlayback.jsx";
import InstrumentScoreCard from "../report/InstrumentScoreCard.jsx";
import CvAnalysisCards from "../report/CvAnalysisCards.jsx";

// One restrained surface for every menu tile — the icon and label carry the
// section, not a different pastel per card. Keyed by the old tone names so the
// PROFILE_ITEMS / EVALUATION_ITEMS / applicationItems call sites stay untouched.
const CARD_TONE = "border-[#E3EBE4] bg-white text-[#0E3B2E]";
const CARD_TONES = {
  green: CARD_TONE,
  pink: CARD_TONE,
  purple: CARD_TONE,
  orange: CARD_TONE,
  blue: CARD_TONE,
};

const PROFILE_ITEMS = [
  { id: "resume", label: "Resume", description: "Uploaded resume and document details", icon: FileText, tone: "green" },
  { id: "skills", label: "Skills", description: "Skills shared with this application", icon: Award, tone: "purple" },
  { id: "experience", label: "Experience", description: "Roles, employers and responsibilities", icon: BriefcaseBusiness, tone: "orange" },
  { id: "education", label: "Education", description: "Degrees, institutions and study history", icon: GraduationCap, tone: "pink" },
  { id: "candidate-details", label: "Candidate Details", description: "Contact, links and submitted profile information", icon: UserRound, tone: "blue" },
];

const EVALUATION_ITEMS = [
  { id: "cv-screening", label: "CV Screening", description: "ATS result, match factors and findings", icon: FileSearch, tone: "green" },
  { id: "skill-assessment", label: "Skill Assessment", description: "Assigned assessment and available result", icon: ClipboardCheck, tone: "purple" },
  { id: "ai-interview", label: "AI Interview", description: "Interview status, score and report", icon: Sparkles, tone: "orange" },
  { id: "full-log", label: "Full Log", description: "Complete interview and candidate activity log", icon: ListChecks, tone: "blue" },
  { id: "assessment-rubric", label: "Assessment Rubric", description: "Criteria and supporting evidence", icon: BookOpen, tone: "pink" },
  { id: "evaluation", label: "Evaluation", description: "Recommendation, strengths and concerns", icon: CheckCircle2, tone: "green" },
  { id: "recording", label: "Recording", description: "Existing interview recording and playback", icon: Mic2, tone: "purple" },
  { id: "summary-report", label: "Summary", description: "Overall interview finding and recommendation", icon: Sparkles, tone: "pink" },
  { id: "overall-score", label: "Overall Score", description: "Score, verdict and evidence coverage", icon: Award, tone: "orange" },
  { id: "claims-probed", label: "Claims Probed", description: "Resume claims checked in the interview", icon: ClipboardCheck, tone: "purple" },
  { id: "cv-analysis", label: "CV Analysis", description: "Professionalism, flags and key attributes", icon: FileText, tone: "blue" },
  { id: "integrity", label: "Integrity", description: "Identity and proctoring observations", icon: ShieldAlert, tone: "orange" },
];

const VIEW_TITLES = {
  "claims-probed": "Claims & probes",
  "profile-menu": "Candidate Details",
  resume: "Resume",
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  "candidate-details": "Candidate Details",
  "ai-summary": "AI Summary",
  "evaluation-menu": "Evaluation Details",
  "summary-report": "Summary",
  "overall-score": "Overall Score",
  "cv-screening": "CV Screening",
  "cv-analysis": "CV Analysis",
  "skill-assessment": "Skill Assessment",
  "ai-interview": "AI Interview",
  "full-log": "Full Log",
  "assessment-rubric": "Assessment Rubric",
  evaluation: "Evaluation",
  "evaluation-detail": "Detailed Evaluation",
  integrity: "Integrity",
  recording: "Recording",
  "application-menu": "Application Details",
  timeline: "Application Timeline",
  process: "Process",
  "ats-breakdown": "ATS Breakdown",
};

const VIEW_DESCRIPTIONS = {
  "profile-menu": "Explore candidate profile information",
  "evaluation-menu": "Explore candidate's evaluation and assessment information",
  evaluation: "Overall evaluation result and recruiter assessment",
  "evaluation-detail": "Complete evaluation summary, competency scores and feedback",
  "assessment-rubric": "Detailed rubric and scoring criteria",
  "skill-assessment": "Assessment scores and skill-wise analysis",
  "ai-interview": "Interview recording, transcript and AI analysis",
  "cv-screening": "Resume screening result and analysis",
  "full-log": "Activity and system logs",
  recording: "Interview recording and playback",
  "application-menu": "Explore the application timeline, hiring process and screening result",
};

const PROFILE_DETAIL = new Set(PROFILE_ITEMS.map((item) => item.id));
const EVALUATION_DETAIL = new Set([...EVALUATION_ITEMS.map((item) => item.id), "evaluation-detail"]);
const APPLICATION_DETAIL = new Set(["timeline", "process", "ats-breakdown"]);

function formatWhen(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function Empty({ children = "No information is available for this candidate yet." }) {
  return <p className="rounded-xl border border-dashed border-[#C5D2C8] bg-[#FAFCF8] p-5 text-sm text-[#5B6B63]">{children}</p>;
}

function MenuGrid({ items, onOpen, label = "Section Details" }) {
  const gridClass = items.length === 3
    ? "sm:grid-cols-3"
    : items.length === 5
      ? "sm:grid-cols-2 lg:grid-cols-5"
      : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-[#E3EBE4] bg-[#F3F7F1] px-4 py-1.5 text-sm font-semibold text-[#0E3B2E]">
        <Sparkles className="h-4 w-4" aria-hidden="true" /> {label}
      </div>
      <div className="mx-auto hidden h-7 w-px bg-[#E3EBE4] sm:block" aria-hidden="true" />
      <div className="relative">
        <span className="absolute left-[6%] right-[6%] top-0 hidden h-px bg-[#E3EBE4] sm:block" aria-hidden="true" />
        <div className={`grid gap-3 pt-4 ${gridClass}`}>
          {items.map(({ id, label: itemLabel, description, icon: Icon, tone = "green" }) => (
            <button
              key={id}
              type="button"
              onClick={() => onOpen(id)}
              className={`group relative flex min-h-32 min-w-0 flex-col items-center justify-center rounded-xl border p-4 text-center shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${CARD_TONES[tone]}`}
            >
              <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
              <span className="mt-3 block text-sm font-semibold text-[#0C1F1B]">{itemLabel}</span>
              <span className="mt-1 block text-[11px] leading-4 text-[#5B6B63]">{description}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="mx-auto mt-6 max-w-sm rounded-full border border-[#E3EBE4] bg-[#FAFCF8] px-5 py-2 text-center text-xs text-[#5B6B63]">Click any section to view details</p>
    </div>
  );
}

function EvaluationMenu({ onOpen }) {
  return <MenuGrid items={EVALUATION_ITEMS} onOpen={onOpen} label="Overall Result" />;
}

function DetailHeader({ onBack, parentLabel }) {
  return (
    <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
      <ArrowLeft className="h-4 w-4" /> Back to {parentLabel}
    </button>
  );
}

function FieldGrid({ fields }) {
  const visible = fields.filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (!visible.length) return <Empty />;
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {visible.map(([label, value]) => (
        <div key={label} className="min-w-0 border-b border-[#E3EBE4] pb-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[#7A8A80]">{label}</dt>
          <dd className="mt-1 text-sm text-[#0C1F1B] [overflow-wrap:anywhere]">{String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Narrative({ text }) {
  if (!text) return <Empty>No AI summary is available for this candidate yet.</Empty>;
  const paragraphs = String(text).split(/\n+/).map((part) => part.trim()).filter(Boolean);
  return <div className="space-y-3 text-sm leading-7 text-[#415048]">{paragraphs.map((part, index) => <p key={index}>{part}</p>)}</div>;
}

function MetricMeter({ label, value }) {
  const numericValue = value == null || value === "" ? NaN : Number(value);
  if (!Number.isFinite(numericValue)) return null;
  const score = Math.max(0, Math.min(100, numericValue));
  const color = score >= 70 ? "bg-emerald-500" : score >= 50 ? "bg-amber-400" : "bg-rose-500";

  return (
    <div className="rounded-xl border border-[#E3EBE4] bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#0C1F1B]">{label}</p>
        <p className="text-sm font-bold tabular-nums text-[#0C1F1B]">{numericValue}/100</p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[#E9EEEB]" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function CircularScore({ value, label, verdict }) {
  const numericValue = value == null || value === "" ? NaN : Number(value);
  const score = Number.isFinite(numericValue) ? Math.max(0, Math.min(100, numericValue)) : 0;
  if (!Number.isFinite(numericValue)) return <p className="text-sm text-slate-600">{label || "Score"}: not assessed{verdict ? ` · ${verdict}` : ""}</p>;
  return (
    <div className="flex flex-col items-center text-center">
      <div className="grid h-28 w-28 place-items-center rounded-full" style={{ background: `conic-gradient(#0E3B2E ${score * 3.6}deg, #E3EBE4 0deg)` }} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number.isFinite(numericValue) ? score : undefined}>
        <div className="grid h-[82px] w-[82px] place-items-center rounded-full bg-white text-2xl font-bold text-[#0C1F1B]">
          {Number.isFinite(numericValue) ? `${Math.round(numericValue)}%` : "—"}
        </div>
      </div>
      {label && <p className="mt-2 text-sm text-[#5B6B63]">{label}</p>}
      {verdict && <span className="mt-2 rounded-full border border-[#E3EBE4] bg-[#F3F7F1] px-4 py-1 text-xs font-semibold text-[#415048]">{verdict}</span>}
    </div>
  );
}

function RubricTable({ coverage }) {
  const rows = coverage?.rows || [];
  if (!rows.length) return null;
  const status = {
    proven: { label: "Passed", className: "bg-emerald-100 text-emerald-800" },
    failed: { label: "Failed", className: "bg-rose-100 text-rose-700" },
    insufficient: { label: "Insufficient evidence", className: "bg-amber-100 text-amber-800" },
  };
  return (
    <div className="overflow-hidden rounded-xl border border-[#DCE5EA]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="bg-[#F5F8FA] text-xs text-[#44516B]"><tr><th className="px-4 py-3 font-semibold">Criteria</th><th className="px-4 py-3 font-semibold">Weight</th><th className="px-4 py-3 font-semibold">Evidence</th><th className="px-4 py-3 font-semibold">Result</th></tr></thead>
          <tbody className="divide-y divide-[#E3EBE4]">
            {rows.map((row) => {
              const result = status[row.bucket] || status.insufficient;
              return <tr key={row.criterionId}><td className="px-4 py-3 font-semibold text-[#0C1F1B]">{row.label}</td><td className="px-4 py-3 tabular-nums text-[#415048]">{Math.round((row.weight || 0) * 100)}%</td><td className="max-w-sm px-4 py-3 text-xs leading-5 text-[#5B6B63]">{row.evidence || "No evidence recorded"}</td><td className="px-4 py-3"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${result.className}`}>{result.label}</span></td></tr>;
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50 px-4 py-4 text-sm">
        <span className="font-semibold text-emerald-900">Total criteria: {rows.length}</span>
        <span className="rounded-full bg-emerald-100 px-4 py-1.5 font-semibold text-emerald-800">{rows.filter((row) => row.bucket === "proven").length} passed · {rows.filter((row) => row.bucket !== "proven" && row.bucket !== "failed").length} unassessed or insufficient</span>
      </div>
    </div>
  );
}

function AtsContent({ ats }) {
  if (ats?.overallScore == null) return <Empty>No CV screening result is available yet.</Empty>;
  const factors = [
    ["Skills match", ats.skillsMatch], ["Experience match", ats.experienceMatch],
    ["Education match", ats.educationMatch], ["Projects match", ats.projectsMatch],
    ["Certification match", ats.certificationMatch], ["Keyword match", ats.keywordMatch],
  ].filter(([, value]) => value != null);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#FAFCF8] p-4">
        <span className="text-3xl font-bold text-[#0C1F1B]">{ats.overallScore}%</span>
        <Badge tone={ats.decision === "pass" ? "green" : ats.decision === "fail" ? "red" : ats.decision === "review" ? "amber" : "slate"}>
          {ats.decision === "pass" ? "Meets screening threshold" : ats.decision === "fail" ? "Below screening threshold" : "Needs review"}
        </Badge>
        <span className="text-xs text-[#5B6B63]">{ats.engine === "evidence" ? "Evidence-based ATS" : "Keyword match"}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {factors.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#E3EBE4] p-3">
            <p className="text-xs text-[#5B6B63]">{label}</p>
            <p className="mt-1 text-lg font-bold text-[#0C1F1B]">{value}%</p>
          </div>
        ))}
      </div>
      {!!ats.missingSkills?.length && <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#5B6B63]">Missing skills</p><div className="flex flex-wrap gap-2">{ats.missingSkills.map((skill) => <Badge key={skill} tone="red">{skill}</Badge>)}</div></div>}
    </div>
  );
}

function ClaimsContent({ claimVerification }) {
  const probes = claimVerification?.probes || [];
  if (!probes.length) return <Empty>No resume claims were probed for this candidate.</Empty>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Recorded probes may be planned, unanswered or assessed. A pending probe does not establish that a claim was verified.</p>
      {claimVerification.scoreDelta && (
        <div className="rounded-xl border border-[#E3EBE4] bg-[#FAFCF8] p-4 text-sm text-[#415048]">
          Evidence score: <strong>{claimVerification.scoreDelta.pre?.overallScore ?? "—"}</strong> → <strong>{claimVerification.scoreDelta.post?.overallScore ?? "—"}</strong>
          {claimVerification.scoreDelta.delta != null && ` (${claimVerification.scoreDelta.delta > 0 ? "+" : ""}${claimVerification.scoreDelta.delta})`}
        </div>
      )}
      {probes.map((probe, index) => (
        <article key={probe.claimId || index} className="rounded-xl border border-[#E3EBE4] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-[#0C1F1B]">{probe.question || "Interview probe"}</p>
            <Badge tone={probe.verdict === "verified" ? "green" : probe.verdict === "contradicted" ? "red" : "amber"}>{probe.verdict || probe.status || "Pending"}</Badge>
          </div>
          {probe.resumeQuote && <blockquote className="mt-3 border-l-2 border-violet-300 pl-3 text-sm italic text-[#5B6B63]">Resume: “{probe.resumeQuote}”</blockquote>}
          {probe.answerQuote && <blockquote className="mt-2 border-l-2 border-emerald-300 pl-3 text-sm italic text-[#5B6B63]">Answer: “{probe.answerQuote}”</blockquote>}
          {probe.verdictReasoning && <p className="mt-3 text-sm leading-6 text-[#415048]">{probe.verdictReasoning}</p>}
        </article>
      ))}
    </div>
  );
}

function IntegrityContent({ proctoring }) {
  if (!proctoring) return <Empty>No integrity information is available for this interview.</Empty>;
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">Monitoring observations are not proof of misconduct or a reason to reject on their own. Camera quality issues are not scored.</p>
      <FieldGrid fields={[
        ["Risk band", proctoring.bandWithheld ? "Withheld" : proctoring.displayRiskBand],
        ["Recorded events", proctoring.totalEvents],
        ["Camera monitoring", proctoring.visionEnabled ? "Was active during the session" : "Was not active"],
        ["Identity match", proctoring.identityMatch?.matched === true ? "Matched" : proctoring.identityMatch?.matched === false ? "Not matched" : null],
      ]} />
      {proctoring.bandWithheldReason && <p className="rounded-xl bg-[#FAFCF8] p-4 text-sm text-[#5B6B63]">{proctoring.bandWithheldReason}</p>}
      {!!proctoring.breakdown?.length && <div className="grid gap-3 sm:grid-cols-2">{proctoring.breakdown.map((row, index) => <div key={row.type || index} className="rounded-xl border border-[#E3EBE4] p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-[#0C1F1B]">{row.label || row.type}</p><Badge tone={row.severity === "critical" ? "red" : row.severity === "warning" ? "amber" : "slate"}>{row.count ?? 0}</Badge></div>{row.benignExplanation && <p className="mt-2 text-xs leading-5 text-[#5B6B63]">{row.benignExplanation}</p>}{row.scored === false && <p className="mt-2 text-xs font-semibold text-[#5B6B63]">Not scored</p>}</div>)}</div>}
    </div>
  );
}

function ConversationContent({ interview, history }) {
  const entries = interview?.conversationLog?.length ? interview.conversationLog : interview?.transcript || [];
  if (entries.length) {
    return <div className="space-y-3">{entries.map((entry, index) => <article key={index} className={`rounded-xl border p-4 ${["candidate", "user"].includes(entry.role) ? "border-emerald-100 bg-emerald-50/40" : "border-[#E3EBE4] bg-[#FAFCF8]"}`}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-[#5B6B63]">{entry.role === "ai" || entry.role === "interviewer" ? "AI interviewer" : "Candidate"}</p>{entry.at && <time className="text-xs text-[#5B6B63]">{formatWhen(entry.at)}</time>}</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#415048]">{entry.text || entry.content || "—"}</p></article>)}</div>;
  }
  if (history?.length) {
    return <ol className="relative ml-2 space-y-4 border-l border-[#C5D2C8] pl-6">{[...history].reverse().map((entry, index) => <li key={index} className="relative"><span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-brand-600 ring-4 ring-[#EAF8E4]" /><p className="font-semibold text-[#0C1F1B]">{stageLabel(entry.stage)}</p><p className="text-xs text-[#5B6B63]">{formatWhen(entry.at)}{entry.by ? ` · ${entry.by}` : ""}</p>{entry.note && <p className="mt-1 text-sm text-[#415048]">{entry.note}</p>}</li>)}</ol>;
  }
  return <Empty>No interview or candidate activity log is available.</Empty>;
}

// THESIS: one recruiter workspace; evidence and human judgement remain distinct.
// OWN-WORLD: retain AptusHire forest, Inter, restrained rules and labelled controls.
// STORY: locate application, inspect the recorded attempt, record a human note, then act explicitly.
// FIRST VIEWPORT: identity and review action, five grouped destinations, compact evidence limitations.
// FORM: user-approved refinement, not a new visual world; contextual subsections replace the mixed dropdown.
export default function CandidatePortal({ candidate, timeline, session, assessment, report, onResumeDownload, onManage, onReviewRecorded, onReload, profileEvidence, onOpenInterviewReport, onReviewEvidence, initialView }) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const [drafts, setDrafts] = useState({});
  const aliases = { "summary-report": "ai-interview", "overall-score": "ai-interview", evaluation: "ai-interview", "evaluation-detail": "ai-interview", recording: "ai-interview", "full-log": "timeline", "ats-breakdown": "cv-screening", "cv-analysis": "cv-screening", "profile-menu": "resume", "evaluation-menu": "ai-interview", "application-menu": "timeline" };
  const requested = params.get("section");
  const defaultInitial = initialView || "ai-summary";
  const view = aliases[requested] || (Object.hasOwn(VIEW_TITLES, requested) ? requested : defaultInitial);
  const groups = [
    { id: "ai-summary", label: "Overview", views: ["ai-summary"] },
    { id: "resume", label: "Profile & CV", views: ["resume", "skills", "experience", "education", "candidate-details", "cv-screening"] },
    { id: "skill-assessment", label: "Assessments", views: ["skill-assessment"] },
    { id: "ai-interview", label: "Interview", views: ["ai-interview", "assessment-rubric", "claims-probed", "integrity"] },
    { id: "timeline", label: "Activity", views: ["timeline", "process"] },
  ];
  const group = groups.find(item => item.views.includes(view)) || groups[0];
  const setView = (next) => setParams((current) => { const updated = new URLSearchParams(current); updated.set("section", next); return updated; });
  const recorded = recordedStages(timeline?.stageHistory || candidate.stageHistory || []);
  const overallRef = useRef(null);
  const basic = candidate.basicDetails || {};
  const ats = isScored(candidate) ? candidate.ats : null;
  const interview = reviewInterview(report?.interview || session?.aiInterview || session || null);
  const evaluation = interview?.evaluation || session?.aiInterview?.evaluation || session?.evaluation || null;
  const interviewTranscript = interview?.conversationLog?.length
    ? interview.conversationLog
    : interview?.transcript || [];
  const interviewScore = evaluation?.overallScore;
  const overallScore = evaluation ? interviewScore : ats?.overallScore;
  // The headline figure is only the ATS screening score while the candidate is
  // still in the ATS phase — `applied` / `ats_passed`, or rejected before ever
  // advancing. The moment they move on (assessment sent, interview, shortlist,
  // …) it reads as an "Overall Score". Keyed off the FURTHEST stage ever
  // reached, not the current one, so a later rejection doesn't relabel it.
  const atsStageIndex = STAGES.indexOf("ats_passed");
  const peakStageIndex = [
    candidate.status,
    ...(candidate.stageHistory || timeline?.stageHistory || []).map((h) => h.stage),
  ]
    .map((s) => STAGES.indexOf(normalizeStage(s)))
    .reduce((max, i) => (i > max ? i : max), -1);
  const pastAtsStage = peakStageIndex > atsStageIndex;
  const headlineScoreLabel = evaluation ? "Interview score" : "CV screening score";
  const summary = evaluation?.summary || session?.aiInterview?.plan?.summary || session?.interviewPlan?.summary;
  const jobId = candidate.job?._id || (typeof candidate.job === "string" ? candidate.job : null);
  const currentStage = normalizeStage(candidate.status);
  const currentStageIndex = STAGES.indexOf(currentStage);
  const negativeResult = currentStage === "rejected" || ats?.decision === "fail" || evaluation?.recommendation === "no_hire";
  const positiveResult = ["shortlisted", "selected", "offer_accepted", "joined"].includes(currentStage)
    || ats?.decision === "pass"
    || ["hire", "strong_hire"].includes(evaluation?.recommendation);
  const initials = String(basic.name || "Candidate").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  const parent = view === "evaluation-detail"
    ? { view: "evaluation", label: "evaluation" }
    : PROFILE_DETAIL.has(view)
    ? { view: "profile-menu", label: "candidate details" }
    : EVALUATION_DETAIL.has(view)
      ? { view: "evaluation-menu", label: "evaluation details" }
      : APPLICATION_DETAIL.has(view)
        ? { view: "application-menu", label: "application details" }
        : view === "ai-summary"
          ? { view: null, label: "overall result" }
          : null;

  const applicationItems = useMemo(() => [
    { id: "timeline", label: "Application Timeline", description: "Actual application and status events", icon: Clock3, tone: "blue" },
    { id: "process", label: "Process", description: "This candidate’s recruitment progress", icon: ListChecks, tone: "purple" },
    { id: "ats-breakdown", label: "ATS Breakdown", description: "Score, match factors and missing skills", icon: FileSearch, tone: "green" },
  ], []);

  function renderView() {
    if (view === "profile-menu") return <MenuGrid items={PROFILE_ITEMS} onOpen={setView} label="Candidate Details" />;
    if (view === "evaluation-menu") return <EvaluationMenu onOpen={setView} />;
    if (view === "application-menu") return <MenuGrid items={applicationItems} onOpen={setView} label="Application Details" />;

    if (view === "resume") return <div className="space-y-4"><div className="rounded-xl border border-[#E3EBE4] bg-[#FAFCF8] p-5"><FileText className="h-8 w-8 text-brand-700" /><p className="mt-3 font-semibold text-[#0C1F1B] [overflow-wrap:anywhere]">{candidate.resumeOriginalName || "Candidate resume"}</p>{candidate.resumeSizeBytes != null && <p className="mt-1 text-xs text-[#5B6B63]">{Math.max(1, Math.round(candidate.resumeSizeBytes / 1024))} KB uploaded file</p>}<Button className="mt-4" onClick={onResumeDownload}><FileText className="h-4 w-4" /> Open resume</Button></div>{candidate.resumeText && <div><h3 className="mb-2 font-semibold text-[#0C1F1B]">Extracted resume content</h3><div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[#E3EBE4] p-4 text-sm leading-6 text-[#415048]">{candidate.resumeText}</div></div>}</div>;
    if (view === "skills") return candidate.skills?.length ? <div className="flex flex-wrap gap-2">{candidate.skills.map((skill) => <Badge key={skill} tone="slate">{skill}</Badge>)}</div> : <Empty />;
    if (view === "experience") return candidate.experience?.length ? <div className="space-y-3">{candidate.experience.map((item, index) => <div key={index} className="rounded-xl border border-[#E3EBE4] p-4"><p className="font-semibold text-[#0C1F1B]">{item.role || "Role not specified"}{item.company ? ` · ${item.company}` : ""}</p>{(item.startDate || item.endDate || item.currentlyWorking) && <p className="mt-1 text-xs text-[#5B6B63]">{item.startDate || "Start not provided"} — {item.currentlyWorking ? "Present" : item.endDate || "End not provided"}</p>}{item.description && <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#415048]">{item.description}</p>}</div>)}</div> : <Empty />;
    if (view === "education") return candidate.education?.length ? <div className="space-y-3">{candidate.education.map((item, index) => <div key={index} className="rounded-xl border border-[#E3EBE4] p-4"><p className="font-semibold text-[#0C1F1B]">{item.degree || "Qualification"}{item.fieldOfStudy ? ` in ${item.fieldOfStudy}` : ""}</p>{item.institution && <p className="mt-1 text-sm text-[#415048]">{item.institution}</p>}<p className="mt-1 text-xs text-[#5B6B63]">{[item.startYear, item.endYear].filter(Boolean).join(" — ")}{item.grade ? ` · Grade: ${item.grade}` : ""}</p></div>)}</div> : <Empty />;
    if (view === "candidate-details") return <div className="space-y-6"><FieldGrid fields={[["Name", basic.name], ["Email", basic.email], ["Phone", basic.phone], ["Location", basic.location], ["LinkedIn", basic.linkedinUrl], ["Portfolio", basic.portfolioUrl], ["Applied for", candidate.job?.title], ["Application source", candidate.source?.channel], ["Applied", formatWhen(candidate.createdAt)]]} />{!!candidate.projects?.length && <div><h3 className="mb-3 font-semibold text-[#0C1F1B]">Projects</h3><div className="space-y-2">{candidate.projects.map((project, index) => <div key={index} className="rounded-xl bg-[#FAFCF8] p-3"><p className="font-medium text-[#0C1F1B]">{project.title}</p>{project.techStack && <p className="text-xs text-[#5B6B63]">{project.techStack}</p>}{project.description && <p className="mt-2 text-sm text-[#415048]">{project.description}</p>}</div>)}</div></div>}{!!candidate.certificates?.length && <div><h3 className="mb-3 font-semibold text-[#0C1F1B]">Certificates</h3><div className="flex flex-wrap gap-2">{candidate.certificates.map((certificate, index) => <Badge key={index} tone="slate">{certificate.name}{certificate.issuer ? ` · ${certificate.issuer}` : ""}</Badge>)}</div></div>}</div>;
    if (view === "ai-summary") {
      const history = timeline?.stageHistory || candidate.stageHistory || [];
      const latest = history[history.length - 1];
      const review = interview?.recruiterReview;
      return <div className="space-y-5 text-sm text-slate-700">
        <div className="grid gap-5 sm:grid-cols-2">
          <div><h2 className="font-semibold text-slate-950">Application now</h2><p className="mt-2">{stageLabel(candidate.status)}</p><button className="mt-2 font-medium text-brand-700 underline" onClick={() => setView("process")}>See recorded lifecycle</button></div>
          <div><h2 className="font-semibold text-slate-950">Latest recorded activity</h2><p className="mt-2">{latest ? (activityLabel(latest, interview) || stageLabel(latest.stage)) + " · " + formatWhen(latest.at) : "No stage activity recorded"}</p>{latest?.note && <p className="mt-1 break-words">{latest.note}</p>}<button className="mt-2 font-medium text-brand-700 underline" onClick={() => setView("timeline")}>View activity</button></div>
        </div>
        <div className="border-t border-slate-200 pt-5"><h2 className="font-semibold text-slate-950">Interview evidence</h2><p className="mt-2">{interview?.status ? interview.status.replaceAll("_", " ") : "No interview recorded"}{review?.eligible ? review.required ? " · Recruiter review pending" : " · Recruiter review recorded" : ""}</p>
          {evaluation?.reviewReason && <p className="mt-2">{evaluation.reviewReason}</p>}
          {report?.hasInterview && (
            <button
              className="mt-3 min-h-11 font-medium text-brand-700 underline"
              onClick={() => {
                if (onReviewEvidence) onReviewEvidence();
                else if (onOpenInterviewReport) onOpenInterviewReport();
                else setView("ai-interview");
              }}
            >
              {review?.required ? "Review evidence and record your note" : "Open interview evidence"}
            </button>
          )}
          <p className="mt-2 text-xs text-slate-600">Application stage, interview outcome and recruiter review are separate records.</p>
        </div>
        <details className="border-t border-slate-200 pt-4"><summary className="cursor-pointer font-medium">Read AI summary</summary><div className="mt-3 max-w-prose"><Narrative text={summary} /></div></details>
      </div>;
    }
    if (view === "cv-screening") return <div className="space-y-5"><h2 className="font-semibold">Automated CV screening</h2><AtsContent ats={ats} /><p className="text-xs text-slate-600">This screening result is separate from the application stage and any recruiter decision.</p>{report?.coverage?.cvAnalysis && <details className="border-t border-slate-200 pt-4"><summary className="cursor-pointer font-medium">Document checks and methodology</summary><div className="mt-3"><CvAnalysisCards analysis={report.coverage.cvAnalysis} /></div></details>}</div>;
    if (view === "skill-assessment") {
      const sessionObj = assessment?.session || (assessment?._id ? assessment : null);
      const decisionObj = assessment?.decision || candidate?.assessmentDecision || null;
      const result = sessionObj?.result;
      if (!sessionObj && !decisionObj) return <Empty>No skill assessment record is available. Check Hiring actions for available assessment controls.</Empty>;
      const assessmentScore = result?.totalItems ? Math.round((result.totalCorrect / result.totalItems) * 100) : (sessionObj?.score ?? null);
      return <div className="space-y-5"><div className="grid items-center gap-5 md:grid-cols-[12rem_1fr]"><CircularScore value={assessmentScore} label="Assessment Score" verdict={result ? "Completed" : sessionObj?.status?.replaceAll("_", " ") || decisionObj?.action} /><div className="rounded-xl border border-[#DCE5EA] p-5"><h3 className="font-bold text-[#0C1F1B]">Skill Breakdown</h3><div className="mt-4 space-y-4">{result?.perCriterion?.length ? result.perCriterion.map((criterion) => <MetricMeter key={criterion.criterionId} label={criterion.label || criterion.criterionId} value={criterion.itemCount ? Math.round((criterion.correctCount / criterion.itemCount) * 100) : null} />) : <Empty>No criterion scores are available yet.</Empty>}</div></div></div><div className="rounded-xl border border-blue-100 bg-blue-50/60 p-5"><h3 className="font-bold text-[#0C1F1B]">Detailed Analysis</h3><FieldGrid fields={[["Status", sessionObj?.status || decisionObj?.action], ["Difficulty", sessionObj?.difficultyTier?.value], ["Assigned by", sessionObj?.assignment?.assignedByName || decisionObj?.byName], ["Completed", formatWhen(result?.scoredAt || decisionObj?.at)], ["Result", result ? `${result.totalCorrect}/${result.totalItems} correct` : null]]} /></div></div>;
    }
    if (view === "claims-probed") return <ClaimsContent claimVerification={report?.claimVerification} />;
    if (view === "ai-interview") {
      if (!interview) return <Empty>No interview has been recorded yet. Scheduling controls are in Hiring actions.</Empty>;
      return <div className="space-y-5">
        <InterviewSummary interview={interview} />
        {session?.interviewAt && <details className="text-xs text-slate-600"><summary className="cursor-pointer">Scheduling record</summary><p className="mt-2">Stored scheduled time: {interviewDate(session.interviewAt)}. Actual attempt timing is shown above; this schedule does not establish when the interview took place.</p></details>}
        <InterviewWorkspace candidateId={candidate._id} interview={interview} onRecorded={onReviewRecorded} onReload={onReload} draftNote={drafts[`${candidate._id}:${interview.attempt}`] || ""} onDraftChange={note => setDrafts(current => ({ ...current, [`${candidate._id}:${interview.attempt}`]: note }))} />
        <details className="border-t border-slate-200 pt-4"><summary className="cursor-pointer text-sm font-semibold">Criteria and evidence coverage</summary><div className="mt-3">{report?.coverage?.rows?.length ? <RubricTable coverage={report.coverage} /> : <Empty>No criteria were assessed for this interview.</Empty>}</div></details>
      </div>;
    }
    if (view === "assessment-rubric") return report?.coverage?.rows?.length ? <RubricTable coverage={report.coverage} /> : <div className="space-y-4"><Empty>No evaluated rubric details are available for this candidate.</Empty>{jobId && <Button as={Link} to={`/jobs?jobId=${jobId}&tab=rubric`} variant="outline">Open role rubric</Button>}</div>;
    if (view === "integrity") return <IntegrityContent proctoring={report?.proctoring} />;
    if (view === "timeline") { const history = timeline?.stageHistory || candidate.stageHistory || []; return history.length ? <ol className="relative ml-2 space-y-5 border-l border-[#C5D2C8] pl-6">{history.map((item, index) => <li key={index} className="relative"><span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-brand-600 ring-4 ring-[#EAF8E4]" /><p className="font-semibold text-[#0C1F1B]">{activityLabel(item, interview) || stageLabel(item.stage)}</p><p className="text-xs text-[#5B6B63]">{formatWhen(item.at)}{typeof item.by === "string" ? ` · ${item.by}` : ""}</p>{item.note && <p className="mt-1 text-sm text-[#415048]">{item.note}</p>}</li>)}</ol> : <Empty>No application events are available.</Empty>; }
    if (view === "process") return <div className="space-y-2">{STAGES.map((stage, index) => { const reached = recorded.has(stage); const active = stage === currentStage; return <div key={stage} className={`flex items-center gap-3 rounded-xl border p-3 ${active ? "border-brand-300 bg-[#EAF8E4]" : "border-[#E3EBE4]"}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${reached ? "bg-brand-600 text-white" : "bg-[#F0F3F1] text-[#7A8A80]"}`}>{index + 1}</span><span className={`text-sm ${active ? "font-bold text-brand-800" : reached ? "font-medium text-[#0C1F1B]" : "text-slate-600"}`}>{stageLabel(stage)}</span>{<Badge tone={active ? "brand" : "slate"}>{active ? "Current" : reached ? "Recorded" : "Not recorded"}</Badge>}</div>; })}</div>;
    return null;
  }

  return (
    <section className="min-w-0 rounded-xl border border-hairline bg-white">
      <header className="rule-b p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 select-none items-center justify-center rounded-lg border border-hairline bg-slate-100 text-base font-bold tracking-tight text-slate-700">{(basic.name || "?").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase()}</span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 [overflow-wrap:anywhere]">{basic.name || "Candidate"}</h1>
              <p className="mt-1 text-sm font-semibold text-slate-700">{jobId ? <Link className="underline" to={`/jobs/${jobId}/candidates`}>{candidate.job?.title || "View role"}</Link> : "Archived role"}</p>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-slate-600">
                {basic.email && <a href={`mailto:${basic.email}`} className="inline-flex min-w-0 items-center gap-1.5 break-all hover:text-brand-800 hover:underline"><Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{basic.email}</a>}
                {basic.phone && <a href={`tel:${basic.phone}`} className="inline-flex items-center gap-1.5 hover:text-brand-800"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{basic.phone}</a>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={stageTone(candidate.status)}>{stageLabel(candidate.status)}</Badge>
            {interview?.recruiterReview?.eligible && (
              <Button
                onClick={() => {
                  if (onReviewEvidence) {
                    onReviewEvidence();
                  } else if (onOpenInterviewReport) {
                    onOpenInterviewReport();
                  } else {
                    setView("ai-interview");
                    requestAnimationFrame(() => document.getElementById("sec-review")?.scrollIntoView({ block: "center" }));
                  }
                }}
              >
                {interview.recruiterReview.required ? "Review evidence" : "View recruiter review"}
              </Button>
            )}
            <Button variant="outline" onClick={onManage}>Hiring actions</Button>
          </div>
        </div>
        <div className="rule-t mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 text-xs text-slate-700">
          <span>CV screening: <strong>{ats?.overallScore == null ? "Not scored" : `${ats.overallScore}/100`}</strong></span>
          <span>Interview: <strong>{evaluation?.reviewReason || interview?.status === "ended_early" ? "Limited evidence" : interviewScore == null ? "Not scored" : `${interviewScore}/100`}</strong></span>
          <button type="button" onClick={onResumeDownload} className="inline-flex min-h-11 items-center font-medium text-brand-700 underline">Download CV</button>
        </div>
      </header>
      <div className="sm:sticky sm:top-14 z-10 rounded-t-lg border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-2 text-xs text-slate-600"><span className="font-semibold">{basic.name || "Candidate"} · {stageLabel(candidate.status)}</span>{interview?.recruiterReview?.eligible && <span>{interview.recruiterReview.required ? "Recruiter review pending" : "Recruiter review recorded"}</span>}</div>
        <nav aria-label="Candidate sections" className="flex flex-wrap gap-1 px-3 py-2">
          {groups.map(item => <button key={item.id} type="button" aria-current={group.id === item.id ? "page" : undefined} onClick={() => setView(item.id)} className={`min-h-11 rounded-lg px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand-600 ${group.id === item.id ? "bg-emerald-100 text-emerald-800" : "text-slate-700 hover:bg-slate-100"}`}>{item.label}</button>)}
        </nav>
      </div>
      {group.views.length > 1 && <nav aria-label={group.label + " subsections"} className="flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-200 px-5 py-2">{group.views.map(key => <button key={key} type="button" aria-current={view === key ? "page" : undefined} className={`min-h-11 text-sm underline-offset-4 ${view === key ? "font-semibold text-brand-800 underline" : "text-slate-600 hover:underline"}`} onClick={() => setView(key)}>{({ "ai-interview": "Evidence & review", "candidate-details": "Projects & details", "assessment-rubric": "Criteria", "claims-probed": "Claims & probes", "cv-screening": "CV screening", timeline: "Events", process: "Recorded stages", integrity: "Monitoring" })[key] || VIEW_TITLES[key]}</button>)}</nav>}
      <div className="min-w-0 p-4 sm:p-5">{renderView()}{view === "resume" && profileEvidence}{view === "timeline" && candidate.offer?.status && candidate.offer.status !== "none" && <p className="mt-4 text-sm">Offer status: {candidate.offer.status}{candidate.offer.sentAt ? ` · Sent ${formatWhen(candidate.offer.sentAt)}` : ""}</p>}</div>
    </section>
  );
}
