import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../../api/client.js";
import { HUES, STEP_HUE } from "../../lib/featureHues.js";
import {
  ArrowLeft,
  KanbanSquare,
  Users,
  FileCheck2,
  FileQuestion,
  Bot,
  FileText,
  Activity,
  ChevronsUpDown,
} from "lucide-react";
import { useCompanyData } from "../../context/CompanyDataContext.jsx";
import Menu, { MenuItem } from "../ui/Menu.jsx";
import { NavItem, NavGroupLabel } from "./NavItem.jsx";

/**
 * The sidebar a recruiter sees INSIDE one job.
 *
 * Opening a job swaps the company-wide navigation for this one, so everything
 * about one role — its candidates, its board, the screening steps it runs — is
 * one click away and nothing about the other roles is in the way. The shell
 * itself does not remount (see App.jsx § ShellLayout): only the sidebar's
 * content changes, so the workspace data and the notification socket stay put.
 *
 * Every status shown here is read from a field the job actually carries.
 * `rubricStatus` drives CV screening and `assessmentPolicy` drives the skills
 * assessment. The AI interview row deliberately has NO status: a job carries no
 * field that says whether it is on, and a marker we cannot source is a claim.
 */

// URL section → what the recruiter calls it. Order is the order of the nav.
export const JOB_SECTIONS = [
  { key: "pipeline", label: "Pipeline", icon: KanbanSquare, group: "Candidates" },
  { key: "candidates", label: "All candidates", icon: Users, group: "Candidates" },
  { key: "cv-screening", label: "CV screening", icon: FileCheck2, group: "Screening steps", hue: STEP_HUE.cv },
  // `title` is the page heading when it differs from the rail label: "Skills
  // assessment" does not fit beside its status in a 236px rail, but a page
  // heading has the room to say it in full.
  { key: "assessment", label: "Assessment", title: "Skills assessment", icon: FileQuestion, group: "Screening steps", hue: STEP_HUE.assessment },
  { key: "ai-interview", label: "AI interview", icon: Bot, group: "Screening steps", hue: STEP_HUE.interview },
  { key: "details", label: "Job details", icon: FileText, group: "Job" },
  { key: "activity", label: "Activity", icon: Activity, group: "Job" },
];

const GROUPS = ["Candidates", "Screening steps", "Job"];

/**
 * The job drawer's tab ids ↔ the workspace's URL sections.
 *
 * The drawer predates the workspace and names its tabs after what they hold
 * ("rubric", "questions"); the workspace names them after what a recruiter
 * calls the step ("CV screening", "AI interview"). One table, used by the
 * page, the list and the legacy redirects, so the two vocabularies cannot drift.
 */
export const TAB_TO_SECTION = {
  overview: "details",
  candidates: "candidates",
  rubric: "cv-screening",
  questions: "ai-interview",
  assessment: "assessment",
  activity: "activity",
};
export const SECTION_TO_TAB = Object.fromEntries(Object.entries(TAB_TO_SECTION).map(([t, s]) => [s, t]));

/** Where to send a recruiter who asked for a job, optionally at a drawer tab. */
export function jobWorkspacePath(jobId, tab) {
  return `/jobs/${jobId}/${TAB_TO_SECTION[tab] || "pipeline"}`;
}

/** The job id and section a pathname points at, or null outside a job. */
export function parseJobPath(pathname) {
  // ObjectId-shaped only, so /jobs/new and /jobs/setup/:draftId — which are
  // not a job — never open a job workspace.
  const match = /^\/jobs\/([a-f0-9]{24})(?:\/([a-z-]+))?\/?$/.exec(pathname);
  if (!match) return null;
  return { id: match[1], section: match[2] || "pipeline" };
}

/** A short, honest status for the two steps a job records a setting for. */
function stepStatus(job, key) {
  if (!job) return null;
  if (key === "cv-screening") {
    // An unapproved rubric on a published job is a real to-do — the Today
    // screen lists it as one — so it reads as an action, not a state.
    return job.rubricStatus === "approved"
      ? { text: "On", tone: "on" }
      : { text: "Set up", tone: "todo" };
  }
  if (key === "assessment") {
    if (job.assessmentPolicy === "auto") return { text: "Auto", tone: "on" };
    if (job.assessmentPolicy === "manual") return { text: "Manual", tone: "on" };
    return { text: "Off", tone: "off" };
  }
  return null;
}

const STATUS_DOT = {
  published: "bg-emerald-500",
  draft: "bg-slate-400",
  closed: "bg-slate-300",
};

export default function JobSidebar({ jobId, section, collapsed, onNavigate }) {
  const { jobs } = useCompanyData();
  const navigate = useNavigate();
  const location = useLocation();
  const job = jobs.find((j) => j._id === jobId) || null;
  // This job's real applicant total, asked for directly.
  //
  // NOT read from the workspace context's `candidatesByJob`: the shell mounts
  // that with `includeCandidates={false}`, so it holds an EMPTY list for every
  // job, and reading its length printed "All candidates 0" beside a board that
  // said "8 candidates". `limit: 1` because only `total` is wanted. `null`
  // while loading and on failure — the badge is then absent, never a guessed 0.
  const [total, setTotal] = useState(null);
  useEffect(() => {
    let alive = true;
    setTotal(null);
    api
      .get("/candidates", { params: { jobId, limit: 1 } })
      .then(({ data }) => alive && setTotal(Number.isFinite(data?.total) ? data.total : null))
      .catch(() => alive && setTotal(null));
    return () => {
      alive = false;
    };
  }, [jobId]);

  const otherJobs = jobs.filter((j) => j._id !== jobId && j.status !== "closed");

  const switchTo = (id) => {
    navigate(`/jobs/${id}/${section}${location.search}`);
    onNavigate?.();
  };

  return (
    <div className="flex flex-col">
      {/* ── Way back out ───────────────────────────────────────────── */}
      <div className={`pt-4 ${collapsed ? "px-2" : "px-3"}`}>
        <Link
          to="/jobs"
          onClick={onNavigate}
          title={collapsed ? "All jobs" : undefined}
          className={`flex h-9 items-center gap-2 rounded-lg text-sm font-medium text-slate-600 transition-colors hover:bg-canvas hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-800 ${
            collapsed ? "justify-center" : "px-3"
          }`}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!collapsed && <span>All jobs</span>}
          {collapsed && <span className="sr-only">All jobs</span>}
        </Link>
      </div>

      {/* ── Which job — and the one-click way to another ──────────── */}
      {!collapsed && (
        <div className="mx-3 mt-2 rounded-xl border border-hairline bg-canvas px-3 py-2.5">
          <Menu
            label="Switch job"
            align="start"
            width={260}
            trigger={
              <button
                type="button"
                className="flex w-full items-start gap-2 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-800"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] leading-snug font-semibold text-slate-900">
                    {job?.title || "Loading job…"}
                  </span>
                </span>
                <ChevronsUpDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                <span className="sr-only">Switch job</span>
              </button>
            }
          >
            {otherJobs.length === 0 ? (
              <p className="px-2.5 py-2 text-sm text-slate-500">No other open jobs.</p>
            ) : (
              otherJobs.map((j) => (
                <MenuItem key={j._id} onSelect={() => switchTo(j._id)} description={j.department || undefined}>
                  {j.title}
                </MenuItem>
              ))
            )}
          </Menu>
          {job && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[job.status] || "bg-slate-400"}`}
                aria-hidden="true"
              />
              <span className="capitalize">{job.status}</span>
              {Number(job.numberOfOpenings) > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {job.numberOfOpenings} {job.numberOfOpenings === 1 ? "opening" : "openings"}
                  </span>
                </>
              )}
            </p>
          )}
        </div>
      )}

      {/* ── The job's own sections ─────────────────────────────────── */}
      <nav aria-label="Job navigation" className={`mt-4 flex flex-col gap-5 ${collapsed ? "px-2" : "px-3"}`}>
        {GROUPS.map((group) => (
          <div key={group}>
            {!collapsed && <NavGroupLabel>{group}</NavGroupLabel>}
            <div className="flex flex-col gap-0.5">
              {JOB_SECTIONS.filter((s) => s.group === group).map((s) => {
                const status = stepStatus(job, s.key);
                const count = s.key === "candidates" ? total : null;
                return (
                  <NavItem
                    key={s.key}
                    to={`/jobs/${jobId}/${s.key}`}
                    icon={s.icon}
                    label={s.label}
                    collapsed={collapsed}
                    onClick={onNavigate}
                    // Pipeline and All candidates are the same page in two
                    // views; the URL section is what tells them apart, so it
                    // decides which one is lit.
                    forceActive={section === s.key}
                    count={count}
                    status={status}
                    // The same hue the step wears when a job is created, so
                    // the colour a recruiter learned there still means it here.
                    iconClass={s.hue ? HUES[s.hue].icon : undefined}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
