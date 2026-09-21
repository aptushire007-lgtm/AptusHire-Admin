import { forwardRef, useEffect, useMemo, useRef, useState, useCallback } from "react";
import CandidateLink from "../../components/candidate/CandidateLink.jsx";
import CandidateDrawer from "../../components/candidate/CandidateDrawer.jsx";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowDownUp,
  ArrowRight,
  Briefcase,
  Calendar,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Flag,
  KanbanSquare,
  Plus,
  RefreshCw,
  RotateCcw,
  Rows3,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import api from "../../api/client.js";
import { usePipelineData } from "../../lib/usePipelineData.js";
import { useCompanyData } from "../../context/CompanyDataContext.jsx";
import { bulkStageMove } from "../../lib/bulkStageMove.js";
import { bulkErase } from "../../lib/bulkErase.js";
import { Avatar, Badge, EmptyState } from "../../components/ui/Card.jsx";
import Menu, { MenuGroup, MenuItem } from "../../components/ui/Menu.jsx";
import StageMenu from "../../components/ui/StageMenu.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { useToast } from "../../components/ui/Toast.jsx";
import {
  ALL_STAGES,
  STAGES,
  REJECTED,
  normalizeStage,
  stageLabel,
  stageStep,
  stageTone,
  allowedNextStages,
} from "../../lib/pipeline.js";
import {
  daysInStage,
  daysSinceApplied,
  pipelineKpis,
  resumeFlagCount,
  scoreCaveat,
  scoreOf,
} from "../../lib/pipelineMetrics.js";
import { downloadFile } from "../../lib/download.js";
import { stageEvidence } from "../../lib/stageEvidence.js";
import { EvidenceRow } from "../../components/ui/Evidence.jsx";

const SORTS = {
  score_desc: { label: "Match Score (High → Low)", compare: (a, b) => byScore(b) - byScore(a) },
  stage_age: { label: "Days in Stage (Longest First)", compare: (a, b) => (daysInStage(b) ?? -1) - (daysInStage(a) ?? -1) },
  newest: { label: "Recently Applied", compare: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0) },
  score_asc: { label: "Match Score (Low → High)", compare: (a, b) => byScore(a) - byScore(b) },
  name: {
    label: "Name (A–Z)",
    compare: (a, b) =>
      (a.basicDetails?.name || "").localeCompare(b.basicDetails?.name || "", undefined, { sensitivity: "base" }),
  },
};

export const PIPELINE_PHASES = [
  { id: "all", label: "All Stages", stages: ALL_STAGES },
  { id: "screening", label: "Screening", stages: ["applied", "ats_passed"] },
  { id: "assessment", label: "Assessments", stages: ["assessment_scheduled", "assessment_completed"] },
  {
    id: "interviews",
    label: "Interviews",
    stages: [
      "interview_scheduled",
      "ai_interview_completed",
      "under_review",
      "shortlisted",
      "hr_interview",
      "technical_interview",
      "manager_interview",
    ],
  },
  {
    id: "offers",
    label: "Offers & Hires",
    stages: ["selected", "offer_sent", "offer_accepted", "joined"],
  },
  { id: "rejected", label: "Off-ramp", stages: [REJECTED] },
];

function byScore(candidate) {
  const s = scoreOf(candidate);
  return s == null ? -1 : s;
}

function figure(value, suffix = "") {
  return value == null ? "—" : `${value}${suffix}`;
}

// REMOVED: EX_COMPANIES / getExCompany().
// It displayed a PREVIOUS EMPLOYER the candidate never gave us — when
// `candidate.company` was empty it picked one from a hardcoded list of real
// companies by `name.charCodeAt(0) + idx`. Every card without a company field
// asserted "Ex-Stripe" or "Ex-Figma" about a real applicant. There is no
// honest fallback for this field, so the chip is gone rather than reworded.

function getAvatarInitials(name) {
  if (!name) return "C";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getStageGlowClass(stage) {
  const s = normalizeStage(stage);
  if (s === "applied") return "stage-glow-inbox";
  if (s === "ats_passed") return "stage-glow-screened";
  if (
    [
      "interview_scheduled",
      "ai_interview_completed",
      "under_review",
      "shortlisted",
      "hr_interview",
      "technical_interview",
      "manager_interview",
      "assessment_scheduled",
      "assessment_completed",
    ].includes(s)
  ) {
    return "stage-glow-interviewing";
  }
  if (["selected", "offer_sent", "offer_accepted", "joined"].includes(s)) {
    return "stage-glow-offer";
  }
  if (s === REJECTED) return "stage-glow-archived";
  return "stage-glow-inbox";
}

function getStageDotColor(stage) {
  const s = normalizeStage(stage);
  if (s === "applied") return "bg-slate-500";
  if (s === "ats_passed") return "bg-[#4b41e1] shadow-sm shadow-[#4b41e1]/40";
  if (
    [
      "interview_scheduled",
      "ai_interview_completed",
      "under_review",
      "shortlisted",
      "hr_interview",
      "technical_interview",
      "manager_interview",
      "assessment_scheduled",
      "assessment_completed",
    ].includes(s)
  ) {
    return "bg-[#645efb] shadow-sm shadow-[#645efb]/40";
  }
  if (["selected", "offer_sent", "offer_accepted", "joined"].includes(s)) {
    return "bg-[#059669] shadow-sm shadow-[#059669]/40";
  }
  return "bg-slate-400";
}

// REMOVED: getCandidateHighlight().
// It returned invented strings keyed off the ATS score — "Top 5% Technical
// Architecture", "Automated 40+ RevOps flows", "$195k Target", "Offer: $185k +
// Equity" — and rendered them as candidate intelligence. None of it came from
// any stored field; a candidate scoring 94 was told to have a $195k target
// because 94 >= 94. Replaced by stageEvidence(), which reports only what the
// application record actually holds.

function getContextualStatusTag(candidate) {
  const status = normalizeStage(candidate.status);
  switch (status) {
    case "applied":
      return { text: "Pending intake", color: "text-amber-700 bg-amber-50 border border-amber-200/60" };
    case "ats_passed":
      return { text: "Ready for review", color: "text-cyan-700 bg-cyan-50 border border-cyan-200/60" };
    case "under_review":
      return { text: "Ready for Panel", color: "text-[#4b41e1] bg-[#4b41e1]/10 border border-[#4b41e1]/20 font-bold" };
    case "shortlisted":
      return { text: "High Intent", color: "text-emerald-700 bg-emerald-50 border border-emerald-200 font-semibold" };
    case "offer_sent":
    case "selected":
      return { text: "Final Step", color: "text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold" };
    case "joined":
      return { text: "Hired 🎉", color: "text-emerald-800 bg-emerald-100 border border-emerald-300 font-bold" };
    case REJECTED:
      return { text: "Archived", color: "text-slate-500 bg-slate-100 border border-slate-200 font-medium" };
    default:
      return { text: "Active", color: "text-slate-600 bg-slate-100 border border-slate-200 font-medium" };
  }
}

function getAdvanceAction(candidate) {
  const status = normalizeStage(candidate.status);
  if (status === "applied") {
    return { label: "Advance to Screened", nextStage: "ats_passed", isHired: false };
  }
  if (status === "ats_passed") {
    return { label: "Move to Interview", nextStage: "under_review", isHired: false };
  }
  if (["under_review", "shortlisted", "interview_scheduled", "assessment_completed"].includes(status)) {
    return { label: "Extend Offer", nextStage: "offer_sent", isHired: false };
  }
  if (["offer_sent", "selected"].includes(status)) {
    return { label: "Mark as Hired 🎉", nextStage: "joined", isHired: true };
  }
  const nextAllowed = allowedNextStages(candidate.status).filter((s) => s !== REJECTED);
  if (nextAllowed.length > 0) {
    return { label: `Advance to ${stageLabel(nextAllowed[0])}`, nextStage: nextAllowed[0], isHired: false };
  }
  return null;
}

/**
 * 3D Tactile Candidate Card
 */
function CandidateCard({
  candidate,
  idx = 0,
  isSelected,
  onToggleSelect,
  onMove,
  onQuickReject,
  onDelete,
  onPreviewResume,
  onInspect,
  busy,
}) {
  const [isAdvancing, setIsAdvancing] = useState(false);
  const score = scoreOf(candidate);
  const caveat = scoreCaveat(candidate);
  const resumeSignals = resumeFlagCount(candidate);
  const inStage = daysInStage(candidate);
  const skills = [...new Set((candidate.skills || []).filter(Boolean).map((skill) => skill.trim()))];
  const shownSkills = skills.slice(0, 3);
  const overflowCount = skills.length - shownSkills.length;
  const isUnderReview = candidate.status === "under_review";
  const isOfferSent = candidate.status === "offer_sent";
  const isOverdue =
    !["joined", REJECTED].includes(normalizeStage(candidate.status)) && inStage != null && inStage >= 14;

  const advanceAction = getAdvanceAction(candidate);
  const initials = getAvatarInitials(candidate.basicDetails?.name);
  const evidence = stageEvidence(candidate);
  const statusTag = getContextualStatusTag(candidate);

  const handleAdvanceClick = async (e) => {
    e.stopPropagation();
    if (!advanceAction || busy) return;
    setIsAdvancing(true);
    setTimeout(async () => {
      await onMove(candidate, advanceAction.nextStage);
      setIsAdvancing(false);
    }, 240);
  };

  return (
    <div
      className={`candidate-card card-tactile-3d bg-white rounded-2xl p-4 border flex flex-col gap-3 relative overflow-hidden group select-none transition-all ${
        isAdvancing ? "anim-advancing" : ""
      } ${
        isSelected
          ? "ring-2 ring-brand-800 border-brand-800 bg-brand-50/40"
          : isUnderReview
          ? "border-amber-300/80 ring-1 ring-amber-200/50"
          : "border-slate-200/80 hover:border-slate-300"
      }`}
      data-candidate-id={candidate._id}
      data-name={candidate.basicDetails?.name || ""}
      // Absent when unscored. It was `score ?? 0`, which wrote an unmeasured
      // candidate into the DOM as a measured zero for anything reading it.
      data-score={score ?? undefined}
    >

      {/* 3D Card Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            aria-label={`Select candidate ${candidate.basicDetails?.name}`}
            className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-brand-800 focus:ring-0 cursor-pointer candidate-checkbox shrink-0"
          />
          {/* Flat brand tint, not a per-index gradient. Colour derived from a
              row's position is decoration that reads as meaning — and eight
              gradients across a board is eight competing light sources. */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-sm font-bold text-brand-800">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <CandidateLink
                candidateId={candidate._id}
                className="candidate-name font-bold text-[15px] text-slate-900 group-hover:text-brand-800 transition-colors truncate block"
                title={candidate.basicDetails?.name}
              >
                {candidate.basicDetails?.name || "Unnamed applicant"}
              </CandidateLink>
            </div>
            {/* "Product & Ops Lead" used to stand in for a role that failed to
                populate, so a card could name a job this person never applied
                to. An unknown role says so. */}
            <p className="text-[12px] text-slate-500 font-medium truncate" title={candidate.job?.title}>
              {candidate.job?.title || "Role unavailable"}
              {inStage != null ? ` • ${inStage}d stage` : ""}
            </p>
          </div>
        </div>

        {/* AI Match Score 3D Badge */}
        <div className="flex flex-col items-end shrink-0">
          {score == null ? (
            <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
              Not scored
            </span>
          ) : (
            <span className="flex shrink-0 flex-col items-end leading-none">
              <span className="text-[9px] font-semibold tracking-wide text-slate-400 uppercase">Fit</span>
              <span className="num pt-0.5 text-[19px] font-semibold text-emerald-700">{score}</span>
              <span className="sr-only">out of 100</span>
            </span>
          )}
        </div>
      </div>

      {candidate.pendingInterviewReviews?.length > 0 && (
        <p className="text-xs font-medium text-amber-800 bg-amber-50/80 px-2 py-1 rounded-md border border-amber-200/60">
          Interview review pending · {candidate.pendingInterviewReviews.length} attempt(s)
        </p>
      )}

      {/* What has actually happened to this application, stage by stage.
          This slot used to hold getCandidateHighlight()'s invented achievement
          and salary line. Now it holds the three stages and their real state,
          so "we have not screened this person" and "we screened them and they
          scored 0" stop looking identical. */}
      <div className="flex flex-col gap-1.5 rounded-xl border border-hairline bg-canvas/60 p-2.5 text-xs">
        <div className="divide-y divide-rule">
          {evidence.map((row) => (
            <EvidenceRow
              key={row.key}
              label={row.label}
              state={row.state}
              value={row.value}
              note={row.note}
            />
          ))}
        </div>

        {/* Skills Chips */}
        {skills.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mt-0.5">
            {shownSkills.map((skill) => (
              <span
                key={skill}
                className="px-1.5 py-0.5 rounded bg-white text-slate-600 font-medium text-[10px] border border-[#c6c6cd]/30"
              >
                {skill}
              </span>
            ))}
            {overflowCount > 0 && (
              <span
                className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-400 font-medium text-[10px] border border-[#c6c6cd]/30 cursor-help"
                title={`More skills: ${skills.slice(3).join(", ")}`}
              >
                +{overflowCount}
                <span className="sr-only"> more skills: {skills.slice(3).join(", ")}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* The caveat used to be its own amber strip here. It now rides on the CV
          screening row beside the figure it qualifies, which is the only place
          it means anything — a "legacy fallback" banner floating under a card
          does not say WHICH of the card's readings is degraded. */}

      {resumeSignals > 0 && (
        <div className="text-[10px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
          {resumeSignals} résumé signal{resumeSignals === 1 ? "" : "s"} to review
        </div>
      )}

      {/* Footer Status & Evaluation */}
      <div className="flex items-center justify-between text-slate-500 text-[11px] pt-0.5">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400" />
          {inStage != null && inStage >= 14 ? (
            <span className="font-semibold text-rose-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              {inStage}d (Overdue)
            </span>
          ) : (
            <span>{inStage != null ? `In stage ${inStage}d` : "Stage age unknown"}</span>
          )}
        </span>
        <span className={`px-2 py-0.5 rounded text-[10.5px] ${statusTag.color}`}>{statusTag.text}</span>
      </div>

      {/* 1-Click Stage Progression Action & Controls */}
      <div className="pt-2 border-t border-[#c6c6cd]/20 flex items-center gap-2">
        {advanceAction && candidate.status !== REJECTED ? (
          <button
            type="button"
            onClick={handleAdvanceClick}
            disabled={busy || isAdvancing}
            className={`btn-advance-action btn-3d-advance flex-1 h-8 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1 tracking-wide transition-all ${
              advanceAction.isHired
                ? "bg-brand-700"
                : "bg-brand-800 hover:bg-brand-700"
            }`}
          >
            <span>{advanceAction.label}</span>
            {advanceAction.isHired ? (
              <CheckCheck className="w-3.5 h-3.5" />
            ) : (
              <ArrowRight className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <div className="flex-1" />
        )}

        {/* Inspect candidate drawer */}
        {onInspect && (
          <button
            type="button"
            onClick={() => onInspect(candidate._id)}
            className="btn-3d-secondary w-8 h-8 rounded-xl bg-white border border-[#c6c6cd]/30 text-slate-500 hover:text-brand-800 flex items-center justify-center transition-colors"
            title="Inspect candidate drawer"
            aria-label={`Inspect candidate ${candidate.basicDetails?.name}`}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Quick View Resume 📄 */}
        <button
          type="button"
          onClick={() => onPreviewResume(candidate)}
          className="btn-3d-secondary w-8 h-8 rounded-xl bg-white border border-[#c6c6cd]/30 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
          title="Quick View Resume"
          aria-label={`Preview resume for ${candidate.basicDetails?.name}`}
        >
          📄
        </button>

        {/* Quick Reject / Archive ✕ */}
        {candidate.status !== REJECTED && (
          <button
            type="button"
            onClick={() => onQuickReject(candidate)}
            disabled={busy}
            className="btn-reject-action btn-3d-secondary w-8 h-8 rounded-xl bg-white border border-[#c6c6cd]/30 text-slate-400 hover:text-rose-600 hover:border-rose-300 flex items-center justify-center transition-colors"
            title="Archive / Pass candidate"
            aria-label={`Reject ${candidate.basicDetails?.name}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <StageMenu
          compact
          status={candidate.status}
          name={candidate.basicDetails?.name}
          busy={busy}
          onMove={(stage) => onMove(candidate, stage)}
        />

        {/* Permanent delete — distinct from Quick Reject, which only archives */}
        <button
          type="button"
          onClick={() => onDelete(candidate)}
          disabled={busy}
          className="btn-3d-secondary w-8 h-8 rounded-xl bg-white border border-[#c6c6cd]/30 text-slate-400 hover:text-rose-700 hover:border-rose-300 flex items-center justify-center transition-colors"
          title="Delete permanently"
          aria-label={`Delete ${candidate.basicDetails?.name} permanently`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * 3D Kanban Column Component
 */
const StageColumn = forwardRef(function StageColumn(
  {
    stage,
    candidates,
    totalCount,
    selectedIds,
    onToggleSelect,
    onMove,
    onQuickReject,
    onDelete,
    onPreviewResume,
    busyId,
    isHighlighted,
    columnDensity,
    onInspect,
  },
  ref
) {
  const step = stageStep(stage);
  const terminal = stage === REJECTED;
  const oldest = candidates.reduce((max, c) => {
    const d = daysInStage(c);
    return d != null && d > max ? d : max;
  }, -1);

  const glowClass = getStageGlowClass(stage);
  const dotColor = getStageDotColor(stage);
  const isOfferStage = ["selected", "offer_sent"].includes(stage);

  return (
    <section
      ref={ref}
      aria-label={`${stageLabel(stage)} — ${candidates.length} candidate${candidates.length === 1 ? "" : "s"}`}
      className={`stage-column flex flex-col column-tray-3d p-3.5 rounded-2xl min-h-[680px] shrink-0 ${glowClass} transition-all ${
        columnDensity === "compact" ? "w-64" : "w-80"
      } ${isHighlighted ? "ring-2 ring-brand-700 shadow-lg" : ""}`}
      data-stage={stage}
      data-stage-name={stageLabel(stage)}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#c6c6cd]/20 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
          {step && (
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              {String(step).padStart(2, "0")}
            </span>
          )}
          <h2 className="font-bold text-slate-900 tracking-wide uppercase text-xs truncate">
            {stageLabel(stage)}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="stage-count bg-white border border-[#c6c6cd]/30 text-slate-800 font-bold text-xs px-2 py-0.5 rounded-full shadow-xs">
            {candidates.length} / {totalCount}
          </span>
        </div>
      </div>

      {/* Longest waiting indicator */}
      <div className="flex items-center justify-between px-1 mb-2 text-[10px] text-slate-400 shrink-0">
        <span>Longest on this page</span>
        <span className="font-semibold text-slate-700">{oldest >= 0 ? `${oldest}d` : "—"}</span>
      </div>

      {/* Cards Container */}
      <div className="candidate-cards-container flex flex-col gap-3.5 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {candidates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-hairline px-3 py-10 text-center">
            <p className="text-xs font-medium text-slate-500">
              No candidates in {stageLabel(stage)}
            </p>
            <p className="pt-1 text-[11px] text-slate-400">Drag a card here to move a candidate.</p>
          </div>
        ) : (
          candidates.map((c, idx) => (
            <CandidateCard
              key={c._id}
              candidate={c}
              idx={idx}
              isSelected={selectedIds.has(c._id)}
              onToggleSelect={() => onToggleSelect(c._id)}
              onMove={onMove}
              onQuickReject={onQuickReject}
              onDelete={onDelete}
              onPreviewResume={onPreviewResume}
              onInspect={onInspect}
              busy={busyId === c._id}
            />
          ))
        )}

        {/* Interactive Tactile Drop Target Slot for Offer Stage */}
        {isOfferStage && (
          <div
            id="offer-drop-slot"
            className="border-2 border-dashed border-[#c6c6cd]/40 hover:border-[#4b41e1]/60 rounded-2xl p-4 flex flex-col items-center justify-center text-center text-slate-500 min-h-[105px] bg-white/40 hover:bg-[#4b41e1]/5 transition-all cursor-pointer group shrink-0 mt-1"
          >
            <div className="w-8 h-8 rounded-full bg-white border border-[#c6c6cd]/40 flex items-center justify-center text-[#4b41e1] mb-1 shadow-xs group-hover:scale-110 transition-transform">
              <ArrowRight className="w-4 h-4 rotate-90" />
            </div>
            <span className="text-xs font-semibold text-slate-800 group-hover:text-brand-800 transition-colors">
              Drop candidate here to prepare offer
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">
              Or use 1-click Advance from Interview stage
            </span>
          </div>
        )}
      </div>
    </section>
  );
});

export default function HiringPipeline() {
  const { jobs, loading: workspaceLoading, loadError: workspaceError, refresh: refreshWorkspace } = useCompanyData();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const setFilter = (key, value) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (key !== "page" && key !== "view") next.delete("page");
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true }
    );

  const [busyId, setBusyId] = useState(null);
  const bulkRunning = useRef(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleteTarget, setDeleteTarget] = useState(null); // { candidates, mode: 'single' | 'bulk' }
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const density = params.get("view") === "list" ? "list" : "board";
  const setDensity = (value) => setFilter("view", value);
  const [columnDensity, setColumnDensity] = useState("comfortable");
  const query = params.get("q") || "";
  const setQuery = (value) => setFilter("q", value);
  // Two entry points, one board. `/pipeline` is the company-wide board where
  // the role is a filter you can change; `/jobs/:id/pipeline` is THAT role's
  // board, where the role comes from the path and is therefore fixed — it
  // survives a refresh, it can be pasted to a colleague, and it is the
  // destination the Job detail's Pipeline tab points at.
  const { id: routeJobId } = useParams();
  const jobScoped = Boolean(routeJobId);
  const jobId = routeJobId || params.get("job") || "all";
  const setJobId = (value) => {
    setSelectedIds(new Set());
    // On the job-scoped route the role is the URL, so changing it means going
    // to another URL rather than editing a query param this page ignores.
    if (jobScoped) {
      navigate(value && value !== "all" ? `/jobs/${value}/pipeline` : "/pipeline");
      return;
    }
    setFilter("job", value);
  };
  const sort = Object.hasOwn(SORTS, params.get("sort")) ? params.get("sort") : "score_desc";
  const setSort = (value) => setFilter("sort", value);
  const phase = PIPELINE_PHASES.some((item) => item.id === params.get("phase")) ? params.get("phase") : "all";
  const setPhase = (value) => {
    setSelectedIds(new Set());
    setFilter("phase", value);
  };
  const [scoreFilter, setScoreFilter] = useState("all");

  const selectedCandidateId = params.get("candidateId");
  const closeDrawer = () =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete("candidateId");
        return next;
      },
      { replace: true }
    );
  const selectCandidate = (candId) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (candId) next.set("candidateId", candId);
      else next.delete("candidateId");
      return next;
    });

  const page = Math.max(1, Math.min(1000000, Math.trunc(Number(params.get("page")) || 1)));
  const remote = usePipelineData({ job: jobId, q: query, phase, sort, page });
  const allCandidates = remote.data?.items || [];
  const loading = workspaceLoading || remote.loading;
  const loadError = workspaceError || remote.error;
  const refresh = async () => {
    remote.refresh();
    await refreshWorkspace();
  };

  useEffect(() => {
    setSelectedIds(new Set());
  }, [query, jobId, phase, page]);

  const [highlightedStage, setHighlightedStage] = useState(null);
  const [previewCandidate, setPreviewCandidate] = useState(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const boardRef = useRef(null);
  const columnRefs = useRef({});

  const selectedJob = jobs.find((j) => j._id === jobId) || null;
  const publishedJobs = useMemo(() => {
    const pub = jobs.filter((j) => j.status === "published");
    return pub.length > 0 ? pub : jobs.filter((j) => !["closed", "archived"].includes(j.status));
  }, [jobs]);
  const effectiveJob = selectedJob || (publishedJobs.length === 1 ? publishedJobs[0] : null);
  const viewConsolidated = params.get("consolidated") === "true";
  const showJobCardsDeck =
    !jobScoped &&
    publishedJobs.length > 1 &&
    (!params.get("job") || params.get("job") === "all") &&
    !viewConsolidated;
  const currentRoleTitle = viewConsolidated
    ? "Consolidated Pipeline (All Roles)"
    : selectedJob
    ? selectedJob.title
    : effectiveJob
    ? effectiveJob.title
    : "All Published Roles";
  const activeApplications = useMemo(() => {
    const currentJobs = new Map(jobs.map((job) => [String(job._id), job]));
    return allCandidates.filter((candidate) => {
      const job = currentJobs.get(String(candidate.job?._id || candidate.job || ""));
      return job && !candidate.pipelineExit?.at && !["closed", "filled", "archived"].includes(job.status);
    });
  }, [allCandidates, jobs]);

  const historicalCount = remote.data?.historicalCount || 0;
  const countsByJob = remote.data?.countsByJob || {};
  const filtered = useMemo(() => {
    if (scoreFilter === "90+") {
      return activeApplications.filter((c) => (scoreOf(c) ?? 0) >= 90);
    }
    return activeApplications;
  }, [activeApplications, scoreFilter]);

  const kpis = remote.data?.kpis || pipelineKpis([]);
  const stageCounts = remote.data?.stages || {};

  // Grouped candidates by stage
  const columns = useMemo(() => {
    const grouped = Object.fromEntries(ALL_STAGES.map((s) => [s, []]));
    for (const c of filtered) {
      const stage = normalizeStage(c.status);
      if (grouped[stage]) grouped[stage].push(c);
    }
    const compare = (SORTS[sort] || SORTS.score_desc).compare;
    for (const stage of ALL_STAGES) grouped[stage].sort(compare);
    return grouped;
  }, [filtered, sort]);

  const sortedFlat = useMemo(
    () =>
      filtered
        .filter(
          (candidate) =>
            phase === "all" ||
            PIPELINE_PHASES.find((item) => item.id === phase)?.stages.includes(
              normalizeStage(candidate.status)
            )
        )
        .sort((SORTS[sort] || SORTS.score_desc).compare),
    [filtered, sort, phase]
  );

  // Filter stages by selected Phase tab
  const phaseStages = useMemo(() => {
    if (phase === "all") return ALL_STAGES;
    const p = PIPELINE_PHASES.find((x) => x.id === phase);
    return p ? p.stages : STAGES;
  }, [phase]);

  const occupied = phaseStages.filter((s) => stageCounts[s] > 0);
  const visibleStages = showEmpty || occupied.length === 0 ? phaseStages : occupied;

  // Hidden empty stages count
  const hiddenCount =
    phaseStages.length - (showEmpty || occupied.length === 0 ? phaseStages.length : occupied.length);

  // Multi-selection handler
  const toggleSelect = useCallback((candidateId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Move candidate to target stage
  async function handleMove(candidate, toStage) {
    if (bulkRunning.current || busyId || loading || loadError) return;
    if (!activeApplications.some((item) => item._id === candidate._id)) {
      toast.error("This application is no longer in the active pipeline. Refresh to see its current state.");
      return;
    }
    setBusyId(candidate._id);
    try {
      await api.patch(`/candidates/${candidate._id}/stage`, { stage: toStage });
      toast.success(`${candidate.basicDetails?.name || "Candidate"} → ${stageLabel(toStage)}`);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not move candidate");
    } finally {
      setBusyId(null);
    }
  }

  // Quick reject candidate
  async function handleQuickReject(candidate) {
    if (
      !window.confirm(
        `Are you sure you want to reject ${candidate.basicDetails?.name || "this candidate"}?`
      )
    ) {
      return;
    }
    await handleMove(candidate, REJECTED);
  }

  async function runBulk(targetFor) {
    if (bulkRunning.current || busyId || loading || loadError) return;
    const candidates = filtered.filter((candidate) => selectedIds.has(candidate._id));
    if (!candidates.length) return;
    bulkRunning.current = true;
    setBulkBusy(true);
    try {
      const result = await bulkStageMove(
        candidates,
        targetFor,
        (id, stage) => api.patch(`/candidates/${id}/stage`, { stage }),
        allowedNextStages
      );
      const message = `${result.succeeded.length} updated · ${result.failed.length} failed · ${result.skipped.length} skipped`;
      setBulkResult(message);
      if (result.failed.length || result.skipped.length) toast.error(message);
      else toast.success(message);
      setSelectedIds(new Set([...result.failed, ...result.skipped]));
      await refresh();
    } finally {
      bulkRunning.current = false;
      setBulkBusy(false);
    }
  }

  async function handleBulkAdvance() {
    return runBulk((candidate) =>
      allowedNextStages(candidate.status).find((stage) => stage !== REJECTED)
    );
  }

  async function handleBulkReject() {
    if (bulkRunning.current || !selectedIds.size) return;
    if (!window.confirm("Reject the eligible selected applications? Review the batch result for any failures."))
      return;
    return runBulk(() => REJECTED);
  }

  async function handleBulkMoveStage(targetStage) {
    if (targetStage) return runBulk(() => targetStage);
  }

  // Permanent delete (DPDP right-to-erasure). Opens the typed-confirmation modal;
  // the actual erase only runs from confirmDelete once "DELETE" is typed.
  function openDeleteCandidate(candidate) {
    if (bulkRunning.current || deleting) return;
    setDeleteTarget({ candidates: [candidate], mode: "single" });
    setDeleteConfirmText("");
  }

  function openBulkDelete() {
    if (bulkRunning.current || deleting || !selectedIds.size) return;
    const candidates = filtered.filter((candidate) => selectedIds.has(candidate._id));
    if (!candidates.length) return;
    setDeleteTarget({ candidates, mode: "bulk" });
    setDeleteConfirmText("");
  }

  function closeDeleteModal() {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteConfirmText("");
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteConfirmText.trim().toUpperCase() !== "DELETE" || deleting) return;
    setDeleting(true);
    try {
      const ids = deleteTarget.candidates.map((candidate) => candidate._id);
      const result = await bulkErase(ids, (id) =>
        api.delete(`/data-rights/candidates/${id}`, { data: { reason: "recruiter removed from pipeline" } })
      );
      const message =
        deleteTarget.mode === "single"
          ? result.succeeded.length
            ? `${deleteTarget.candidates[0].basicDetails?.name || "Candidate"} deleted permanently`
            : "Could not delete this candidate"
          : `${result.succeeded.length} deleted permanently · ${result.failed.length} failed`;
      if (result.failed.length) toast.error(message);
      else toast.success(message);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of result.succeeded) next.delete(id);
        return next;
      });
      setDeleteTarget(null);
      setDeleteConfirmText("");
      await refresh();
    } finally {
      setDeleting(false);
    }
  }

  // Horizontal scroll arrows
  const handleScroll = (direction) => {
    if (boardRef.current?.scrollBy) {
      try {
        const amount = direction === "left" ? -400 : 400;
        boardRef.current.scrollBy({ left: amount, behavior: "smooth" });
      } catch {
        // fallback
      }
    }
  };

  const jumpToStage = (stage) => {
    setShowEmpty(true);
    window.setTimeout(() => {
      columnRefs.current?.[stage]?.scrollIntoView?.({ behavior: "smooth", inline: "center" });
      setHighlightedStage(stage);
      window.setTimeout(() => setHighlightedStage(null), 1200);
    }, 0);
  };

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const updateScroll = () => {
      setCanScrollLeft(el.scrollLeft > 10);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    };
    updateScroll();
    el.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    return () => {
      el.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, [visibleStages, density]);

  if (workspaceLoading || (loading && !remote.data)) {
    return (
      <div
        className="flex min-h-[28rem] items-center justify-center bg-mesh-canvas"
        aria-label="Loading hiring pipeline"
      >
        <div className="h-8 w-8 animate-pulse rounded-full bg-slate-300" />
      </div>
    );
  }

  if (loadError)
    return (
      <section role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 m-6">
        <h1 className="text-lg font-semibold">Pipeline could not be refreshed</h1>
        <p className="mt-2 text-sm">{loadError} Stage actions are unavailable until current data loads.</p>
        <button
          type="button"
          onClick={refresh}
          className="mt-4 rounded-xl border border-amber-400 bg-amber-100 px-4 py-2 font-semibold hover:bg-amber-200 transition-colors"
        >
          Retry pipeline
        </button>
      </section>
    );

  if (remote.data?.applicationTotal === 0) {
    return (
      <div className="flex min-h-[28rem] items-center justify-center bg-mesh-canvas p-8">
        <EmptyState
          icon={Users}
          title="No candidates yet"
          description="Candidates will appear here once applications arrive."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-w-0 bg-mesh-canvas -mx-4 sm:-mx-6 -mt-[22px] -mb-12 min-h-[calc(100vh-57px)]">
      {/* On /jobs/:id/pipeline this board IS the job's Pipeline tab, so it
          carries the job's own context strip: where you are, and the sibling
          tabs of the same job. On /pipeline there is no single job to head, so
          nothing is rendered and the board opens as before. */}
      {jobScoped && (
        <nav
          aria-label="Job sections"
          className="shrink-0 border-b border-hairline bg-white/90 px-4 sm:px-6 pt-3 backdrop-blur"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Link to="/jobs" className="font-medium hover:text-slate-900 hover:underline">
              Jobs
            </Link>
            <span aria-hidden="true">/</span>
            <span className="truncate font-semibold text-slate-900">
              {selectedJob?.title || "This role"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {[
              { key: "overview", label: "JD" },
              { key: "rubric", label: "Process" },
              { key: "questions", label: "Questions" },
              { key: "assessment", label: "Assessment" },
            ].map((tab) => (
              <Link
                key={tab.key}
                to={`/jobs?jobId=${routeJobId}&tab=${tab.key}`}
                className="rounded-t-lg border border-transparent px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-canvas hover:text-slate-900"
              >
                {tab.label}
              </Link>
            ))}
            <span
              aria-current="page"
              className="-mb-px rounded-t-lg border border-hairline border-b-white bg-white px-3 py-2 text-[13px] font-semibold text-[#0E3B2E]"
            >
              Pipeline
            </span>
          </div>
        </nav>
      )}
      {loading && (
        <p role="status" className="shrink-0 bg-white px-6 py-2 text-sm text-slate-600 border-b border-slate-200">
          Updating pipeline… Previous results remain visible; stage actions are paused.
        </p>
      )}
      {(bulkBusy || bulkResult) && (
        <p role="status" className="shrink-0 border-b border-slate-200 bg-white px-6 py-3 text-sm text-slate-700">
          {bulkBusy ? "Updating selected applications…" : bulkResult}
        </p>
      )}
      {historicalCount > 0 && (
        <p className="sr-only">
          {historicalCount} historical applications are outside the active pipeline.{" "}
          <Link to="/candidates" className="font-semibold text-[#4b41e1] underline underline-offset-4">
            View candidate history
          </Link>
        </p>
      )}

      {/* ── 1. Published Jobs Selection Cards (Shown when no specific job is selected) ──────────── */}
      {showJobCardsDeck ? (
        <section className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-emerald-700" />
                Published Role Pipelines
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Select a published job requisition to open its candidate pipeline, review stages, and scorecards.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="green" className="text-xs font-semibold px-3 py-1">
                {publishedJobs.length} Published {publishedJobs.length === 1 ? "Role" : "Roles"}
              </Badge>
              <button
                type="button"
                onClick={() => {
                  setSelectedIds(new Set());
                  setParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set("job", "all");
                    next.set("consolidated", "true");
                    return next;
                  });
                }}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-2xs transition cursor-pointer"
              >
                View Consolidated Board →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {publishedJobs.map((j) => {
              const candidateCount = countsByJob[j._id] || 0;
              return (
                <div
                  key={j._id}
                  onClick={() => {
                    setSelectedIds(new Set());
                    setParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("job", j._id);
                      next.delete("consolidated");
                      return next;
                    });
                  }}
                  className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-lg hover:border-emerald-500/80 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/60 group-hover:bg-emerald-100 transition">
                        <Briefcase className="h-5 w-5 text-emerald-700" />
                      </div>
                      <Badge tone="green" className="text-[10.5px] font-semibold">
                        • Published
                      </Badge>
                    </div>

                    <h3 className="mt-3.5 text-base font-bold text-slate-900 group-hover:text-emerald-800 transition line-clamp-1">
                      {j.title}
                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
                      <span>{j.department || "General"}</span>
                      <span>•</span>
                      <span>{j.location || "Remote / Hybrid"}</span>
                      {Number(j.numberOfOpenings) > 0 && (
                        <>
                          <span>•</span>
                          <span>{j.numberOfOpenings} {j.numberOfOpenings === 1 ? "opening" : "openings"}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      {candidateCount} {candidateCount === 1 ? "Candidate" : "Candidates"}
                    </span>

                    <span className="text-xs font-semibold text-emerald-700 group-hover:text-emerald-800 flex items-center gap-1">
                      View Pipeline <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <>
          {/* ── 1. Role Hero Header (Prominent Title, context, KPI chips, Add Candidate) ── */}
          <section className="px-6 py-4 border-b border-slate-200/90 bg-white shrink-0">
            {/* Top Breadcrumb & Metadata line */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                {publishedJobs.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIds(new Set());
                        setParams((prev) => {
                          const next = new URLSearchParams(prev);
                          next.set("job", "all");
                          next.delete("consolidated");
                          return next;
                        });
                      }}
                      className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Back to All Roles</span>
                    </button>
                    <span className="text-slate-300">/</span>
                  </>
                )}
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{effectiveJob?.department || "General"}</span>
                </span>
                {effectiveJob?.location && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>{effectiveJob.location}</span>
                  </>
                )}
                {Number(effectiveJob?.numberOfOpenings) > 0 && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>{effectiveJob.numberOfOpenings} {effectiveJob.numberOfOpenings === 1 ? "opening" : "openings"}</span>
                  </>
                )}
                <Badge tone="green" className="text-[10px] font-semibold py-0 px-2">
                  • Published
                </Badge>
              </div>

              {/* KPI Badges Strip */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Active in pipeline</span>
                  <span className="font-bold text-slate-900">{kpis.active}</span>
                  <span className="text-[10px] text-slate-400">Of {kpis.total} applications on record</span>
                </div>
                <div className="hidden sm:block h-3 w-px bg-slate-200" />
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Avg ATS score {kpis.avgScore != null ? `${kpis.avgScore}%` : "—"} across {kpis.scoredCount} scored</span>
                </div>
                <div className="hidden sm:block h-3 w-px bg-slate-200" />
                <div className="hidden md:flex items-center gap-1.5">
                  <span className="text-slate-400">Stage Velocity:</span>
                  <span className="font-bold text-slate-900">{kpis.avgDaysInStage != null ? `${kpis.avgDaysInStage}d avg` : "—"}</span>
                </div>
                <div className="hidden sm:block h-3 w-px bg-slate-200" />
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Pass-through:</span>
                  <span className="font-bold text-emerald-700">{kpis.passThroughPct != null ? `${kpis.passThroughPct}%` : "—"}</span>
                  <span className="text-[10px] text-slate-400">({kpis.shortlisted} of {kpis.total} reached Shortlisted)</span>
                </div>
              </div>
            </div>

            {/* Role Title & Action Row */}
            <div className="flex items-center justify-between gap-4 flex-wrap pt-1">
              <div className="flex items-center gap-3 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight" title={currentRoleTitle}>
                  {currentRoleTitle}
                </h1>

                <span
                  id="total-candidate-badge"
                  className="bg-emerald-50 text-emerald-800 border border-emerald-200/70 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 shadow-2xs"
                >
                  {filtered.length} {filtered.length === 1 ? "candidate" : "candidates"}
                </span>

                {/* Switch Job Dropdown */}
                <Menu
                  align="start"
                  width={280}
                  label="Filter by requisition"
                  trigger={
                    <button
                      type="button"
                      className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>Switch Job</span>
                      <ChevronDown className="h-3 w-3 text-slate-400" />
                    </button>
                  }
                >
                  <MenuGroup label="Requisitions">
                    <MenuItem
                      onSelect={() => {
                        setSelectedIds(new Set());
                        setParams((prev) => {
                          const next = new URLSearchParams(prev);
                          next.set("job", "all");
                          next.set("consolidated", "true");
                          return next;
                        });
                      }}
                      leading={<Briefcase className="h-4 w-4 text-slate-400" />}
                      trailing={
                        <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                          {remote.data?.activeTotal || 0}
                        </span>
                      }
                    >
                      Consolidated Pipeline (All Roles)
                    </MenuItem>
                    {jobs.map((j) => (
                      <MenuItem
                        key={j._id}
                        onSelect={() => {
                          setSelectedIds(new Set());
                          setParams((prev) => {
                            const next = new URLSearchParams(prev);
                            next.set("job", j._id);
                            next.delete("consolidated");
                            return next;
                          });
                        }}
                        description={j.department || j.status}
                        trailing={
                          <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                            {countsByJob[j._id] || 0}
                          </span>
                        }
                      >
                        {j.title}
                      </MenuItem>
                    ))}
                  </MenuGroup>
                </Menu>
              </div>

              {/* Add Candidate Button */}
              <button
                type="button"
                id="btn-add-candidate"
                onClick={() => navigate("/jobs?create=1")}
                className="h-9 px-4 rounded-xl bg-[#0E3B2E] hover:bg-[#154d3d] text-white text-xs font-semibold flex items-center gap-2 shadow-sm hover:shadow transition cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Add Candidate</span>
              </button>
            </div>
          </section>

          {/* ── 2. Unified Controls & Stage Navigator Toolbar ── */}
          <section className="px-6 py-2.5 bg-slate-50/90 border-b border-slate-200/80 shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Left: Phase Tabs Bar */}
            <div className="flex items-center gap-1.5 font-medium flex-wrap">
              {/* Mobile Phase Select */}
              <label className="flex w-full items-center gap-2 py-1 sm:hidden">
                <span className="font-bold text-slate-500">Phase:</span>
                <select
                  aria-label="Pipeline phase"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs"
                  value={phase}
                  onChange={(event) => setPhase(event.target.value)}
                >
                  {PIPELINE_PHASES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label} ({item.stages.reduce((sum, stage) => sum + (stageCounts[stage] || 0), 0)})
                    </option>
                  ))}
                </select>
              </label>

              <div className="hidden sm:flex items-center gap-1.5 font-medium flex-wrap">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  Phase View:
                </span>
                {phase !== "all" && <span className="sr-only">Phase:</span>}
                {PIPELINE_PHASES.map((p) => {
                  const count = p.stages.reduce((acc, s) => acc + (stageCounts[s] || 0), 0);
                  const isSelected = phase === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPhase(p.id)}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs ${
                        isSelected
                          ? "bg-[#0E3B2E] text-white font-semibold shadow-xs"
                          : "text-slate-600 bg-white hover:bg-slate-200/60 border border-slate-200/60"
                      }`}
                    >
                      <span>{p.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
                          isSelected ? "bg-[#185342] text-emerald-100" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
                {phase !== "all" && (
                  <button
                    type="button"
                    aria-label="Clear Phase filter"
                    onClick={() => setPhase("all")}
                    className="px-2 py-1 text-xs text-slate-500 hover:text-slate-900 font-semibold cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Right: Search, View Mode, Density, Empty Stages, Sort, Jump Dots */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Live Search Input */}
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter candidates..."
                  aria-label="Search pipeline"
                  className="h-8 w-40 sm:w-48 pl-7 pr-7 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition shadow-2xs"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title="Clear filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* View Switcher (Board vs List) */}
              <div className="bg-white p-0.5 rounded-lg flex items-center gap-0.5 border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  id="view-board-btn"
                  onClick={() => setDensity("board")}
                  aria-pressed={density === "board"}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                    density === "board"
                      ? "bg-slate-100 text-slate-900 font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <KanbanSquare className={`w-3.5 h-3.5 ${density === "board" ? "text-emerald-700" : ""}`} />
                  <span>Board</span>
                </button>
                <button
                  type="button"
                  id="view-list-btn"
                  onClick={() => setDensity("list")}
                  aria-pressed={density === "list"}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                    density === "list"
                      ? "bg-slate-100 text-slate-900 font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Rows3 className={`w-3.5 h-3.5 ${density === "list" ? "text-emerald-700" : ""}`} />
                  <span>List</span>
                </button>
              </div>

              {/* Density toggle (Comfortable vs Compact) */}
              {density === "board" && (
                <div className="hidden md:flex bg-white p-0.5 rounded-lg items-center gap-0.5 border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setColumnDensity("comfortable")}
                    aria-pressed={columnDensity === "comfortable"}
                    className={`px-2 py-1 rounded-md text-xs font-semibold transition ${
                      columnDensity === "comfortable"
                        ? "bg-slate-100 text-slate-900 font-bold"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Comfortable
                  </button>
                  <button
                    type="button"
                    onClick={() => setColumnDensity("compact")}
                    aria-pressed={columnDensity === "compact"}
                    className={`px-2 py-1 rounded-md text-xs font-semibold transition ${
                      columnDensity === "compact"
                        ? "bg-slate-100 text-slate-900 font-bold"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Compact
                  </button>
                </div>
              )}

              {/* Quick Score Filter (All vs 90%+) */}
              <div className="hidden xl:flex items-center gap-0.5 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setScoreFilter("all")}
                  className={`px-2 py-1 rounded-md text-xs font-semibold transition ${
                    scoreFilter === "all"
                      ? "bg-slate-100 text-slate-900 font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setScoreFilter("90+")}
                  className={`px-2 py-1 rounded-md text-xs font-semibold transition ${
                    scoreFilter === "90+"
                      ? "bg-emerald-50 text-emerald-800 font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Top 90%+
                </button>
              </div>

              {/* Toggle empty stages */}
              {!loading && (hiddenCount > 0 || showEmpty) && (
                <button
                  type="button"
                  onClick={() => setShowEmpty((v) => !v)}
                  aria-label={showEmpty ? "Hide empty stages" : `Show ${hiddenCount} empty stages`}
                  className="h-8 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium px-2.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  {showEmpty ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{showEmpty ? "Hide empty" : `Show ${hiddenCount} empty`}</span>
                </button>
              )}

              {/* Sort selector */}
              <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 h-8 shadow-2xs">
                <select
                  value={sort}
                  aria-label="Sort pipeline"
                  onChange={(e) => setSort(e.target.value)}
                  className="bg-transparent border-0 text-xs font-semibold text-slate-600 hover:text-slate-900 focus:ring-0 cursor-pointer pr-4 py-1"
                >
                  {Object.entries(SORTS).map(([k, item]) => (
                    <option key={k} value={k}>
                      Sort: {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stage dots navigator */}
              <div className="hidden lg:flex text-[11px] text-slate-400 items-center gap-2 pl-2 border-l border-slate-200">
                <span>
                  Showing {visibleStages.length} of {ALL_STAGES.length} stages
                </span>
                {occupied.map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    title={`Jump to ${stageLabel(stage)}`}
                    onClick={() => jumpToStage(stage)}
                    className="h-2 w-2 rounded-full bg-slate-300 hover:bg-[#4b41e1] transition-colors cursor-pointer"
                  >
                    <span className="sr-only">Jump to {stageLabel(stage)}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

      {/* ── Main Pipeline Content (Board / List) ───────────────────────────── */}
      {density === "list" ? (
        <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 overflow-hidden">
          {sortedFlat.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <EmptyState
                icon={Users}
                title="No candidates found"
                description={
                  query
                    ? `No candidates match "${query}". Try adjusting your search term.`
                    : "No candidates match the current phase and requisition filter."
                }
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="sm:hidden space-y-3 overflow-y-auto p-3">
                {sortedFlat.map((candidate) => (
                  <article key={candidate._id} className="border-b border-slate-200 pb-3 last:border-0">
                    <CandidateLink
                      asDrawer
                      className="font-semibold text-slate-900 underline underline-offset-4"
                      candidateId={candidate._id}
                    >
                      {candidate.basicDetails?.name || "Unnamed applicant"}
                    </CandidateLink>
                    <p className="mt-1 text-sm text-slate-600">
                      {candidate.job?.title || "No job on record"} · {stageLabel(candidate.status)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      CV score: {scoreOf(candidate) == null ? "Unscored" : `${scoreOf(candidate)}/100`} ·{" "}
                      {figure(daysInStage(candidate), "d in stage")}
                    </p>
                    {candidate.pendingInterviewReviews?.length > 0 && (
                      <p className="mt-2 text-sm text-amber-800">Interview review pending</p>
                    )}
                  </article>
                ))}
              </div>

              <div className="hidden sm:block flex-1 overflow-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider sticky top-0 border-b border-slate-200 z-10">
                    <tr>
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          aria-label="Select all on this page"
                          checked={selectedIds.size > 0 && selectedIds.size === sortedFlat.length}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds(new Set(sortedFlat.map((c) => c._id)));
                            else setSelectedIds(new Set());
                          }}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-brand-800 focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="p-3">Candidate</th>
                      <th className="p-3">Role & Dept</th>
                      <th className="p-3">Stage</th>
                      <th className="p-3">Match Score</th>
                      <th className="p-3">Stage Age</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedFlat.map((c, idx) => {
                      const score = scoreOf(c);
                      const isSelected = selectedIds.has(c._id);
                      return (
                        <tr
                          key={c._id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSelected ? "bg-[#4b41e1]/5" : ""
                          }`}
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(c._id)}
                              aria-label={`Select candidate ${c.basicDetails?.name}`}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-brand-800 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <CandidateLink
                              candidateId={c._id}
                              className="font-bold text-slate-900 hover:text-brand-800 transition-colors"
                            >
                              {c.basicDetails?.name || "Unnamed applicant"}
                            </CandidateLink>
                          </td>
                          <td className="p-3 text-slate-600">{c.job?.title || "No job assigned"}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                              {stageLabel(c.status)}
                            </span>
                          </td>
                          <td className="p-3">
                            {score == null ? (
                              <span className="text-slate-400 font-medium">Not scored</span>
                            ) : (
                              <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                                {score}%
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-500">{figure(daysInStage(c), "d")}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => selectCandidate(c._id)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800"
                                title="Inspect drawer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <StageMenu
                                compact
                                status={c.status}
                                name={c.basicDetails?.name}
                                busy={busyId === c._id}
                                onMove={(stage) => handleMove(c, stage)}
                              />
                              <button
                                type="button"
                                onClick={() => openDeleteCandidate(c)}
                                className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-700"
                                title="Delete permanently"
                                aria-label={`Delete ${c.basicDetails?.name || "candidate"} permanently`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
                <span>
                  Showing <strong className="font-semibold text-slate-800">{sortedFlat.length}</strong> candidate
                  {sortedFlat.length === 1 ? "" : "s"}
                </span>
                <span>💡 Click any candidate to view full profile</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative flex-1 min-h-0 flex flex-col">
          {/* Smooth Scroll Navigation Arrows */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => handleScroll("left")}
              aria-label="Scroll pipeline left"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lift border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-brand-800 hover:scale-105 active:scale-95 transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {canScrollRight && (
            <button
              type="button"
              onClick={() => handleScroll("right")}
              aria-label="Scroll pipeline right"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lift border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-brand-800 hover:scale-105 active:scale-95 transition-all"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          {/* Kanban Board Container */}
          <section
            ref={boardRef}
            id="pipeline-board"
            className="flex-1 min-h-0 overflow-x-auto p-4 sm:p-6 flex gap-6 kanban-scroll [scrollbar-width:thin] items-start select-none"
          >
            {visibleStages.map((stage) => (
              <StageColumn
                key={stage}
                ref={(el) => {
                  if (columnRefs.current) columnRefs.current[stage] = el;
                }}
                stage={stage}
                candidates={columns[stage] || []}
                totalCount={stageCounts[stage] || 0}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onMove={handleMove}
                onQuickReject={handleQuickReject}
                onDelete={openDeleteCandidate}
                onPreviewResume={setPreviewCandidate}
                busyId={busyId}
                isHighlighted={highlightedStage === stage}
                columnDensity={columnDensity}
                onInspect={selectCandidate}
              />
            ))}
          </section>
        </div>
      )}

      {/* ── Bottom Floating Bulk Action Dock ───────────────────────────────── */}
      <div
        id="bulk-dock"
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-gradient-to-b from-slate-900 to-slate-950 text-white px-5 py-2.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-4 transition-all duration-300 transform z-50 ${
          selectedIds.size > 0
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-24 opacity-0 pointer-events-none"
        }`}
      >
        <span className="text-xs font-medium whitespace-nowrap">
          <span className="font-bold text-emerald-400">{selectedIds.size}</span> Candidates Selected
        </span>

        <div className="h-4 w-px bg-slate-700" />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBulkAdvance}
            disabled={bulkBusy || !selectedIds.size}
            className="btn-3d-advance text-xs bg-[#4b41e1] hover:bg-[#4338ca] text-white font-semibold px-3 py-1.5 rounded-xl transition-all whitespace-nowrap shadow-xs"
          >
            Advance Selected →
          </button>

          <button
            type="button"
            onClick={handleBulkReject}
            disabled={bulkBusy || !selectedIds.size}
            className="text-xs bg-rose-600/90 hover:bg-rose-600 text-white font-semibold px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap"
          >
            Reject
          </button>

          <Menu
            align="end"
            width={240}
            label="Move selected to stage"
            trigger={
              <button
                type="button"
                className="text-xs bg-slate-800 hover:bg-slate-700 font-semibold px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1 border border-slate-700"
              >
                <span>Move to Stage</span>
                <ChevronDown className="h-3 w-3 text-slate-300" />
              </button>
            }
          >
            <MenuGroup label="Select Stage">
              {STAGES.map((s) => (
                <MenuItem
                  key={s}
                  onSelect={() => handleBulkMoveStage(s)}
                  trailing={<span className="text-[10px] text-slate-400 font-bold">{stageStep(s)}</span>}
                >
                  {stageLabel(s)}
                </MenuItem>
              ))}
            </MenuGroup>
          </Menu>

          <button
            type="button"
            onClick={openBulkDelete}
            disabled={bulkBusy || deleting || !selectedIds.size}
            title="Permanently delete the selected candidates and all their data"
            className="flex items-center gap-1 text-xs bg-transparent hover:bg-rose-950/60 text-rose-300 hover:text-rose-100 border border-rose-800/60 font-semibold px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap"
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" /> Delete
          </button>

          <button
            type="button"
            onClick={clearSelection}
            className="text-xs text-slate-400 hover:text-white px-1.5 py-1 transition-colors ml-1"
          >
            ✕ Clear
          </button>
        </div>
      </div>
    </>
  )}

      {/* ── Resume / CV Preview Modal ───────────────────────────────────────── */}
      {previewCandidate && (
        <Modal
          open={Boolean(previewCandidate)}
          onClose={() => setPreviewCandidate(null)}
          title={`Candidate Preview — ${previewCandidate.basicDetails?.name || "Applicant"}`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {previewCandidate.basicDetails?.name}
                </h3>
                <p className="text-slate-500 font-medium">
                  {previewCandidate.job?.title || "No job title"}
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-slate-600 text-[11px]">
                  {previewCandidate.basicDetails?.email && (
                    <span>✉️ {previewCandidate.basicDetails.email}</span>
                  )}
                  {previewCandidate.basicDetails?.phone && (
                    <span>📞 {previewCandidate.basicDetails.phone}</span>
                  )}
                  {previewCandidate.basicDetails?.location && (
                    <span>📍 {previewCandidate.basicDetails.location}</span>
                  )}
                </div>
              </div>

              {scoreOf(previewCandidate) != null && (
                <div className="text-center px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-xs font-bold text-emerald-700">
                    {scoreOf(previewCandidate)}%
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium">ATS Match</div>
                </div>
              )}
            </div>

            {previewCandidate.skills && previewCandidate.skills.length > 0 && (
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Skills
                </h4>
                <div className="flex flex-wrap gap-1">
                  {previewCandidate.skills.map((skill) => (
                    <span
                      key={skill}
                      className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <div>
                <span className="text-slate-500">Current Stage:</span>
                <span className="ml-1.5 font-bold text-slate-900">
                  {stageLabel(previewCandidate.status)}
                </span>
              </div>
              <span className="text-slate-400">
                In stage {daysInStage(previewCandidate) ?? 0} days
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await downloadFile(
                      `/candidates/${previewCandidate._id}/resume`,
                      `${previewCandidate.basicDetails?.name || "candidate"}-resume.pdf`
                    );
                    toast.success("Resume download started");
                  } catch (err) {
                    toast.error("Could not download resume file");
                  }
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Resume</span>
              </button>

              <CandidateLink
                candidateId={previewCandidate._id}
                onClick={() => setPreviewCandidate(null)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <span>Full Profile</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </CandidateLink>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Permanent Delete Confirmation Modal (DPDP erasure) ───────────────── */}
      {deleteTarget && (
        <Modal
          open={Boolean(deleteTarget)}
          onClose={closeDeleteModal}
          busy={deleting}
          title={
            deleteTarget.mode === "single"
              ? `Delete ${deleteTarget.candidates[0].basicDetails?.name || "this candidate"} permanently?`
              : `Delete ${deleteTarget.candidates.length} candidates permanently?`
          }
          size="sm"
        >
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5">
            <p className="flex items-start gap-2 text-sm font-semibold text-rose-800">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              This permanently deletes the résumé, interview recordings, transcripts and every
              score for {deleteTarget.mode === "single"
                ? deleteTarget.candidates[0].basicDetails?.name || "this candidate"
                : `${deleteTarget.candidates.length} selected candidates`}.
            </p>
            <p className="mt-1 text-xs text-rose-700">
              It cannot be undone, and the record cannot be restored from the interface. Type
              DELETE to confirm.
            </p>
            {deleteTarget.mode === "bulk" && (
              <ul className="mt-2 max-h-32 space-y-0.5 overflow-y-auto text-xs text-rose-800">
                {deleteTarget.candidates.map((candidate) => (
                  <li key={candidate._id} className="truncate">
                    • {candidate.basicDetails?.name || "Unnamed applicant"}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                aria-label="Type DELETE to confirm"
                placeholder="DELETE"
                autoFocus
                className="w-28 rounded-lg border border-rose-300 bg-white px-2.5 py-1.5 text-sm uppercase tracking-wide text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting || deleteConfirmText.trim().toUpperCase() !== "DELETE"}
                className="rounded-lg bg-rose-700 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete permanently"}
              </button>
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      <CandidateDrawer
        candidateId={selectedCandidateId}
        reviewIds={sortedFlat.map((item) => item._id)}
        onClose={closeDrawer}
        onSelectCandidate={selectCandidate}
        onCandidateUpdated={() => remote.refresh()}
      />
    </div>
  );
}
