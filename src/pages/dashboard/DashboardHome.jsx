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
import { Badge, Card, CardHeader, CardRow, EmptyState, StatCard, StatGrid, Skeleton } from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import { stageLabel, stageTone } from "../../lib/pipeline.js";
import { VISUALIZATION_PALETTE } from "../../lib/visualizationColors.js";
import TrendChart from "../../components/dashboard/TrendChart.jsx";
import { recruiterTasks } from "../../lib/recruiterTasks.js";

import { useEffect } from "react";
import api from "../../api/client.js";
import { getSocket } from "../../lib/socket.js";


function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Monogram({ name }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-[#EAF8E4] text-sm font-bold text-[#0E3B2E]">
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
  const { me, jobs, queue, loading: workspaceLoading, loadError: workspaceError, refresh: refreshWorkspace } = useCompanyData();
  const [jobPage, setJobPage] = useState(0);
  const [taskPage, setTaskPage] = useState(1);
  const [summary, setSummary] = useState({ total: 0, shortlisted: 0, joined: 0, buckets: [], stages: [], totalWithStage: 1, recent: [], upcomingInterviews: [], attention: [], attentionTotal: 0 });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setSummaryLoading(true);
    api.get("/candidates/dashboard-summary", { params: { page: taskPage } })
      .then(({ data }) => { if (alive) { setSummary(data); setSummaryError(""); } })
      .catch(() => { if (alive) setSummaryError("Could not load application summary. Retry to get current figures."); })
      .finally(() => { if (alive) setSummaryLoading(false); });
    return () => { alive = false; };
  }, [taskPage, attempt]);
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const reload = () => setAttempt(value => value + 1);
    socket.on("candidate:stage", reload);
    socket.on("candidate:review", reload);
    socket.on("job:capacity", reload);
    return () => { socket.off("candidate:stage", reload); socket.off("candidate:review", reload); socket.off("job:capacity", reload); };
  }, []);
  const loading = workspaceLoading || summaryLoading;
  const loadError = workspaceError || summaryError;
  const refresh = () => { refreshWorkspace(); setAttempt(value => value + 1); };
  const rubricTasks = useMemo(() => recruiterTasks([], jobs), [jobs]);
  const tasks = useMemo(() => recruiterTasks(summary.attention, jobs).filter(task => task.kind === "application"), [summary.attention, jobs]);
  const visibleTasks = [...tasks, ...(taskPage === 1 ? rubricTasks : [])];
  const taskTotal = summary.attentionTotal + rubricTasks.length;
  const liveQueue = useMemo(() => (queue || []).filter(entry => entry.job), [queue]);
  const model = summary;

  const jobsPerPage = 4;
  const totalJobPages = Math.ceil(jobs.length / jobsPerPage) || 1;
  const paginatedJobs = jobs.slice(jobPage * jobsPerPage, (jobPage + 1) * jobsPerPage);
  const stats = [
    { label: "Open Roles",    value: jobs.filter((job) => job.status === "published").length, sub: `${jobs.filter((job) => job.status === "published").length} published`, icon: Briefcase, iconTone: "brand", delta: null, to: "/jobs", accent: "brand" },
    { label: "Applications",    value: summary.total,      sub: "All roles, including historical applications",                                   icon: Users,     iconTone: "sky", delta: model.applicantDelta,   to: "/candidates",    accent: "brand" },
    { label: "Interview queue",    value: liveQueue.length,            sub: "Queue entries for existing roles",                                                   icon: Layers,    iconTone: "violet", delta: null, to: "/ai-interviews", accent: "orange" },
    { label: "Shortlisted",   value: summary.shortlisted, sub: "Applications at shortlist stage",        icon: Scale,     iconTone: "teal", delta: null,                  to: "/pipeline",      accent: "brand" },
    { label: "Hired",         value: summary.joined,      sub: "Applications marked joined",     icon: Users,     iconTone: "positive", delta: null,                  to: "/pipeline",      accent: "orange" },
  ];

  return (
    <div className="space-y-[18px]">
      {/* The screen used to open with eleven cards of identical weight — five
          KPI tiles, two charts, three lists and a queue — so nothing told a
          recruiter where to start. One focal block does, and the figure it
          carries is the only one that implies an action: how much is waiting
          on a human right now. Everything below it is supporting detail.

          The figure obeys the same rule as every other number in this product:
          a skeleton while it is unknown and an em dash when the request
          failed — never a confident 0 standing in for "we could not count". */}
      <section className="panel-hero workspace-panel rounded-2xl px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/70">
              {greeting()}{me?.name ? `, ${me.name.split(" ")[0]}` : ""}
            </p>
            {/* A <div>, not a <p>: the loading branch renders a <Skeleton>, which
                is a block, and a block inside a <p> is invalid HTML that React
                warns about and the browser silently reparents — which moves the
                placeholder out of this row. Card.jsx § StatCard hit the same
                trap and documents it. */}
            <div className="mt-3 flex items-baseline gap-3">
              <span className="num text-[44px] leading-none font-semibold text-white">
                {loading ? (
                  <Skeleton className="h-10 w-20 bg-white/20 inline-block align-middle" />
                ) : loadError ? (
                  <span title="Could not load this figure">—</span>
                ) : (
                  taskTotal
                )}
              </span>
              <span className="text-base font-semibold text-white/90">
                {taskTotal === 1 ? "item waiting on you" : "items waiting on you"}
              </span>
            </div>
            <p className="prose-wrap mt-2 max-w-md text-sm text-white/70">
              Recorded workflow states that need a recruiter decision. Nothing here is actioned automatically.
            </p>
          </div>
          {/* Deliberately NOT <Button variant="primary"> here: primary is
              bg-brand-800, the same forest this panel is filled with, so the
              button would be invisible on it. On a dark ground the white
              `secondary` IS the emphatic one. */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/review-queue"
              className="inline-flex items-center gap-1.5 rounded-control border border-white/30 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Open review queue
            </Link>
            <Button as={Link} to="/jobs?create=1" variant="secondary">
              <FilePlus2 className="h-4 w-4" aria-hidden="true" />Create job
            </Button>
          </div>
        </div>
      </section>
      {loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <span>{loadError} Figures may be incomplete.</span><Button variant="secondary" size="sm" onClick={refresh}>Refresh</Button>
      </div>}
      <Card padding="none">
        <CardHeader title="Needs attention" count={loading ? undefined : taskTotal} description="Ordered by what blocks a decision first." />
        {loading ? <div className="p-[18px]"><Skeleton className="h-20" /></div> : loadError ? <p className="p-[18px] text-sm text-slate-600">Refresh to see the current review queue.</p> :
          visibleTasks.length === 0 ? <p className="p-[18px] text-sm text-slate-600">No pending application reviews, assessment decisions or published-rubric approvals on this page.</p> :
          <ul>{visibleTasks.map(task => <li key={task.key} className="rule-b flex flex-wrap items-center justify-between gap-3 px-[18px] py-3">
            <div className="min-w-0"><p className="text-sm font-bold text-slate-900">{task.title}</p><p className="pt-0.5 text-xs text-slate-500">{task.detail}</p></div>
            <Button as={Link} to={task.href} variant="pending" size="sm">{task.action}</Button>
          </li>)}</ul>}
        {summary.attentionTotal > 20 && <div className="flex flex-wrap items-center gap-3 p-3">
          <Button variant="secondary" size="sm" disabled={taskPage === 1} onClick={() => setTaskPage(page => page - 1)}>Previous tasks</Button>
          <span className="text-xs">Page {taskPage} of {Math.ceil(summary.attentionTotal / 20)}</span>
          <Button variant="secondary" size="sm" disabled={taskPage >= Math.ceil(summary.attentionTotal / 20)} onClick={() => setTaskPage(page => page + 1)}>Next tasks</Button>
        </div>}
      </Card>
      <section aria-label="Key Performance Indicators">
        <StatGrid min={170}>{stats.map((item, index) => <StatCard key={item.label} as={Link} to={item.to} interactive
          className={index === 0 ? "accent-edge" : ""}
          aria-label={loading ? item.label : `${item.value} ${item.label}`}
          label={item.label} value={loading ? <Skeleton className="h-7 w-16" /> : loadError ? "—" : item.value}
          note={item.sub} icon={item.icon} iconTone={item.iconTone}
          chip={item.delta == null ? undefined : `${item.delta > 0 ? "+" : ""}${item.delta}%`}
          chipTone={item.delta > 0 ? "green" : item.delta < 0 ? "red" : "slate"}
        />)}</StatGrid>
      </section>
      <section className="grid items-start gap-[18px] lg:grid-cols-2">
        <Card padding="none">
          <CardHeader title="Recruitment activity" description="Applications received over the past 12 weeks" />
          <div className="p-[18px]">{loading ? <Skeleton className="h-48" /> : <TrendChart buckets={model.buckets} />}</div>
        </Card>
        <Card padding="none">
          <CardHeader title="Hiring funnel" description="Current application distribution by stage" action={<Button as={Link} to="/pipeline" variant="secondary" size="sm">Open pipeline</Button>} />
          <div className="space-y-3 p-[18px]">{loading ? <Skeleton className="h-48" /> : model.stages.length === 0 ? <p className="text-sm text-slate-500">No candidate applications yet.</p> : model.stages.map(([stage,count],index) => {
            const percentage = model.totalWithStage > 0 ? Math.round(count / model.totalWithStage * 100) : 0;
            return <div key={stage}><div className="mb-1 flex items-center justify-between text-xs"><span className="font-semibold text-slate-700">{stageLabel(stage)}</span><span className="num text-slate-700">{count} ({percentage}%)</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{backgroundColor:VISUALIZATION_PALETTE[index % VISUALIZATION_PALETTE.length],width:`${percentage}%`}} /></div>
            </div>;
          })}</div>
        </Card>
      </section>
      <section className="grid items-start gap-[18px] xl:grid-cols-3">
        <Card padding="none"><CardHeader title="Recent candidates" action={<Link to="/candidates" className="text-xs font-semibold text-brand-700 hover:underline">View all</Link>} />
          {loading ? <div className="p-[18px]"><Skeleton className="h-24" /></div> : model.recent.length === 0 ? <p className="p-[18px] text-sm text-slate-500">No candidates yet.</p> : model.recent.map(candidate => <Link key={candidate._id} to={`/candidates/${candidate._id}`} className="rule-b flex min-w-0 items-center gap-2.5 px-[18px] py-3 hover:bg-canvas"><Monogram name={candidate.basicDetails?.name} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{candidate.basicDetails?.name || "Candidate"}</span><span className="block truncate text-xs text-slate-500">{candidate.job?.title || "Application"}</span></span><Badge tone={stageTone(candidate.status)}>{stageLabel(candidate.status)}</Badge></Link>)}
        </Card>
        <Card padding="none"><CardHeader title="Recent jobs" action={<Link to="/jobs" className="text-xs font-semibold text-brand-700 hover:underline">View all</Link>} />
          {loading ? <div className="p-[18px]"><Skeleton className="h-24" /></div> : paginatedJobs.length === 0 ? <EmptyState icon={Briefcase} title="No jobs posted yet" description="Create a role to begin recruiting." action={<Button as={Link} to="/jobs?create=1" size="sm">Create job</Button>} /> : paginatedJobs.map(job => <Link key={job._id} to={`/jobs?jobId=${job._id}`} className="rule-b flex min-w-0 items-center gap-2.5 px-[18px] py-3 hover:bg-canvas"><Briefcase className="h-4 w-4 shrink-0 text-brand-700" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{job.title}</span><span className="block truncate text-xs text-slate-500">{job.department || "General"} · {job.location || "Location not specified"}</span></span><Badge tone={job.status === "published" ? "green" : "slate"}>{job.status || "Status unavailable"}</Badge></Link>)}
          {totalJobPages > 1 && <div className="flex items-center justify-end gap-2 p-3"><Button variant="secondary" size="sm" onClick={() => setJobPage(page => Math.max(0,page-1))} disabled={jobPage === 0} aria-label="Previous jobs"><ChevronLeft className="h-3.5 w-3.5" /></Button><span className="num text-xs">{jobPage+1} / {totalJobPages}</span><Button variant="secondary" size="sm" onClick={() => setJobPage(page => Math.min(totalJobPages-1,page+1))} disabled={jobPage >= totalJobPages-1} aria-label="Next jobs"><ChevronRight className="h-3.5 w-3.5" /></Button></div>}
        </Card>
        <Card padding="none"><CardHeader title="Recent interviews" action={<Link to="/ai-interviews" className="text-xs font-semibold text-brand-700 hover:underline">View all</Link>} />
          {loading ? <div className="p-[18px]"><Skeleton className="h-24" /></div> : model.upcomingInterviews.length === 0 ? <p className="p-[18px] text-sm text-slate-500">No interview activity yet.</p> : model.upcomingInterviews.map(candidate => <Link key={candidate._id} to={`/candidates/${candidate._id}`} className="rule-b flex min-w-0 items-center gap-2.5 px-[18px] py-3 hover:bg-canvas"><Monogram name={candidate.basicDetails?.name} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{candidate.basicDetails?.name || "Candidate"}</span><span className="block truncate text-xs text-slate-500">{candidate.job?.title || "Interview"}</span></span><Badge tone={stageTone(candidate.status)}>{stageLabel(candidate.status)}</Badge></Link>)}
        </Card>
      </section>
    </div>
  );
}
