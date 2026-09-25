import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
  FilePlus2,
  FileText,
  Mail,
  Star,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { useCompanyData } from "../../context/CompanyDataContext.jsx";
import { Badge, Card, CardHeader, CardRow, EmptyState, StatCard, StatGrid, Skeleton } from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import { stageLabel, stageTone } from "../../lib/pipeline.js";
import { VISUALIZATION_PALETTE } from "../../lib/visualizationColors.js";
import TrendChart from "../../components/dashboard/TrendChart.jsx";
import HeroIllustration from "../../components/dashboard/HeroIllustration.jsx";
import { recruiterTasks } from "../../lib/recruiterTasks.js";

import { useEffect } from "react";
import api from "../../api/client.js";
import { TEMPLATE_CATEGORIES } from "../../lib/templates.js";
import { getSocket } from "../../lib/socket.js";


function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Monogram({ name }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-[#EAF5FF] text-sm font-bold text-[#123B6D]">
      {(name || "?")[0].toUpperCase()}
    </span>
  );
}

function initialsOf(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Cycled by row position, never derived from the name itself — see
// Card.jsx § Avatar for why this product doesn't hash a person's name to a
// colour. Position-based variety is what the reference asked for without
// that risk.
const ATTENTION_AVATAR_TONES = [
  "bg-[#DCEAF5] text-[#123B6D]",
  "bg-emerald-100 text-emerald-800",
  "bg-[#FFF3D6] text-[#8A5A19]",
  "bg-violet-100 text-violet-800",
  "bg-pink-100 text-pink-800",
  "bg-sky-100 text-sky-700",
];

function AttentionAvatar({ name, index }) {
  return (
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${ATTENTION_AVATAR_TONES[index % ATTENTION_AVATAR_TONES.length]}`}>
      {initialsOf(name)}
    </span>
  );
}

// Funnel bar colour, keyed by the pipeline stage itself rather than its
// position in the list — so "Rejected" is always the same hue whichever row
// it lands on for a given company's mix of stages. Any stage not named here
// (a company-specific one) falls back to the shared visualization palette.
const FUNNEL_STAGE_COLORS = {
  rejected: "#7B68E8",
  assessment_scheduled: "#39A0F4",
  applied: "#32B879",
  offer_sent: "#F3B83F",
  ai_interview_completed: "#F28B55",
  interview_scheduled: "#7B68E8",
};

function funnelStageColor(stage, index) {
  return FUNNEL_STAGE_COLORS[stage] || VISUALIZATION_PALETTE[index % VISUALIZATION_PALETTE.length];
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
    { label: "Open Roles",       value: jobs.filter((job) => job.status === "published").length, sub: `${jobs.filter((job) => job.status === "published").length} published`,      icon: Briefcase,     iconTone: "statSky",    chevronClassName: "text-[#2F8FF3]", bg: "bg-white",           delta: null,                  to: "/jobs" },
    { label: "Applications",     value: summary.total,      sub: "All roles, including historical applications",                                                                    icon: FileText,      iconTone: "statAmber",  chevronClassName: "text-[#B9821B]", bg: "bg-[#FFFDF8]",       delta: model.applicantDelta, to: "/candidates" },
    { label: "Interview queue",  value: liveQueue.length,   sub: "Queue entries for existing roles",                                                                                 icon: Users,         iconTone: "statViolet", chevronClassName: "text-[#7564D8]", bg: "bg-[#FCFBFF]",       delta: null,                  to: "/ai-interviews" },
    { label: "Shortlisted",      value: summary.shortlisted, sub: "Applications at shortlist stage",                                                                                 icon: ClipboardList, iconTone: "statSky",    chevronClassName: "text-[#2F8FF3]", bg: "bg-white",           delta: null,                  to: "/pipeline" },
    { label: "Hired",            value: summary.joined,      sub: "Applications marked joined",                                                                                      icon: User,          iconTone: "statCream",  chevronClassName: "text-[#B9821B]", bg: "bg-[#FFFDF8]",       delta: null,                  to: "/pipeline" },
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
      <section className="panel-hero workspace-panel overflow-hidden rounded-[14px] px-5 pt-4 pb-0 sm:px-8 sm:pt-5 sm:pb-1">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <div className="min-w-0 flex-1 sm:basis-1/2">
            <p className="text-[14px] font-medium text-[#123B6D]">
              {greeting()}{me?.name ? `, ${me.name.split(" ")[0]}` : ""}
              <span aria-hidden="true"> 👋</span>
            </p>
            {/* A <div>, not a <p>: the loading branch renders a <Skeleton>, which
                is a block, and a block inside a <p> is invalid HTML that React
                warns about and the browser silently reparents — which moves the
                placeholder out of this row. Card.jsx § StatCard hit the same
                trap and documents it. */}
            <div className="mt-2 flex items-baseline gap-3">
              <span className="num text-[38px] leading-none font-bold text-[#0B2F57]">
                {loading ? (
                  <Skeleton className="h-9 w-14 inline-block align-middle" />
                ) : loadError ? (
                  <span title="Could not load this figure">—</span>
                ) : (
                  taskTotal
                )}
              </span>
              <span className="text-[14px] font-semibold text-[#123B6D]">
                {taskTotal === 1 ? "item waiting on you" : "items waiting on you"}
              </span>
            </div>
            <p className="prose-wrap mt-1.5 max-w-[500px] text-[13px] leading-[1.5] text-[#55708F]">
              Recorded workflow states that need a recruiter decision. Nothing here is actioned automatically.
            </p>
            <div className="mt-2 mb-2 flex flex-wrap items-center gap-2.5">
              <Link
                to="/review-queue"
                className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-[#BFDDF5] bg-white px-3 text-[11px] font-semibold text-[#123B6D] shadow-[0_1px_3px_rgba(18,59,109,0.08)] transition-colors hover:bg-[#F4FAFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#123B6D]"
              >
                <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />Open review queue
              </Link>
              <Link
                to="/jobs?create=1"
                className="inline-flex h-[34px] items-center gap-1.5 rounded-lg bg-[#2F9CF4] px-3 text-[11px] font-semibold text-white transition-colors hover:bg-[#1688F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#123B6D]"
              >
                <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" />Create job
              </Link>
            </div>
          </div>
          <HeroIllustration className="hidden h-auto w-full max-w-[190px] flex-1 sm:block sm:basis-[45%]" />
        </div>
      </section>
      {loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <span>{loadError} Figures may be incomplete.</span><Button variant="secondary" size="sm" onClick={refresh}>Refresh</Button>
      </div>}
      <section aria-label="Key Performance Indicators">
        <StatGrid columns={5}>{stats.map((item, index) => <StatCard key={item.label} as={Link} to={item.to} interactive
          className={`${index === 0 ? "accent-edge" : ""} ${item.bg}`}
          aria-label={loading ? item.label : `${item.value} ${item.label}`}
          label={item.label} value={loading ? <Skeleton className="h-7 w-16" /> : loadError ? "—" : item.value}
          note={item.sub} icon={item.icon} iconTone={item.iconTone}
          chip={item.delta == null ? undefined : `${item.delta > 0 ? "+" : ""}${item.delta}%`}
          chipTone={item.delta > 0 ? "green" : item.delta < 0 ? "red" : "slate"}
          chipClassName={item.delta > 0 ? "!border-[#BFE6D0] !bg-[#E8F7EF] !rounded-[6px] !px-[7px] !py-1 !text-[#24784F]" : ""}
          chevron chevronClassName={item.chevronClassName}
        />)}</StatGrid>
      </section>
      <section className="grid items-start gap-[18px] lg:grid-cols-2">
        <Card padding="none">
          <div className="rule-b flex flex-wrap items-center gap-x-3 gap-y-1.5 px-[18px] py-[15px]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF5FF] text-[#2F9CF4]"><BarChart3 className="h-[18px] w-[18px]" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold text-[#123B6D]">Recruitment activity</h2>
              <p className="text-[11px] text-[#637D98]">Applications received over the past 12 weeks</p>
            </div>
            {/* A display, not a control: the summary endpoint always returns a
                fixed 12-week window, so a clickable period picker here would
                promise a filter nothing behind it can honour. */}
            <span className="inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-lg border border-[#DCE7F1] bg-white px-3 text-[11px] font-semibold text-[#123B6D]">
              <Calendar className="h-3.5 w-3.5 text-[#637D98]" aria-hidden="true" />Last 12 weeks<ChevronDown className="h-3.5 w-3.5 text-[#8AA0B5]" aria-hidden="true" />
            </span>
          </div>
          <div className="p-[18px]">{loading ? <Skeleton className="h-48" /> : <TrendChart buckets={model.buckets} />}</div>
        </Card>
        <Card padding="none">
          <div className="rule-b flex flex-wrap items-center gap-x-3 gap-y-1.5 px-[18px] py-[15px]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFF3D6] text-[#F28B55]"><Filter className="h-[18px] w-[18px]" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold text-[#123B6D]">Hiring funnel</h2>
              <p className="text-[11px] text-[#637D98]">Current application distribution by stage</p>
            </div>
            <Button as={Link} to="/pipeline" variant="secondary" size="sm" className="h-[38px] shrink-0 !border-[#DCE7F1] !text-[11px] !text-[#123B6D]">Open pipeline</Button>
          </div>
          <div className="space-y-3.5 p-[18px]">{loading ? <Skeleton className="h-48" /> : model.stages.length === 0 ? <p className="text-sm text-slate-500">No candidate applications yet.</p> : model.stages.map(([stage,count],index) => {
            const percentage = model.totalWithStage > 0 ? Math.round(count / model.totalWithStage * 100) : 0;
            return <div key={stage} className="flex items-center gap-3">
              <span className="w-[120px] shrink-0 truncate text-xs font-semibold text-[#123B6D]">{stageLabel(stage)}</span>
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#EAF0F5]"><div className="h-full rounded-full" style={{backgroundColor:funnelStageColor(stage,index),width:`${percentage}%`}} /></div>
              <span className="num w-[64px] shrink-0 text-right text-xs text-[#637D98]">{count} ({percentage}%)</span>
            </div>;
          })}</div>
        </Card>
      </section>
      <Card padding="none">
        <div className="flex items-center gap-2.5 rounded-t-[14px] border-b border-[#F0DCA6] bg-[#FFF3D6] px-[14px] py-2">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5B942]/30 text-[#8A5A19]">
            <AlertTriangle className="h-[15px] w-[15px]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <h2 className="text-[17px] font-bold tracking-[-0.02em] text-[#123B6D]">Needs attention</h2>
              {!loading && <span className="text-sm font-normal text-[#55708F]">({taskTotal})</span>}
            </div>
            <p className="prose-wrap text-[13px] text-[#55708F]">Ordered by what blocks a decision first.</p>
          </div>
        </div>
        {loading ? <div className="p-[18px]"><Skeleton className="h-20" /></div> : loadError ? <p className="p-[18px] text-sm text-slate-600">Refresh to see the current review queue.</p> :
          visibleTasks.length === 0 ? <p className="p-[18px] text-sm text-slate-600">No pending application reviews, assessment decisions or published-rubric approvals on this page.</p> :
          <ul className="max-h-[360px] overflow-y-auto overscroll-contain">{visibleTasks.map((task, index) => {
            const ActionIcon = task.kind === "rubric" ? Star : FileText;
            return (
              <li key={task.key} className="rule-b flex flex-wrap items-center justify-between gap-3 px-[18px] py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <AttentionAvatar name={task.title} index={index} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#123B6D]">{task.title}</p>
                    <p className="pt-0.5 text-xs text-[#55708F]">{task.detail}</p>
                  </div>
                </div>
                <Button as={Link} to={task.href} variant="pending" size="sm" className="!h-8 w-[240px] shrink-0 justify-center whitespace-nowrap !px-2.5 !text-[13px]">
                  <ActionIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{task.action}
                </Button>
              </li>
            );
          })}</ul>}
        {summary.attentionTotal > 20 && <div className="flex flex-wrap items-center gap-3 p-3">
          <Button variant="secondary" size="sm" disabled={taskPage === 1} onClick={() => setTaskPage(page => page - 1)}>Previous tasks</Button>
          <span className="text-xs">Page {taskPage} of {Math.ceil(summary.attentionTotal / 20)}</span>
          <Button variant="secondary" size="sm" disabled={taskPage >= Math.ceil(summary.attentionTotal / 20)} onClick={() => setTaskPage(page => page + 1)}>Next tasks</Button>
        </div>}
      </Card>
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
      <TemplatesCard />
    </div>
  );
}

const TEMPLATE_TYPE = Object.fromEntries(TEMPLATE_CATEGORIES.map((c) => [c.value, c.label]));

// Saved messages, one click from Home: the recruiter's offer letters and other
// standard emails. Its own fetch, so a failure here never blanks the dashboard.
function TemplatesCard() {
  const [templates, setTemplates] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    api.get("/templates")
      .then(({ data }) => { if (alive) setTemplates(data.templates || []); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);
  return (
    <Card padding="none">
      <CardHeader
        title="Message templates"
        count={templates?.length || undefined}
        description="Offer letters and other messages you send again and again."
        action={<Button as={Link} to="/templates" variant="secondary" size="sm">{templates?.length ? "Manage" : "Create template"}</Button>}
      />
      {failed ? (
        <p className="p-[18px] text-sm text-slate-500">Could not load templates. <Link to="/templates" className="font-semibold text-brand-700 hover:underline">Open templates</Link></p>
      ) : templates === null ? (
        <div className="p-[18px]"><Skeleton className="h-12" /></div>
      ) : templates.length === 0 ? (
        <p className="p-[18px] text-sm text-slate-500">No templates yet. Save an offer letter once and reuse it every time you send an offer from the pipeline.</p>
      ) : (
        <ul className="grid gap-px sm:grid-cols-2 xl:grid-cols-4">
          {templates.slice(0, 4).map((t) => (
            <li key={t._id}>
              <Link to="/templates" className="flex min-w-0 items-center gap-2.5 px-[18px] py-3 hover:bg-canvas">
                <Mail className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-900">{t.name}</span>
                  <span className="block truncate text-xs text-slate-500">{TEMPLATE_TYPE[t.category] || "Other"}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
