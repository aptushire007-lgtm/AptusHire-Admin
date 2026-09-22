import { forwardRef, useEffect, useMemo, useRef, useState, useCallback } from "react";
import CandidateLink from "../../components/candidate/CandidateLink.jsx";
import CandidateDrawer from "../../components/candidate/CandidateDrawer.jsx";
import OfferDialog from "../../components/candidate/OfferDialog.jsx";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
  MoreHorizontal,
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
import Menu, { MenuGroup, MenuItem, MenuSeparator } from "../../components/ui/Menu.jsx";
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
import { EvidenceChip } from "../../components/ui/Evidence.jsx";
import { HUES, STEP_HUE } from "../../lib/featureHues.js";

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
  { id: "rejected", label: "Rejected", stages: [REJECTED] },
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
  if (s === "ats_passed") return "bg-teal-400 shadow-sm shadow-teal-400/40";
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
    return "bg-brand-400 shadow-sm shadow-brand-400/40";
  }
  if (["selected", "offer_sent", "offer_accepted", "joined"].includes(s)) {
    return "bg-brand-800 shadow-sm shadow-brand-800/40";
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

/**
 * 3D Tactile Candidate Card
 */
function CandidateCard({
  candidate,
  isSelected,
  onToggleSelect,
  onMove,
  onDelete,
  onPreviewResume,
  onInspect,
  busy,
  showRole = true,
}) {
  const score = scoreOf(candidate);
  const resumeSignals = resumeFlagCount(candidate);
  const inStage = daysInStage(candidate);
  const waitingLong =
    !["joined", REJECTED].includes(normalizeStage(candidate.status)) && inStage != null && inStage >= 14;
  const initials = getAvatarInitials(candidate.basicDetails?.name);
  const evidence = stageEvidence(candidate);
  const name = candidate.basicDetails?.name || "Unnamed applicant";

  // The card used to carry eleven things: a checkbox, a gradient avatar, the
  // name, the role, the Fit score, an evidence box, up to four skill chips and
  // an overflow, a caveat strip, a résumé-signal strip, an "In stage" line with
  // a status tag, and a row of SIX controls — view, résumé, quick reject, a
  // separate advance button, the stage menu and delete. It is now who, how well
  // they fit, what has happened, and the one thing to do next. Everything else
  // is in the profile, or behind the ⋯ menu.
  return (
    <article
      className={`candidate-card group relative rounded-xl border bg-white p-3.5 transition-all duration-150 ${
        isSelected
          ? "border-brand-700 ring-1 ring-brand-700/30"
          : "border-hairline hover:-translate-y-px hover:border-slate-300 hover:shadow-sm"
      }`}
      data-candidate-id={candidate._id}
      data-name={candidate.basicDetails?.name || ""}
      // Absent when unscored — never an unmeasured candidate written as 0.
      data-score={score ?? undefined}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          aria-label={`Select candidate ${name}`}
          className="candidate-checkbox mt-2.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-brand-800"
        />
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold text-brand-800"
          aria-hidden="true"
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <CandidateLink
            candidateId={candidate._id}
            className="candidate-name block truncate text-sm font-semibold text-slate-900 hover:text-brand-800"
            title={name}
          >
            {name}
          </CandidateLink>
          {/* Inside a job every card is for that job, so the role is not
              repeated on each; the company-wide board still shows it. */}
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {showRole && <span>{candidate.job?.title || "Role unavailable"} · </span>}
            {inStage != null ? (
              <span className={waitingLong ? "font-medium text-amber-700" : ""}>
                {inStage}d in stage{waitingLong ? " — waiting" : ""}
              </span>
            ) : (
              "Stage age unknown"
            )}
          </p>
        </div>
        {score == null ? (
          <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
            Not scored
          </span>
        ) : (
          <span className="flex shrink-0 flex-col items-end leading-none">
            <span className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">Fit</span>
            <span className="num pt-0.5 text-lg font-semibold text-emerald-700">{score}</span>
            <span className="sr-only">out of 100</span>
          </span>
        )}
      </div>

      {/* What has happened, one line per stage. The dot is the step's colour
          (lib/featureHues.js) — identity only; the chip beside it carries the
          verdict in the verdict colours, so the two never share a mark. */}
      <ul className="mt-3 space-y-1.5 border-t border-rule pt-2.5">
        {evidence.map((row) => (
          <li key={row.key} className="flex items-center gap-2 text-xs">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${HUES[STEP_HUE[row.key]].dot}`} aria-hidden="true" />
            <span className={`min-w-0 flex-1 truncate ${row.state === "absent" ? "text-slate-500" : "text-slate-700"}`}>
              {row.label}
            </span>
            <EvidenceChip state={row.state} className="shrink-0">
              {row.note || "Not run"}
            </EvidenceChip>
          </li>
        ))}
      </ul>

      {resumeSignals > 0 && (
        <p className="mt-2.5 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800">
          {resumeSignals} résumé signal{resumeSignals === 1 ? "" : "s"} to review
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        {/* The single next decision, and the menu of the rest — one rule for
            both (stageDecisions in pipeline.js). The card used to have its own
            separate advance button with a hand-written rule that could jump a
            candidate still awaiting their interview straight to "Offer sent",
            emailing them an offer in one click. */}
        <StageMenu
          compact
          status={candidate.status}
          name={candidate.basicDetails?.name}
          busy={busy}
          onMove={(stage) => onMove(candidate, stage)}
          className="min-w-0"
        />
        <Menu
          label={`More actions for ${name}`}
          align="end"
          width={220}
          trigger={
            <button
              type="button"
              aria-label={`More actions for ${name}`}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </button>
          }
        >
          {onInspect && (
            <MenuItem onSelect={() => onInspect(candidate._id)} leading={<Eye className="h-4 w-4 text-slate-500" />}>
              View profile
            </MenuItem>
          )}
          <MenuItem onSelect={() => onPreviewResume(candidate)} leading={<FileText className="h-4 w-4 text-slate-500" />}>
            Preview résumé
          </MenuItem>
          <MenuSeparator />
          <MenuItem tone="danger" onSelect={() => onDelete(candidate)} leading={<Trash2 className="h-4 w-4" />}>
            Delete permanently
          </MenuItem>
        </Menu>
      </div>
    </article>
  );
}

const StageColumn = forwardRef(function StageColumn(
  {
    stage,
    candidates,
    totalCount,
    selectedIds,
    onToggleSelect,
    onMove,
    onDelete,
    onPreviewResume,
    busyId,
    onInspect,
    showRole,
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
      className={`stage-column flex flex-col column-tray-3d p-3 rounded-2xl min-h-[420px] shrink-0 ${glowClass} transition-all ${
        // One width: the card is compact now, so the density toggle that
        // switched between two went with it.
        "w-72"
      }`}
      data-stage={stage}
      data-stage-name={stageLabel(stage)}
    >
      {/* Header: which stage, where it sits, how many, and who has waited
          longest — two quiet lines where there were two bordered rows. The name
          is sentence case: an all-caps column title shouts, and eight of them
          side by side shout over the candidates. */}
      <div className="mb-2.5 shrink-0 px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} aria-hidden="true" />
          {step && <span className="num text-[11px] font-semibold text-slate-400">{String(step).padStart(2, "0")}</span>}
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{stageLabel(stage)}</h2>
          {/* One number when the whole stage is on this page; "shown of total"
              only when it is not. "1 / 1" asked the reader to do arithmetic. */}
          <span className="stage-count num rounded-md bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-700 shadow-2xs">
            {candidates.length === totalCount ? totalCount : `${candidates.length} of ${totalCount}`}
          </span>
        </div>
        {candidates.length > 0 && (
          <p className="mt-1 flex items-center gap-1 pl-4 text-[11px] text-slate-500">
            <span>Longest on this page</span>
            <span className="num font-semibold text-slate-700">{oldest >= 0 ? `${oldest}d` : "—"}</span>
          </p>
        )}
      </div>

      {/* Cards Container */}
      <div className="candidate-cards-container flex flex-col gap-2.5 flex-1 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
        {candidates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-hairline px-3 py-10 text-center">
            <p className="text-xs font-medium text-slate-500">
              No candidates in {stageLabel(stage)}
            </p>
            {/* It used to say "Drag a card here to move a candidate." — but
                this board has no drag-and-drop, so that was a promise it could
                not keep. Candidates are moved from a card's action button. */}
            <p className="pt-1 text-[11px] text-slate-500">Candidates appear here when they reach this stage.</p>
          </div>
        ) : (
          candidates.map((c, idx) => (
            <CandidateCard
              key={c._id}
              showRole={showRole}
              candidate={c}
              idx={idx}
              isSelected={selectedIds.has(c._id)}
              onToggleSelect={() => onToggleSelect(c._id)}
              onMove={onMove}
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
            className="border-2 border-dashed border-[#c6c6cd]/40 hover:border-brand-700/60 rounded-2xl p-4 flex flex-col items-center justify-center text-center text-slate-500 min-h-[105px] bg-white/40 hover:bg-brand-50 transition-all cursor-pointer group shrink-0 mt-1"
          >
            <div className="w-8 h-8 rounded-full bg-white border border-[#c6c6cd]/40 flex items-center justify-center text-brand-700 mb-1 shadow-xs group-hover:scale-110 transition-transform">
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
  const [offerFor, setOfferFor] = useState(null);
  const bulkRunning = useRef(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleteTarget, setDeleteTarget] = useState(null); // { candidates, mode: 'single' | 'bulk' }
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  // The ROUTER's location, not the global `window.location`: the two agree in
  // a browser, but only this one is correct under a MemoryRouter or during a
  // navigation that has not reached the address bar yet.
  const location = useLocation();
  // Pipeline and All candidates are one page in two views. An explicit ?view=
  // always wins; otherwise the URL section picks the default, so the job
  // sidebar's "All candidates" opens as a list and "Pipeline" as a board.
  const onCandidatesSection = /\/candidates\/?$/.test(location.pathname);
  const density = (params.get("view") ?? (onCandidatesSection ? "list" : "board")) === "list" ? "list" : "board";
  const setDensity = (value) => setFilter("view", value);
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
  // Sending an offer stops at the offer dialog first, so the recruiter can pick
  // a saved template; the dialog calls back here with the message.
  async function handleMove(candidate, toStage, offerMessage) {
    if (bulkRunning.current || busyId || loading || loadError) return;
    if (!activeApplications.some((item) => item._id === candidate._id)) {
      toast.error("This application is no longer in the active pipeline. Refresh to see its current state.");
      return;
    }
    if (toStage === "offer_sent" && !offerFor) {
      setOfferFor(candidate);
      return;
    }
    setBusyId(candidate._id);
    try {
      await api.patch(`/candidates/${candidate._id}/stage`, { stage: toStage, offerMessage });
      setOfferFor(null);
      toast.success(`${candidate.basicDetails?.name || "Candidate"} → ${stageLabel(toStage)}`);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not move candidate");
    } finally {
      setBusyId(null);
    }
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
      {/* No job tab strip here: inside a job, the sidebar IS the job's
          navigation (see JobSidebar.jsx), so a second row of the same links
          above the board would only compete with it. */}
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
          <Link to="/candidates" className="font-semibold text-brand-800 underline underline-offset-4">
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
                      <Badge tone="green" className="text-[11px] font-semibold">
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
          {/* ── Header ──────────────────────────────────────────────────────────
              Two rows, where there used to be four stacked bands: a job meta
              line and a strip of four KPI chips, a large title row, a "Phase
              View" bar, and a toolbar of eight controls ending in a row of
              stage dots. Inside a job the sidebar already names the job, its
              status and its openings, so none of that is repeated here, and
              the KPIs — analytics, not board work — fold into "Pipeline stats"
              rather than competing with the candidates for attention. */}
          <section className="shrink-0 space-y-3 border-b border-hairline bg-white px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                {!jobScoped && publishedJobs.length > 1 && (
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
                    className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    <span>Back to All Roles</span>
                  </button>
                )}
                <h1 className="truncate font-display text-xl font-semibold text-slate-900" title={currentRoleTitle}>
                  {jobScoped ? "Pipeline" : currentRoleTitle}
                </h1>
                <span
                  id="total-candidate-badge"
                  className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700"
                >
                  {/* Only the figure takes the numeral face; the word does not. */}
                  <span className="num">{filtered.length}</span> {filtered.length === 1 ? "candidate" : "candidates"}
                </span>
                {!jobScoped && <Menu
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
                </Menu>}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex items-center">
                  <Search className="pointer-events-none absolute left-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search candidates"
                    aria-label="Search pipeline"
                    className="h-9 w-48 rounded-lg border border-hairline bg-white py-0 pr-7 pl-8 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-700 focus:outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="absolute right-2 text-slate-400 hover:text-slate-700"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-0.5 rounded-lg border border-hairline bg-canvas p-0.5">
                  {[
                    { id: "board", label: "Board", icon: KanbanSquare },
                    { id: "list", label: "List", icon: Rows3 },
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      id={`view-${v.id}-btn`}
                      onClick={() => setDensity(v.id)}
                      aria-pressed={density === v.id}
                      className={`flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors ${
                        density === v.id ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <v.icon className="h-4 w-4" aria-hidden="true" />
                      <span>{v.label}</span>
                    </button>
                  ))}
                </div>

                <select
                  value={sort}
                  aria-label="Sort pipeline"
                  onChange={(e) => setSort(e.target.value)}
                  className="h-9 rounded-lg border border-hairline bg-white py-0 pr-8 pl-3 text-sm font-medium text-slate-700"
                >
                  {Object.entries(SORTS).map(([k, item]) => (
                    <option key={k} value={k}>
                      Sort: {item.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  id="btn-add-candidate"
                  onClick={() => navigate("/jobs?create=1")}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-800 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Add candidate</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Mobile: one select instead of a wrapping row of tabs. */}
              <label className="flex w-full items-center gap-2 sm:hidden">
                <span className="text-xs font-semibold text-slate-600">Phase</span>
                <select
                  aria-label="Pipeline phase"
                  className="min-w-0 flex-1 rounded-lg border border-hairline bg-white px-2.5 py-1 text-sm"
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

              {/* The same four phases the move menu groups its decisions under. */}
              <div className="hidden flex-wrap items-center gap-1 sm:flex">
                {phase !== "all" && <span className="sr-only">Phase:</span>}
                {PIPELINE_PHASES.map((p) => {
                  const count = p.stages.reduce((acc, st) => acc + (stageCounts[st] || 0), 0);
                  const isSelected = phase === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPhase(p.id)}
                      className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors ${
                        isSelected ? "bg-brand-800 font-semibold text-white" : "text-slate-600 hover:bg-canvas hover:text-slate-900"
                      }`}
                    >
                      <span>{p.label}</span>
                      <span
                        className={`num rounded-md px-1.5 text-xs font-semibold ${
                          isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
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
                    className="px-2 text-sm font-medium text-slate-500 hover:text-slate-900"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => setScoreFilter((v) => (v === "90+" ? "all" : "90+"))}
                  aria-pressed={scoreFilter === "90+"}
                  className={`rounded-md px-2 py-1 font-medium transition-colors ${
                    scoreFilter === "90+" ? "bg-emerald-50 text-emerald-800" : "hover:bg-canvas hover:text-slate-900"
                  }`}
                >
                  Fit 90+
                </button>
                <span>
                  Showing {visibleStages.length} of {ALL_STAGES.length} stages
                </span>
                {!loading && (hiddenCount > 0 || showEmpty) && (
                  <button
                    type="button"
                    onClick={() => setShowEmpty((v) => !v)}
                    aria-label={showEmpty ? "Hide empty stages" : `Show ${hiddenCount} empty stages`}
                    className="flex items-center gap-1 rounded-md px-2 py-1 font-medium hover:bg-canvas hover:text-slate-900"
                  >
                    {showEmpty ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                    <span>{showEmpty ? "Hide empty" : `Show ${hiddenCount} empty`}</span>
                  </button>
                )}
                {/* Native <details>: the four board KPIs are one click away, and
                    kept with their denominators, but no longer sit above every
                    card competing with the candidates for attention. */}
                <details className="relative">
                  <summary className="cursor-pointer list-none rounded-md px-2 py-1 font-medium hover:bg-canvas hover:text-slate-900">
                    Pipeline stats
                  </summary>
                  <div className="absolute right-0 z-20 mt-2 w-72 space-y-2 rounded-xl border border-hairline bg-white p-4 text-sm text-slate-600 shadow-lift">
                    <p>
                      <span className="text-slate-500">Active in pipeline</span>{" "}
                      <span className="num font-semibold text-slate-900">{kpis.active}</span>{" "}
                      <span className="text-xs">Of {kpis.total} applications on record</span>
                    </p>
                    <p>
                      Avg ATS score {kpis.avgScore != null ? `${kpis.avgScore}%` : "—"} across {kpis.scoredCount} scored
                    </p>
                    <p>
                      <span className="text-slate-500">Stage velocity</span>{" "}
                      <span className="num font-semibold text-slate-900">
                        {kpis.avgDaysInStage != null ? `${kpis.avgDaysInStage}d avg` : "—"}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-500">Pass-through</span>{" "}
                      <span className="num font-semibold text-emerald-700">
                        {kpis.passThroughPct != null ? `${kpis.passThroughPct}%` : "—"}
                      </span>{" "}
                      <span className="text-xs">({kpis.shortlisted} of {kpis.total} reached Shortlisted)</span>
                    </p>
                  </div>
                </details>
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
                            isSelected ? "bg-brand-50" : ""
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
                // The role is repeated on every card only on the company-wide
                // board; inside a job every card is for that job.
                showRole={!jobScoped}
                ref={(el) => {
                  if (columnRefs.current) columnRefs.current[stage] = el;
                }}
                stage={stage}
                candidates={columns[stage] || []}
                totalCount={stageCounts[stage] || 0}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onMove={handleMove}
                onDelete={openDeleteCandidate}
                onPreviewResume={setPreviewCandidate}
                busyId={busyId}
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
            className="btn-3d-advance text-xs bg-brand-800 hover:bg-brand-700 text-white font-semibold px-3 py-1.5 rounded-xl transition-all whitespace-nowrap shadow-xs"
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

      {offerFor && (
        <OfferDialog
          candidate={offerFor}
          onClose={() => setOfferFor(null)}
          onSend={(message) => handleMove(offerFor, "offer_sent", message)}
        />
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
