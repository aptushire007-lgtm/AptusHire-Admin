import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Clock, Eye, EyeOff, KanbanSquare } from "lucide-react";
import api from "../../api/client.js";
import { useCompanyData } from "../../context/CompanyDataContext.jsx";
import { Skeleton, EmptyState } from "../../components/ui/Card.jsx";
import { Chip } from "../../components/ui/Panels.jsx";
import StageMenu from "../../components/ui/StageMenu.jsx";
import { useToast } from "../../components/ui/Toast.jsx";
import {
  ALL_STAGES,
  REJECTED,
  stageLabel,
  normalizeStage,
} from "../../lib/pipeline.js";

// ─── Initials avatar ─────────────────────────────────────────────────────────
function Avatar({ name }) {
  const letters =
    String(name || "?")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?";
  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E8F2EC] text-[11px] font-bold text-[#176B45]">
      {letters}
    </span>
  );
}

// ─── Candidate card ───────────────────────────────────────────────────────────
// White, very light green border, no shadow — matches reference exactly
function CandidateCard({ candidate, onMove, busy }) {
  const score = candidate.ats?.overallScore;

  return (
    <Link
      to={`/candidates/${candidate._id}`}
      className="flex items-center gap-2.5 rounded-lg border border-[#E5EBE7] bg-white p-3 transition-colors hover:border-[#C7DDD1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B45]"
    >
      <Avatar name={candidate.basicDetails?.name} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold leading-snug text-[#111]">
          {candidate.basicDetails?.name || "Unnamed applicant"}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-[#64736A]">
          {candidate.job?.title || ""}
        </p>
        {score != null && (
          <p className="mt-1 text-[11px] font-bold text-[#176B45]">
            {score}% match
          </p>
        )}
      </div>

      <div
        onClick={(e) => e.preventDefault()}
        onMouseDown={(e) => e.stopPropagation()}
        className="shrink-0"
      >
        <StageMenu
          compact
          status={candidate.status}
          name={candidate.basicDetails?.name}
          busy={busy}
          onMove={(stage) => onMove(candidate, stage)}
        />
      </div>
    </Link>
  );
}

// ─── Stage column ─────────────────────────────────────────────────────────────
// No bg fill on column — columns are transparent inside the outer light-green card
function StageColumn({ stage, candidates, onMove, busyId, isLast }) {
  const terminal = stage === REJECTED;

  return (
    <div
      className={`flex min-w-[190px] flex-1 flex-col ${
        !isLast ? "border-r border-[#E5EBE7]" : ""
      }`}
    >
      {/* Header: label left, count right */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <h2 className={`text-sm font-bold ${terminal ? "text-[#C95C5C]" : "text-[#111]"}`}>
          {stageLabel(stage)}
        </h2>
        <span className="ml-auto text-sm font-semibold text-[#64736A]">
          {candidates.length}
        </span>
      </div>

      {/* Cards list */}
      <div className="flex max-h-[56vh] flex-col gap-2 overflow-y-auto overscroll-contain px-3 pb-4">
        {candidates.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-[#A8B8B0]">No candidates</p>
        ) : (
          candidates.map((c) => (
            <CandidateCard
              key={c._id}
              candidate={c}
              onMove={onMove}
              busy={busyId === c._id}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HiringPipeline() {
  const { allCandidates, jobs, loading, refresh } = useCompanyData();
  const toast  = useToast();
  const [busyId,     setBusyId]     = useState(null);
  const [showEmpty,  setShowEmpty]  = useState(false);

  const columns = useMemo(() => {
    const grouped = Object.fromEntries(ALL_STAGES.map((s) => [s, []]));
    for (const c of allCandidates) {
      const stage = normalizeStage(c.status);
      if (grouped[stage]) grouped[stage].push(c);
    }
    return grouped;
  }, [allCandidates]);

  const kpiStats = useMemo(() => {
    const interviewStages = new Set([
      "interview_scheduled","interview_completed",
      "ai_interview_sent","ai_interview_completed",
    ]);
    const shortlistStages = new Set([
      "shortlisted","screening_passed","offer_extended","offer_accepted",
    ]);
    return [
      { label: "Open roles",  value: jobs?.length ?? 0 },
      { label: "Candidates",  value: allCandidates.length },
      { label: "Interviews",  value: allCandidates.filter((c) => interviewStages.has(normalizeStage(c.status))).length },
      { label: "Shortlisted", value: allCandidates.filter((c) => shortlistStages.has(normalizeStage(c.status))).length },
      { label: "Hired",       value: allCandidates.filter((c) => normalizeStage(c.status) === "hired").length },
    ];
  }, [allCandidates, jobs]);

  const occupied      = ALL_STAGES.filter((s) => columns[s].length > 0);
  const visibleStages = showEmpty || occupied.length === 0 ? ALL_STAGES : occupied;
  const hiddenCount   = ALL_STAGES.length - visibleStages.length;

  async function handleMove(candidate, toStage) {
    setBusyId(candidate._id);
    try {
      await api.patch(`/candidates/${candidate._id}/stage`, { stage: toStage });
      toast.success(`${candidate.basicDetails?.name} → ${stageLabel(toStage)}`);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not move candidate");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17221C]">
            Hiring Pipeline
          </h1>
          <p className="mt-1 text-sm text-[#64736A]">
            One workspace for every open role, candidate, conversation, and decision.
          </p>
        </div>
        {!loading && allCandidates.length > 0 && (hiddenCount > 0 || showEmpty) && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#64736A]">
              {visibleStages.length} of {ALL_STAGES.length} stages
            </span>
            <Chip icon={showEmpty ? EyeOff : Eye} onClick={() => setShowEmpty((v) => !v)}>
              {showEmpty ? "Hide empty" : `+${hiddenCount} empty`}
            </Chip>
          </div>
        )}
      </div>

      {/* ── States ───────────────────────────────────────────────── */}
      {loading ? (
        /* Loading skeleton — same outer shape */
        <div className="overflow-hidden rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9]">
          {/* KPI skeleton */}
          <div className="grid grid-cols-5 divide-x divide-[#E5EBE7] border-b border-[#E5EBE7]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-4">
                <Skeleton className="h-3 w-20 bg-[#E5EBE7]" />
                <Skeleton className="mt-2 h-8 w-12 bg-[#E5EBE7]" />
                <Skeleton className="mt-1 h-3 w-16 bg-[#E5EBE7]" />
              </div>
            ))}
          </div>
          {/* Columns skeleton */}
          <div className="flex divide-x divide-[#E5EBE7]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-1 px-3 py-4 space-y-2">
                <Skeleton className="h-4 w-24 bg-[#E5EBE7]" />
                <Skeleton className="h-16 w-full bg-[#E5EBE7] rounded-lg" />
                <Skeleton className="h-16 w-full bg-[#E5EBE7] rounded-lg" />
              </div>
            ))}
          </div>
        </div>

      ) : allCandidates.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] p-10">
          <EmptyState
            icon={KanbanSquare}
            title="No candidates yet"
            description="Applicants appear here once they apply and flow through the pipeline as you move them."
          />
        </div>

      ) : (
        /* ── ONE big outer card — light green bg ─────────────── */
        <div className="overflow-hidden rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9]">

          {/* ── KPI row ────────────────────────────────────────── */}
          <div className="grid grid-cols-2 divide-x divide-y divide-[#E5EBE7] border-b border-[#E5EBE7] sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
            {kpiStats.map((s) => (
              <div key={s.label} className="px-5 py-4">
                <p className="text-xs font-medium text-[#64736A]">{s.label}</p>
                <p className="mt-0.5 font-display text-[2.1rem] font-bold leading-none tracking-tight text-[#111]">
                  {s.value}
                </p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-[#64736A]">
                  <Clock className="h-3 w-3 shrink-0" aria-hidden />
                  Updated now
                </p>
              </div>
            ))}
          </div>

          {/* ── Kanban columns ─────────────────────────────────── */}
          <div className="overflow-x-auto">
            <div className="flex min-w-max divide-x divide-[#E5EBE7]">
              {visibleStages.map((stage, idx) => (
                <StageColumn
                  key={stage}
                  stage={stage}
                  candidates={columns[stage]}
                  onMove={handleMove}
                  busyId={busyId}
                  isLast={idx === visibleStages.length - 1}
                />
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
