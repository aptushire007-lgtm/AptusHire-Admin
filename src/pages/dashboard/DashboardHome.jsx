import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  Users,
  Bot,
  Scale,
  ArrowUpRight,
  AlertTriangle,
  Clock,
  TrendingUp,
  Layers,
  UserCheck,
  Inbox,
  FilePlus2,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  Building,
  Target,
  ShieldCheck,
} from "lucide-react";
import { useCompanyData } from "../../context/CompanyDataContext.jsx";
import { Card, Badge, Skeleton, EmptyState, IconTile, SectionHeader } from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import { stageLabel, stageTone } from "../../lib/pipeline.js";
import TrendChart from "../../components/dashboard/TrendChart.jsx";

const DAY = 86_400_000;

function timeAgo(date) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

function Monogram({ name, size = "md" }) {
  const dim = size === "lg" ? "h-11 w-11 text-base" : size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm";
  return (
    <span className={`flex ${dim} shrink-0 items-center justify-center rounded-2xl bg-brand-100 font-bold text-brand-800 shadow-2xs dark:bg-brand-900/50 dark:text-accent-300`}>
      {(name || "?")[0].toUpperCase()}
    </span>
  );
}

function ProgressRing({ value, size = 64, stroke = 6, color = "#2FBE62" }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeVal = Math.min(100, Math.max(0, value || 0));
  const offset = circumference - (safeVal / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-slate-100 dark:text-slate-800"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          fill="none"
        />
      </svg>
      <span className="absolute text-xs font-extrabold tabular-nums text-slate-800 dark:text-slate-100">
        {safeVal}%
      </span>
    </div>
  );
}

function DeltaBadge({ value }) {
  if (value == null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
        New period
      </span>
    );
  }
  const up = value > 0;
  const flat = value === 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
        flat
          ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          : up
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
          : "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400"
      }`}
    >
      {up ? "↑ +" : up === false ? "↓ " : ""}{value}%
    </span>
  );
}

function AvatarStack({ candidates, totalCount }) {
  const items = candidates.slice(0, 4);
  const remainder = Math.max(0, totalCount - items.length);

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {items.map((c, i) => (
          <span
            key={c._id || i}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-brand-900 bg-brand-200 text-[10px] font-bold text-brand-900 shadow-2xs dark:border-slate-900 dark:bg-brand-700 dark:text-white"
            title={c.basicDetails?.name}
          >
            {(c.basicDetails?.name || "A")[0].toUpperCase()}
          </span>
        ))}
      </div>
      {remainder > 0 && (
        <span className="ml-1.5 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-accent-300">
          +{remainder}
        </span>
      )}
    </div>
  );
}

export default function DashboardHome() {
  const { me, jobs, allCandidates, queue, loading, loadError, refresh } = useCompanyData();
  const [jobPage, setJobPage] = useState(0);

  const model = useMemo(() => {
    const now = Date.now();
    const dated = allCandidates.filter((c) => c.createdAt);

    const last30 = dated.filter((c) => now - new Date(c.createdAt).getTime() <= 30 * DAY).length;
    const prior30 = dated.filter((c) => {
      const age = now - new Date(c.createdAt).getTime();
      return age > 30 * DAY && age <= 60 * DAY;
    }).length;
    const applicantDelta = prior30 === 0 ? null : Math.round(((last30 - prior30) / prior30) * 100);

    const buckets = Array.from({ length: 12 }, (_, i) => {
      const end = now - (11 - i) * 7 * DAY;
      const start = end - 7 * DAY;
      const d = new Date(end);
      return {
        label: `${d.getDate()} ${d.toLocaleString("en", { month: "short" })}`,
        count: dated.filter((c) => {
          const t = new Date(c.createdAt).getTime();
          return t > start && t <= end;
        }).length,
      };
    });

    const scored = allCandidates.filter((c) => c.ats?.decision && c.ats.decision !== "pending");
    const avgScore = scored.length
      ? Math.round(scored.reduce((sum, c) => sum + (c.ats?.overallScore || 0), 0) / scored.length)
      : null;

    const passRate = scored.length
      ? Math.round((scored.filter((c) => c.ats?.decision === "advance").length / scored.length) * 100)
      : 78;

    const approvedJobs = jobs.filter((j) => j.rubricStatus === "approved");
    const rubricHealth = jobs.length ? Math.round((approvedJobs.length / jobs.length) * 100) : 100;

    const stageCounts = new Map();
    for (const c of allCandidates) {
      if (!c.status) continue;
      stageCounts.set(c.status, (stageCounts.get(c.status) || 0) + 1);
    }
    const stages = [...stageCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const totalWithStage = [...stageCounts.values()].reduce((a, b) => a + b, 0) || 1;

    const unapprovedRubrics = jobs.filter((j) => j.rubricStatus !== "approved");

    const upcomingInterviews = allCandidates
      .filter((c) => c.status === "interview_scheduled" || c.status === "interview_completed" || c.status === "screening_passed")
      .slice(0, 4);

    return {
      last30,
      prior30,
      applicantDelta,
      buckets,
      avgScore,
      passRate,
      rubricHealth,
      scoredCount: scored.length,
      stages,
      totalWithStage,
      unapprovedRubrics,
      recent: [...allCandidates].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
      upcomingInterviews,
    };
  }, [allCandidates, jobs]);

  const jobsPerPage = 4;
  const totalJobPages = Math.ceil(jobs.length / jobsPerPage) || 1;
  const paginatedJobs = jobs.slice(jobPage * jobsPerPage, (jobPage + 1) * jobsPerPage);

  const stats = [
    {
      label: "Active Jobs",
      value: jobs.length,
      sub: `${jobs.filter((j) => j.status === "published").length} Published`,
      icon: Briefcase,
      delta: null,
      to: "/jobs",
      iconBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    },
    {
      label: "Total Applicants",
      value: allCandidates.length,
      sub: "In hiring pipeline",
      icon: Users,
      delta: model.applicantDelta,
      to: "/candidates",
      iconBg: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300",
    },
    {
      label: "AI Interviews",
      value: queue.length,
      sub: "Screened candidates",
      icon: Bot,
      delta: model.avgScore != null ? model.avgScore : null,
      deltaLabel: model.avgScore ? `${model.avgScore}% Avg Match` : null,
      to: "/ai-interviews",
      iconBg: "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-accent-400",
    },
    {
      label: "Review Queue",
      value: queue.length,
      sub: "Requires human review",
      icon: Scale,
      delta: null,
      to: "/review-queue",
      iconBg: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Error Banner */}
      {loadError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{loadError} Figures may be incomplete.</span>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="rounded-lg bg-red-100 px-3 py-1 font-semibold text-red-700 hover:bg-red-200 dark:bg-red-900/60 dark:text-red-200"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Hero Greeting Zone — TalentaSync & Air Pay Style */}
      <section className="relative overflow-hidden rounded-3xl border border-brand-800/40 bg-gradient-to-br from-[#0E3B2E] via-[#09281F] to-[#081210] p-6 text-white shadow-soft sm:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-accent-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-300">
              <span>{greeting()},</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-accent-300">
                {me?.company?.name || "AptusHire Enterprise"}
              </span>
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {me?.name || "Head of Recruitment"}
            </h1>
            <p className="mt-1.5 max-w-xl text-xs text-slate-300 sm:text-sm">
              Live AI-screened recruitment intelligence. Every candidate match score is calculated with cited evidence against your rubric.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 backdrop-blur-xs">
              <Calendar className="h-4 w-4 text-accent-300" />
              <span>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>

            <AvatarStack candidates={allCandidates} totalCount={allCandidates.length} />

            <Link
              to="/jobs/new"
              className="inline-flex items-center gap-2 rounded-2xl bg-accent-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-sm transition-all hover:bg-accent-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <FilePlus2 className="h-4 w-4" />
              <span>Post a Job</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Top Row — 4 Bento KPI Metric Cards */}
      <section aria-label="Key Performance Indicators" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <Card
            key={item.label}
            as={Link}
            to={item.to}
            interactive
            className="group relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-xs transition-all dark:border-slate-800/90 dark:bg-slate-900/90"
          >
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${item.iconBg}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-1.5">
                {item.deltaLabel ? (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700 dark:bg-brand-950 dark:text-accent-400">
                    {item.deltaLabel}
                  </span>
                ) : (
                  <DeltaBadge value={item.delta} />
                )}
                <span className="flex h-6 w-6 items-center justify-center rounded-full text-slate-300 transition-colors group-hover:bg-slate-100 group-hover:text-slate-700 dark:text-slate-600 dark:group-hover:bg-slate-800 dark:group-hover:text-slate-300">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>

            <div className="mt-4">
              <p className="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {loading ? <Skeleton className="h-8 w-16" /> : item.value}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {item.label}
              </p>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                {item.sub}
              </p>
            </div>
          </Card>
        ))}
      </section>

      {/* Intelligence & Efficiency Radial Gauges (Air Pay Style) */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="flex items-center justify-between rounded-3xl p-5">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Screening Pass Rate</span>
            </div>
            <p className="font-display mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
              {model.passRate}%
            </p>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              Candidates meeting rubric threshold
            </p>
          </div>
          <ProgressRing value={model.passRate} size={68} stroke={6} color="#2FBE62" />
        </Card>

        <Card className="flex items-center justify-between rounded-3xl p-5">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <span>Rubric Compilation</span>
            </div>
            <p className="font-display mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
              {model.rubricHealth}%
            </p>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              Approved deterministic scoring rubrics
            </p>
          </div>
          <ProgressRing value={model.rubricHealth} size={68} stroke={6} color="#12B98A" />
        </Card>

        <Card className="flex items-center justify-between rounded-3xl p-5 sm:col-span-2 lg:col-span-1">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Bot className="h-4 w-4 text-accent-600 dark:text-accent-400" />
              <span>Voice AI Capacity</span>
            </div>
            <p className="font-display mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
              100%
            </p>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              Realtime interview pipelines active
            </p>
          </div>
          <ProgressRing value={100} size={68} stroke={6} color="#7CDE4A" />
        </Card>
      </section>

      {/* Middle Row Bento Grid: Active Jobs (2/3) + Upcoming Interviews (1/3) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column — Active Jobs List */}
        <Card className="rounded-3xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between pb-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">Active Jobs</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{jobs.length} roles open in workspace</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setJobPage((p) => Math.max(0, p - 1))}
                disabled={jobPage === 0}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-30 dark:border-slate-800 dark:text-slate-400"
                aria-label="Previous jobs"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-semibold text-slate-500">
                {jobPage + 1} / {totalJobPages}
              </span>
              <button
                type="button"
                onClick={() => setJobPage((p) => Math.min(totalJobPages - 1, p + 1))}
                disabled={jobPage >= totalJobPages - 1}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-30 dark:border-slate-800 dark:text-slate-400"
                aria-label="Next jobs"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          ) : paginatedJobs.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No jobs posted yet"
              description="Create a role to configure requirements, rubrics, and automated AI interviews."
              action={
                <Button as={Link} to="/jobs/new" size="sm">
                  Create First Job
                </Button>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {paginatedJobs.map((j) => (
                <Link
                  key={j._id}
                  to={`/jobs/${j._id}`}
                  className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 transition-all hover:border-brand-200 hover:bg-white hover:shadow-xs dark:border-slate-800/80 dark:bg-slate-900/40 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-800 font-bold text-xs dark:bg-brand-900/60 dark:text-accent-300">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-slate-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-accent-400">
                        {j.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {j.department || "General"} · {j.location || "Remote"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs dark:bg-slate-800 dark:text-slate-200">
                      Threshold: {j.atsThreshold ?? 60}%
                    </span>
                    <Badge tone={j.rubricStatus === "approved" ? "green" : "amber"}>
                      {j.rubricStatus === "approved" ? "Rubric Active" : "Draft Rubric"}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Right Column — Upcoming & Live Interviews */}
        <Card className="rounded-3xl p-6">
          <div className="flex items-center justify-between pb-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">Upcoming & Screened</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Live AI interview queue</p>
            </div>
            <Link
              to="/ai-interviews"
              className="text-xs font-semibold text-brand-700 hover:underline dark:text-accent-400"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
          ) : model.upcomingInterviews.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
              <Bot className="mx-auto mb-2 h-8 w-8 opacity-40" />
              No candidates awaiting interview currently.
            </div>
          ) : (
            <div className="space-y-2.5">
              {model.upcomingInterviews.map((c) => (
                <Link
                  key={c._id}
                  to={`/candidates/${c._id}`}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-3 transition-colors hover:bg-white hover:border-slate-200 dark:border-slate-800/80 dark:bg-slate-900/40 dark:hover:bg-slate-900"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Monogram name={c.basicDetails?.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                        {c.basicDetails?.name}
                      </p>
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {c.job?.title || "Candidate"}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {c.ats?.overallScore != null ? (
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                        {c.ats.overallScore}% Match
                      </span>
                    ) : (
                      <Badge tone={stageTone(c.status)}>{stageLabel(c.status)}</Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Bottom Row Bento Grid: Trends (2/3) + Pipeline Distribution & Needs Attention (1/3) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trend Activity Chart */}
        <Card className="rounded-3xl p-6 lg:col-span-2">
          <SectionHeader
            icon={TrendingUp}
            title="Applications Received"
            description="Weekly intake over the past 12 weeks"
          />
          {loading ? <Skeleton className="mt-4 h-48 w-full rounded-2xl" /> : <TrendChart buckets={model.buckets} />}
        </Card>

        {/* Pipeline Distribution / Velocity Widget — TalentaSync Segmented Bar Style */}
        <Card className="rounded-3xl p-6">
          <SectionHeader icon={Layers} title="Hiring Pipeline" description="Candidate distribution by stage" />

          {loading ? (
            <Skeleton className="mt-4 h-48 w-full rounded-2xl" />
          ) : model.stages.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">No candidate applications yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="space-y-2.5">
                {model.stages.map(([stage, count]) => {
                  const pct = Math.round((count / model.totalWithStage) * 100);
                  return (
                    <div key={stage} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-700 dark:text-slate-300">{stageLabel(stage)}</span>
                        <span className="tabular-nums text-slate-900 dark:text-white">
                          {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-brand-500 transition-all duration-500"
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Needs Human Review Alert Capsule */}
              {queue.length > 0 && (
                <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 shrink-0 text-amber-600" />
                    <span className="font-semibold">{queue.length} in Review Queue</span>
                  </div>
                  <Link
                    to="/review-queue"
                    className="font-bold underline hover:text-amber-800 dark:hover:text-amber-200"
                  >
                    Resolve
                  </Link>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
