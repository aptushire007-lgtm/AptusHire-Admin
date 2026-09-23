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
import {
  criterionIndex,
  assessmentCriterionRows,
  claimCheckRows,
  itemTally,
  integrityRows,
} from "../../lib/reportData.js";
import { ScoreRing, DistributionStrip, ResultBar, CriterionBars } from "../report/Scorecard.jsx";
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
import OfferDialog from "./OfferDialog.jsx";
import { RubricRadar, KeyPoints, CriterionRows } from "../report/Insights.jsx";
import { criterionMatrix, keyPoints } from "../../lib/reportInsights.js";
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
  // Side data for the report's visuals, loaded apart from the drawer's main
  // fetch so that never waits on it: the job's rubric (to NAME criteria, which
  // the report printed as "c1", "c10") and the CV scores of the job's other
  // applicants (to place this one among them). Null until loaded and on
  // failure — the visuals that need them are then simply not drawn.
  const [jobRubric, setJobRubric] = useState(null);
  const [focusCriterion, setFocusCriterion] = useState(null);
  const [openCriterion, setOpenCriterion] = useState(null);
  const [peerScores, setPeerScores] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [movingStage, setMovingStage] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
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
      // The workspace read model replaces five overlapping browser requests.
      // Fall back during a rolling deployment where the frontend may reach an
      // older API instance for a few seconds.
      try {
        const workspace = await api.get(`/candidates/${id}/workspace`, { signal });
        if (workspace.data?.candidate) {
          setCandidate(workspace.data.candidate);
          setInterviewSession(workspace.data.interviewSession || null);
          setAssessmentSession(workspace.data.assessmentSession || null);
          setInterviewReport(workspace.data.interviewReport || null);
          setProfileAssessment(workspace.data.profileAssessment || null);
          return;
        }
      } catch (workspaceError) {
        if (workspaceError?.name === "CanceledError" || workspaceError?.name === "AbortError") throw workspaceError;
        const status = workspaceError?.response?.status;
        if (status !== 404 && status !== 405) throw workspaceError;
      }

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

  // The report's side data, keyed on the JOB (not the candidate): opening the
  // next applicant for the same role reuses it. Both requests are reads.
  const reportJobId = candidate?.job?._id || (typeof candidate?.job === "string" ? candidate.job : null);
  useEffect(() => {
    if (!reportJobId) return undefined;
    let alive = true;
    setJobRubric(null);
    setPeerScores(null);
    api
      .get(`/rubrics/job/${reportJobId}`)
      .then(({ data }) => alive && setJobRubric(data))
      // `false`, not null: "could not load" must end the loading state, or the
      // criteria section would wait forever on a request that already failed.
      .catch(() => alive && setJobRubric(false));
    api
      .get("/candidates", { params: { jobId: reportJobId, limit: 200 } })
      .then(({ data }) => {
        if (!alive) return;
        // Only applicants the ATS actually scored: an unscored application's
        // schema-default 0 is not a score and must not drag the comparison.
        setPeerScores(
          (data.items || [])
            .filter((c) => c._id !== candidateId && isScored(c))
            .map((c) => scoreOf(c))
            .filter((v) => v != null)
        );
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [reportJobId, candidateId]);

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

  // An offer goes through the offer dialog, which calls back with the message.
  async function handleStageMove(newStage, offerMessage) {
    if (!candidateId || !newStage) return;
    if (newStage === "offer_sent" && !offerOpen) {
      setOfferOpen(true);
      return;
    }
    setMovingStage(true);
    try {
      await api.patch(`/candidates/${candidateId}/stage`, { stage: newStage, offerMessage });
      setOfferOpen(false);
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
  const rubricIndex = criterionIndex(jobRubric);
  const assessmentRows = assessmentCriterionRows(assessmentPerCriterion, rubricIndex);
  const claimRows = claimCheckRows(assessmentClaimVerdicts, rubricIndex);
  const tally = itemTally(assessmentResult?.perItem);
  const integrity = integrityRows(assessmentItem?.proctoring?.counts);
  const matrix = criterionMatrix(findings, assessmentPerCriterion, rubricIndex, profileAssessment?.topEvidence);
  const interviewEndedUnscored = interviewScore == null && Boolean(interviewCompletedAt || interviewReport?.interview);
  const points = keyPoints({
    matrix,
    claimRows,
    missingSkills: candidate?.ats?.missingSkills || [],
    timelineGaps: profileAssessment?.timelineGaps || [],
    integrity: assessmentItem?.proctoring?.riskBand
      ? { band: assessmentItem.proctoring.riskBand, events: assessmentItem.proctoring.totalEvents ?? integrity.reduce((n, r) => n + r.count, 0) }
      : null,
    interview: {
      strengths: interviewStrengths,
      weaknesses: interviewWeaknesses,
      withheld: interviewEndedUnscored,
      reason: interviewEv?.reviewReason || null,
    },
  });
  const lastMove = candidate?.stageHistory?.length ? candidate.stageHistory[candidate.stageHistory.length - 1] : null;

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
    <>
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
              {/* ── Scorecard ─────────────────────────────────────────────────
                  The three instruments side by side, each a ring in its step's
                  colour — the same sky / rose / violet the pipeline card and job
                  creation use, so a recruiter reads them without a legend. It
                  replaces three number tiles in unrelated blue / green / purple
                  gradients. A missing score is a dashed empty ring with the
                  reason in it ("Not run", "Withheld"), never a low one. */}
              {(() => {
                const atsVerdict = { pass: "Passed screening", fail: "Did not pass", review: "Flagged for review" }[
                  candidate.ats?.decision
                ];
                const peersBeaten = cvScore != null && peerScores ? peerScores.filter((v) => v < cvScore).length : null;
                const interviewEnded = Boolean(interviewCompletedAt || interviewReport);
                const tiles = [
                  {
                    key: "cv",
                    title: "CV screening",
                    hue: "sky",
                    value: cvScore,
                    empty: "Not run",
                    verdict: cvScore == null ? "Not scored yet" : atsVerdict || "Scored",
                    lines: [
                      caveat || (profileAssessment?.engine === "evidence" || candidate.ats?.engine === "evidence" ? "Evidence engine" : "Keyword screening"),
                      peersBeaten != null && peerScores.length >= 3
                        ? `Higher than ${peersBeaten} of ${peerScores.length} other applicants`
                        : null,
                    ],
                    tab: "ats-breakdown",
                  },
                  {
                    key: "assessment",
                    title: "Skills assessment",
                    hue: "rose",
                    value: assessmentScore,
                    empty: assessmentDecision?.action === "skipped" ? "Skipped" : "Not run",
                    verdict:
                      assessmentItem?.status === "completed"
                        ? `${assessmentTotalCorrect} of ${assessmentTotalItems} correct`
                        : assessmentItem?.status === "in_progress"
                        ? "In progress"
                        : assessmentItem?.status === "scheduled"
                        ? "Sent — awaiting the candidate"
                        : assessmentDecision?.action === "skipped"
                        ? `Skipped by ${assessmentDecision.byName || "a recruiter"}`
                        : "Not sent",
                    lines: [
                      assessmentItem?.proctoring?.riskBand
                        ? `${assessmentItem.proctoring.riskBand[0].toUpperCase()}${assessmentItem.proctoring.riskBand.slice(1)} integrity risk`
                        : null,
                    ],
                    tab: "assessments",
                  },
                  {
                    key: "interview",
                    title: "AI interview",
                    hue: "violet",
                    value: interviewScore,
                    // Ended but unscored is WITHHELD — a finished interview the
                    // engine would not grade — not the same as never having run.
                    empty: interviewEnded ? "Withheld" : "Not run",
                    verdict:
                      interviewScore != null
                        ? "Scored"
                        : interviewStatus === "in_progress"
                        ? "In progress"
                        : interviewEnded
                        ? "Needs your review"
                        : "Not held yet",
                    lines: [],
                    tab: "ai-interview",
                  },
                ];
                return (
                  <div className="grid shrink-0 grid-cols-1 gap-3 md:grid-cols-3">
                    {tiles.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => handleTabSwitch(t.tab)}
                        className="group flex items-center gap-3.5 rounded-2xl border border-hairline bg-white p-4 text-left transition-all duration-150 hover:-translate-y-px hover:border-slate-300 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                      >
                        <ScoreRing value={t.value} hue={t.hue} size={72} emptyLabel={t.empty} label={t.title} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold tracking-wide text-slate-500 uppercase">{t.title}</span>
                          <span className="mt-1 block text-sm font-semibold text-slate-900">{t.verdict}</span>
                          {t.lines.filter(Boolean).map((line) => (
                            <span key={line} className="mt-0.5 block text-xs text-slate-500">
                              {line}
                            </span>
                          ))}
                          <span className="mt-1.5 block text-xs font-medium text-brand-700 opacity-0 transition-opacity group-hover:opacity-100">
                            View details →
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* ── Fit to the rubric + at a glance ─────────────────────────
                  A picture and a short list, in place of two paragraphs of
                  generated prose. The radar is the CV's evidence per rubric
                  criterion, with the test's result on the same axes where the
                  test covered it; the list says what that adds up to, one line
                  per point, each linking to the tab that backs it. */}
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
                <Card className="border-slate-200/80 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900">Fit to the rubric</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    What the CV shows for each criterion{matrix.some((r) => r.test != null) ? ", and what the test confirmed" : ""}.
                  </p>
                  {matrix.length >= 3 ? (
                    <div className="mt-2">
                      <RubricRadar
                        rows={matrix}
                        focus={focusCriterion}
                        onFocus={(id, pin) => {
                          setFocusCriterion(id);
                          if (pin) setOpenCriterion(id);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-600">
                      {isScored(candidate)
                        ? "This CV was screened by keyword matching, which does not score rubric criteria one by one. Rescore it with the evidence engine to see the breakdown."
                        : "The rubric breakdown appears once this CV has been screened."}
                      {resumeSkillNames.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {resumeSkillNames.map((name) => (
                            <span key={name} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">{name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                <Card className="border-slate-200/80 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900">At a glance</h3>
                  <p className="mt-0.5 mb-3 text-xs text-slate-500">Drawn only from what was measured. Click a point to see its evidence.</p>
                  {(candidate.ats?.recommendation || candidate.ats?.summary) && (
                    <p className="mb-3 line-clamp-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      <span className="font-semibold text-slate-900">Screening note: </span>
                      {candidate.ats.recommendation || candidate.ats.summary}
                    </p>
                  )}
                  <KeyPoints points={points} onOpen={handleTabSwitch} />
                </Card>
              </div>

              {matrix.length > 0 && (
                <Card padding="none" className="border-slate-200/80 shadow-xs">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-4 py-3">
                    <h3 className="text-sm font-bold text-slate-900">Criterion by criterion</h3>
                    <span className="text-xs text-slate-500">
                      {matrix.filter((r) => r.status === "satisfied").length} met · {matrix.filter((r) => r.status === "partial").length} partly ·{" "}
                      {matrix.filter((r) => ["absent", "unmet", "contradicted"].includes(r.status)).length} without evidence — open a row for the why
                    </span>
                  </div>
                  <CriterionRows rows={matrix} focus={focusCriterion} onFocus={setFocusCriterion} open={openCriterion} onToggle={setOpenCriterion} />
                </Card>
              )}

              {/* ── Who, and where they are ─────────────────────────────── */}
              <Card className="border-slate-200/80 shadow-xs">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs md:grid-cols-4">
                  <div className="min-w-0">
                    <dt className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Latest role</dt>
                    <dd className="mt-0.5 truncate font-semibold text-slate-900">
                      {candidate.experience?.[0]
                        ? `${candidate.experience[0].title || candidate.experience[0].role || "—"} · ${candidate.experience[0].company || "—"}`
                        : "Not in CV"}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Education</dt>
                    <dd className="mt-0.5 truncate font-semibold text-slate-900">
                      {candidate.education?.[0]
                        ? `${candidate.education[0].degree || "—"} · ${candidate.education[0].institution || candidate.education[0].school || "—"}`
                        : "Not in CV"}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Applied</dt>
                    <dd className="mt-0.5 truncate font-semibold text-slate-900">
                      {candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : "—"} · {candidate.job?.title || "No job"}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Last move</dt>
                    <dd className="mt-0.5 truncate font-semibold text-slate-900">
                      {lastMove ? `${stageLabel(lastMove.stage)}${lastMove.at ? ` · ${new Date(lastMove.at).toLocaleDateString()}` : ""}` : "None recorded"}
                    </dd>
                  </div>
                </dl>
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
              {/* CV Screening Breakdown */}
              <Card className="bg-white shadow-xs border-slate-200/80">
                {/* Headline: the score as a ring in CV screening's colour, the
                    ATS verdict in words, and where this sits among the role's
                    other scored applicants — one dot each, real people. */}
                <div className="flex flex-wrap items-center gap-5 rounded-2xl bg-gradient-to-br from-sky-50/70 via-white to-white p-4">
                  <ScoreRing
                    value={cvScore}
                    hue="sky"
                    size={104}
                    emptyLabel="Not run"
                    label="CV screening score"
                  />
                  <div className="min-w-[14rem] flex-1">
                    <h3 className="text-base font-semibold text-slate-900">CV screening</h3>
                    <p className="mt-0.5 text-sm text-slate-700">
                      {cvScore == null
                        ? "Not screened yet."
                        : { pass: "Passed screening", fail: "Did not pass screening", review: "Flagged for review" }[
                            candidate.ats?.decision
                          ] || "Scored"}
                      <span className="text-slate-500">
                        {" · "}
                        {profileAssessment?.engine === "evidence" || candidate.ats?.engine === "evidence"
                          ? "evidence engine"
                          : "keyword screening"}
                      </span>
                    </p>
                    {caveat && <p className="mt-0.5 text-xs font-medium text-amber-700">{caveat}</p>}
                    {cvScore != null && peerScores && (
                      <div className="mt-3 max-w-md">
                        <DistributionStrip values={peerScores} mine={cvScore} hue="sky" />
                      </div>
                    )}
                  </div>
                </div>

                {/* The same honest gate as before: these axes DEFAULT TO 0 in
                    the schema, so an unscreened candidate has no breakdown. An
                    axis the run did not produce reads as a dashed empty track
                    with "Not measured", never as 0%. */}
                {!isScored(candidate) ? (
                  <p className="mt-4 text-xs text-slate-500">
                    Not screened yet — there is no CV screening breakdown to show.
                  </p>
                ) : (
                  <section className="mt-5">
                    <h4 className="mb-3 text-sm font-semibold text-slate-900">How the CV matches the role</h4>
                    <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                      <CriterionBars
                        hue="sky"
                        rows={[
                          { key: "skills", label: "Skills", value: candidate.ats?.skillsMatch ?? candidate.ats?.breakdown?.skillsScore, note: "Not measured" },
                          { key: "experience", label: "Experience", value: candidate.ats?.experienceMatch ?? candidate.ats?.breakdown?.experienceScore, note: "Not measured" },
                        ]}
                      />
                      <CriterionBars
                        hue="sky"
                        rows={[
                          { key: "education", label: "Education", value: candidate.ats?.educationMatch ?? candidate.ats?.breakdown?.educationScore, note: "Not measured" },
                          { key: "projects", label: "Projects", value: candidate.ats?.projectsMatch, note: "Not measured" },
                        ]}
                      />
                    </div>
                  </section>
                )}

                {candidate.ats?.missingSkills?.length > 0 && (
                  <section className="mt-5">
                    <h4 className="text-sm font-semibold text-slate-900">Skills the job asks for that the CV does not show</h4>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {candidate.ats.missingSkills.map((sk, idx) => (
                        <span key={idx} className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-200">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {findings.length > 0 && (
                  <section className="mt-6">
                    <h4 className="text-sm font-semibold text-slate-900">Rubric criteria</h4>
                    <p className="mt-0.5 mb-3 text-xs text-slate-500">
                      Each criterion's judgement, and separately how strong the CV's evidence for it is.
                    </p>
                    <ul className="space-y-2.5">
                      {findings.map((f, idx) => {
                        // Two channels, deliberately apart. The STATUS is the
                        // engine's judgement; `criterionScore` is evidence
                        // strength. They can disagree — "satisfied" with a
                        // strength of 0 is in the data — and the old row hid
                        // that by painting the 0% in the status's green. Now
                        // the chip says the judgement and the bar says the
                        // strength, so a disagreement is visible, not dressed.
                        //
                        // "absent" means no evidence was found in the CV. It
                        // is drawn as an empty dashed track with no number:
                        // a missing reading is not a measured zero.
                        const absent = f.status === "absent";
                        const pct = !absent && f.criterionScore != null ? Math.round(f.criterionScore * 100) : null;
                        const chip = {
                          satisfied: "bg-emerald-100 text-emerald-800",
                          partial: "bg-amber-100 text-amber-800",
                          unmet: "bg-red-100 text-red-700",
                          contradicted: "bg-red-100 text-red-700",
                        }[f.status] || "bg-slate-100 text-slate-600";
                        return (
                          <li key={idx} className="rounded-xl border border-hairline px-4 py-3">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="min-w-0 flex-1 text-sm font-medium text-slate-900">{f.label}</span>
                              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${chip}`}>
                                {absent ? "No evidence in CV" : STATUS_WORDS[f.status] || "Not assessed"}
                              </span>
                              {pct != null && (
                                <span className="num w-10 text-right text-xs font-semibold text-slate-700">{pct}%</span>
                              )}
                            </div>
                            <div
                              className={`mt-2 h-1.5 overflow-hidden rounded-full ${
                                pct != null ? "bg-slate-100" : "border border-dashed border-slate-300"
                              }`}
                              aria-hidden="true"
                            >
                              {pct != null && <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />}
                            </div>
                            {/* The engine's justification — without it, a bare
                                number with nothing to check it against. */}
                            {f.reasoning && <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{f.reasoning}</p>}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
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
                  <div className="space-y-6">
                    {/* Headline: the score as a ring in the assessment's colour,
                        and right / wrong / unanswered as one bar — three separate
                        facts, because a question never reached is not a question
                        answered wrongly. */}
                    <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-hairline bg-gradient-to-br from-rose-50/60 via-white to-white p-5">
                      <ScoreRing
                        value={assessmentScore}
                        hue="rose"
                        size={104}
                        emptyLabel={assessmentItem.status === "completed" ? "Withheld" : "Pending"}
                        label="Skills assessment score"
                      />
                      <div className="min-w-[14rem] flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {assessmentPaper?.sections?.[0]?.title || "Skills assessment"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {assessmentItem.status === "completed"
                            ? `Scored ${formatWhen(assessmentResult?.scoredAt || assessmentItem.completedAt)}`
                            : assessmentItem.status === "in_progress"
                            ? "In progress — awaiting submission"
                            : `Sent ${formatWhen(assessmentItem.assignment?.at || assessmentItem.createdAt)}`}
                          {assessmentItem.difficultyTier?.value && ` · ${assessmentItem.difficultyTier.value} difficulty`}
                        </p>
                        {assessmentItem.status === "completed" && (
                          <>
                            <p className="mt-3 text-sm text-slate-700">
                              <span className="num font-semibold text-slate-900">{assessmentTotalCorrect}</span> of{" "}
                              {assessmentTotalItems} correct
                            </p>
                            {/* The three-way bar needs the per-question record.
                                Without it, the total is stated in words and no
                                split is guessed — splitting "10 − 8" into
                                "incorrect" would count unanswered as wrong. */}
                            {tally.correct + tally.incorrect + tally.unanswered > 0 && (
                              <div className="mt-3">
                                <ResultBar {...tally} />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {assessmentRows.length > 0 && (
                      <section>
                        <h4 className="mb-3 text-sm font-semibold text-slate-900">What it tested</h4>
                        {/* Wait for the rubric only if a name is actually
                            missing; rows the result already named show now. */}
                        {jobRubric === null && assessmentRows.some((r) => r.unnamed) ? (
                          <p className="text-xs text-slate-500">Loading criteria…</p>
                        ) : (
                          <CriterionBars rows={assessmentRows} hue="rose" />
                        )}
                      </section>
                    )}

                    {/* Résumé claims the test put to the proof. Named — these
                        were printed as "contradicted c2 (0/4 items)". */}
                    {claimRows.length > 0 && (
                      <section>
                        <h4 className="text-sm font-semibold text-slate-900">Résumé claims it checked</h4>
                        <p className="mt-0.5 mb-3 text-xs text-slate-500">
                          Questions targeting a skill the résumé claims. A contradicted claim is worth probing in
                          the interview — not a conclusion on its own.
                        </p>
                        <ul className="divide-y divide-rule rounded-xl border border-hairline">
                          {claimRows.map((c) => (
                            <li key={c.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                              <span
                                className={`rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${
                                  { verified: "bg-emerald-100 text-emerald-800", contradicted: "bg-red-100 text-red-700", inconclusive: "bg-slate-100 text-slate-700" }[c.verdict] || "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {c.verdict}
                              </span>
                              <span className="min-w-0 flex-1 text-sm text-slate-800">{c.label}</span>
                              <span className="text-xs text-slate-500">{c.detail}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {/* Integrity, in plain words and with the innocent reading
                        of each event beside it (mirrored from the scorer's own
                        catalogue). A flag is a prompt to look, never a verdict. */}
                    {assessmentItem.proctoring?.riskBand && (
                      <section>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h4 className="text-sm font-semibold text-slate-900">Integrity</h4>
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                              assessmentItem.proctoring.riskBand === "high"
                                ? "bg-red-100 text-red-700"
                                : assessmentItem.proctoring.riskBand === "medium"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {assessmentItem.proctoring.riskBand[0].toUpperCase() + assessmentItem.proctoring.riskBand.slice(1)} risk
                          </span>
                        </div>
                        {integrity.length === 0 ? (
                          <p className="text-sm text-slate-600">No integrity events were recorded during the test.</p>
                        ) : (
                          <ul className="space-y-2">
                            {integrity.map((e) => (
                              <li key={e.type} className="rounded-xl border border-hairline px-4 py-2.5">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-sm text-slate-800">{e.label}</span>
                                  <span className="num text-xs font-semibold text-slate-700">×{e.count}</span>
                                </div>
                                {e.note && <p className="mt-0.5 text-xs text-slate-500">{e.note}</p>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
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
    {offerOpen && candidate && (
      <OfferDialog candidate={candidate} onClose={() => setOfferOpen(false)} onSend={(message) => handleStageMove("offer_sent", message)} />
    )}
    </>
  );
}
