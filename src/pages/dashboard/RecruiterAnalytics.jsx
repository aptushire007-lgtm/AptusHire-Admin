import { useEffect, useState } from "react";
import { Activity, Clock3 } from "lucide-react";
import api from "../../api/client.js";
import PageHeader from "../../components/ui/PageHeader.jsx";

const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
];

const ACTIVITY_CATEGORIES = [
  ["jobs", "Jobs"],
  ["candidates", "Candidates"],
  ["interviews", "Interviews"],
  ["assessments", "Assessments"],
  ["evaluation", "Evaluation"],
  ["other", "Other"],
];

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatDuration(value) {
  const milliseconds = Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  const totalMinutes = Math.floor(milliseconds / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours && !minutes) return "0m";
  return [hours ? `${hours}h` : "", minutes ? `${minutes}m` : ""].filter(Boolean).join(" ");
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-[#09090B]">{title}</h2>
      {children}
    </section>
  );
}

function Table({ label, columns, rows, emptyMessage }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#E4E4E7] bg-white">
      <table className="min-w-full divide-y divide-[#E4E4E7] text-left text-sm">
        <caption className="sr-only">{label}</caption>
        <thead className="bg-[#F8FAF9] text-xs font-semibold uppercase tracking-wide text-[#64736A]">
          <tr>{columns.map((column) => <th key={column.label} scope="col" className="whitespace-nowrap px-4 py-3">{column.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[#E4E4E7] text-[#27272A]">
          {rows.length ? rows.map((row, index) => (
            <tr key={row.id || `${row.date || row.timestamp || "row"}-${index}`}>
              {columns.map((column) => <td key={column.label} className="whitespace-nowrap px-4 py-3">{column.render(row)}</td>)}
            </tr>
          )) : (
            <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-[#71717A]">{emptyMessage}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-[#E4E4E7] bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-[#64736A]">
        <Icon className="h-4 w-4 text-[#176B45]" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-[#09090B]">{value}</p>
    </div>
  );
}

export default function RecruiterAnalytics() {
  const [range, setRange] = useState("7d");
  const [recruiterId, setRecruiterId] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api.get("/recruiter-analytics", {
      params: { range, ...(recruiterId ? { recruiterId } : {}) },
    }).then(({ data }) => {
      if (active) setAnalytics(data);
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.error || "Could not load recruiter analytics.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [range, recruiterId]);

  const summary = analytics?.activitySummary || {};
  const recruiters = analytics?.recruiters || [];
  const sessions = analytics?.sessions || [];
  const dailyRecruiterActivity = analytics?.dailyRecruiterActivity || [];
  const recentActivities = analytics?.recentActivities || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recruiter Analytics"
        description="Review recruiter sessions and business activity for your company."
      />

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-[#E4E4E7] bg-white p-4">
        <label className="grid gap-1.5 text-sm font-medium text-[#27272A]">
          Date range
          <select
            aria-label="Date range"
            value={range}
            onChange={(event) => setRange(event.target.value)}
            className="h-10 min-w-40 rounded-lg border border-[#D4D4D8] bg-white px-3"
          >
            {RANGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-[#27272A]">
          Recruiter
          <select
            aria-label="Recruiter"
            value={recruiterId}
            onChange={(event) => setRecruiterId(event.target.value)}
            className="h-10 min-w-56 rounded-lg border border-[#D4D4D8] bg-white px-3"
          >
            <option value="">All recruiters</option>
            {recruiters.map((recruiter) => (
              <option key={recruiter.id} value={recruiter.id}>{recruiter.name}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      {loading && <p role="status" className="text-sm text-[#64736A]">Loading recruiter analytics…</p>}

      {!loading && !error && analytics && (
        <>
          <Section title="Activity summary">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard icon={Activity} label="Total activities" value={summary.total || 0} />
              {ACTIVITY_CATEGORIES.map(([key, label]) => (
                <SummaryCard key={key} icon={Activity} label={label} value={summary[key] || 0} />
              ))}
            </div>
          </Section>

          <Section title="Recruiter sessions">
            <Table
              label="Recruiter session summary"
              emptyMessage="No recruiter sessions in this period."
              rows={sessions}
              columns={[
                { label: "Recruiter", render: (row) => <span><span className="block font-medium">{row.name}</span><span className="text-xs text-[#71717A]">{row.email || "—"}</span></span> },
                { label: "Status", render: (row) => row.status === "no_session" ? "No session" : row.status.replace("_", " ") },
                { label: "Last Login", render: (row) => formatDate(row.lastLoginAt) },
                { label: "Last Logout", render: (row) => formatDate(row.lastLogoutAt) },
                { label: "Last Active", render: (row) => formatDate(row.lastActiveAt) },
                { label: "Sessions", render: (row) => row.totalSessions },
                { label: "Total Session Time", render: (row) => formatDuration(row.totalDurationMs) },
                { label: "Average Session Time", render: (row) => formatDuration(row.averageDurationMs) },
                { label: "Timeout Count", render: (row) => row.timeoutCount },
              ]}
            />
          </Section>

          <Section title="Daily activity">
            <Table
              label="Daily activity by recruiter"
              emptyMessage="No activity recorded in this period."
              rows={dailyRecruiterActivity}
              columns={[
                {
                  label: "Recruiter",
                  render: (row) => <span><span className="block font-medium">{row.recruiterName}</span><span className="text-xs text-[#71717A]">{row.recruiterEmail || "—"}</span></span>,
                },
                { label: "Date (UTC)", render: (row) => row.date },
                { label: "Total activities", render: (row) => row.totalActivities },
                {
                  label: "Module breakdown",
                  render: (row) => Object.entries(row.activityBreakdown || {})
                    .map(([module, count]) => `${module}: ${count}`)
                    .join(", ") || "—",
                },
              ]}
            />
          </Section>

          <Section title="Recent activity">
            <p className="text-sm text-[#71717A]">Showing up to 100 records for the selected filters.</p>
            <Table
              label="Recent recruiter activity"
              emptyMessage="No recent activity in this period."
              rows={recentActivities}
              columns={[
                { label: "Time", render: (row) => formatDate(row.timestamp) },
                { label: "Recruiter", render: (row) => row.recruiter?.name || "—" },
                { label: "Email", render: (row) => row.recruiter?.email || "—" },
                { label: "Module", render: (row) => row.module },
                { label: "Action", render: (row) => row.action },
                { label: "Target", render: (row) => row.targetType ? `${row.targetType} · ${row.targetId}` : "—" },
              ]}
            />
          </Section>

          <div className="flex items-center gap-2 text-xs text-[#71717A]">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            Session totals use the selected range; latest session status and activity timestamps reflect recorded history.
          </div>
        </>
      )}
    </div>
  );
}
