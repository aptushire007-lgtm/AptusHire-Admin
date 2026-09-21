import { useState, useEffect, useMemo, useCallback } from "react";
import CandidateLink from "../../components/candidate/CandidateLink.jsx";
import CandidateDrawer from "../../components/candidate/CandidateDrawer.jsx";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../api/client.js";
import {
  Users,
  Search,
  AlertTriangle,
  Download,
  Plus,
  MoreVertical,
  Calendar,
  ExternalLink,
  MessageSquare,
  X,
  LayoutGrid,
  Rows3,
  Sparkles,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Briefcase,
  Mail,
  RefreshCw,
} from "lucide-react";
import Modal from "../../components/ui/Modal.jsx";
import { Card, Badge, Skeleton, EmptyState } from "../../components/ui/Card.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Button from "../../components/ui/Button.jsx";
import ActionMenu, { MenuItem, MenuSeparator } from "../../components/ui/Menu.jsx";
import { TableWrap, Table, THead, TBody, TR, TH, TD } from "../../components/ui/DataTable.jsx";
import { useToast } from "../../components/ui/Toast.jsx";
import { ALL_STAGES, stageLabel, stageTone, normalizeStage, allowedNextStages } from "../../lib/pipeline.js";
import { scoreOf, scoreCaveat } from "../../lib/pipelineMetrics.js";

// Why an application left the active pipeline without a reject decision (Phase 17).
const PIPELINE_EXIT_LABELS = {
  hired_for_other_role: "Hired elsewhere",
  job_filled: "Role filled",
  job_closed: "Role closed",
  job_deleted: "Role deleted",
};

function LinkedInIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.2a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24Z" />
    </svg>
  );
}

/**
 * Applications received in the last 30 days against the 30 before it.
 *
 * `null` is the honest answer for a workspace with no prior period to compare
 * against — the endpoint returns it rather than a percentage, and this renders
 * "New period" rather than a movement nothing measured. The arrow follows the
 * sign; it is never hardcoded up.
 */
function DeltaChip({ value }) {
  if (value == null)
    return (
      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
        New period
      </span>
    );
  const up = value > 0;
  const tone = value === 0 ? "text-slate-600 bg-slate-100" : up ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50";
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded ${tone}`}>
      {value !== 0 && <Icon className="w-3 h-3" aria-hidden="true" />}
      {up ? "+" : ""}
      {value}%<span className="sr-only"> versus the previous 30 days</span>
    </span>
  );
}

/**
 * One KPI tile.
 *
 * A `null` value means the count has not arrived, and renders as a skeleton —
 * not as 0, and not as a stand-in figure. The tile has no way to produce a
 * number on its own, which is the point: every digit on this strip came from
 * the server or it is not on screen.
 */
function KpiTile({ label, value, note, noteClass = "text-slate-400", chip, failed }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-elevation-card">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        {!failed && chip}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900">
          {failed ? (
            <span title="Could not load this figure">—</span>
          ) : value == null ? (
            <Skeleton className="h-7 w-12 inline-block align-middle" />
          ) : (
            value.toLocaleString()
          )}
        </span>
        <span className={`text-xs ${noteClass}`}>{failed ? "Unavailable" : note}</span>
      </div>
    </div>
  );
}

const AVATAR_COLOR_STYLES = [
  "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300/60",
  "bg-indigo-100 text-indigo-800",
  "bg-rose-100 text-rose-800",
  "bg-cyan-100 text-cyan-800",
  "bg-purple-100 text-purple-800",
];

export default function CandidatesAll() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") || "";
  const selectedCandidateId = searchParams.get("candidateId");
  const reportCohort = {
    reached: searchParams.get("reached"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  };
  const historical = Boolean(reportCohort.reached);
  const stageFilter = ALL_STAGES.includes(normalizeStage(searchParams.get("stage")))
    ? normalizeStage(searchParams.get("stage"))
    : "all";
  const jobFilter = searchParams.get("job") || "all";
  const sortBy = searchParams.get("sort") || "ai_match";
  const pageValue = Number(searchParams.get("page") || 1);
  const page = Number.isFinite(pageValue) ? Math.min(1e6, Math.max(1, Math.floor(pageValue))) : 1;

  const setFilter = (key, value) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value && value !== "all") next.set(key, value);
        else next.delete(key);
        next.delete("page");
        return next;
      },
      { replace: true }
    );

  const setPage = (value) =>
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("page", String(value));
      return next;
    });

  const setSearch = (value) => setFilter("q", value);
  const setStageFilter = (value) => setFilter("stage", value);
  const setJobFilter = (value) => setFilter("job", value);
  const setSortBy = (value) => setFilter("sort", value);
  const clearFilters = () => setSearchParams({});

  const closeDrawer = () =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete("candidateId");
        next.delete("tab");
        return next;
      },
      { replace: true }
    );

  const selectCandidate = (id, tab = "summary") =>
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (id) {
        next.set("candidateId", id);
        if (tab && tab !== "summary") next.set("tab", tab);
        else next.delete("tab");
      } else {
        next.delete("candidateId");
        next.delete("tab");
      }
      return next;
    });

  const setTab = (tab) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (tab && tab !== "summary") next.set("tab", tab);
        else next.delete("tab");
        return next;
      },
      { replace: true }
    );

  const [density, setDensity] = useState("comfortable");
  const [attempt, setAttempt] = useState(0);
  const refresh = () => setAttempt((value) => value + 1);
  const [result, setResult] = useState({ items: [], total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const toast = useToast();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError("");
    const timer = setTimeout(() => {
      api
        .get("/candidates", {
          params: {
            page,
            limit: 50,
            q: search,
            stage: stageFilter,
            ...(jobFilter && jobFilter !== "all" ? { jobId: jobFilter } : {}),
            ...(historical
              ? {
                  reached: reportCohort.reached,
                  from: reportCohort.from || undefined,
                  to: reportCohort.to || undefined,
                }
              : { groupBy: "candidate" }),
          },
        })
        .then(({ data }) => {
          if (alive) setResult(data);
        })
        .catch((error) => {
          if (alive)
            setLoadError(
              error.response?.data?.error || "Could not load candidates. Please retry."
            );
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [
    page,
    search,
    stageFilter,
    jobFilter,
    historical,
    reportCohort.reached,
    reportCohort.from,
    reportCohort.to,
    attempt,
  ]);

  const rawGroups = result.items.map((row) =>
    historical
      ? { key: row._id, latest: row, applications: [row] }
      : {
          key: row.latestApplication?._id,
          applications: row.applications || [],
          latest: {
            ...row.latestApplication,
            createdAt: row.latestApplication?.appliedAt || row.createdAt,
            basicDetails: { name: row.name, email: row.email },
            ats: row.latestAts,
          },
        }
  );

  // Client-side sort options for display
  const groups = useMemo(() => {
    const list = [...rawGroups];
    if (sortBy === "ai_match") {
      return list.sort((a, b) => (scoreOf(b.latest) || 0) - (scoreOf(a.latest) || 0));
    }
    if (sortBy === "newest") {
      return list.sort(
        (a, b) =>
          new Date(b.latest?.createdAt || 0).getTime() -
          new Date(a.latest?.createdAt || 0).getTime()
      );
    }
    if (sortBy === "oldest") {
      return list.sort(
        (a, b) =>
          new Date(a.latest?.createdAt || 0).getTime() -
          new Date(b.latest?.createdAt || 0).getTime()
      );
    }
    if (sortBy === "name") {
      return list.sort((a, b) =>
        (a.latest?.basicDetails?.name || "").localeCompare(
          b.latest?.basicDetails?.name || ""
        )
      );
    }
    return list;
  }, [rawGroups, sortBy]);

  // The role filter lists the WORKSPACE's roles, not the roles that happen to
  // appear on the loaded page. Deriving them from `groups` meant the options
  // were a function of the current 50 rows, so a role whose candidates sat on
  // page 3 could not be selected at all — and selecting a role then removed the
  // option you had just picked, because the narrowed page no longer contained
  // the others.
  //
  // Fetched here rather than read from <CompanyDataProvider>: this page is
  // mounted on its own in tests and in the candidate deep-links, and reaching
  // for the shell's context would make it un-mountable outside the shell (the
  // hook throws by design) as well as pulling the notification socket into
  // every page that imports it. One small GET keeps the page self-contained.
  const [jobs, setJobs] = useState([]);
  useEffect(() => {
    let alive = true;
    api
      .get("/jobs")
      .then(({ data }) => {
        if (!alive || !Array.isArray(data)) return;
        setJobs(data.map((j) => ({ _id: j._id, title: j.title })));
      })
      .catch(() => {
        // A missing role list degrades the filter to "All roles"; it must never
        // take down the candidate list, which is the actual content here.
      });
    return () => {
      alive = false;
    };
  }, []);

  // Selected candidate record for bottom inspection card
  const selectedCandidate = useMemo(() => {
    if (!selectedCandidateId) return null;
    const found = groups.find((g) => g.latest?._id === selectedCandidateId);
    return found?.latest || null;
  }, [selectedCandidateId, groups]);


  // Workspace-wide application counts for the KPI tiles and the filter chips.
  //
  // These CANNOT come from `groups`: that array is one page of 50, already
  // narrowed by the active stage/job/search filters, so counting it would
  // describe the current view while the tile claims to describe the workspace —
  // and the "Shortlisted" chip would report 0 the moment you filtered to
  // "Rejected". `/candidates/dashboard-summary` counts every application server
  // side, in one bounded aggregate, which is the same source the Today page
  // uses. Until it lands `summary` is null and every figure renders as a
  // skeleton, never as a number.
  const [summary, setSummary] = useState(null);
  const [summaryFailed, setSummaryFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get("/candidates/dashboard-summary")
      .then(({ data }) => {
        if (alive) {
          setSummary(data);
          setSummaryFailed(false);
        }
      })
      .catch(() => {
        if (alive) {
          setSummary(null);
          setSummaryFailed(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  // Sum of the stages a candidate can only be sitting in AFTER the named event,
  // so "AI Evaluated" counts someone now at Technical Interview — they were
  // evaluated, they just moved on. Stages absent from the map are genuinely
  // zero: the endpoint returns every active stage, not a truncated top-N.
  const sumStages = useCallback(
    (names) => {
      if (!summary?.stageCounts) return null;
      return names.reduce((sum, name) => sum + (summary.stageCounts[name] || 0), 0);
    },
    [summary]
  );

  const kpiMetrics = useMemo(
    () => ({
      total: summary ? summary.total : null,
      // Past screening, not yet interviewed — the queue this page exists to work.
      screening: sumStages(["ats_passed", "assessment_scheduled", "assessment_completed", "interview_scheduled", "under_review"]),
      interviewCompleted: sumStages([
        "ai_interview_completed",
        "under_review",
        "shortlisted",
        "hr_interview",
        "technical_interview",
        "manager_interview",
        "selected",
        "offer_sent",
        "offer_accepted",
        "joined",
      ]),
      shortlisted: summary ? summary.shortlisted : null,
      // Null until there is a prior period to compare against, so the tile can
      // say "New period" instead of inventing a movement.
      delta: summary ? summary.applicantDelta : null,
    }),
    [summary, sumStages]
  );

  // Stage counts for the quick filter chips. Same workspace-wide source as the
  // KPI tiles, and for the same reason: a chip saying how many candidates are
  // behind a filter has to count them all, not just the ones already on screen.
  // Null means "not loaded yet" and renders as nothing — a chip never shows a
  // count it did not receive.
  const stageCounts = useMemo(
    () => ({
      all: summary ? summary.total : null,
      shortlisted: sumStages(["shortlisted"]),
      interview_completed: sumStages(["ai_interview_completed"]),
      ats_passed: sumStages(["ats_passed"]),
      rejected: sumStages(["rejected"]),
    }),
    [summary, sumStages]
  );

  // CSV Export handler
  const exportCandidatesCSV = useCallback(() => {
    if (!groups.length) {
      toast.error("No candidates to export");
      return;
    }
    const headers = [
      "Candidate Name",
      "Email",
      "Job Title",
      "Stage",
      "CV Score",
      "Evaluation Engine",
      "Applied Date",
    ];
    const rows = groups.map(({ latest: c }) => [
      `"${(c.basicDetails?.name || "").replace(/"/g, '""')}"`,
      `"${(c.basicDetails?.email || "").replace(/"/g, '""')}"`,
      `"${(c.job?.title || "").replace(/"/g, '""')}"`,
      `"${c.status || ""}"`,
      scoreOf(c) ?? "",
      `"${c.ats?.engine || ""}"`,
      `"${c.createdAt || ""}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `candidates_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Candidates exported to CSV");
  }, [groups, toast]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <PageHeader
        title="Talent Pool"
        description="Every person who has ever applied to this company — one row per person, not per application. To work a single role's board, open that job's pipeline."
        action={
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCandidatesCSV}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300/80 rounded-lg shadow-elevation-low hover:bg-slate-50 transition-all flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-slate-500" /> Export CSV
            </Button>
            <Button
              as={Link}
              to="/jobs"
              size="sm"
              className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm shadow-emerald-900/30 transition-all flex items-center gap-2"
            >
              {/* Candidates arrive by applying to a published job — there is no
                  "add candidate" form to send anyone to, so the label names
                  where this actually goes. */}
              <Plus className="w-4 h-4" aria-hidden="true" /> Post a job
            </Button>
          </div>
        }
      />

      {/* ── PipelineMetricsQuickBar (Level 2 Elevated KPI Cards) ───────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4" data-purpose="pipeline-metrics">
        <KpiTile
          label="Total Candidates"
          value={kpiMetrics.total}
          failed={summaryFailed}
          note="All applications on record"
          chip={<DeltaChip value={kpiMetrics.delta} />}
        />
        <KpiTile
          label="In Screening"
          value={kpiMetrics.screening}
          failed={summaryFailed}
          note="Past screening, awaiting an interview"
          chip={
            <span className="text-[11px] font-semibold text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded">
              Active Stage
            </span>
          }
        />
        <KpiTile
          label="AI Evaluated"
          value={kpiMetrics.interviewCompleted}
          failed={summaryFailed}
          note="Completed an AI interview"
          chip={
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
              Scored
            </span>
          }
        />
        <KpiTile
          label="Shortlisted"
          value={kpiMetrics.shortlisted}
          failed={summaryFailed}
          note="At shortlist stage"
          noteClass="text-emerald-600 font-medium"
          chip={
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              Shortlist
            </span>
          }
        />
      </section>

      {/* ── SearchFilterStageControls (Unified Search, Segmented Tabs & Filters) ── */}
      <section className="space-y-3" data-purpose="table-controls">
        {/* Row 1: Search, Requisitions, Stages, Sort, View */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-3">
          {/* Text Query Search */}
          <div className="relative flex-1 min-w-[260px]">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              aria-label="Search candidates"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate by name, email, or key skills..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200/90 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-elevation-low"
            />
          </div>

          {/* Job Requisition Filter */}
          <div className="relative w-full sm:w-52">
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              aria-label="Filter by job requisition"
              className="w-full py-2 pl-3 pr-8 text-xs font-medium bg-white border border-slate-200/90 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-elevation-low appearance-none cursor-pointer"
            >
              <option value="all">All Jobs / Requisitions</option>
              {jobs.map((j) => (
                <option key={j._id} value={j._id}>
                  {j.title}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Stage Status Dropdown */}
          <div className="relative w-full sm:w-44">
            <select
              aria-label="Candidate stage"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-full py-2 pl-3 pr-8 text-xs font-medium bg-white border border-slate-200/90 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-elevation-low appearance-none cursor-pointer"
            >
              <option value="all">All Stages</option>
              {ALL_STAGES.map((s) => (
                <option key={s} value={s}>
                  {stageLabel(s)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Match Score Sorting */}
          <div className="relative w-full sm:w-48">
            <select
              aria-label="Sort candidates"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full py-2 pl-3 pr-8 text-xs font-medium bg-white border border-slate-200/90 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-elevation-low appearance-none cursor-pointer"
            >
              <option value="ai_match">Sort: Highest AI Match</option>
              <option value="newest">Sort: Newest Applied</option>
              <option value="oldest">Sort: Oldest Applied</option>
              <option value="name">Sort: Name (A–Z)</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Table / Kanban View Toggle */}
          <div className="flex items-center border border-slate-200/90 bg-white p-0.5 rounded-lg shadow-elevation-low shrink-0">
            {/* The kanban button used to have no onClick — it rendered as a
                live toggle and did nothing when pressed. A company-wide talent
                pool has no single board to switch into (a person here may sit
                in three different roles' pipelines at once), so the honest
                affordance is a link to the pipeline, not a view toggle. */}
            <span
              className="p-1.5 rounded bg-slate-100 text-slate-800"
              title="Table view"
              aria-current="true"
            >
              <Rows3 className="w-4 h-4" aria-hidden="true" />
            </span>
            <Link
              to={jobFilter && jobFilter !== "all" ? `/jobs/${jobFilter}/pipeline` : "/pipeline"}
              className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
              title={
                jobFilter && jobFilter !== "all"
                  ? "Open this role's pipeline board"
                  : "Open the pipeline board"
              }
            >
              <LayoutGrid className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only">Open pipeline board</span>
            </Link>
          </div>
        </div>

        {/* Segmented Filter Tabs & Density */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium [scrollbar-width:none]">
            {[
              {
                id: "all",
                label: "All candidates",
                count: stageCounts.all,
                badgeClass: (active) =>
                  active ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600",
              },
              {
                id: "shortlisted",
                label: "Shortlisted",
                count: stageCounts.shortlisted,
                badgeClass: () => "bg-emerald-100 text-emerald-800 font-bold",
              },
              {
                id: "ai_interview_completed",
                label: "Interview completed",
                count: stageCounts.interview_completed,
                badgeClass: () => "bg-indigo-100 text-indigo-800 font-bold",
              },
              {
                id: "ats_passed",
                label: "Currently ATS passed",
                count: stageCounts.ats_passed,
                badgeClass: () => "bg-cyan-100 text-cyan-800 font-bold",
              },
              {
                id: "rejected",
                label: "Rejected",
                count: stageCounts.rejected,
                badgeClass: () => "bg-rose-100 text-rose-800 font-bold",
              },
            ].map(({ id, label, count, badgeClass }) => {
              const active = stageFilter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStageFilter(id)}
                  className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    active
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                  {/* No count until the server has sent one. The chip is still
                      usable as a filter while it loads — it just does not claim
                      a number. */}
                  {count != null && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${badgeClass(active)}`}>
                      {count.toLocaleString()}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {(search || stageFilter !== "all" || jobFilter !== "all" || historical) && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline"
              >
                <X className="h-3 w-3" /> Clear filters
              </button>
            )}

            <div className="hidden xl:flex items-center gap-2 text-xs text-slate-500">
              <span>Row spacing:</span>
              <select
                aria-label="Candidate row spacing"
                value={density}
                onChange={(e) => setDensity(e.target.value)}
                className="py-1 pl-2 pr-6 text-xs bg-transparent border-none text-slate-700 font-semibold focus:ring-0 cursor-pointer"
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {historical && (
        <p className="text-xs text-slate-600">
          Applications that reached {stageLabel(reportCohort.reached)} in the report cohort.
          Current stages are shown below.
        </p>
      )}

      {/* ── Main Candidates Table ─────────────────────────────────────────── */}
      {loading ? (
        <Card padding="none" className="divide-y divide-slate-100 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-4 py-3">
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </Card>
      ) : loadError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Could not load candidates"
          description={loadError}
          action={
            <button
              type="button"
              onClick={refresh}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
            >
              Retry candidates
            </button>
          }
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No candidates on this page"
          description="Clear filters or return to the previous page to find applications."
          action={
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-hairline px-3 py-2 text-sm font-medium"
            >
              View all candidates
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {/* Sub-header caption */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500">
            <span className="font-semibold tracking-wide text-slate-600">
              Candidates Database • {result.total} matching{" "}
              {historical ? "applications" : "candidate records"}
            </span>
            <span className="text-[11px] text-slate-400">
              Showing{" "}
              <span className="num font-medium text-slate-700">
                {groups.length > 0 ? (page - 1) * 50 + 1 : 0}-
                {Math.min(result.total, page * 50)}
              </span>{" "}
              of <span className="num font-medium text-slate-700">{result.total}</span>
            </span>
          </div>

          {/* Table Container */}
          <div className="w-full bg-white rounded-xl border border-slate-200/80 shadow-elevation-card overflow-hidden">
            <TableWrap label="Candidate records">
              <Table density={density} className="min-w-[920px] text-xs text-left" aria-label="All candidates">
                <THead>
                  <TR className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <TH padding="compact">CANDIDATE</TH>
                    <TH padding="compact">LATEST APPLICATION</TH>
                    <TH padding="compact">STAGE</TH>
                    <TH padding="compact">CV SCREENING</TH>
                    <TH padding="compact">APPLIED</TH>
                    <TH padding="compact" align="right">
                      ACTIONS
                    </TH>
                  </TR>
                </THead>
                <TBody className="divide-y divide-slate-100 font-normal">
                  {groups.map(({ key, latest: c, applications }, idx) => {
                    const isSelected = selectedCandidateId === c._id;
                    const score = scoreOf(c);
                    const caveat = scoreCaveat(c);
                    const exitLabel = c.pipelineExit?.at
                      ? PIPELINE_EXIT_LABELS[c.pipelineExit.reason] || "Left pipeline"
                      : null;
                    const rawName = c.basicDetails?.name || "Unnamed applicant";
                    const initials = rawName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <TR
                        key={key}
                        onClick={() => selectCandidate(c._id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-emerald-50/40 hover:bg-emerald-50/70 border-l-4 border-l-emerald-600"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        {/* Candidate Column */}
                        <TD padding="compact" className="py-3 px-4 min-w-64">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                                isSelected
                                  ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300/60"
                                  : AVATAR_COLOR_STYLES[idx % AVATAR_COLOR_STYLES.length]
                              }`}
                            >
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                                <CandidateLink
                                  asDrawer
                                  candidateId={c._id}
                                  reviewIds={groups.map((item) => item.latest._id)}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    selectCandidate(c._id, "summary");
                                  }}
                                  className="font-bold text-slate-900 uppercase tracking-tight hover:text-emerald-700 text-xs sm:text-sm"
                                >
                                  {rawName}
                                </CandidateLink>
                                {isSelected && (
                                  <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-medium">
                                    Selected
                                  </span>
                                )}
                              </div>
                              <div
                                className="text-[11px] text-slate-500 truncate"
                                title={c.basicDetails?.email}
                              >
                                {c.basicDetails?.email || ""}
                              </div>
                            </div>
                          </div>
                        </TD>

                        {/* Latest Application Column */}
                        <TD padding="compact" className="py-3 px-3 min-w-48">
                          {c.job?.title ? (
                            <>
                              <span className="font-semibold text-slate-800">{c.job.title}</span>
                              <span className="block text-[11px] text-slate-400">
                                {c.job?.department || "Platform Core"}
                              </span>
                            </>
                          ) : historical ? (
                            <>
                              <span className="font-semibold text-slate-800">Historic application</span>
                              <span className="block text-[11px] text-slate-400">Platform Core</span>
                            </>
                          ) : (
                            <span className="text-slate-400 italic">No job on record</span>
                          )}
                          {applications.length > 1 && (
                            <span className="block text-[11px] text-slate-400 mt-0.5">
                              {applications.length} applications
                            </span>
                          )}
                        </TD>

                        {/* Stage Column */}
                        <TD padding="compact" className="py-3 px-3">
                          {exitLabel ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {exitLabel}
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                c.status === "shortlisted"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                  : c.status === "ai_interview_completed" ||
                                    c.status === "hr_interview" ||
                                    c.status === "technical_interview" ||
                                    c.status === "manager_interview"
                                  ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                                  : c.status === "ats_passed" || c.status === "passed"
                                  ? "bg-cyan-100 text-cyan-800 border border-cyan-200"
                                  : c.status === "rejected"
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : "bg-amber-100 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {stageLabel(c.status)}
                            </span>
                          )}
                        </TD>

                        {/* CV Screening Column */}
                        <TD padding="compact" className="py-3 px-3 min-w-44">
                          {score != null ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold text-[11px] ${
                                  score >= 80
                                    ? "bg-emerald-100 text-emerald-800"
                                    : score >= 60
                                    ? "bg-emerald-100 text-emerald-800 font-semibold"
                                    : "bg-amber-100 text-amber-800 font-semibold"
                                }`}
                              >
                                {score}%
                              </span>
                              <span className="text-[11px] text-slate-600 font-medium truncate">
                                {score >= 90
                                  ? "Autonomous verified"
                                  : c.ats?.engine === "evidence" || score >= 60
                                  ? "Evidence engine"
                                  : "Keyword match"}
                              </span>
                            </div>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold text-[11px]">
                              Not scored
                            </span>
                          )}
                          {caveat && (
                            <p className="mt-0.5 text-[11px] text-amber-700 font-medium">{caveat}</p>
                          )}
                        </TD>

                        {/* Applied Date Column */}
                        <TD padding="compact" className="py-3 px-3 text-slate-500 whitespace-nowrap text-xs">
                          {c.createdAt && Number.isFinite(new Date(c.createdAt).getTime())
                            ? new Date(c.createdAt).toLocaleDateString()
                            : "9/8/2026"}
                        </TD>

                        {/* Actions Column */}
                        <TD padding="compact" align="right" onClick={(e) => e.stopPropagation()}>
                          <ActionMenu
                            label={`Actions for ${rawName}`}
                            trigger={
                              <button
                                type="button"
                                aria-label={`More actions for ${rawName}`}
                                className="p-1 rounded hover:bg-slate-200/70 text-slate-600 transition-colors"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            }
                          >
                            <MenuItem onSelect={() => selectCandidate(c._id, "summary")}>
                              Inspect Candidate
                            </MenuItem>
                            <MenuItem onSelect={() => selectCandidate(c._id, "profile-cv")}>
                              Open Full Profile
                            </MenuItem>
                            <MenuItem onSelect={() => selectCandidate(c._id, "ai-interview")}>
                              Full Interview Report
                            </MenuItem>
                            <MenuItem onSelect={() => selectCandidate(c._id, "assessments")}>
                              Assessments
                            </MenuItem>
                            <MenuItem onSelect={() => selectCandidate(c._id, "activity")}>
                              Activity & Notes
                            </MenuItem>
                            <MenuSeparator />
                            <MenuItem
                              onSelect={() => {
                                navigator.clipboard.writeText(
                                  `${window.location.origin}/candidates/${c._id}`
                                );
                                toast.success("Candidate link copied");
                              }}
                            >
                              Copy Candidate Link
                            </MenuItem>
                          </ActionMenu>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </TableWrap>

            {/* Pagination Bar matching HTML Prototype */}
            <div className="px-5 py-3 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
              <span>{result.total} Total Candidates Found</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, Math.max(1, result.pages || 1)) }, (_, i) => {
                  const pageNum = i + 1;
                  const isCurrent = page === pageNum;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setPage(pageNum)}
                      className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                        isCurrent
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={page >= (result.pages || 1)}
                  onClick={() => setPage(page + 1)}
                  className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Candidate Inspection Modal (~80% viewport, centered, 6 segregated tabs) ── */}
      <CandidateDrawer
        candidateId={selectedCandidateId}
        reviewIds={groups.map((item) => item.latest?._id || item.key).filter(Boolean)}
        initialTab={searchParams.get("tab") || "summary"}
        onClose={closeDrawer}
        onSelectCandidate={(id) => selectCandidate(id, searchParams.get("tab") || "summary")}
        onCandidateUpdated={refresh}
        onTabChange={(tab) => setTab(tab)}
      />
    </div>
  );
}
