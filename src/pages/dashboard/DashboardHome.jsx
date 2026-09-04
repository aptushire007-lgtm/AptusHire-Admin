import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  Layers,
  Scale,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCompanyData } from "../../context/CompanyDataContext.jsx";
import { Badge, Card, EmptyState, SectionHeader, Skeleton } from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import { stageLabel, stageTone } from "../../lib/pipeline.js";
import TrendChart from "../../components/dashboard/TrendChart.jsx";

const DAY = 86_400_000;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Monogram({ name }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-lime-soft text-sm font-bold text-primary">
      {(name || "?")[0].toUpperCase()}
    </span>
  );
}

function DeltaBadge({ value }) {
  if (value == null) return <Badge tone="slate">New period</Badge>;
  if (value === 0) return <Badge tone="slate">0%</Badge>;
  return <Badge tone={value > 0 ? "green" : "red"}>{value > 0 ? "Up +" : "Down "}{value}%</Badge>;
}

export default function DashboardHome() {
  const { me, jobs, allCandidates, queue, loading, loadError, refresh } = useCompanyData();
  const [jobPage, setJobPage] = useState(0);

  const model = useMemo(() => {
    const now = Date.now();
    const dated = allCandidates.filter((candidate) => candidate.createdAt);
    const last30 = dated.filter((candidate) => now - new Date(candidate.createdAt).getTime() <= 30 * DAY).length;
    const prior30 = dated.filter((candidate) => {
      const age = now - new Date(candidate.createdAt).getTime();
      return age > 30 * DAY && age <= 60 * DAY;
    }).length;
    const applicantDelta = prior30 === 0 ? null : Math.round(((last30 - prior30) / prior30) * 100);
    const buckets = Array.from({ length: 12 }, (_, index) => {
      const end = now - (11 - index) * 7 * DAY;
      const start = end - 7 * DAY;
      const date = new Date(end);
      return {
        label: `${date.getDate()} ${date.toLocaleString("en", { month: "short" })}`,
        count: dated.filter((candidate) => {
          const time = new Date(candidate.createdAt).getTime();
          return time > start && time <= end;
        }).length,
      };
    });
    const scored = allCandidates.filter((candidate) => candidate.ats?.decision && candidate.ats.decision !== "pending");
    const avgScore = scored.length
      ? Math.round(scored.reduce((sum, candidate) => sum + (candidate.ats?.overallScore || 0), 0) / scored.length)
      : null;
    const approvedJobs = jobs.filter((job) => job.rubricStatus === "approved");
    const stageCounts = new Map();
    for (const candidate of allCandidates) {
      if (!candidate.status) continue;
      stageCounts.set(candidate.status, (stageCounts.get(candidate.status) || 0) + 1);
    }
    const stages = [...stageCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const totalWithStage = [...stageCounts.values()].reduce((sum, count) => sum + count, 0) || 1;
    return {
      applicantDelta,
      avgScore,
      buckets,
      rubricHealth: jobs.length ? Math.round((approvedJobs.length / jobs.length) * 100) : 100,
      stages,
      totalWithStage,
      recent: [...allCandidates].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
      upcomingInterviews: allCandidates
        .filter((candidate) => ["interview_scheduled", "interview_completed", "screening_passed"].includes(candidate.status))
        .slice(0, 4),
    };
  }, [allCandidates, jobs]);

  const jobsPerPage = 4;
  const totalJobPages = Math.ceil(jobs.length / jobsPerPage) || 1;
  const paginatedJobs = jobs.slice(jobPage * jobsPerPage, (jobPage + 1) * jobsPerPage);
  const stats = [
    { label: "Active Jobs", value: jobs.length, sub: `${jobs.filter((job) => job.status === "published").length} published`, icon: Briefcase, delta: null, to: "/jobs" },
    { label: "Candidates", value: allCandidates.length, sub: "In hiring pipeline", icon: Users, delta: model.applicantDelta, to: "/candidates" },
    { label: "AI Interviews", value: queue.length, sub: "Screened candidates", icon: Layers, deltaLabel: model.avgScore ? `${model.avgScore}% avg match` : null, to: "/ai-interviews" },
    { label: "Review Queue", value: queue.length, sub: "Requires human review", icon: Scale, delta: null, to: "/review-queue" },
  ];

  return (
    <div className="mx-auto max-w-360 space-y-8 pb-12">
      {loadError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" /><span>{loadError} Figures may be incomplete.</span></div>
          <button type="button" onClick={refresh} className="rounded-control bg-red-100 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-200">Refresh</button>
        </div>
      )}

      <section className="flex flex-col justify-between gap-6 border-b border-border pb-7 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-green">{greeting()}, {me?.company?.name || "AptusHire"}</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">{me?.name || "Admin"}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">Manage your recruitment platform from one place with evidence-backed candidate intelligence.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden items-center gap-2 text-xs font-medium text-text-muted sm:inline-flex"><Calendar className="h-4 w-4 text-brand-green" />{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          <Link to="/jobs/new" className="inline-flex min-h-10 items-center gap-2 rounded-control bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"><FilePlus2 className="h-4 w-4" />Post a Job</Link>
        </div>
      </section>

      <section aria-label="Key Performance Indicators" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.label} as={Link} to={item.to} interactive padding="compact" className="group border-border bg-surface">
            <div className="flex items-start justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-control bg-lime-soft text-brand-green"><item.icon className="h-5 w-5" /></span><span className="flex h-8 w-8 items-center justify-center rounded-control text-text-muted transition-colors group-hover:bg-lime-soft group-hover:text-primary"><ArrowUpRight className="h-4 w-4" /></span></div>
            <p className="mt-5 font-display text-3xl font-bold tracking-tight text-text">{loading ? <Skeleton className="h-9 w-16" /> : item.value}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-text">{item.label}</p>{item.deltaLabel ? <Badge tone="brand">{item.deltaLabel}</Badge> : <DeltaBadge value={item.delta} />}</div>
            <p className="mt-1 text-xs text-text-muted">{item.sub}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
        <Card className="border-border bg-surface"><SectionHeader icon={TrendingUp} title="Recruitment activity" description="Applications received over the past 12 weeks" />{loading ? <Skeleton className="mt-6 h-56 w-full rounded-control" /> : <TrendChart buckets={model.buckets} />}</Card>
        <Card className="border-border bg-surface"><SectionHeader icon={Layers} title="Hiring funnel" description="Candidate distribution by stage" />{loading ? <Skeleton className="mt-6 h-56 w-full rounded-control" /> : model.stages.length === 0 ? <p className="mt-8 text-sm text-text-muted">No candidate applications yet.</p> : <div className="mt-6 space-y-4">{model.stages.map(([stage, count]) => { const percentage = Math.round((count / model.totalWithStage) * 100); return <div key={stage} className="space-y-1.5"><div className="flex items-center justify-between text-sm"><span className="font-medium text-text-muted">{stageLabel(stage)}</span><span className="font-semibold tabular-nums text-text">{count} <span className="text-xs font-normal text-text-muted">({percentage}%)</span></span></div><div className="h-2 w-full overflow-hidden rounded-full bg-lime-soft"><div className="h-full rounded-full bg-brand-green transition-all duration-500" style={{ width: `${Math.max(4, percentage)}%` }} /></div></div>; })}{queue.length > 0 && <div className="flex items-center justify-between rounded-control border border-orange-200 bg-accent-orange-soft p-3 text-sm"><span className="flex items-center gap-2 font-semibold text-text"><Scale className="h-4 w-4 text-accent-orange" />{queue.length} need review</span><Link to="/review-queue" className="font-semibold text-primary hover:underline">Resolve</Link></div>}</div>}</Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="border-border bg-surface"><div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-bold text-text">Recent candidates</h2><p className="mt-1 text-xs text-text-muted">Latest additions to your pipeline</p></div><Link to="/candidates" className="text-xs font-semibold text-primary hover:underline">View all</Link></div><div className="mt-5 space-y-2">{loading ? <><Skeleton className="h-12 w-full rounded-control" /><Skeleton className="h-12 w-full rounded-control" /></> : model.recent.length === 0 ? <p className="py-6 text-sm text-text-muted">No candidates yet.</p> : model.recent.map((candidate) => <Link key={candidate._id} to={`/candidates/${candidate._id}`} className="flex min-w-0 items-center gap-3 rounded-control border border-transparent p-2 transition-colors hover:border-border hover:bg-background"><Monogram name={candidate.basicDetails?.name} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-text">{candidate.basicDetails?.name || "Candidate"}</span><span className="block truncate text-xs text-text-muted">{candidate.job?.title || "Application"}</span></span><Badge tone={stageTone(candidate.status)}>{stageLabel(candidate.status)}</Badge></Link>)}</div></Card>
        <Card className="border-border bg-surface"><div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-bold text-text">Recent jobs</h2><p className="mt-1 text-xs text-text-muted">Roles currently in your workspace</p></div><Link to="/jobs" className="text-xs font-semibold text-primary hover:underline">View all</Link></div><div className="mt-5 space-y-2">{loading ? <><Skeleton className="h-12 w-full rounded-control" /><Skeleton className="h-12 w-full rounded-control" /></> : paginatedJobs.length === 0 ? <EmptyState icon={Briefcase} title="No jobs posted yet" description="Create a role to begin recruiting." action={<Button as={Link} to="/jobs/new" size="sm">Create job</Button>} /> : paginatedJobs.map((job) => <Link key={job._id} to={`/jobs/${job._id}`} className="flex min-w-0 items-center gap-3 rounded-control border border-transparent p-2 transition-colors hover:border-border hover:bg-background"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-lime-soft text-brand-green"><Briefcase className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-text">{job.title}</span><span className="block truncate text-xs text-text-muted">{job.department || "General"} - {job.location || "Remote"}</span></span><Badge tone={job.rubricStatus === "approved" ? "green" : "amber"}>{job.rubricStatus === "approved" ? "Active" : "Draft"}</Badge></Link>)}</div>{totalJobPages > 1 && <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-3"><button type="button" onClick={() => setJobPage((page) => Math.max(0, page - 1))} disabled={jobPage === 0} aria-label="Previous jobs" className="tap-target inline-flex items-center justify-center rounded-control border border-border text-text-muted disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button><span className="text-xs font-medium text-text-muted">{jobPage + 1} / {totalJobPages}</span><button type="button" onClick={() => setJobPage((page) => Math.min(totalJobPages - 1, page + 1))} disabled={jobPage >= totalJobPages - 1} aria-label="Next jobs" className="tap-target inline-flex items-center justify-center rounded-control border border-border text-text-muted disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button></div>}</Card>
        <Card className="border-border bg-surface"><div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-bold text-text">Recent interviews</h2><p className="mt-1 text-xs text-text-muted">AI interview activity</p></div><Link to="/ai-interviews" className="text-xs font-semibold text-primary hover:underline">View all</Link></div><div className="mt-5 space-y-2">{loading ? <><Skeleton className="h-12 w-full rounded-control" /><Skeleton className="h-12 w-full rounded-control" /></> : model.upcomingInterviews.length === 0 ? <p className="py-6 text-sm text-text-muted">No interview activity yet.</p> : model.upcomingInterviews.map((candidate) => <Link key={candidate._id} to={`/candidates/${candidate._id}`} className="flex min-w-0 items-center gap-3 rounded-control border border-transparent p-2 transition-colors hover:border-border hover:bg-background"><Monogram name={candidate.basicDetails?.name} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-text">{candidate.basicDetails?.name || "Candidate"}</span><span className="block truncate text-xs text-text-muted">{candidate.job?.title || "Interview"}</span></span>{candidate.ats?.overallScore != null ? <Badge tone="green">{candidate.ats.overallScore}% match</Badge> : <Badge tone={stageTone(candidate.status)}>{stageLabel(candidate.status)}</Badge>}</Link>)}</div></Card>
      </section>
    </div>
  );
}
