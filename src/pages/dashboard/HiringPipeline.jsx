import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Clock, Eye, EyeOff, KanbanSquare, ChevronLeft, ChevronRight } from "lucide-react";
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
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E8F2EC] text-[9px] font-bold text-[#176B45]">
      {letters}
    </span>
  );
}

// ─── Candidate card ───────────────────────────────────────────────────────────
// White, very light green border, no shadow — matches reference exactly
function CandidateCard({ candidate, onMove, busy }) {
  const score = candidate.ats?.overallScore;

  return (
    <div className="group relative min-h-[76px] rounded-lg border border-[#D9E4DB] bg-white transition-colors hover:border-[#BFD4C4]">
      <Link
        to={`/candidates/${candidate._id}`}
        className="block h-full rounded-lg px-2.5 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B45]"
      >
        <div className="flex min-w-0 items-center gap-2 pr-1">
          <Avatar name={candidate.basicDetails?.name} />
          <p className="truncate text-[11px] font-semibold leading-tight text-[#17221C]">
            {candidate.basicDetails?.name || "Unnamed applicant"}
          </p>
        </div>
        <p className="mt-1 truncate text-[10px] leading-tight text-[#445249]">
          {candidate.job?.title || "Application"}
        </p>
        {score != null && (
          <span className="mt-1 inline-flex bg-[#E8F2EC] px-1.5 py-0.5 text-[9px] font-bold leading-none text-[#176B45]">
            {score}% match
          </span>
        )}
      </Link>

      {/* Keep stage controls available without changing the clean reference
          card at rest. Keyboard focus also reveals them. */}
      <div
        className="absolute bottom-1.5 right-1.5 z-10 hidden rounded-lg bg-white shadow-sm group-hover:block group-focus-within:block"
      >
        <StageMenu
          compact
          status={candidate.status}
          name={candidate.basicDetails?.name}
          busy={busy}
          onMove={(stage) => onMove(candidate, stage)}
        />
      </div>
    </div>
  );
}

// ─── Horizontal kanban scroller ──────────────────────────────────────────────
// The board can be far wider than the viewport (every stage shown, or a busy
// pipeline). The native scrollbar is hidden by design, which left mouse users
// with NO way to reach the off-screen stages — no bar to drag, no wheel
// translation, no buttons. This restores all three:
//   • a vertical mouse wheel over the board scrolls it sideways (unless the
//     column under the pointer still has room to scroll vertically itself),
//   • ◀ / ▶ buttons appear whenever there is more board in that direction,
//   • drag-to-pan with the pointer.
function KanbanScroller({ children }) {
  const ref = useRef(null);
  const drag = useRef(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ atStart: el.scrollLeft <= 1, atEnd: el.scrollLeft >= max - 1 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    measure();

    // Registered natively with { passive: false } — React attaches onWheel as
    // passive, which silently no-ops the preventDefault() this needs to stop the
    // page scrolling vertically while we pan the board sideways.
    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // genuine horizontal intent
      const col = e.target.closest?.("[data-col-scroll]");
      if (col) {
        const room = e.deltaY > 0
          ? col.scrollTop + col.clientHeight < col.scrollHeight - 1
          : col.scrollTop > 1;
        if (room) return; // let the column consume its own vertical scroll first
      }
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };

    el.addEventListener("scroll", measure, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      el.removeEventListener("wheel", onWheel);
      ro?.disconnect();
    };
  }, [measure, children]);

  function onPointerDown(e) {
    if (e.button !== 0 || e.target.closest("a, button, [role='menu']")) return;
    drag.current = { x: e.clientX, left: ref.current.scrollLeft, moved: false };
  }
  function onPointerMove(e) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    if (Math.abs(dx) > 3) drag.current.moved = true;
    ref.current.scrollLeft = drag.current.left - dx;
  }
  function endDrag() {
    drag.current = null;
  }

  const nudge = (dir) => ref.current?.scrollBy({ left: dir * Math.round(ref.current.clientWidth * 0.8), behavior: "smooth" });
  const hasOverflow = !(edges.atStart && edges.atEnd);

  return (
    <div className="relative mt-4">
      {hasOverflow && (
        <div className="mb-1.5 flex justify-end gap-1">
          <button
            type="button"
            onClick={() => nudge(-1)}
            disabled={edges.atStart}
            aria-label="Scroll stages left"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#D9E4DB] bg-white text-[#445249] transition-colors hover:bg-[#EDF4EE] disabled:opacity-40 disabled:hover:bg-white"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            disabled={edges.atEnd}
            aria-label="Scroll stages right"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#D9E4DB] bg-white text-[#445249] transition-colors hover:bg-[#EDF4EE] disabled:opacity-40 disabled:hover:bg-white"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
      <div
        ref={ref}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        className={`overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          hasOverflow ? "cursor-grab select-none active:cursor-grabbing" : ""
        }`}
      >
        {children}
      </div>
      {/* Edge fades — a visual cue that there is more board past the edge. */}
      {!edges.atStart && (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[#F3F8EF] to-transparent" aria-hidden="true" />
      )}
      {!edges.atEnd && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[#F3F8EF] to-transparent" aria-hidden="true" />
      )}
    </div>
  );
}

// ─── Stage column ─────────────────────────────────────────────────────────────
// No bg fill on column — columns are transparent inside the outer light-green card
function StageColumn({ stage, candidates, onMove, busyId, stretch }) {
  const terminal = stage === REJECTED;

  return (
    <section
      className={`flex w-[236px] min-w-[236px] flex-col sm:w-[248px] sm:min-w-[248px] ${
        stretch ? "xl:w-auto xl:min-w-0 xl:flex-1" : ""
      }`}
    >
      {/* Header: label left, count right */}
      <div className="flex items-center gap-2 pb-2">
        <h2 className={`text-[12px] font-bold ${terminal ? "text-[#C95C5C]" : "text-[#17221C]"}`}>
          {stageLabel(stage)}
        </h2>
        <span className="ml-auto rounded bg-[#E8EEE9] px-1.5 py-0.5 text-[9px] font-semibold leading-4 text-[#64736A]">
          {candidates.length}
        </span>
      </div>

      {/* Cards list */}
      <div
        data-col-scroll
        className="flex max-h-[56vh] flex-col gap-1.5 overflow-y-auto overscroll-contain pb-1 pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
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
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HiringPipeline() {
  const { allCandidates, jobs, loading, refresh } = useCompanyData();
  const toast  = useToast();
  const [busyId,     setBusyId]     = useState(null);
  const [showEmpty,  setShowEmpty]  = useState(false);

  // What actually belongs on the board: applications still moving through a live
  // role. Excludes
  //   • `pipelineExit` — left the pipeline without a reject decision (hired for
  //     another role here, or the role was filled / closed / deleted), and
  //   • orphans with no `job` — a role deleted before the release logic existed;
  //     nothing about them can be actioned from here.
  const boardCandidates = useMemo(
    () => allCandidates.filter((c) => !c.pipelineExit?.at && c.job),
    [allCandidates]
  );

  const columns = useMemo(() => {
    const grouped = Object.fromEntries(ALL_STAGES.map((s) => [s, []]));
    for (const c of boardCandidates) {
      const stage = normalizeStage(c.status);
      if (grouped[stage]) grouped[stage].push(c);
    }
    return grouped;
  }, [boardCandidates]);

  const kpiStats = useMemo(() => {
    // Stage keys must match utils/pipeline.js exactly — the previous set held
    // names that don't exist ("interview_completed", "screening_passed",
    // "hired"), so "Hired" was permanently 0 and the others undercounted.
    const interviewStages = new Set([
      "interview_scheduled", "ai_interview_completed",
      "hr_interview", "technical_interview", "manager_interview",
    ]);
    const shortlistStages = new Set([
      "shortlisted", "selected", "offer_sent", "offer_accepted",
    ]);
    const stageOf = (c) => normalizeStage(c.status);
    // One person applying to several roles is one candidate, not several.
    const uniquePeople = new Set(
      allCandidates.map((c) => String(c.candidateUser || c.basicDetails?.email?.toLowerCase() || c._id))
    ).size;
    return [
      { label: "Open roles",  value: jobs?.filter((job) => job.status === "published").length ?? 0 },
      { label: "Candidates",  value: uniquePeople },
      { label: "Interviews",  value: boardCandidates.filter((c) => interviewStages.has(stageOf(c))).length },
      { label: "Shortlisted", value: boardCandidates.filter((c) => shortlistStages.has(stageOf(c))).length },
      { label: "Hired",       value: allCandidates.filter((c) => stageOf(c) === "joined").length },
    ];
  }, [allCandidates, boardCandidates, jobs]);

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
        <div className="overflow-hidden rounded-2xl border border-[#D7E5D5] bg-[#F3F8EF] p-3">
          {/* KPI skeleton */}
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-[#D9E4DB] bg-white divide-x divide-y divide-[#D9E4DB] sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-4">
                <Skeleton className="h-3 w-20 bg-[#E5EBE7]" />
                <Skeleton className="mt-2 h-8 w-12 bg-[#E5EBE7]" />
                <Skeleton className="mt-1 h-3 w-16 bg-[#E5EBE7]" />
              </div>
            ))}
          </div>
          {/* Columns skeleton */}
          <div className="mt-4 flex gap-2">
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
        <div className="overflow-hidden rounded-2xl border border-[#D7E5D5] bg-[#F3F8EF] p-10">
          <EmptyState
            icon={KanbanSquare}
            title="No candidates yet"
            description="Applicants appear here once they apply and flow through the pipeline as you move them."
          />
        </div>

      ) : (
        /* ── ONE big outer card — light green bg ─────────────── */
        <div className="overflow-hidden rounded-2xl border border-[#D7E5D5] bg-[#F3F8EF] p-3 shadow-[0_16px_40px_rgba(23,34,28,0.04)]">

          {/* ── KPI row ────────────────────────────────────────── */}
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-[#D9E4DB] bg-white divide-x divide-y divide-[#D9E4DB] sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
            {kpiStats.map((s) => (
              <div key={s.label} className="px-3.5 py-2.5 sm:px-4">
                <p className="text-[10px] font-semibold text-[#445249]">{s.label}</p>
                <p className="mt-1 font-display text-[1.5rem] font-bold leading-none tracking-tight text-[#111]">
                  {s.value}
                </p>
                <p className="mt-1.5 flex items-center gap-0.5 text-[9px] text-[#64736A]">
                  <Clock className="h-2.5 w-2.5 shrink-0" aria-hidden />
                  Updated now
                </p>
              </div>
            ))}
          </div>

          {/* ── Kanban columns ─────────────────────────────────── */}
          <KanbanScroller>
            <div className="flex min-w-max gap-2 xl:min-w-full">
              {visibleStages.map((stage) => (
                <StageColumn
                  key={stage}
                  stage={stage}
                  candidates={columns[stage]}
                  onMove={handleMove}
                  busyId={busyId}
                  stretch={visibleStages.length <= 5}
                />
              ))}
            </div>
          </KanbanScroller>

        </div>
      )}
    </div>
  );
}
