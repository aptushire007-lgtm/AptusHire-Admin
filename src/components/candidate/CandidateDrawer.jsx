import { useEffect, useState, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Sparkles,
  FileText,
  Award,
  AlertTriangle,
  RefreshCw,
  Clock,
  CheckCircle2,
  ListChecks,
  Mic,
  ArrowLeft,
  Download,
  Send,
  User,
  MapPin,
  Building2,
  GraduationCap,
  Cpu,
  ShieldCheck,
  ShieldAlert,
  MessageSquare,
  Eye,
  BarChart3,
  Trash2,
  XCircle,
} from "lucide-react";
import api from "../../api/client.js";
import { downloadFile } from "../../lib/download.js";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import { Card, Badge, Avatar, Skeleton } from "../ui/Card.jsx";
import StageMenu from "../ui/StageMenu.jsx";
import { useToast } from "../ui/Toast.jsx";
import {
  stageLabel,
  stageTone,
  ALL_STAGES,
  normalizeStage,
  allowedNextStages,
} from "../../lib/pipeline.js";
import { scoreOf, scoreCaveat, isScored } from "../../lib/pipelineMetrics.js";
import { EvidenceChip } from "../ui/Evidence.jsx";

// A criterion the engine judged but did not score. Shown in place of a
// percentage, so a judgement is never dressed up as a measurement.
const STATUS_WORDS = {
  satisfied: "Satisfied",
  partial: "Partial",
  unmet: "Unmet",
  contradicted: "Contradicted",
  inconclusive: "Inconclusive",
};
import InterviewWorkspace, { InterviewSummary } from "./InterviewWorkspace.jsx";
import RelatedApplications from "./RelatedApplications.jsx";
import InsightPanel from "../report/InsightPanel.jsx";
import {
  EvaluationCard,
  IntegrityCard,
  InstrumentScores,
  RecommendedActionCard,
  CommunicationCompetencyCard,
  RECOMMENDATION,
  formatWhen,
} from "./InterviewReportCards.jsx";

export const TABS = [
  // "Overview" used to sit here. It restated Summary: the same job, the same
  // ATS score, the same interview status, one card lower down. What it alone
  // carried — applied-on, requisition, the last stage event, the interview
  // evidence digest — moved into Summary, and the tab went.
  { id: "summary", label: "Summary", icon: Sparkles },
  { id: "ats-breakdown", label: "ATS Score Breakdown", icon: ListChecks },
  { id: "assessments", label: "Assessments", icon: Award },
  { id: "ai-interview", label: "AI Interview Report", icon: Mic },
  { id: "profile-cv", label: "Profile & CV", icon: FileText },
  { id: "activity", label: "Activity", icon: Clock },
];

function LinkedInIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.2a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24Z" />
    </svg>
  );
}

const PROVENANCE_LABELS = {
  autofill_accepted: {
    label: "From résumé",
    title: "Read from the résumé by extraction engine and accepted by candidate.",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  autofill_edited: {
    label: "From résumé · edited",
    title: "Read from résumé, then changed by candidate before submitting.",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
};

function ProvenanceTag({ provenance }) {
  const meta = PROVENANCE_LABELS[provenance?.source];
  if (!meta) return null;
  return (
    <span
      title={meta.title}
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${meta.className}`}
    >
      <Cpu className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

export default function CandidateDrawer({
  candidateId,
  reviewIds = [],
  initialTab = "summary",
  onClose,
  onSelectCandidate,
  onCandidateUpdated,
  onTabChange,
}) {
  const toast = useToast();

  // Normalize initial tab (support legacy aliases "evidence" -> "profile-cv", "interview" -> "ai-interview")
  const resolveTab = useCallback((tab) => {
    if (tab === "evidence") return "profile-cv";
    if (tab === "interview") return "ai-interview";
    // Overview was merged into Summary; existing deep links still land somewhere true.
    if (tab === "overview") return "summary";
    const found = TABS.find((t) => t.id === tab);
    return found ? found.id : "summary";
  }, []);

  const [activeTab, setActiveTab] = useState(() => resolveTab(initialTab));
  const [candidate, setCandidate] = useState(null);
  const [interviewSession, setInterviewSession] = useState(null);
  const [interviewReport, setInterviewReport] = useState(null);
  const [assessmentSession, setAssessmentSession] = useState(null);
  const [profileAssessment, setProfileAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [movingStage, setMovingStage] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [interviewSubTab, setInterviewSubTab] = useState("all");

  // Record tools (rescore / DPDP export / DPDP erasure). These used to live
  // only on the standalone /candidates/:id page, which no route renders any
  // more — the drawer replaced it. Export and erasure are the data-principal
  // rights the DPDP Act obliges the controller to honour, so they follow the
  // record to wherever the record is actually opened rather than being
  // deleted along with the page that happened to host them.
  const [rescoring, setRescoring] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [eraseConfirm, setEraseConfirm] = useState("");
  const [eraseArmed, setEraseArmed] = useState(false);

  // The recruiter gate on a manual-policy job: until someone sends the test or
  // decides to skip it, an ATS-passed candidate does not move. The backend has
  // always shipped both endpoints and even returns `paperReady` so the gate can
  // explain itself — the UI for it just lived on a page no route rendered.
  const [assessmentAction, setAssessmentAction] = useState("");

  // Position in review list
  const currentIndex = candidateId && Array.isArray(reviewIds) ? reviewIds.indexOf(candidateId) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < reviewIds.length - 1;

  const handleTabSwitch = (tabId) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const loadData = useCallback(async (id, signal) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const [candRes, sessRes, assessRes, reportRes, cvAssessRes] = await Promise.allSettled([
        api.get(`/candidates/${id}`, { signal }),
        api.get(`/interview-sessions/candidate/${id}`, { signal }),
        api.get(`/assessments/candidate/${id}`, { signal }),
        api.get(`/candidates/${id}/interview-report`, { signal }),
        api.get(`/candidates/${id}/assessment`, { signal }),
      ]);

      if (candRes.status === "fulfilled") {
        setCandidate(candRes.value.data);
      } else {
        throw new Error(candRes.reason?.response?.data?.error || "Could not load candidate profile.");
      }

      if (sessRes.status === "fulfilled") {
        setInterviewSession(sessRes.value.data);
      } else {
        setInterviewSession(null);
      }

      if (assessRes.status === "fulfilled") {
        setAssessmentSession(assessRes.value.data);
      } else {
        setAssessmentSession(null);
      }

      if (reportRes.status === "fulfilled") {
        setInterviewReport(reportRes.value.data);
      } else {
        setInterviewReport(null);
      }

      if (cvAssessRes.status === "fulfilled") {
        setProfileAssessment(cvAssessRes.value.data);
      } else {
        setProfileAssessment(null);
      }
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return;
      setError(err.message || "Failed to load candidate information.");
      setCandidate(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (candidateId) {
      const controller = new AbortController();
      loadData(candidateId, controller.signal);
      if (initialTab) {
        setActiveTab(resolveTab(initialTab));
      }
      return () => controller.abort();
    } else {
      setCandidate(null);
      setInterviewSession(null);
      setInterviewReport(null);
      setAssessmentSession(null);
      setProfileAssessment(null);
      setError("");
    }
  }, [candidateId, initialTab, loadData, resolveTab]);

  async function handleStageMove(newStage) {
    if (!candidateId || !newStage) return;
    setMovingStage(true);
    try {
      await api.patch(`/candidates/${candidateId}/stage`, { stage: newStage });
      toast.success(`Candidate moved to ${stageLabel(newStage)}`);
      const updated = { ...candidate, status: newStage };
      setCandidate(updated);
      onCandidateUpdated?.(updated);
      loadData(candidateId);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not move candidate");
    } finally {
      setMovingStage(false);
    }
  }

  const handleAdvanceCandidate = () => {
    if (!candidate) return;
    const nextStages = allowedNextStages(candidate.status || "applied");
    const nextForward = nextStages.find((s) => s !== "rejected");
    if (nextForward) {
      handleStageMove(nextForward);
    } else if (candidate.status === "shortlisted") {
      handleStageMove("technical_interview");
    } else {
      handleStageMove("selected");
    }
  };

  const handleAddNote = async (e) => {
    e?.preventDefault();
    if (!newNote.trim() || !candidateId) return;
    setSavingNote(true);
    try {
      await api.patch(`/candidates/${candidateId}/stage`, {
        stage: candidate.status || "applied",
        note: newNote.trim(),
      });
      toast.success("Recruiter note saved");
      setNewNote("");
      loadData(candidateId);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not save note");
    } finally {
      setSavingNote(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!candidateId) return;
    try {
      const res = await api.get(`/candidates/${candidateId}/interview-report/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `interview-report-${candidate?.basicDetails?.name ? candidate.basicDetails.name.toLowerCase().replace(/\s+/g, "-") : "candidate"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download interview report PDF.");
    }
  };

  // `window.open("/api/candidates/:id/resume")` could not work: the new tab
  // carries no Authorization header, so the protected endpoint 401s, and the
  // relative /api path only resolves at all behind the dev proxy — in a build
  // pointed at an absolute VITE_API_URL it opened a page of this app. Fetch it
  // through the axios client, which injects the bearer token, and save the blob.
  const handleDownloadResume = async () => {
    if (!candidateId) return;
    try {
      await downloadFile(
        `/candidates/${candidateId}/resume`,
        candidate?.resumeOriginalName || "resume"
      );
    } catch {
      toast.error("Could not download the resume");
    }
  };

  // Send the skills test. A 409 here is not a fault to swallow — it names the
  // thing standing in the way (the job's policy is "off"), so it is shown.
  const handleSendAssessment = async () => {
    if (!candidateId) return;
    setAssessmentAction("send");
    try {
      await api.post(`/assessments/candidate/${candidateId}/send`);
      toast.success("Skills test sent — the candidate has the link.");
      await loadData(candidateId);
      onCandidateUpdated?.();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not send the skills test");
    } finally {
      setAssessmentAction("");
    }
  };

  // Skipping is a recorded recruiter decision, not missing data: it stamps who
  // decided and moves the candidate straight to the AI interview.
  const handleSkipAssessment = async () => {
    if (!candidateId) return;
    setAssessmentAction("skip");
    try {
      await api.post(`/assessments/candidate/${candidateId}/skip`);
      toast.success("Assessment skipped — the candidate goes straight to the AI interview.");
      await loadData(candidateId);
      onCandidateUpdated?.();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not skip the assessment");
    } finally {
      setAssessmentAction("");
    }
  };

  // DPDP data portability: the full record as stored, not a rendering of it.
  const handleExportRecord = async () => {
    if (!candidateId) return;
    const safeName = String(candidate?.basicDetails?.name || "candidate").replace(/[^a-z0-9]+/gi, "_");
    try {
      await downloadFile(`/candidates/${candidateId}/export`, `${safeName}_record.json`);
    } catch {
      toast.error("Could not export this candidate's record");
    }
  };

  // Removes only this application from this job's pipeline, leaving the
  // candidate and their other applications untouched — unlike erasure below,
  // which takes the whole record.
  const handleRemoveFromJob = async () => {
    const jobId = candidate?.job?._id || (typeof candidate?.job === "string" ? candidate.job : null);
    if (!candidateId || !jobId) {
      toast.error("This application is not linked to a job");
      return;
    }
    if (!window.confirm("Remove this application from this job's Hiring Pipeline? The candidate and other applications will remain.")) {
      return;
    }
    setRemoving(true);
    try {
      await api.delete(`/candidates/${candidateId}/applications/${jobId}`);
      toast.success("Application removed from this job");
      onCandidateUpdated?.(null);
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not remove this application");
      setRemoving(false);
    }
  };

  // Re-scores against whatever rubric is approved NOW — the natural follow-up
  // once a recruiter approves a rubric for a job whose candidates were screened
  // while it was still a draft.
  //
  // The endpoint acks with 202 and scores in the background, because an
  // evidence rescore is minutes of model work — longer than the request
  // timeout. So the POST returning is NOT the result: poll until the score's
  // timestamp actually moves, and say plainly if it is still running rather
  // than reporting a success the engine has not delivered.
  const handleRescore = async () => {
    if (!candidateId) return;
    setRescoring(true);
    try {
      const { data } = await api.post(`/candidates/${candidateId}/ats/rerun`);
      const previous = data?.previousScoredAt ?? candidate?.ats?.scoredAt ?? null;
      toast.success("Rescoring started — evidence scoring takes a minute or two");

      const deadline = Date.now() + 6 * 60 * 1000;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const { data: fresh } = await api.get(`/candidates/${candidateId}`);
        if ((fresh?.ats?.scoredAt ?? null) !== previous) {
          setCandidate(fresh);
          onCandidateUpdated?.(fresh);
          toast.success(
            fresh?.ats?.engine === "evidence"
              ? "Rescored against the approved rubric"
              : "Rescored — evidence engine unavailable, keyword score shown"
          );
          return;
        }
      }
      toast.error("Rescore is taking longer than expected — reopen this record shortly to see the result");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not rescore this candidate");
    } finally {
      setRescoring(false);
    }
  };

  // DPDP right to erasure. Irreversible hard-delete of the candidate and every
  // artifact (resume, identity photo, interview transcript, queue rows, usage).
  // Gated on typing the word rather than a browser confirm, because a confirm
  // dialog is dismissed by the same reflex that opened it.
  const handleErase = async () => {
    if (!candidateId || eraseConfirm.trim().toUpperCase() !== "ERASE") return;
    setErasing(true);
    try {
      await api.delete(`/data-rights/candidates/${candidateId}`, {
        data: { reason: "data-principal erasure request" },
      });
      toast.success("Candidate data erased");
      onCandidateUpdated?.(null);
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not erase this candidate's data");
      setErasing(false);
    }
  };

  // Computed metrics
  const cvScore = candidate ? (profileAssessment?.overallScore ?? scoreOf(candidate)) : null;
  const caveat = candidate ? scoreCaveat(candidate) : null;
  const findings = profileAssessment?.criterionFindings || [];
  const satisfiedFindings = findings.filter((f) => f.status === "satisfied");
  const resumeSkillNames = (candidate?.skills || [])
    .slice(0, 5)
    .map((s) => (typeof s === "string" ? s : s?.name))
    .filter(Boolean);
  const topCompetencies = (satisfiedFindings.length > 0 ? satisfiedFindings : findings).slice(0, 3).map((f) => f.label);

  // Normalized Interview State
  const interviewEv =
    interviewReport?.interview?.evaluation ||
    interviewSession?.aiInterview?.evaluation ||
    interviewReport?.evaluation ||
    interviewSession?.evaluation ||
    null;
  const interviewScore = interviewEv?.overallScore ?? null;
  const interviewRecommendation = interviewEv?.recommendation ?? null;
  const interviewSummary = interviewEv?.summary ?? null;
  const interviewStrengths = interviewEv?.strengths || [];
  const interviewWeaknesses = interviewEv?.weaknesses || [];

  const interviewStatus =
    interviewReport?.interview?.status ||
    interviewSession?.aiInterview?.status ||
    interviewSession?.status ||
    (interviewReport?.hasInterview ? "completed" : null);

  const interviewCompletedAt =
    interviewSession?.aiInterview?.completedAt ||
    interviewSession?.completedAt ||
    interviewReport?.interview?.completedAt ||
    null;

  // A raw `completedAt - startedAt` used to be printed here as the interview's
  // duration. On a session the pipeline never closed that subtraction returns
  // days — one candidate's card read "21494 mins" — so it described the gap
  // between two timestamps and called it the length of a conversation. The
  // standalone report derives this from the backend's `durationFlag` instead
  // (secondsPerQuestion, with an abnormally-short warning), which is the only
  // reading that survives a session that was abandoned rather than finished.

  // Normalized Assessment Session & Decision State
  const rawAssessment = assessmentSession || interviewReport?.assessment || null;
  const assessmentItem =
    rawAssessment?.session ??
    (rawAssessment?._id ? rawAssessment : null) ??
    interviewReport?.assessment?.session ??
    null;
  const assessmentDecision =
    rawAssessment?.decision ??
    candidate?.assessmentDecision ??
    interviewReport?.assessment?.decision ??
    null;
  const isPaperReady = Boolean(rawAssessment?.paperReady ?? rawAssessment?.paper);
  const assessmentPaper = rawAssessment?.paper ?? null;
  const assessmentResult = assessmentItem?.result ?? null;

  const assessmentTotalItems = assessmentResult?.totalItems ?? 0;
  const assessmentTotalCorrect = assessmentResult?.totalCorrect ?? 0;
  const assessmentScore =
    assessmentTotalItems > 0
      ? Math.round((assessmentTotalCorrect / assessmentTotalItems) * 100)
      : assessmentItem?.score != null
      ? assessmentItem.score
      : null;
  const assessmentPerCriterion = assessmentResult?.perCriterion || [];
  const assessmentClaimVerdicts = assessmentResult?.claimVerdicts || [];

  const linkedinUrl = candidate?.basicDetails?.linkedinUrl
    ? candidate.basicDetails.linkedinUrl.startsWith("http")
      ? candidate.basicDetails.linkedinUrl
      : `https://${candidate.basicDetails.linkedinUrl}`
    : null;

  const portfolioUrl = candidate?.basicDetails?.portfolioUrl
    ? candidate.basicDetails.portfolioUrl.startsWith("http")
      ? candidate.basicDetails.portfolioUrl
      : `https://${candidate.basicDetails.portfolioUrl}`
    : null;

  const initials = (candidate?.basicDetails?.name || "C")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Modal
      open={Boolean(candidateId)}
      onClose={onClose}
      placement="center"
      showClose={false}
      role="dialog"
      label={candidate?.basicDetails?.name ? `Candidate Profile: ${candidate.basicDetails.name}` : "Candidate Profile"}
      panelClassName="!w-[96vw] !max-w-[1400px] !h-[94vh] !max-h-[96vh] !p-0 flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden"
    >
      {/* ── STICKY TOP HEADER ──────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-slate-200 z-10">
        {/* Row 1: Back breadcrumb, Reviewer controls (< > X of Y), and Close button */}
        <div className="flex items-center justify-between px-6 py-1.5 bg-slate-50/80 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to candidates</span>
            </button>
            {reviewIds.length > 0 && currentIndex >= 0 && (
              <span className="text-slate-300">|</span>
            )}
            {reviewIds.length > 0 && currentIndex >= 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={() => onSelectCandidate?.(reviewIds[currentIndex - 1])}
                  aria-label="Previous candidate"
                  title="Previous candidate"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs font-medium text-slate-500 tabular-nums">
                  {currentIndex + 1} of {reviewIds.length}
                </span>
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={() => onSelectCandidate?.(reviewIds[currentIndex + 1])}
                  aria-label="Next candidate"
                  title="Next candidate"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close candidate drawer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Row 2: Candidate Identity Banner & Sticky Action Buttons */}
        {loading && !candidate ? (
          <div className="px-6 py-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </div>
        ) : error && !candidate ? (
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-700 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
            <Button size="sm" onClick={() => loadData(candidateId)}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
            </Button>
          </div>
        ) : candidate ? (
          <div className="px-5 py-2 flex flex-wrap items-center justify-between gap-2">
            {/* Left: Identity & Metadata */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-600 text-white font-bold text-base flex items-center justify-center shadow-sm shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base font-bold text-slate-900 leading-tight">
                    {candidate.basicDetails?.name || "Unnamed Candidate"}
                  </h1>
                  <Badge tone={stageTone(candidate.status)}>
                    {stageLabel(candidate.status)}
                  </Badge>
                  {linkedinUrl && (
                    <a
                      href={linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="LinkedIn Profile"
                      className="text-slate-400 hover:text-emerald-700 transition-colors"
                    >
                      <LinkedInIcon className="w-3.5 h-3.5 fill-current" />
                    </a>
                  )}
                  {portfolioUrl && (
                    <a
                      href={portfolioUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Portfolio"
                      className="text-slate-400 hover:text-emerald-700 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-500">
                  {candidate.job?.title && (
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Briefcase className="h-3 w-3 text-slate-400" />
                      <span>Req: {candidate.job.title}</span>
                    </span>
                  )}
                  {candidate.basicDetails?.email && (
                    <span className="flex items-center gap-1 truncate" title={candidate.basicDetails.email}>
                      <Mail className="h-3 w-3 text-slate-400" />
                      {candidate.basicDetails.email}
                    </span>
                  )}
                  {candidate.basicDetails?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {candidate.basicDetails.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Quick Action Buttons (Sticky & accessible at all times) */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {candidate.status !== "rejected" ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={movingStage}
                  onClick={() => handleStageMove("rejected")}
                  className="border-rose-200 text-rose-700 hover:bg-rose-50"
                >
                  Reject Candidate
                </Button>
              ) : (
                <span className="px-2.5 py-1 text-xs font-semibold rounded bg-rose-50 text-rose-700 border border-rose-200">
                  Status: Rejected
                </span>
              )}

              {candidate.status !== "selected" && candidate.status !== "joined" && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={movingStage}
                  onClick={handleAdvanceCandidate}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs flex items-center gap-1.5"
                >
                  <span>
                    {candidate.status === "applied" || candidate.status === "ats_passed"
                      ? "Shortlist Candidate"
                      : candidate.status === "shortlisted"
                      ? "Schedule Technical Interview"
                      : "Advance Candidate"}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTabSwitch("ai-interview")}
                className="border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-brand-700" />
                Review Evidence
              </Button>

              <StageMenu
                status={candidate.status}
                name={candidate.basicDetails?.name}
                busy={movingStage}
                onMove={handleStageMove}
                trigger={
                  <Button variant="outline" size="sm">
                    Hiring Actions ▾
                  </Button>
                }
              />
            </div>
          </div>
        ) : null}

        {/* Row 3: 6 Segregated Tabs Navigation */}
        <nav
          aria-label="Candidate inspection tabs"
          className="px-6 flex gap-1 border-t border-slate-200 bg-white overflow-x-auto"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            // Everything these three read is fetched when the drawer opens, so
            // we can say up front that a panel is empty rather than making the
            // reader click to find out. Only a POSITIVE "we loaded this and
            // there is nothing" is marked: a failed fetch leaves the tab
            // unmarked, because "we could not load it" is not "there is none".
            const emptyTab =
              (tab.id === "ats-breakdown" && candidate && !isScored(candidate)) ||
              (tab.id === "assessments" && candidate && !assessmentSession && !profileAssessment) ||
              (tab.id === "ai-interview" && candidate && !interviewReport && !interviewSession);
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={tab.id === "profile-cv" ? "Profile & CV / Evidence & CV" : tab.label}
                onClick={() => handleTabSwitch(tab.id)}
                className={`relative inline-flex items-center gap-1.5 py-2 px-3 text-xs font-semibold transition-colors border-b-2 whitespace-nowrap ${
                  active
                    ? "border-emerald-700 text-emerald-900 bg-emerald-50/40"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? "text-emerald-700" : "text-slate-400"}`} />
                <span>{tab.label}</span>
                {emptyTab && <EvidenceChip state="absent">None</EvidenceChip>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── SCROLLABLE TAB PANELS ────────────────────────────────────────────── */}
      {loading && !candidate ? (
        <div className="flex-1 p-8 space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : candidate ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/60 min-h-0">
          {/* ══════════════════════════════════════════════════════════════════
              TAB 1: SUMMARY — 2D Dashboard (no-scroll)
              ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "summary" && (
            <div className="flex flex-col gap-3 p-3 flex-1 overflow-y-auto min-h-0">
              {/* ── Row 1: 3 KPI Score Cards ─────────────────────────────── */}
              <div className="grid grid-cols-3 gap-3 shrink-0">
                {/* CV Screening */}
                <Card padding="compact" className="bg-gradient-to-br from-blue-50 to-slate-50 border-l-4 border-l-blue-400 shadow-sm border-slate-200/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">CV Screening</span>
                    <Badge tone="brand">ATS</Badge>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    {cvScore != null ? (
                      <>
                        <span className="text-3xl font-bold tabular-nums text-blue-700">{cvScore}</span>
                        <span className="text-xs text-slate-500 font-medium">/ 100</span>
                      </>
                    ) : (
                      <span className="text-sm font-semibold text-slate-500">Not scored</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {profileAssessment?.engine === "evidence" || candidate.ats?.engine === "evidence"
                      ? "Autonomous Evidence Engine"
                      : "Keyword screening"}
                  </p>
                  {caveat && <p className="text-[11px] text-amber-700 font-medium mt-0.5">{caveat}</p>}
                </Card>

                {/* AI Interview */}
                <Card padding="compact" className="bg-gradient-to-br from-emerald-50 to-teal-50 border-l-4 border-l-emerald-500 shadow-sm border-slate-200/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">AI Interview</span>
                    <Badge tone={interviewScore != null ? "green" : interviewStatus === "in_progress" ? "blue" : "slate"}>
                      {interviewStatus ? interviewStatus.replaceAll("_", " ") : (interviewReport ? "Completed" : "Pending")}
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    {interviewScore != null ? (
                      <>
                        <span className="text-3xl font-bold tabular-nums text-emerald-700">{interviewScore}</span>
                        <span className="text-xs text-slate-500 font-medium">/ 100</span>
                      </>
                    ) : (
                      <span className="text-sm font-semibold text-slate-500">
                        {interviewStatus === "in_progress" ? "In Progress" : "Pending Evaluation"}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {interviewCompletedAt
                      ? "Session completed & evaluated"
                      : interviewStatus === "in_progress"
                      ? "Interview currently in progress"
                      : "Awaiting interview session"}
                  </p>
                </Card>

                {/* Skill Assessment */}
                <Card padding="compact" className="bg-gradient-to-br from-purple-50 to-indigo-50 border-l-4 border-l-purple-500 shadow-sm border-slate-200/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Skill Assessment</span>
                    <Badge
                      tone={
                        assessmentItem?.status === "completed"
                          ? "green"
                          : assessmentItem?.status === "in_progress"
                          ? "blue"
                          : assessmentItem?.status === "scheduled"
                          ? "amber"
                          : "slate"
                      }
                    >
                      {assessmentItem?.status?.replaceAll("_", " ") ||
                        (assessmentDecision?.action === "skipped"
                          ? "Skipped"
                          : assessmentDecision?.action === "send"
                          ? "Pending"
                          : "Not Assigned")}
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    {assessmentScore != null ? (
                      <>
                        <span className="text-3xl font-bold tabular-nums text-purple-700">{assessmentScore}</span>
                        <span className="text-xs text-slate-500 font-medium">/ 100</span>
                      </>
                    ) : (
                      <span className="text-sm font-semibold text-slate-500">
                        {assessmentItem?.status === "in_progress"
                          ? "In Progress"
                          : assessmentItem?.status === "scheduled"
                          ? "Scheduled"
                          : assessmentDecision?.action === "skipped"
                          ? "Skipped"
                          : "Not assigned"}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {assessmentItem?.status === "completed"
                      ? `${assessmentTotalCorrect}/${assessmentTotalItems} items correct`
                      : assessmentItem?.status === "in_progress"
                      ? "Awaiting candidate submission"
                      : assessmentDecision?.action === "skipped"
                      ? "Direct to interview"
                      : "Awaiting paper assignment"}
                  </p>
                </Card>
              </div>

              {/* ── Row 2: 3-Column Content Grid (fills remaining height) ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

                {/* Column 1: Aptus AI Autonomous Evaluation */}
                <div
                  className="flex flex-col p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50/90 via-teal-50/60 to-purple-50/50 border border-emerald-200/80 shadow-xs overflow-y-auto min-h-0"
                  data-purpose="ai-match-card"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-700 text-white shadow-xs">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                          AI Autonomous Evaluation
                        </span>
                        <span className="block text-[10px] text-emerald-700 font-medium">
                          Real-time profile synthesis
                        </span>
                      </div>
                    </div>
                    {cvScore !== null ? (
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                          cvScore >= 70
                            ? "text-emerald-800 bg-emerald-100 border-emerald-300"
                            : cvScore >= 50
                            ? "text-amber-800 bg-amber-100 border-amber-300"
                            : "text-rose-800 bg-rose-100 border-rose-300"
                        }`}
                      >
                        {cvScore}% Match
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-600 bg-white/80 px-2.5 py-0.5 rounded-md border border-slate-200">
                        Evaluating…
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 text-xs text-slate-800 leading-relaxed flex-1">
                    {profileAssessment ? (
                      topCompetencies.length > 0 ? (
                        <p>
                          Candidate demonstrates verified competence in{" "}
                          <strong className="text-slate-950 font-semibold">{topCompetencies.join(", ")}</strong>.
                          Validated against {satisfiedFindings.length} of {findings.length} rubric competencies.
                          {profileAssessment.reviewReason && (
                            <span className="block mt-1.5 text-slate-600 italic">
                              Review note: {profileAssessment.reviewReason}
                            </span>
                          )}
                        </p>
                      ) : (
                        <p>
                          Autonomous screening evaluated candidate against {findings.length} rubric competencies
                          {profileAssessment.overallScore != null
                            ? ` with an overall match of ${profileAssessment.overallScore}%.`
                            : ". No overall match was recorded for the run."}
                        </p>
                      )
                    ) : isScored(candidate) ? (
                      // `ats.overallScore` DEFAULTS TO 0 in the schema, so this
                      // prose is only reachable behind the same `isScored` gate
                      // the score cards use — otherwise it announced a confident
                      // "Overall match: 0%" about a candidate nobody screened.
                      // The skill list is likewise printed only when it exists:
                      // "competencies in technical skills" named no competency.
                      <p>
                        {resumeSkillNames.length > 0 ? (
                          <>
                            Resume keyword screening identified competencies in{" "}
                            <strong className="text-slate-950 font-semibold">{resumeSkillNames.join(", ")}</strong>.{" "}
                          </>
                        ) : (
                          <>Resume keyword screening recorded no extracted skills for this candidate. </>
                        )}
                        {candidate.ats.overallScore != null && <>Overall match: {candidate.ats.overallScore}%.</>}
                        {candidate.ats.missingSkills?.length > 0 && (
                          <span className="block mt-1.5 text-amber-800 font-medium">
                            Flagged unverified: {candidate.ats.missingSkills.join(", ")}.
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-slate-600 italic">
                        Autonomous screening has not completed for this candidate yet.
                      </p>
                    )}
                  </div>

                  {/* AI Recommendation box */}
                  {(candidate.ats?.recommendation || candidate.ats?.summary) && (
                    <div className="mt-2 rounded-xl bg-purple-50/80 border border-purple-200/80 p-2.5 shrink-0">
                      <div className="flex items-center gap-1 mb-1">
                        <Sparkles className="h-3 w-3 text-purple-700" />
                        <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wide">AI Recommendation</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-purple-950">
                        {candidate.ats.recommendation || candidate.ats.summary}
                      </p>
                    </div>
                  )}

                  <div className="mt-2.5 pt-2.5 border-t border-emerald-200/60 flex items-center justify-between text-[10px] text-slate-600 shrink-0">
                    <span>
                      {profileAssessment?.engine === "evidence"
                        ? "Rubric Evidence Engine"
                        : "ATS Resume Screening"}
                    </span>
                    {/* `confidence` has no schema default, so an engine that
                        did not emit one used to be reported as "High
                        Confidence" — a claim about the run's own certainty
                        that nothing measured. Absent means absent. */}
                    <span className="font-semibold text-emerald-900">
                      {profileAssessment?.confidence != null
                        ? `Confidence: ${Math.round(profileAssessment.confidence * 100)}%`
                        : "Confidence not reported"}
                    </span>
                  </div>
                </div>

                {/* Column 2: Applicant Highlights */}
                <Card className="bg-gradient-to-br from-slate-50 to-white shadow-sm border-slate-200/80 overflow-y-auto min-h-0 flex flex-col">
                  <h3 className="text-xs font-bold text-slate-900 mb-2.5 flex items-center gap-1.5 shrink-0">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    Applicant Highlights
                  </h3>
                  <div className="space-y-2.5 text-xs text-slate-700 flex-1">
                    {candidate.experience?.[0] && (
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Latest Role</span>
                        {/* A missing role or employer reads as "—", not as the
                            words "Role" and "Company" set in the same weight as
                            a real one. A placeholder rendered as data is data. */}
                        <p className="font-semibold text-slate-900">
                          {candidate.experience[0].title || candidate.experience[0].role || "—"} at{" "}
                          <strong className="font-bold">{candidate.experience[0].company || "—"}</strong>
                        </p>
                        {candidate.experience[0].description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{candidate.experience[0].description}</p>
                        )}
                      </div>
                    )}

                    {candidate.education?.[0] && (
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Education</span>
                        <p className="font-medium text-slate-900">
                          {candidate.education[0].degree || "—"} —{" "}
                          {candidate.education[0].institution || candidate.education[0].school || "—"}
                        </p>
                      </div>
                    )}

                    {candidate.skills?.length > 0 && (
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Key Skills</span>
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.slice(0, 12).map((skill, index) => {
                            const name = typeof skill === "string" ? skill : skill.name;
                            return (
                              <span
                                key={index}
                                className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] text-slate-800 font-medium"
                              >
                                {name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Top CV Citations inline */}
                    {profileAssessment?.topEvidence?.length > 0 && (
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">CV Evidence</span>
                        <div className="space-y-1.5">
                          {profileAssessment.topEvidence.slice(0, 2).map((ev, idx) => {
                            const matchedCriterion = findings.find((c) => c.criterionId === ev.criterionId);
                            return (
                              <div key={idx} className="p-2 rounded-lg border border-slate-200/80 bg-slate-50/70 text-[11px]">
                                <span className="text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                  {matchedCriterion?.label || "Resume Evidence"}
                                </span>
                                <p className="text-slate-700 italic leading-snug mt-1 line-clamp-2">"{ev.quote}"</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

              </div>

              {/* ── Row 3: application context (merged in from Overview) ─── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <Card className="bg-white shadow-xs border-slate-200/80">
                  <h3 className="text-xs font-bold text-slate-900 mb-2.5 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                    Application
                  </h3>
                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Applied on</dt>
                      <dd className="font-semibold text-slate-900">
                        {candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Requisition</dt>
                      <dd className="font-semibold text-slate-900">{candidate.job?.title || "No job assigned"}</dd>
                      {candidate.job?.department && (
                        <dd className="text-slate-500">{candidate.job.department}</dd>
                      )}
                    </div>
                  </dl>
                </Card>

                {/* Latest Recorded Activity */}
                <Card className="bg-white shadow-xs border-slate-200/80">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    Latest Recorded Activity
                  </h3>
                  {candidate.stageHistory?.length > 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1 text-xs sm:text-sm">
                        <div className="flex justify-between items-baseline flex-wrap gap-2">
                          <strong className="text-slate-900 font-semibold">
                            Moved to {stageLabel(candidate.stageHistory[candidate.stageHistory.length - 1].stage)}
                          </strong>
                          <span className="text-xs text-slate-500">
                            {candidate.stageHistory[candidate.stageHistory.length - 1].at
                              ? new Date(candidate.stageHistory[candidate.stageHistory.length - 1].at).toLocaleString()
                              : "Recorded"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          {candidate.stageHistory[candidate.stageHistory.length - 1].actor
                            ? `Action performed by ${candidate.stageHistory[candidate.stageHistory.length - 1].actor}`
                            : // An unrecorded actor is not evidence the move was
                              // automatic — the record simply does not say who.
                              "No actor recorded for this move"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No previous stage events recorded.</p>
                  )}
                </Card>
              </div>

              {/* Interview Evidence Summary Card with jump button */}
              <Card className="bg-white shadow-xs border-slate-200/80">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Mic className="w-4 h-4 text-slate-500" />
                    AI Interview Evidence Summary
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTabSwitch("ai-interview")}
                    className="text-xs"
                  >
                    Open Full AI Interview Report →
                  </Button>
                </div>

                {interviewSession || interviewReport ? (
                  <div className="space-y-3 text-xs sm:text-sm">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-semibold text-slate-900">
                          {interviewRecommendation
                            ? `Recommendation: ${interviewRecommendation.toUpperCase().replaceAll("_", " ")}`
                            : "AI Evaluation Overview"}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          {interviewScore != null ? `${interviewScore}/100` : "Score pending"}
                        </span>
                      </div>
                      {/* A missing evaluation summary is not a promise that a
                          recording and a transcript exist — that sentence was
                          printed without either being checked. */}
                      <p className="text-slate-700 leading-relaxed text-xs">
                        {interviewSummary || (
                          <span className="text-slate-500 italic">
                            No evaluation summary recorded for this session.
                          </span>
                        )}
                      </p>
                    </div>

                    {(interviewStrengths.length > 0 || interviewWeaknesses.length > 0) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80">
                          <span className="font-bold text-emerald-900 block mb-1">Key Strengths</span>
                          <ul className="list-disc list-inside space-y-0.5 text-emerald-950">
                            {interviewStrengths.slice(0, 3).map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/80">
                          <span className="font-bold text-amber-900 block mb-1">Evidence Gaps / Probes</span>
                          <ul className="list-disc list-inside space-y-0.5 text-amber-950">
                            {interviewWeaknesses.length > 0 ? (
                              interviewWeaknesses.slice(0, 3).map((w, i) => (
                                <li key={i}>{w}</li>
                              ))
                            ) : (
                              // An empty array and an unproduced field look the
                              // same from here, and neither is the engine
                              // affirming the candidate has no gaps.
                              <li className="list-none text-amber-900/70 italic">None recorded.</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-2">
                    No AI interview session recorded yet for this applicant. You can invite the candidate from the AI Interview Report tab.
                  </p>
                )}
              </Card>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB: ATS SCORE BREAKDOWN
              The CV-screening evidence used to be split in two: a condensed
              column on Summary and a fuller card buried inside Assessments,
              which meant the same four axes were rendered twice from two
              separate (and once divergent) code paths. It is one subject, so
              it gets one place — and it sits next to Assessments because both
              answer "what did we measure about this person".
              ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "ats-breakdown" && (
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
            <div className="space-y-5">
              {/* CV Screening Breakdown Card */}
              <Card className="bg-white shadow-xs border-slate-200/80">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">CV Screening Assessment</h3>
                    <p className="text-xs text-slate-500">Autonomous evaluation based on job rubric & experience</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-slate-900 tabular-nums">
                      {cvScore != null ? `${cvScore}/100` : "—"}
                    </span>
                    <span className="block text-[11px] text-slate-400">Overall Match</span>
                  </div>
                </div>

                {/* The same honest gate as the Summary tab's rubric breakdown:
                    these axes DEFAULT TO 0 in the schema, so `|| 0` reported
                    four confident zeroes about a candidate nobody screened.
                    An axis the run did not produce reads "—", not 0%. */}
                {!isScored(candidate) ? (
                  <p className="text-xs text-slate-500">
                    Not screened yet — there is no CV screening breakdown to show.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Skills Match", value: candidate.ats?.skillsMatch ?? candidate.ats?.breakdown?.skillsScore },
                      { label: "Experience Match", value: candidate.ats?.experienceMatch ?? candidate.ats?.breakdown?.experienceScore },
                      { label: "Education Match", value: candidate.ats?.educationMatch ?? candidate.ats?.breakdown?.educationScore },
                      { label: "Projects Match", value: candidate.ats?.projectsMatch },
                    ].map((axis) => (
                      <div key={axis.label} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                        <span className="text-xs font-semibold text-slate-600 block mb-1">{axis.label}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-slate-900 tabular-nums">
                            {axis.value != null ? `${axis.value}%` : "—"}
                          </span>
                        </div>
                        {axis.value != null && (
                          <div className="w-full h-1.5 rounded-full bg-slate-200 mt-2 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-600"
                              style={{ width: `${Math.min(100, axis.value)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {candidate.ats?.missingSkills?.length > 0 && (
                  <div className="mt-4 p-3 rounded-xl bg-amber-50/80 border border-amber-200">
                    <span className="text-xs font-bold text-amber-900 block mb-1">
                      Flagged Unverified / Missing Competencies:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.ats.missingSkills.map((s, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-white border border-amber-300 px-2 py-0.5 text-xs text-amber-900 font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {findings.length > 0 && (
                  <div className="mt-4 border-t border-slate-100 pt-3 space-y-1.5">
                    <span className="text-xs font-bold text-slate-800 block mb-1">
                      Evaluated Rubric Criteria
                    </span>
                    {findings.map((f, idx) => {
                      // Only a real `criterionScore` becomes a percentage.
                      // Mapping "satisfied" to 100% and "partial" to 50%
                      // manufactures precision the engine never claimed —
                      // the status is a judgement, not a measurement — so a
                      // finding without a score shows its status word.
                      const pct = f.criterionScore != null ? Math.round(f.criterionScore * 100) : null;
                      return (
                        <div key={idx} className="p-2 rounded-lg border border-slate-100 bg-slate-50/70 text-[11px]">
                          <div className="flex justify-between items-center gap-2 mb-0.5">
                            <span className="font-semibold text-slate-800">{f.label}</span>
                            <span className={`font-bold tabular-nums shrink-0 ${f.status === "satisfied" ? "text-emerald-700" : "text-slate-600"}`}>
                              {pct != null ? `${pct}%` : STATUS_WORDS[f.status] || "Not assessed"}
                            </span>
                          </div>
                          {pct != null && (
                            <div className="w-full h-1 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${f.status === "satisfied" ? "bg-emerald-600" : "bg-slate-400"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                          {/* The engine's justification for this criterion.
                              Dropping it left a bare number with nothing a
                              recruiter could check it against, which is the
                              opposite of an evidence-bound score. */}
                          {f.reasoning && (
                            <p className="mt-1 text-[11px] leading-snug text-slate-600">{f.reasoning}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </div>
          )}

          {/* ================================================================
              TAB 3: ASSESSMENTS
              ================================================================ */}
          {activeTab === "assessments" && (
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
            <div className="space-y-5">
              {/* ── THE RECRUITER GATE ──────────────────────────────────────
                  On a "manual" policy job an ATS-passed candidate waits here
                  until a person decides. With no control on screen that wait
                  is indistinguishable from the pipeline being stuck, so the
                  decision is put where the candidate is — and the reason a
                  decision cannot be taken yet is stated rather than discovered
                  by clicking. */}
              {assessmentSession && !assessmentSession.session && !assessmentSession.decision && (
                <Card className="border-amber-200 bg-amber-50/70 shadow-xs">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-amber-900">
                    <ListChecks className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Awaiting your decision on the skills test
                  </h3>
                  {candidate.job?.assessmentPolicy === "off" ? (
                    <p className="mt-1.5 text-xs text-amber-800">
                      Assessments are off for {candidate.job?.title || "this job"}. Turn the job&apos;s
                      assessment policy to manual before a test can be sent.
                    </p>
                  ) : !assessmentSession.paperReady ? (
                    <p className="mt-1.5 text-xs text-amber-800">
                      No approved paper for this job yet — approve one on the job&apos;s Assessment tab
                      and the test can go out. Skipping is still available.
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-amber-800">
                      Send the test, or record a decision to skip it and go straight to the AI interview.
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSendAssessment}
                      disabled={
                        !!assessmentAction ||
                        !assessmentSession.paperReady ||
                        candidate.job?.assessmentPolicy === "off"
                      }
                      className="flex items-center gap-1.5"
                    >
                      <Send className="h-4 w-4" aria-hidden="true" />
                      {assessmentAction === "send" ? "Sending…" : "Send skills test"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSkipAssessment}
                      disabled={!!assessmentAction}
                    >
                      {assessmentAction === "skip" ? "Skipping…" : "Skip to AI interview"}
                    </Button>
                  </div>
                </Card>
              )}

              {/* A recorded skip is a decision with a name on it, and reads as
                  one — never as a test that silently never happened. */}
              {assessmentSession?.decision?.action === "skipped" && !assessmentSession.session && (
                <Card className="bg-white shadow-xs border-slate-200/80">
                  <p className="text-sm font-semibold text-slate-900">Skills test skipped</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Recorded by {assessmentSession.decision.byName || "a recruiter"}
                    {assessmentSession.decision.at
                      ? ` on ${new Date(assessmentSession.decision.at).toLocaleString()}`
                      : ""}
                    .
                  </p>
                </Card>
              )}

              {/* Skill Assessment Paper Card */}
              <Card className="bg-white shadow-xs border-slate-200/80">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Technical Skill Assessment Paper</h3>
                    <p className="text-xs text-slate-500">Objective questions & coding challenges</p>
                  </div>
                  <Badge
                    tone={
                      assessmentItem?.status === "completed"
                        ? "green"
                        : assessmentItem?.status === "in_progress"
                        ? "blue"
                        : assessmentItem?.status === "scheduled"
                        ? "amber"
                        : "slate"
                    }
                  >
                    {assessmentItem?.status?.replaceAll("_", " ") ||
                      (assessmentDecision?.action === "skipped"
                        ? "Skipped"
                        : assessmentDecision?.action === "send"
                        ? "Pending Assignment"
                        : "Not Assigned")}
                  </Badge>
                </div>

                {assessmentItem ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-xs text-slate-500 font-medium">
                          {/* The paper's own section title, or nothing — an
                              invented one ("Core Technical Assessment") named a
                              paper that does not exist under that name. */}
                          {assessmentPaper?.sections?.[0]?.title || "Untitled section"}
                        </span>
                        <div className="mt-1 flex items-baseline gap-1.5">
                          <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                            {assessmentScore != null ? assessmentScore : "—"}
                          </span>
                          <span className="text-xs text-slate-500">/ 100</span>
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <span className="text-slate-500 block">
                          Result:{" "}
                          <strong className="text-slate-900 font-semibold">
                            {assessmentItem.status === "completed"
                              ? `${assessmentTotalCorrect}/${assessmentTotalItems} correct`
                              : assessmentItem.status === "in_progress"
                              ? "In Progress"
                              : "Scheduled"}
                          </strong>
                        </span>
                        <span className="text-slate-400 block text-[11px] mt-0.5">
                          {assessmentItem.status === "completed"
                            ? `Scored ${formatWhen(assessmentResult?.scoredAt || assessmentItem.completedAt)}`
                            : `Assigned ${formatWhen(assessmentItem.assignment?.at || assessmentItem.createdAt)}`}
                        </span>
                      </div>
                    </div>

                    {assessmentItem.difficultyTier?.value && (
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <span>Difficulty Tier:</span>
                        <strong className="text-slate-800 uppercase">{assessmentItem.difficultyTier.value}</strong>
                        {assessmentItem.difficultyTier.basis && (
                          <span className="text-slate-400">({assessmentItem.difficultyTier.basis})</span>
                        )}
                      </div>
                    )}

                    {assessmentPerCriterion.length > 0 && (
                      <div className="mt-3 space-y-1.5 border-t border-slate-200/70 pt-3">
                        <span className="text-xs font-semibold text-slate-700 block mb-1">Criterion Performance</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {assessmentPerCriterion.map((c, idx) => (
                            <div
                              key={c.criterionId || idx}
                              className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs"
                            >
                              <span className="text-slate-600 font-medium">{c.label || c.criterionId}</span>
                              <span className="font-bold text-slate-900 tabular-nums">
                                {c.correctCount}/{c.itemCount}
                                {c.itemCount ? ` (${Math.round((c.correctCount / c.itemCount) * 100)}%)` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {assessmentClaimVerdicts.length > 0 && (
                      <div className="mt-3 space-y-1.5 border-t border-slate-200/70 pt-3">
                        <span className="text-xs font-semibold text-slate-700 block mb-1">Résumé-Claim Probes</span>
                        {assessmentClaimVerdicts.map((v, idx) => (
                          <div key={v.claimId || idx} className="text-xs flex items-center gap-2">
                            <Badge tone={v.verdict === "verified" ? "green" : v.verdict === "contradicted" ? "red" : "amber"}>
                              {v.verdict}
                            </Badge>
                            <span className="text-slate-700">{v.criterionId || v.claimId}</span>
                            <span className="text-slate-400 font-medium">({v.correctCount}/{v.itemCount} items)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : assessmentDecision?.action === "skipped" ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                    <p className="font-medium text-slate-800 mb-1">Skills Assessment Skipped</p>
                    <p>
                      Technical assessment was skipped by{" "}
                      <strong>{assessmentDecision.byName || "a recruiter"}</strong> on{" "}
                      {formatWhen(assessmentDecision.at)}. The candidate was routed directly to the AI interview.
                    </p>
                  </div>
                ) : assessmentDecision?.action === "send" ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                    <p className="font-medium text-slate-800 mb-1">Assessment Invitation Pending</p>
                    <p>
                      Invitation initiated by <strong>{assessmentDecision.byName || "a recruiter"}</strong> on{" "}
                      {formatWhen(assessmentDecision.at)}. Awaiting candidate activation.
                    </p>
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500">
                    <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No technical test paper assigned</p>
                    <p className="text-slate-400 mt-0.5">
                      {isPaperReady
                        ? "An approved technical paper is available for this job role and can be sent to the candidate."
                        : "No assessment paper has been configured or approved for this job role yet."}
                    </p>
                  </div>
                )}
              </Card>
            </div>
          </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 4: AI INTERVIEW REPORT
              ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "ai-interview" && (
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <div className="space-y-5">
              {/* Header with recommendation & actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">AI Interview Workspace & Analysis</h3>
                    {/* The badge was hardcoded emerald, so a NO HIRE verdict
                        arrived dressed in the colour of a pass. The colour is
                        read faster than the word — it has to carry the same
                        verdict the word does. */}
                    {interviewRecommendation && (
                      <Badge tone={RECOMMENDATION[interviewRecommendation]?.tone || "slate"}>
                        {RECOMMENDATION[interviewRecommendation]?.label || interviewRecommendation.replaceAll("_", " ")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Interactive recording playback, transcripts, rubric coverage, and recruiter notes.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    Download PDF Report
                  </Button>
                </div>
              </div>

              {interviewSession || interviewReport ? (() => {
                const reportInterview = interviewReport?.interview || interviewSession?.aiInterview || interviewSession;
                const reportEv = interviewEv || reportInterview?.evaluation;
                const reportRec = RECOMMENDATION[reportEv?.recommendation] || (reportEv?.recommendation ? { label: reportEv.recommendation.replaceAll("_", " "), tone: "emerald" } : null);
                const reportProctoring = interviewReport?.proctoring || interviewSession?.proctoring || reportInterview?.proctoring;
                const reportInsights = reportInterview?.insights || interviewReport?.insights || reportEv?.insights;
                const reportCoverage = interviewReport?.coverage || reportInterview?.coverage;
                return (
                  <div className="space-y-5">
                    {/* Sub-navigation tabs for rapid drill-down across Report sections */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 border border-slate-200/70 text-xs font-semibold">
                      {[
                        { id: "all", label: "All Sections", icon: FileText },
                        { id: "evaluation", label: "Evaluation & Scores", icon: BarChart3 },
                        { id: "communication", label: "Communication Skills", icon: Sparkles },
                        { id: "integrity", label: "Integrity & Proctoring", icon: Eye },
                        { id: "recording", label: "Recording & Transcripts", icon: Mic },
                      ].map((sub) => {
                        const Icon = sub.icon;
                        const isActive = interviewSubTab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => setInterviewSubTab(sub.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                              isActive
                                ? "bg-white text-brand-900 shadow-xs font-bold ring-1 ring-slate-200/60"
                                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5 text-slate-500" />
                            <span>{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Section 1: Evaluation & Scores */}
                    {(interviewSubTab === "all" || interviewSubTab === "evaluation") && (
                      <div className="space-y-4">
                        {reportEv?.overallScore == null || reportEv?.generatedBy === "fallback" || reportInterview?.sessionQuality?.degraded ? (
                          <InterviewSummary interview={reportInterview} />
                        ) : (
                          <InstrumentScores
                            id="drawer-sec-scores"
                            only="interview"
                            report={interviewReport || { hasInterview: true }}
                            interview={reportInterview}
                            ev={reportEv}
                            coverage={reportCoverage}
                            interviewReadable={true}
                          />
                        )}

                        <EvaluationCard interview={reportInterview || {}} ev={reportEv} rec={reportRec} />

                        {reportInterview?.recommendedAction && (
                          <RecommendedActionCard action={reportInterview.recommendedAction} />
                        )}
                      </div>
                    )}

                    {/* Section 2: Communication Skills */}
                    {(interviewSubTab === "all" || interviewSubTab === "communication") && (
                      <div className="space-y-4">
                        <CommunicationCompetencyCard interview={reportInterview} ev={reportEv} />
                        <InsightPanel
                          id="drawer-sec-communication"
                          title="Communication Skills"
                          axes={reportInsights?.communication}
                          unavailable={
                            !reportInsights?.communication?.length && !reportInterview?.competencyTriplet?.communication && !reportEv?.delivery && !reportEv?.confidence && !reportEv?.spokenCommunication
                              ? "Not assessed for this session — communication analysis requires scored candidate answers."
                              : null
                          }
                          note="Scored from the transcript only — never from pace, hesitation or accent. Grammar is counted only where the transcription was reliable enough to attribute to the candidate rather than to the transcriber."
                        />
                      </div>
                    )}

                    {/* Section 4: Integrity & Proctoring */}
                    {(interviewSubTab === "all" || interviewSubTab === "integrity") && (
                      <div className="space-y-4">
                        {reportProctoring ? (
                          <IntegrityCard proctoring={reportProctoring} candidateId={candidateId} />
                        ) : (
                          /* There is no proctoring record for this session.
                             This used to render a "Standard Verification" badge
                             and state that anti-cheat was enabled and that no
                             suspicious events were recorded — two claims about
                             a run that left nothing behind to claim them from.
                             A session nobody proctored and a session proctored
                             clean produce the identical absence here, and the
                             difference matters far too much to guess at. */
                          <Card id="drawer-sec-integrity">
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                                <Eye className="h-4 w-4 text-brand-600" /> Integrity & Proctoring
                              </h3>
                              <Badge tone="slate">Not recorded</Badge>
                            </div>
                            <p className="text-sm text-slate-600 mt-1">
                              No proctoring record was stored for this session. That is not a clean result — it means
                              nothing was measured, so this session carries no integrity evidence either way.
                            </p>
                          </Card>
                        )}
                      </div>
                    )}

                    {/* Section 5: Recording & Transcripts */}
                    {(interviewSubTab === "all" || interviewSubTab === "recording") && (
                      <Card className="bg-white shadow-xs border-slate-200/80">
                        <InterviewWorkspace
                          candidateId={candidateId}
                          interview={reportInterview}
                        />
                      </Card>
                    )}
                  </div>
                );
              })() : (
                <Card className="bg-white text-center py-10">
                  <Mic className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-900">No Interview Conducted Yet</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                    The candidate has not completed an AI voice/video interview session. You can advance them in the
                    pipeline to generate an invitation link.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStageMove("interview_scheduled")}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white"
                  >
                    Schedule AI Interview
                  </Button>
                </Card>
              )}
            </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 5: PROFILE & CV
              ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "profile-cv" && (
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
            <div className="space-y-5">
              {/* Contact and Identity Grid */}
              <Card className="bg-white shadow-xs border-slate-200/80">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500" />
                    Candidate Profile Information
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadResume}
                    className="flex items-center gap-1.5 text-xs text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Original CV
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  {/* "—" left a reader guessing whether the candidate gave us
                      nothing or the field failed to load. These come from the
                      application the candidate filled in themselves, so the
                      honest reading is "they did not provide it".

                      Deliberately NOT an "+ Add" affordance like some ATSs
                      offer: there is no admin endpoint to write a candidate's
                      own contact details, and adding one would create an
                      unaudited write path into a record whose provenance this
                      product otherwise tracks field by field. */}
                  <div>
                    <span className="text-slate-400 block mb-0.5">Full Name</span>
                    {candidate.basicDetails?.name ? (
                      <strong className="text-slate-900 text-sm font-semibold">
                        {candidate.basicDetails.name}
                      </strong>
                    ) : (
                      <EvidenceChip state="absent">Not provided</EvidenceChip>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Email Address</span>
                    {candidate.basicDetails?.email ? (
                      <strong className="text-slate-900 text-sm font-semibold break-all">
                        {candidate.basicDetails.email}
                      </strong>
                    ) : (
                      <EvidenceChip state="absent">Not provided</EvidenceChip>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Phone Number</span>
                    {candidate.basicDetails?.phone ? (
                      <strong className="text-slate-900 text-sm font-semibold">
                        {candidate.basicDetails.phone}
                      </strong>
                    ) : (
                      <EvidenceChip state="absent">Not provided</EvidenceChip>
                    )}
                  </div>
                  {candidate.basicDetails?.location && (
                    <div>
                      <span className="text-slate-400 block mb-0.5">Location</span>
                      <strong className="text-slate-900 text-sm font-semibold">
                        {candidate.basicDetails.location}
                      </strong>
                    </div>
                  )}
                  {linkedinUrl && (
                    <div>
                      <span className="text-slate-400 block mb-0.5">LinkedIn</span>
                      <a
                        href={linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 font-semibold underline truncate block"
                      >
                        {linkedinUrl}
                      </a>
                    </div>
                  )}
                  {portfolioUrl && (
                    <div>
                      <span className="text-slate-400 block mb-0.5">Portfolio / Website</span>
                      <a
                        href={portfolioUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 font-semibold underline truncate block"
                      >
                        {portfolioUrl}
                      </a>
                    </div>
                  )}
                </div>
              </Card>

              {/* Work Experience Section with Provenance */}
              <Card className="bg-white shadow-xs border-slate-200/80">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-500" />
                  Work Experience ({candidate.experience?.length || 0})
                </h3>
                {candidate.experience?.length > 0 ? (
                  <div className="space-y-4">
                    {candidate.experience.map((exp, index) => (
                      <div key={index} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{exp.role || exp.title || "Position"}</h4>
                            <p className="text-xs font-semibold text-emerald-800">{exp.company || "Company"}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <ProvenanceTag provenance={exp.provenance} />
                            <span className="text-xs text-slate-500">
                              {exp.startDate || ""} {exp.endDate ? `– ${exp.endDate}` : ""}
                            </span>
                          </div>
                        </div>
                        {exp.description && (
                          <p className="text-xs text-slate-700 leading-relaxed mt-2 whitespace-pre-line">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No work experience entries recorded.</p>
                )}
              </Card>

              {/* Education Section */}
              <Card className="bg-white shadow-xs border-slate-200/80">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-slate-500" />
                  Education
                </h3>
                {candidate.education?.length > 0 ? (
                  <div className="space-y-3">
                    {candidate.education.map((edu, index) => (
                      <div key={index} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                        <div className="flex justify-between items-baseline">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{edu.degree || "Degree"}</h4>
                          <span className="text-xs text-slate-500">
                            {edu.year || edu.startDate || ""} {edu.endDate ? `– ${edu.endDate}` : ""}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{edu.institution || edu.school || "University"}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No education entries recorded.</p>
                )}
              </Card>

            </div>
          </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 6: ACTIVITY & TIMELINE
              ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "activity" && (
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
            <div className="space-y-5">
              {/* Recorded Stage History Timeline */}
              <Card className="bg-white shadow-xs border-slate-200/80">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Recorded Stage History
                </h3>
                <ol className="space-y-4 relative border-l-2 border-slate-200 ml-3 pl-5 py-1">
                  {candidate.stageHistory?.length > 0 ? (
                    candidate.stageHistory.map((step, idx) => {
                      const isCurrent = normalizeStage(step.stage) === normalizeStage(candidate.status);
                      return (
                        <li key={idx} className="relative">
                          <span
                            className={`absolute -left-[27px] top-0.5 h-3.5 w-3.5 rounded-full ring-4 ring-white ${
                              isCurrent ? "bg-emerald-700" : "bg-slate-400"
                            }`}
                          />
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className={`text-xs font-bold ${isCurrent ? "text-emerald-900" : "text-slate-800"}`}>
                              {stageLabel(step.stage)}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {step.at ? new Date(step.at).toLocaleString() : "Recorded"}
                            </span>
                          </div>
                          {step.actor && (
                            <p className="text-[11px] text-slate-500 mt-0.5">Updated by {step.actor}</p>
                          )}
                          {step.note && (
                            <div className="mt-1.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700">
                              {step.note}
                            </div>
                          )}
                        </li>
                      );
                    })
                  ) : (
                    <li className="text-xs text-slate-500">No stage transitions recorded.</li>
                  )}
                </ol>
              </Card>

              {/* Recruiter Notes Log & Add Note Form */}
              <Card className="bg-white shadow-xs border-slate-200/80">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-500" />
                  Recruiter Notes
                </h3>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="mb-4 space-y-2">
                  <textarea
                    rows={2}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add an internal note or interview debrief about this candidate..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={savingNote || !newNote.trim()}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      {savingNote ? "Saving..." : "Save Note"}
                    </Button>
                  </div>
                </form>

                {/* Notes List */}
                {candidate.notes?.length > 0 ? (
                  <div className="space-y-2.5">
                    {candidate.notes.map((note, index) => (
                      <div key={index} className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs">
                        <p className="text-slate-800 whitespace-pre-wrap font-medium">
                          {typeof note === "string" ? note : note.content}
                        </p>
                        {note.author && (
                          <span className="mt-1.5 block text-[11px] text-slate-400">
                            By {note.author} · {note.createdAt ? new Date(note.createdAt).toLocaleDateString() : ""}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No notes added for this applicant yet.</p>
                )}
              </Card>

              {/* Offer Status (if exists) */}
              {candidate.offer?.status && candidate.offer.status !== "none" && (
                <Card className="bg-white shadow-xs border-slate-200/80">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Offer Status</h3>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <p className="font-semibold text-slate-900">
                      Current Offer: <span className="capitalize">{candidate.offer.status}</span>
                    </p>
                    {candidate.offer.sentAt && (
                      <p className="text-slate-500 mt-1">
                        Sent on {new Date(candidate.offer.sentAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </Card>
              )}

              {/* ── RECORD TOOLS ───────────────────────────────────────────
                  Rescore, export and erase. They sit on the Activity tab
                  because this is the record-keeping surface, and behind a
                  disclosure because none of them is part of reviewing a
                  candidate — you come here deliberately.

                  Order and weight are deliberate: the reversible action reads
                  first, the irreversible one is last, quietest, and separated
                  by a rule. Erase is not a button you can reach by aiming at
                  Export and missing. */}
              <details className="rounded-xl border border-slate-200 bg-white">
                <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 text-sm font-bold text-slate-900">
                  Record tools
                  <span className="text-xs font-medium text-slate-500">rescore · export · erase</span>
                </summary>
                <div className="space-y-4 border-t border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {isScored(candidate) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRescore}
                        disabled={rescoring}
                        className="flex items-center gap-1.5"
                        title="Re-run scoring against the rubric approved for this job right now"
                      >
                        <RefreshCw className={`h-4 w-4 ${rescoring ? "animate-spin" : ""}`} aria-hidden="true" />
                        {rescoring ? "Rescoring…" : "Rescore"}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportRecord}
                      className="flex items-center gap-1.5"
                      title="Download everything stored about this candidate as JSON (DPDP data portability)"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" /> Export record
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveFromJob}
                      disabled={removing || erasing}
                      className="flex items-center gap-1.5"
                      title="Remove only this application from this job's Hiring Pipeline"
                    >
                      <XCircle className="h-4 w-4" aria-hidden="true" /> {removing ? "Removing…" : "Remove from job"}
                    </Button>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    {!eraseArmed ? (
                      <button
                        type="button"
                        onClick={() => setEraseArmed(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" /> Erase all data for this candidate
                      </button>
                    ) : (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5">
                        <p className="flex items-start gap-2 text-sm font-semibold text-rose-800">
                          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                          This permanently deletes the résumé, interview recording, transcript and
                          every score for {candidate.basicDetails?.name || "this candidate"}.
                        </p>
                        <p className="mt-1 text-xs text-rose-700">
                          It cannot be undone, and the record cannot be restored from the interface.
                          Type ERASE to confirm.
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={eraseConfirm}
                            onChange={(event) => setEraseConfirm(event.target.value)}
                            aria-label="Type ERASE to confirm"
                            placeholder="ERASE"
                            className="w-28 rounded-lg border border-rose-300 bg-white px-2.5 py-1.5 text-sm uppercase tracking-wide text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none"
                          />
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={handleErase}
                            disabled={erasing || eraseConfirm.trim().toUpperCase() !== "ERASE"}
                          >
                            {erasing ? "Erasing…" : "Erase permanently"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEraseArmed(false);
                              setEraseConfirm("");
                            }}
                            disabled={erasing}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </details>
            </div>
            </div>
          )}
        </div>
      ) : null}

      {/* ── STICKY MODAL FOOTER ────────────────────────────────────────────── */}
      {candidate && (
        <footer className="shrink-0 px-6 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 z-10">
          <div className="text-xs text-slate-600">
            <span className="font-semibold text-slate-900">Applicant: {candidate.basicDetails?.name || "Candidate"}</span>
            <span className="mx-1.5">·</span>
            <span className="text-slate-500">Stage: {stageLabel(candidate.status)}</span>
          </div>

          <div className="flex items-center gap-2">
            {candidate.status !== "rejected" && (
              <Button
                variant="secondary"
                size="sm"
                disabled={movingStage}
                onClick={() => handleStageMove("rejected")}
                className="border-rose-200 text-rose-700 hover:bg-rose-50"
              >
                Reject Candidate
              </Button>
            )}
            {candidate.status !== "selected" && candidate.status !== "joined" && (
              <Button
                variant="primary"
                size="sm"
                disabled={movingStage}
                onClick={handleAdvanceCandidate}
                className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
              >
                {candidate.status === "applied" || candidate.status === "ats_passed"
                  ? "Shortlist Candidate"
                  : candidate.status === "shortlisted"
                  ? "Schedule Technical Interview"
                  : "Advance Candidate"}
              </Button>
            )}
          </div>
        </footer>
      )}
    </Modal>
  );
}
