import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
const CARD_TONE = "border-[#E5EBE7] bg-white text-[#176B45]";
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
  return <p className="rounded-xl border border-dashed border-[#D7E0DA] bg-[#F8FAF9] p-5 text-sm text-[#64736A]">{children}</p>;
}

function MenuGrid({ items, onOpen, label = "Section Details" }) {
  const gridClass = items.length === 3
    ? "sm:grid-cols-3"
    : items.length === 5
      ? "sm:grid-cols-2 lg:grid-cols-5"
      : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-[#E5EBE7] bg-[#F1F7F3] px-4 py-1.5 text-sm font-semibold text-[#176B45]">
        <Sparkles className="h-4 w-4" aria-hidden="true" /> {label}
      </div>
      <div className="mx-auto hidden h-7 w-px bg-[#E5EBE7] sm:block" aria-hidden="true" />
      <div className="relative">
        <span className="absolute left-[6%] right-[6%] top-0 hidden h-px bg-[#E5EBE7] sm:block" aria-hidden="true" />
        <div className={`grid gap-3 pt-4 ${gridClass}`}>
          {items.map(({ id, label: itemLabel, description, icon: Icon, tone = "green" }) => (
            <button
              key={id}
              type="button"
              onClick={() => onOpen(id)}
              className={`group relative flex min-h-32 min-w-0 flex-col items-center justify-center rounded-xl border p-4 text-center shadow-sm transition-colors duration-150 hover:border-[#C7DDD1] hover:bg-[#F8FAF9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${CARD_TONES[tone]}`}
            >
              <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
              <span className="mt-3 block text-sm font-semibold text-[#17221C]">{itemLabel}</span>
              <span className="mt-1 block text-[11px] leading-4 text-[#64736A]">{description}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="mx-auto mt-6 max-w-sm rounded-full border border-[#E5EBE7] bg-[#F8FAF9] px-5 py-2 text-center text-xs text-[#64736A]">Click any section to view details</p>
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
        <div key={label} className="min-w-0 border-b border-[#E5EBE7] pb-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[#7A8A80]">{label}</dt>
          <dd className="mt-1 text-sm text-[#17221C] [overflow-wrap:anywhere]">{String(value)}</dd>
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
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;
  const score = Math.max(0, Math.min(100, numericValue));
  const color = score >= 70 ? "bg-emerald-500" : score >= 50 ? "bg-amber-400" : "bg-rose-500";

  return (
    <div className="rounded-xl border border-[#E5EBE7] bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#17221C]">{label}</p>
        <p className="text-sm font-bold tabular-nums text-[#17221C]">{numericValue}/100</p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[#E9EEEB]" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function CircularScore({ value, label, verdict }) {
  const numericValue = Number(value);
  const score = Number.isFinite(numericValue) ? Math.max(0, Math.min(100, numericValue)) : 0;
  return (
    <div className="flex flex-col items-center text-center">
      <div className="grid h-28 w-28 place-items-center rounded-full" style={{ background: `conic-gradient(#176B45 ${score * 3.6}deg, #E5EBE7 0deg)` }} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number.isFinite(numericValue) ? score : undefined}>
        <div className="grid h-[82px] w-[82px] place-items-center rounded-full bg-white text-2xl font-bold text-[#17221C]">
          {Number.isFinite(numericValue) ? `${Math.round(numericValue)}%` : "—"}
        </div>
      </div>
      {label && <p className="mt-2 text-sm text-[#64736A]">{label}</p>}
      {verdict && <span className="mt-2 rounded-full border border-[#E5EBE7] bg-[#F1F7F3] px-4 py-1 text-xs font-semibold text-[#415048]">{verdict}</span>}
    </div>
  );
}

function RubricTable({ coverage }) {
  const rows = coverage?.rows || [];
  if (!rows.length) return null;
  const status = {
    proven: { label: "Passed", className: "bg-emerald-100 text-emerald-800" },
    failed: { label: "Failed", className: "bg-rose-100 text-rose-700" },
    insufficient: { label: "Not tested", className: "bg-amber-100 text-amber-800" },
  };
  return (
    <div className="overflow-hidden rounded-xl border border-[#DCE5EA]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="bg-[#F5F8FA] text-xs text-[#44516B]"><tr><th className="px-4 py-3 font-semibold">Criteria</th><th className="px-4 py-3 font-semibold">Weight</th><th className="px-4 py-3 font-semibold">Evidence</th><th className="px-4 py-3 font-semibold">Result</th></tr></thead>
          <tbody className="divide-y divide-[#E5EBE7]">
            {rows.map((row) => {
              const result = status[row.bucket] || status.insufficient;
              return <tr key={row.criterionId}><td className="px-4 py-3 font-semibold text-[#17221C]">{row.label}</td><td className="px-4 py-3 tabular-nums text-[#415048]">{Math.round((row.weight || 0) * 100)}%</td><td className="max-w-sm px-4 py-3 text-xs leading-5 text-[#64736A]">{row.evidence || "No evidence recorded"}</td><td className="px-4 py-3"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${result.className}`}>{result.label}</span></td></tr>;
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50 px-4 py-4 text-sm">
        <span className="font-semibold text-emerald-900">Total criteria: {rows.length}</span>
        <span className="rounded-full bg-emerald-100 px-4 py-1.5 font-semibold text-emerald-800">{rows.filter((row) => row.bucket === "proven").length} passed</span>
      </div>
    </div>
  );
}

function EvaluationDetailView({ evaluation }) {
  const [tab, setTab] = useState("summary");
  const tabs = [["summary", "Evaluation Summary"], ["scores", "Competency Scores"], ["feedback", "Recruiter Feedback"]];
  return (
    <div>
      <div className="flex overflow-x-auto border-b border-[#DCE5EA]">
        {tabs.map(([id, label]) => <button key={id} type="button" onClick={() => setTab(id)} className={`shrink-0 border-b-2 px-3 py-3 text-sm font-semibold ${tab === id ? "border-blue-600 text-blue-700" : "border-transparent text-[#526079]"}`}>{label}</button>)}
      </div>
      {tab === "summary" && <div className="mt-4 space-y-4"><div className="rounded-xl border border-blue-100 bg-blue-50/60 p-5"><p className="font-bold text-[#17221C]">Overall Assessment</p><div className="mt-2"><Narrative text={evaluation?.summary} /></div></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-5"><p className="font-bold text-emerald-900">Key Strengths</p>{evaluation?.strengths?.length ? <ul className="mt-3 space-y-2 text-sm text-[#415048]">{evaluation.strengths.map((item, index) => <li key={index} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{item}</li>)}</ul> : <p className="mt-2 text-sm text-[#64736A]">No strengths recorded.</p>}</div><div className="rounded-xl border border-rose-100 bg-rose-50/60 p-5"><p className="font-bold text-rose-800">Areas of Concern</p>{evaluation?.weaknesses?.length ? <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#415048]">{evaluation.weaknesses.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p className="mt-2 text-sm text-[#64736A]">No concerns recorded.</p>}</div></div><div className="rounded-xl border border-amber-100 bg-amber-50/70 p-5"><p className="font-bold text-[#17221C]">Recommendation</p><p className="mt-1 text-sm capitalize text-[#415048]">{evaluation?.recommendation?.replaceAll("_", " ") || "Not recorded"}</p></div></div>}
      {tab === "scores" && <div className="mt-4 grid gap-3 sm:grid-cols-2"><MetricMeter label="Communication" value={evaluation?.communication} /><MetricMeter label="Technical knowledge" value={evaluation?.technicalKnowledge} /><MetricMeter label="Problem solving" value={evaluation?.problemSolving} /><MetricMeter label="Confidence" value={evaluation?.confidence} /></div>}
      {tab === "feedback" && <div className="mt-4 rounded-xl border border-[#DCE5EA] bg-[#F8FAF9] p-5"><Narrative text={evaluation?.reviewReason || evaluation?.summary} /></div>}
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
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#F8FAF9] p-4">
        <span className="text-3xl font-bold text-[#17221C]">{ats.overallScore}%</span>
        <Badge tone={ats.decision === "pass" ? "green" : ats.decision === "fail" ? "red" : ats.decision === "review" ? "amber" : "slate"}>
          {ats.decision || "Pending"}
        </Badge>
        <span className="text-xs text-[#64736A]">{ats.engine === "evidence" ? "Evidence-based ATS" : "Keyword match"}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {factors.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#E5EBE7] p-3">
            <p className="text-xs text-[#64736A]">{label}</p>
            <p className="mt-1 text-lg font-bold text-[#17221C]">{value}%</p>
          </div>
        ))}
      </div>
      {!!ats.missingSkills?.length && <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64736A]">Missing skills</p><div className="flex flex-wrap gap-2">{ats.missingSkills.map((skill) => <Badge key={skill} tone="red">{skill}</Badge>)}</div></div>}
    </div>
  );
}

function ClaimsContent({ claimVerification }) {
  const probes = claimVerification?.probes || [];
  if (!probes.length) return <Empty>No resume claims were probed for this candidate.</Empty>;
  return (
    <div className="space-y-4">
      {claimVerification.scoreDelta && (
        <div className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-4 text-sm text-[#415048]">
          Evidence score: <strong>{claimVerification.scoreDelta.pre?.overallScore ?? "—"}</strong> → <strong>{claimVerification.scoreDelta.post?.overallScore ?? "—"}</strong>
          {claimVerification.scoreDelta.delta != null && ` (${claimVerification.scoreDelta.delta > 0 ? "+" : ""}${claimVerification.scoreDelta.delta})`}
        </div>
      )}
      {probes.map((probe, index) => (
        <article key={probe.claimId || index} className="rounded-xl border border-[#E5EBE7] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-[#17221C]">{probe.question || "Interview probe"}</p>
            <Badge tone={probe.verdict === "verified" ? "green" : probe.verdict === "contradicted" ? "red" : "amber"}>{probe.verdict || probe.status || "Pending"}</Badge>
          </div>
          {probe.resumeQuote && <blockquote className="mt-3 border-l-2 border-violet-300 pl-3 text-sm italic text-[#64736A]">Resume: “{probe.resumeQuote}”</blockquote>}
          {probe.answerQuote && <blockquote className="mt-2 border-l-2 border-emerald-300 pl-3 text-sm italic text-[#64736A]">Answer: “{probe.answerQuote}”</blockquote>}
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
      <FieldGrid fields={[
        ["Risk band", proctoring.bandWithheld ? "Withheld" : proctoring.displayRiskBand],
        ["Risk score", proctoring.bandWithheld ? null : proctoring.displayRiskScore],
        ["Recorded findings", proctoring.totalEvents],
        ["Camera monitoring", proctoring.visionEnabled ? "Active" : "Not active"],
        ["Identity match", proctoring.identityMatch?.matched === true ? "Matched" : proctoring.identityMatch?.matched === false ? "Not matched" : null],
      ]} />
      {proctoring.bandWithheldReason && <p className="rounded-xl bg-[#F8FAF9] p-4 text-sm text-[#64736A]">{proctoring.bandWithheldReason}</p>}
      {!!proctoring.breakdown?.length && <div className="grid gap-3 sm:grid-cols-2">{proctoring.breakdown.map((row, index) => <div key={row.type || index} className="rounded-xl border border-[#E5EBE7] p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-[#17221C]">{row.label || row.type}</p><Badge tone={row.severity === "critical" ? "red" : row.severity === "warning" ? "amber" : "slate"}>{row.count ?? 0}</Badge></div>{row.benignExplanation && <p className="mt-2 text-xs leading-5 text-[#64736A]">{row.benignExplanation}</p>}{row.scored === false && <p className="mt-2 text-xs font-semibold text-[#64736A]">Not scored</p>}</div>)}</div>}
    </div>
  );
}

function ConversationContent({ interview, history }) {
  const entries = interview?.conversationLog?.length ? interview.conversationLog : interview?.transcript || [];
  if (entries.length) {
    return <div className="space-y-3">{entries.map((entry, index) => <article key={index} className={`rounded-xl border p-4 ${["candidate", "user"].includes(entry.role) ? "border-emerald-100 bg-emerald-50/40" : "border-[#E5EBE7] bg-[#F8FAF9]"}`}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-[#64736A]">{entry.role === "ai" || entry.role === "interviewer" ? "AI interviewer" : "Candidate"}</p>{entry.at && <time className="text-xs text-[#9BAAA1]">{formatWhen(entry.at)}</time>}</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#415048]">{entry.text || entry.content || "—"}</p></article>)}</div>;
  }
  if (history?.length) {
    return <ol className="relative ml-2 space-y-4 border-l border-[#D7E0DA] pl-6">{[...history].reverse().map((entry, index) => <li key={index} className="relative"><span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-brand-600 ring-4 ring-[#E8F2EC]" /><p className="font-semibold text-[#17221C]">{stageLabel(entry.stage)}</p><p className="text-xs text-[#64736A]">{formatWhen(entry.at)}{entry.by ? ` · ${entry.by}` : ""}</p>{entry.note && <p className="mt-1 text-sm text-[#415048]">{entry.note}</p>}</li>)}</ol>;
  }
  return <Empty>No interview or candidate activity log is available.</Empty>;
}

export default function CandidatePortal({ candidate, timeline, session, assessment, report, onResumeDownload }) {
  const [view, setView] = useState(null);
  const overallRef = useRef(null);
  const basic = candidate.basicDetails || {};
  const ats = candidate.ats;
  const interview = report?.interview || session?.aiInterview || session || null;
  const evaluation = interview?.evaluation || session?.evaluation || null;
  const interviewTranscript = interview?.conversationLog?.length
    ? interview.conversationLog
    : interview?.transcript || [];
  const interviewScore = evaluation?.overallScore;
  const overallScore = interviewScore ?? ats?.overallScore;
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
  const headlineScoreLabel = pastAtsStage ? "Overall Score" : "ATS Score";
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

    if (view === "resume") return <div className="space-y-4"><div className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-5"><FileText className="h-8 w-8 text-brand-700" /><p className="mt-3 font-semibold text-[#17221C] [overflow-wrap:anywhere]">{candidate.resumeOriginalName || "Candidate resume"}</p>{candidate.resumeSizeBytes != null && <p className="mt-1 text-xs text-[#64736A]">{Math.max(1, Math.round(candidate.resumeSizeBytes / 1024))} KB uploaded file</p>}<Button className="mt-4" onClick={onResumeDownload}><FileText className="h-4 w-4" /> Open resume</Button></div>{candidate.resumeText && <div><h3 className="mb-2 font-semibold text-[#17221C]">Extracted resume content</h3><div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[#E5EBE7] p-4 text-sm leading-6 text-[#415048]">{candidate.resumeText}</div></div>}</div>;
    if (view === "skills") return candidate.skills?.length ? <div className="flex flex-wrap gap-2">{candidate.skills.map((skill) => <Badge key={skill} tone="slate">{skill}</Badge>)}</div> : <Empty />;
    if (view === "experience") return candidate.experience?.length ? <div className="space-y-3">{candidate.experience.map((item, index) => <div key={index} className="rounded-xl border border-[#E5EBE7] p-4"><p className="font-semibold text-[#17221C]">{item.role || "Role not specified"}{item.company ? ` · ${item.company}` : ""}</p>{(item.startDate || item.endDate || item.currentlyWorking) && <p className="mt-1 text-xs text-[#64736A]">{item.startDate || "Start not provided"} — {item.currentlyWorking ? "Present" : item.endDate || "End not provided"}</p>}{item.description && <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#415048]">{item.description}</p>}</div>)}</div> : <Empty />;
    if (view === "education") return candidate.education?.length ? <div className="space-y-3">{candidate.education.map((item, index) => <div key={index} className="rounded-xl border border-[#E5EBE7] p-4"><p className="font-semibold text-[#17221C]">{item.degree || "Qualification"}{item.fieldOfStudy ? ` in ${item.fieldOfStudy}` : ""}</p>{item.institution && <p className="mt-1 text-sm text-[#415048]">{item.institution}</p>}<p className="mt-1 text-xs text-[#64736A]">{[item.startYear, item.endYear].filter(Boolean).join(" — ")}{item.grade ? ` · Grade: ${item.grade}` : ""}</p></div>)}</div> : <Empty />;
    if (view === "candidate-details") return <div className="space-y-6"><FieldGrid fields={[["Name", basic.name], ["Email", basic.email], ["Phone", basic.phone], ["Location", basic.location], ["LinkedIn", basic.linkedinUrl], ["Portfolio", basic.portfolioUrl], ["Applied for", candidate.job?.title], ["Application source", candidate.source?.channel], ["Applied", formatWhen(candidate.createdAt)]]} />{!!candidate.projects?.length && <div><h3 className="mb-3 font-semibold text-[#17221C]">Projects</h3><div className="space-y-2">{candidate.projects.map((project, index) => <div key={index} className="rounded-xl bg-[#F8FAF9] p-3"><p className="font-medium text-[#17221C]">{project.title}</p>{project.techStack && <p className="text-xs text-[#64736A]">{project.techStack}</p>}{project.description && <p className="mt-2 text-sm text-[#415048]">{project.description}</p>}</div>)}</div></div>}{!!candidate.certificates?.length && <div><h3 className="mb-3 font-semibold text-[#17221C]">Certificates</h3><div className="flex flex-wrap gap-2">{candidate.certificates.map((certificate, index) => <Badge key={index} tone="slate">{certificate.name}{certificate.issuer ? ` · ${certificate.issuer}` : ""}</Badge>)}</div></div>}</div>;
    if (view === "ai-summary" || view === "summary-report") return <div className="space-y-6"><Narrative text={summary} />{!!evaluation?.strengths?.length && <div><h3 className="mb-2 font-semibold text-[#17221C]">Strengths</h3><ul className="space-y-2">{evaluation.strengths.map((item, index) => <li key={index} className="flex gap-2 text-sm text-[#415048]"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{item}</li>)}</ul></div>}{!!evaluation?.weaknesses?.length && <div><h3 className="mb-2 font-semibold text-[#17221C]">Concerns</h3><ul className="list-disc space-y-2 pl-5 text-sm text-[#415048]">{evaluation.weaknesses.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}{evaluation?.recommendation && <div className="rounded-xl bg-[#F8FAF9] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#64736A]">Recommendation</p><p className="mt-1 font-semibold capitalize text-[#17221C]">{evaluation.recommendation.replaceAll("_", " ")}</p>{evaluation.reviewReason && <p className="mt-2 text-sm text-[#64736A]">{evaluation.reviewReason}</p>}</div>}</div>;
    if (view === "overall-score") return <div className="space-y-5"><div className={`rounded-2xl border p-6 text-center ${negativeResult ? "border-red-200 bg-red-50" : positiveResult ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#64736A]">{pastAtsStage ? "Overall score" : "ATS score"}</p><p className="mt-2 text-5xl font-black text-[#17221C]">{overallScore != null ? `${overallScore}%` : "—"}</p>{!pastAtsStage && <p className="mt-2 text-xs text-[#64736A]">This is the résumé screening score. It becomes an overall score once the candidate moves past screening.</p>}<div className="mt-3"><Badge tone={stageTone(candidate.status)}>{report?.interview?.verdictChip?.label || stageLabel(candidate.status)}</Badge></div></div><FieldGrid fields={[["Current status", stageLabel(candidate.status)], ["Recommendation", evaluation?.recommendation?.replaceAll("_", " ")], ["Questions answered", report?.interview?.substance?.totalAnswers ?? evaluation?.questionsAnswered], ["Questions asked", report?.interview?.substance?.totalQuestions ?? evaluation?.questionsAsked], ["CV screening score", ats?.overallScore != null ? `${ats.overallScore}%` : null], ["Interview score", interviewScore != null ? `${interviewScore}%` : null]]} /></div>;
    if (view === "ats-breakdown") return <AtsContent ats={ats} />;
    if (view === "cv-screening") return ats?.overallScore != null ? <div className="space-y-5"><div className="flex justify-center"><CircularScore value={ats.overallScore} label="CV Match Score" verdict={ats.decision === "pass" ? "Good Match" : ats.decision === "fail" ? "Needs Review" : "Review"} /></div><div className="rounded-xl border border-[#DCE5EA] p-5"><h3 className="font-bold text-[#17221C]">Key Findings</h3><ul className="mt-3 space-y-2 text-sm text-[#415048]">{[["Skills match", ats.skillsMatch], ["Experience match", ats.experienceMatch], ["Education match", ats.educationMatch]].filter(([, value]) => value != null).map(([label, value]) => <li key={label} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{label}: <strong>{value}%</strong></li>)}{ats.missingSkills?.map((skill) => <li key={skill} className="flex items-center gap-2 text-rose-700"><ShieldAlert className="h-4 w-4" />Missing skill: {skill}</li>)}</ul></div></div> : <Empty>No CV screening result is available yet.</Empty>;
    if (view === "skill-assessment") {
      const result = assessment?.session?.result;
      if (!assessment?.session && !assessment?.decision) return <Empty>No skill assessment has been assigned or completed.</Empty>;
      const assessmentScore = result?.totalItems ? Math.round((result.totalCorrect / result.totalItems) * 100) : null;
      return <div className="space-y-5"><div className="grid items-center gap-5 md:grid-cols-[12rem_1fr]"><CircularScore value={assessmentScore} label="Assessment Score" verdict={result ? "Completed" : assessment?.session?.status?.replaceAll("_", " ")} /><div className="rounded-xl border border-[#DCE5EA] p-5"><h3 className="font-bold text-[#17221C]">Skill Breakdown</h3><div className="mt-4 space-y-4">{result?.perCriterion?.length ? result.perCriterion.map((criterion) => <MetricMeter key={criterion.criterionId} label={criterion.label || criterion.criterionId} value={criterion.itemCount ? Math.round((criterion.correctCount / criterion.itemCount) * 100) : null} />) : <Empty>No criterion scores are available yet.</Empty>}</div></div></div><div className="rounded-xl border border-blue-100 bg-blue-50/60 p-5"><h3 className="font-bold text-[#17221C]">Detailed Analysis</h3><FieldGrid fields={[["Status", assessment?.session?.status || assessment?.decision?.action], ["Difficulty", assessment?.session?.difficultyTier?.value], ["Assigned by", assessment?.session?.assignment?.assignedByName || assessment?.decision?.byName], ["Completed", formatWhen(result?.scoredAt || assessment?.decision?.at)], ["Result", result ? `${result.totalCorrect}/${result.totalItems} correct` : null]]} /></div></div>;
    }
    if (view === "claims-probed") return <ClaimsContent claimVerification={report?.claimVerification} />;
    if (view === "cv-analysis") return report?.coverage?.cvAnalysis ? <CvAnalysisCards analysis={report.coverage.cvAnalysis} /> : <Empty>No detailed CV analysis is available.</Empty>;
    if (view === "ai-interview") {
      if (!interview) return <Empty>No AI interview exists for this candidate yet.</Empty>;
      const competency = interview.competencyTriplet || {};
      const metrics = [
        ["Communication", competency.communication ?? evaluation?.communication],
        ["Technical knowledge", competency.technicalKnowledge ?? evaluation?.technicalKnowledge],
        ["Problem solving", competency.problemSolving ?? evaluation?.problemSolving],
        ["Delivery", evaluation?.delivery],
        ["Confidence", evaluation?.confidence],
      ].filter(([, value]) => Number.isFinite(Number(value)));
      const answered = evaluation?.questionsAnswered ?? interview.substance?.totalAnswers;
      const asked = evaluation?.questionsAsked ?? interview.substance?.totalQuestions ?? interview.questionCount;
      const notMeasurable = evaluation?.generatedBy === "fallback" || interview.sessionQuality?.degraded;
      const recommendation = interview.recommendedAction;

      return (
        <div className="space-y-6">
          <FieldGrid fields={[
            ["Status", interview.status?.replaceAll("_", " ")],
            ["Scheduled", formatWhen(session?.interviewAt)],
            ["Completed", formatWhen(interview.completedAt)],
            ["Recommendation", evaluation?.recommendation?.replaceAll("_", " ")],
          ]} />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setView("recording")}><PlayCircle className="h-4 w-4" /> View recording</Button>
            <Button variant="outline" onClick={() => document.getElementById("candidate-interview-transcript")?.scrollIntoView({ behavior: "smooth", block: "start" })}>View transcript <ArrowDown className="h-4 w-4" /></Button>
          </div>
          <InstrumentScoreCard
            title="AI interview score"
            gauge={{
              value: notMeasurable ? null : interviewScore,
              max: 100,
              display: notMeasurable ? "—" : interviewScore ?? "—",
              verdict: interview.verdictChip || null,
              caption: answered != null && asked != null ? `${answered} answered of ${asked} asked` : "Not scored yet",
            }}
            narrative={notMeasurable ? null : evaluation?.summary}
            tabs={[
              {
                key: "recommendations",
                label: "Recommendations",
                tone: "recommend",
                items: [
                  recommendation?.action && recommendation?.justification
                    ? `${recommendation.action.replaceAll("_", " ")} — ${recommendation.justification}`
                    : recommendation?.justification,
                  evaluation?.reviewReason,
                ].filter(Boolean),
                empty: "No recommendation recorded.",
              },
              { key: "strengths", label: "Strengths", tone: "positive", items: evaluation?.strengths || [], empty: "No strengths recorded." },
              {
                key: "gaps",
                label: "Gaps",
                tone: "negative",
                items: [...(evaluation?.weaknesses || []), ...(evaluation?.missingSkills || []).map((skill) => `Not evidenced: ${skill}`)],
                empty: "No gaps recorded.",
              },
            ]}
          />
          <div>
            <h3 className="mb-3 font-semibold text-[#17221C]">Score by interview field</h3>
            {metrics.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {metrics.map(([label, value]) => <MetricMeter key={label} label={label} value={value} />)}
              </div>
            ) : <Empty>No field-level interview scores are available yet.</Empty>}
          </div>
          <div id="candidate-interview-transcript" className="scroll-mt-4">
            <h3 className="mb-3 font-semibold text-[#17221C]">Interview transcript</h3>
            <ConversationContent interview={{ conversationLog: interviewTranscript }} />
          </div>
        </div>
      );
    }
    if (view === "full-log") return <ConversationContent history={timeline?.stageHistory || candidate.stageHistory || []} />;
    if (view === "assessment-rubric") return report?.coverage?.rows?.length ? <RubricTable coverage={report.coverage} /> : <div className="space-y-4"><Empty>No evaluated rubric details are available for this candidate.</Empty>{jobId && <Button as={Link} to={`/jobs/${jobId}/rubric`} variant="outline">Open role rubric</Button>}</div>;
    if (view === "evaluation") return evaluation ? <div className="space-y-5"><div className="grid items-center gap-6 border-b border-[#DCE5EA] pb-5 md:grid-cols-[10rem_1fr]"><CircularScore value={interviewScore} verdict={interview?.verdictChip?.label || "Evaluation complete"} /><FieldGrid fields={[["Evaluation status", interview?.status?.replaceAll("_", " ") || "Completed"], ["Evaluator", "AI + Recruiter"], ["Evaluated on", formatWhen(interview?.completedAt)], ["Recommendation", evaluation.recommendation?.replaceAll("_", " ")], ["Confidence", evaluation.confidence]]} /></div><div className="rounded-xl border border-rose-100 bg-rose-50/50 p-5"><h3 className="flex items-center gap-2 font-bold text-[#17221C]"><Sparkles className="h-5 w-5 text-rose-600" />Summary</h3><div className="mt-2"><Narrative text={evaluation.summary} /></div></div><Button className="w-full sm:w-auto" onClick={() => setView("evaluation-detail")}>View detailed evaluation <ArrowRight className="h-4 w-4" /></Button></div> : <Empty>No completed interview evaluation is available.</Empty>;
    if (view === "evaluation-detail") return <EvaluationDetailView evaluation={evaluation} />;
    if (view === "integrity") return <IntegrityContent proctoring={report?.proctoring} />;
    if (view === "recording") return interview ? <div className="space-y-4"><div className="flex items-center gap-3 rounded-xl bg-[#F8FAF9] p-4"><PlayCircle className="h-8 w-8 text-brand-700" /><div><p className="font-semibold text-[#17221C]">Interview playback</p><p className="text-xs text-[#64736A]">Recording and transcript remain linked to this candidate’s interview.</p></div></div><InterviewPlayback candidateId={candidate._id} transcript={interviewTranscript} startedAt={interview.startedAt} /></div> : <Empty>No interview recording is available yet.</Empty>;
    if (view === "timeline") { const history = timeline?.stageHistory || candidate.stageHistory || []; return history.length ? <ol className="relative ml-2 space-y-5 border-l border-[#D7E0DA] pl-6">{history.map((item, index) => <li key={index} className="relative"><span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-brand-600 ring-4 ring-[#E8F2EC]" /><p className="font-semibold text-[#17221C]">{stageLabel(item.stage)}</p><p className="text-xs text-[#64736A]">{formatWhen(item.at)}</p>{item.note && <p className="mt-1 text-sm text-[#415048]">{item.note}</p>}</li>)}</ol> : <Empty>No application events are available.</Empty>; }
    if (view === "process") return <div className="space-y-2">{STAGES.map((stage, index) => { const reached = currentStageIndex >= index; const active = stage === currentStage; return <div key={stage} className={`flex items-center gap-3 rounded-xl border p-3 ${active ? "border-brand-300 bg-[#E8F2EC]" : "border-[#E5EBE7]"}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${reached ? "bg-brand-600 text-white" : "bg-[#F0F3F1] text-[#7A8A80]"}`}>{index + 1}</span><span className={`text-sm ${active ? "font-bold text-brand-800" : reached ? "font-medium text-[#17221C]" : "text-[#7A8A80]"}`}>{stageLabel(stage)}</span>{active && <Badge tone="brand">Current</Badge>}</div>; })}</div>;
    return null;
  }

  return (
    <>
      <section aria-labelledby="candidate-profile-heading" className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-[#E5EBE7] bg-[#F1F7F3] text-2xl font-semibold text-[#176B45]" aria-hidden="true">{initials}</div>
            <div className="min-w-0"><h2 id="candidate-profile-heading" className="text-2xl font-bold tracking-tight text-[#17221C] [overflow-wrap:anywhere]">{basic.name}</h2><p className="mt-1 text-sm text-[#64736A]">{candidate.job?.title || "Candidate"}{basic.location ? ` · ${basic.location}` : ""}</p></div>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => setView("profile-menu")}>Candidate Details <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
        </div>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#64736A]">{basic.location && <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{basic.location}</span>}{candidate.job?.title && <span className="inline-flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4" />{candidate.job.title}</span>}{basic.email && <span className="inline-flex min-w-0 items-center gap-2"><Mail className="h-4 w-4 shrink-0" /><span className="truncate">{basic.email}</span></span>}{basic.phone && <span className="inline-flex items-center gap-2"><Phone className="h-4 w-4" />{basic.phone}</span>}{basic.linkedinUrl && <a href={basic.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-2 hover:text-brand-700 hover:underline"><span className="grid h-4 w-4 shrink-0 place-items-center rounded-sm bg-[#64736A] text-[9px] font-bold text-white">in</span><span className="truncate">LinkedIn profile</span></a>}</div>
        <div className="mt-6 grid gap-3 border-t border-[#E5EBE7] pt-5 sm:grid-cols-3"><div className="flex min-w-0 items-center gap-4 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#F1F7F3] text-[#176B45]"><Mail className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-sm font-semibold text-[#64736A]">Email</span><span className="mt-1 block truncate text-sm font-semibold text-[#17221C]">{basic.email || "Not available"}</span></span></div><div className="flex items-center gap-4 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#F1F7F3] text-[#176B45]"><Phone className="h-5 w-5" /></span><span><span className="block text-sm font-semibold text-[#64736A]">Phone</span><span className="mt-1 block text-sm font-semibold text-[#17221C]">{basic.phone || "Not available"}</span></span></div><div className="flex items-center gap-4 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#F1F7F3] text-[#176B45]"><CheckCircle2 className="h-5 w-5" /></span><span><span className="block text-sm font-semibold text-[#64736A]">Current status</span><span className="mt-1 block"><Badge tone={stageTone(candidate.status)}>{stageLabel(candidate.status)}</Badge></span></span></div></div>
      </section>

      <section ref={overallRef} aria-labelledby="overall-result-heading" className="scroll-mt-24 rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-sm sm:p-6">
        <h2 id="overall-result-heading" className="text-2xl font-bold tracking-tight text-[#17221C]">{pastAtsStage ? "Overall Result" : "Screening Result"}</h2>
        <div className="mt-8 grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_3rem_14rem_3rem_minmax(0,1fr)]">
          <button type="button" onClick={() => setView("ai-summary")} className="group flex min-w-0 items-center gap-4 rounded-xl border border-[#E5EBE7] bg-white p-5 text-left transition-colors hover:border-[#C7DDD1] hover:bg-[#F8FAF9]"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#F1F7F3] text-[#176B45]"><Sparkles className="h-7 w-7" /></span><span className="min-w-0 flex-1"><span className="block text-base font-semibold text-[#17221C]">AI Summary</span><span className="mt-1 block text-sm text-[#64736A]">View AI-generated summary</span></span><ArrowRight className="h-5 w-5 shrink-0 text-[#9BAAA1] transition-colors group-hover:text-[#176B45]" /></button>
          <ArrowRight className="mx-auto hidden h-6 w-6 text-[#9BAAA1] lg:block" aria-hidden="true" />
          <button type="button" onClick={() => setView("overall-score")} className="flex items-center justify-center rounded-xl p-2"><CircularScore value={overallScore} label={headlineScoreLabel} verdict={negativeResult ? "Needs Review" : positiveResult ? "Strong Match" : "In Review"} /></button>
          <ArrowRight className="mx-auto hidden h-6 w-6 text-[#9BAAA1] lg:block" aria-hidden="true" />
          <button type="button" onClick={() => setView("evaluation-menu")} className="group flex min-w-0 items-center gap-4 rounded-xl border border-[#E5EBE7] bg-white p-5 text-left transition-colors hover:border-[#C7DDD1] hover:bg-[#F8FAF9]"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#F1F7F3] text-[#176B45]"><Award className="h-7 w-7" /></span><span className="min-w-0 flex-1"><span className="block text-base font-semibold text-[#17221C]">Overall Result</span><span className="mt-1 block text-sm text-[#64736A]">View detailed evaluation</span></span><ArrowRight className="h-5 w-5 shrink-0 text-[#9BAAA1] transition-colors group-hover:text-[#176B45]" /></button>
        </div>
      </section>

      <section aria-labelledby="application-details-heading" className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 id="application-details-heading" className="text-xl font-bold tracking-tight text-[#17221C]">Application Details</h2><p className="mt-1 text-sm text-[#64736A]">Timeline, recruitment process and ATS screening for this application.</p></div><Button type="button" variant="secondary" size="sm" onClick={() => setView("application-menu")}>Application Details <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button></div><div className="mt-5 grid gap-3 sm:grid-cols-3">{applicationItems.map(({ id, label, description, icon: Icon, tone }) => <button key={id} type="button" onClick={() => setView(id)} className={`group flex min-w-0 items-center gap-3 rounded-xl border p-4 text-left shadow-sm transition-colors hover:border-[#C7DDD1] hover:bg-[#F8FAF9] ${CARD_TONES[tone]}`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#F1F7F3] text-[#176B45]"><Icon className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-sm font-semibold text-[#17221C]">{label}</span><span className="mt-1 block text-xs leading-4 text-[#64736A]">{description}</span></span></button>)}</div></section>

      <Modal open={Boolean(view)} onClose={() => setView(null)} title={view === "overall-score" ? headlineScoreLabel : VIEW_TITLES[view]} description={VIEW_DESCRIPTIONS[view] || `${basic.name}${candidate.job?.title ? ` · ${candidate.job.title}` : ""}`} size={["profile-menu", "evaluation-menu", "application-menu"].includes(view) || EVALUATION_DETAIL.has(view) ? "4xl" : "2xl"} panelClassName="max-h-[92vh]">
        {parent && <DetailHeader onBack={() => setView(parent.view)} parentLabel={parent.label} />}
        {renderView()}
      </Modal>
    </>
  );
}
