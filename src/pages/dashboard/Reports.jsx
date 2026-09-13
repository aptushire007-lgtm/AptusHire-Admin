import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  ShieldCheck,
  Users,
  Bot,
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Scale,
  Calendar,
  ArrowRight,
  Download,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import api from "../../api/client.js";
import { Card, Skeleton, EmptyState } from "../../components/ui/Card.jsx";
import { useToast } from "../../components/ui/Toast.jsx";

const RANGES = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
  { key: "365", label: "1 year" },
];

const share = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);

// "Jun 13 – Sep 12, 2026". Formatted server-answered date range.
function periodLabel(range) {
  if (!range?.from || !range?.to) return null;
  const from = new Date(range.from);
  const to = new Date(range.to);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return null;
  const day = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${day(from)} – ${day(to)}, ${to.getFullYear()}`;
}

export default function Reports() {
  const toast = useToast();
  const [days, setDays] = useState("90");
  const [overview, setOverview] = useState(null);
  const [evidence, setEvidence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [evidenceError, setEvidenceError] = useState(false);
  const [funnelTab, setFunnelTab] = useState("funnel"); // 'funnel' | 'flow' | 'velocity'
  const [criterionFilter, setCriterionFilter] = useState("all"); // 'all' | 'top3'

  // Single source of truth for "from", shared by the on-screen fetches and the audit-pack export
  const fromDate = useMemo(
    () => new Date(Date.now() - Number(days) * 86400000).toISOString().slice(0, 10),
    [days]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setEvidenceError(false);
    try {
      const [ov, ev] = await Promise.all([
        api.get("/analytics/overview", { params: { from: fromDate } }),
        api.get("/analytics/evidence", { params: { from: fromDate } }).catch(() => {
          setEvidenceError(true);
          return { data: null };
        }),
      ]);
      setOverview(ov.data);
      setEvidence(ev.data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not load analytics");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function downloadAuditPack() {
    setDownloading(true);
    try {
      const res = await api.get("/analytics/audit-pack", {
        params: { from: fromDate },
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `bias-audit-pack-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Bias audit pack downloaded successfully.");
    } catch {
      toast.error("Could not export the audit pack.");
    } finally {
      setDownloading(false);
    }
  }

  const totals = overview?.totals;
  const screening = overview?.screening;
  const applications = totals?.applications ?? overview?.funnel?.total ?? 0;
  const candidatesCount = totals?.candidates ?? 0;
  const interviewsCompleted = totals?.interviewsCompleted ?? 0;
  const offersAccepted = totals?.offersAccepted ?? 0;
  const hires = totals?.hires ?? 0;

  const decided = screening
    ? (screening.decisions?.pass || 0) + (screening.decisions?.review || 0) + (screening.decisions?.fail || 0)
    : 0;
  const passCount = screening?.decisions?.pass || 0;
  const reviewCount = screening?.decisions?.review || 0;
  const failCount = screening?.decisions?.fail || 0;

  const passPct = share(passCount, decided || 1);
  const reviewPct = share(reviewCount, decided || 1);
  const failPct = share(failCount, decided || 1);

  // Score distribution calculations & chart geometry directly from API bins
  const dist = useMemo(() => {
    const bins = screening?.scoreDistribution || [];
    const scored = bins.reduce((s, b) => s + (b.count || 0), 0);
    if (!scored) {
      return {
        bins,
        scored: 0,
        medianBand: null,
        modalBand: null,
        passedCount: 0,
        topScore: null,
        maxCount: 1,
        points: [],
        curvePath: "",
      };
    }
    let seen = 0;
    let medianBand = null;
    let passedCount = 0;
    let topScore = null;

    for (const b of bins) {
      seen += b.count;
      if (medianBand == null && seen >= scored / 2) medianBand = b;
      if (b.lo >= 60) passedCount += b.count;
      if (b.count > 0 && (topScore == null || b.hi > topScore)) topScore = b.hi;
    }
    const modalBand = bins.reduce((best, b) => (b.count > (best?.count || 0) ? b : best), bins[0] || null);
    const maxCount = Math.max(...bins.map((b) => b.count || 0), 1);

    // Compute coordinates for SVG viewBox 0 0 600 200
    // 10 bins: each spans 60px (total 600px).
    // X center of bin i = i * 60 + 30.
    // Baseline y = 185, max height = 135px.
    const points = bins.map((b, i) => {
      const x = i * 60 + 30;
      const h = (b.count / maxCount) * 135;
      const y = 185 - h;
      return { x, y, h, count: b.count, lo: b.lo, hi: b.hi, i };
    });

    // Construct smooth continuous spline curve matching actual data
    let curvePath = `M 0 185`;
    for (let i = 0; i < points.length; i++) {
      const prev = points[i - 1] || { x: 0, y: 185 };
      const curr = points[i];
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (curr.x - prev.x) / 2;
      const cp2y = curr.y;
      curvePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }
    const last = points[points.length - 1];
    curvePath += ` C ${last.x + (600 - last.x) / 2} ${last.y}, ${last.x + (600 - last.x) / 2} 185, 600 185`;

    return { bins, scored, medianBand, modalBand, passedCount, topScore, maxCount, points, curvePath };
  }, [screening]);

  // Funnel stages directly from API
  const funnelStages = useMemo(() => overview?.funnel?.stages || [], [overview]);
  const appliedCount = applications;
  const atsPassedCount = funnelStages.find((s) => s.stage === "ats_passed")?.count || 0;
  const aiInterviewCount = funnelStages.find((s) => s.stage === "ai_interview_completed")?.count || interviewsCompleted;
  const shortlistedCount = funnelStages.find((s) => s.stage === "shortlisted")?.count || 0;
  const hrRoundCount = funnelStages.find((s) => s.stage === "hr_interview")?.count || 0;
  const techRoundCount = funnelStages.find((s) => s.stage === "technical_interview")?.count || 0;
  const offerSentCount = funnelStages.find((s) => s.stage === "offer_sent")?.count || 0;
  const joinedCount = hires;

  const atsThroughput = share(atsPassedCount, appliedCount || 1);
  const dropoffCount = Math.max(0, appliedCount - atsPassedCount);
  const dropoffPct = share(dropoffCount, appliedCount || 1);

  // Evidence intelligence: claim verification by skill directly from API
  const claims = useMemo(() => {
    const rows = evidence?.claimVerificationBySkill || [];
    return rows.reduce(
      (acc, s) => ({
        probed: acc.probed + (s.probed || 0),
        verified: acc.verified + (s.verified || 0),
        contradicted: acc.contradicted + (s.contradicted || 0),
        inconclusive: acc.inconclusive + (s.inconclusive || 0),
      }),
      { probed: 0, verified: 0, contradicted: 0, inconclusive: 0 }
    );
  }, [evidence]);

  const verifiedClaimsPct = share(claims.verified, claims.probed || 1);
  const contradictedClaimsPct = share(claims.contradicted, claims.probed || 1);
  const unclearClaimsPct = claims.probed > 0 ? Math.max(0, 100 - verifiedClaimsPct - contradictedClaimsPct) : 0;

  // Top eliminators directly from API
  const topEliminators = useMemo(() => {
    const list = evidence?.topEliminators || [];
    if (criterionFilter === "top3") {
      return list.slice(0, 3);
    }
    return list.slice(0, 6);
  }, [evidence, criterionFilter]);

  const period = periodLabel(overview?.range);

  const funnelQuery = (stage) =>
    new URLSearchParams({
      reached: stage,
      from: overview?.range?.from || "",
      to: overview?.range?.to || "",
    }).toString();

  return (
    <div className="space-y-7 max-w-[1720px] mx-auto w-full pb-12">
      {/* ── BEGIN: DashboardHeader ────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics &amp; Reports</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-[#0D5F4A] border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              Live Synced
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Hiring funnel, score distribution, and evidence-quality signals for the selected period.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
            <span className="font-medium text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-xs flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {period || "Selected Range"}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600 font-medium">
              <strong className="text-slate-900">{candidatesCount}</strong> candidates cohort
            </span>
            {screening && (
              <>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-blue-50/70 text-blue-700 border border-blue-200/60">
                  {screening.scoreSource === "mixed"
                    ? "Mixed screening methods"
                    : screening.scoreSource === "evidence"
                    ? "Rubric screening"
                    : "Keyword screening"}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Filter Controls and Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Timeframe Pills Switcher */}
          <div className="inline-flex p-1 bg-slate-200/70 rounded-xl border border-slate-200 shadow-inner">
            {RANGES.map((r) => {
              const active = days === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setDays(r.key)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                    active
                      ? "font-bold text-white bg-[#0D5F4A] shadow-xs"
                      : "font-medium text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          {/* Secondary Actions */}
          <button
            type="button"
            onClick={downloadAuditPack}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-lg hover:bg-slate-50 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#0D5F4A]" />
            <span>{downloading ? "Exporting…" : "Bias Audit Pack"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              toast.success("Analytics summary exported.");
              downloadAuditPack();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-lg hover:bg-slate-50 shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export</span>
          </button>
        </div>
      </div>
      {/* ── END: DashboardHeader ──────────────────────────────────────────── */}

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-5 rounded-2xl bg-white border border-slate-200/80">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-8 w-16" />
                <Skeleton className="mt-4 h-2 w-full" />
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-7 p-6 rounded-2xl bg-white border border-slate-200/80">
              <Skeleton className="h-64 w-full" />
            </Card>
            <Card className="lg:col-span-5 p-6 rounded-2xl bg-white border border-slate-200/80">
              <Skeleton className="h-64 w-full" />
            </Card>
          </div>
        </div>
      ) : !overview?.totals?.candidates ? (
        <Card className="p-12 rounded-2xl bg-white border border-slate-200/80 text-center">
          <EmptyState
            icon={BarChart3}
            title="No data in this period"
            description="Reports populate once candidates apply within the selected range."
          />
        </Card>
      ) : (
        <>
          {/* ── BEGIN: Row 1 KPI Section (5 Executive Stat Cards) ──────────────── */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" data-purpose="kpi-metrics-row">
            {/* Metric 1: Candidates */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_4px_14px_-2px_rgba(15,23,42,0.05)] hover:shadow-md transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">Candidates</span>
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{candidatesCount}</span>
                  <span className="text-xs font-semibold text-[#0D5F4A] bg-emerald-50 px-1.5 py-0.5 rounded">
                    {share(candidatesCount, applications || 1)}%
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-snug">
                  {applications} applications • distinct people counted once
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Applications screened</span>
                <span className="font-bold text-slate-800 font-mono">
                  {decided} / {share(decided, applications || 1)}%
                </span>
              </div>
            </div>

            {/* Metric 2: AI Interviews Completed */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_4px_14px_-2px_rgba(15,23,42,0.05)] hover:shadow-md transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">AI Interviews</span>
                <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-[#0D5F4A]">
                  <Bot className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{interviewsCompleted}</span>
                  <span className="text-xs font-medium text-slate-600">sessions</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-snug">
                  Completed during range; may include earlier apps
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                  <span>Completion rate</span>
                  <span className="font-bold text-[#0D5F4A]">
                    {applications > 0 ? Math.min(100, Math.round((interviewsCompleted / applications) * 100)) : 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#0D5F4A] h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${applications > 0 ? Math.min(100, Math.round((interviewsCompleted / applications) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Metric 3: Screening Pass Rate (Soft Blue for Review) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_4px_14px_-2px_rgba(15,23,42,0.05)] hover:shadow-md transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">Pass Rate</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-[#0D5F4A]">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {screening?.passRate != null ? `${Math.round(screening.passRate * 100)}%` : "—"}
                  </span>
                  <span className="text-xs font-medium text-slate-600">{passCount} advanced</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-snug">
                  {reviewCount} in human review • {failCount} declined
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100">
                {/* Tri-color segmented mini-bar with Soft Blue for Review */}
                <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-slate-100">
                  <div className="h-full bg-[#10B981]" style={{ width: `${passPct}%` }} title={`Advanced: ${passPct}%`} />
                  <div className="h-full bg-[#60A5FA]" style={{ width: `${reviewPct}%` }} title={`Review: ${reviewPct}%`} />
                  <div className="h-full bg-[#F87171]" style={{ width: `${failPct}%` }} title={`Declined: ${failPct}%`} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 mt-1.5">
                  <span>{passCount} of {applications} applications</span>
                  <span className="text-[#0D5F4A] font-semibold">Strict Rubric</span>
                </div>
              </div>
            </div>

            {/* Metric 4: Offers Accepted (Soft Blue theme) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_4px_14px_-2px_rgba(15,23,42,0.05)] hover:shadow-md transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">Offers Accepted</span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{offersAccepted}</span>
                  <span className="text-xs font-semibold text-[#0D5F4A] bg-emerald-50 px-1.5 py-0.5 rounded">
                    {offersAccepted > 0 ? `${share(hires, offersAccepted)}% Accept` : "—"}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-snug">
                  {hires} accepted / joined headcount
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600">Joined cohort</span>
                <span className="font-bold text-slate-800">
                  {hires} of {offersAccepted} ({offersAccepted > 0 ? share(hires, offersAccepted) : 0}%)
                </span>
              </div>
            </div>

            {/* Metric 5: Time to Hire */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_4px_14px_-2px_rgba(15,23,42,0.05)] hover:shadow-md transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">Time to Hire</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-[#D97706]">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {overview?.timeToHire?.medianDays != null ? overview.timeToHire.medianDays : "—"}
                    <span className="text-lg font-bold text-slate-500">d</span>
                  </span>
                  <span className="text-xs font-semibold text-[#0D5F4A] bg-emerald-50 px-1.5 py-0.5 rounded">
                    Active
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-snug">
                  {overview?.timeToHire?.n
                    ? `Median of ${overview.timeToHire.n} accepted/joined`
                    : "No completed hires in range"}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Mean time: {overview?.timeToHire?.meanDays != null ? `${overview.timeToHire.meanDays}d` : "—"}</span>
                <span className="text-[#0D5F4A] font-semibold font-mono">Verified</span>
              </div>
            </div>
          </section>
          {/* ── END: Row 1 KPI Section ────────────────────────────────────────── */}

          {/* ── BEGIN: Row 2 Core Funnel & Scoring Grid ───────────────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6" data-purpose="funnel-and-scoring-grid">
            {/* Column Left: Screening Decisions & Score Distribution (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Card 1: Screening Decisions Segmented Overview */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_4px_14px_-2px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">Screening Decisions</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#0D5F4A] border border-emerald-200">
                        Live Funnel
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Outcome breakdown with deterministic criteria &amp; AI screening
                    </p>
                  </div>
                  <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-semibold">
                    {decided} total runs
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Circular Radial Donut (Review slice in Soft Blue #60A5FA) */}
                  <div className="md:col-span-5 flex flex-col items-center justify-center relative">
                    <div className="relative w-44 h-44 flex items-center justify-center">
                      {/* SVG Donut circumference: 2 * pi * 38 ≈ 238.76 */}
                      <svg className="w-44 h-44 -rotate-90 transform" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" fill="transparent" r="38" stroke="#F1F5F9" strokeWidth="11" />
                        {/* Fail slice */}
                        <circle
                          cx="50"
                          cy="50"
                          fill="transparent"
                          r="38"
                          stroke="#F87171"
                          strokeDasharray={`${(failPct / 100) * 238.8} 238.8`}
                          strokeDashoffset="0"
                          strokeLinecap="round"
                          strokeWidth="11"
                        />
                        {/* Review slice in Soft Blue */}
                        <circle
                          cx="50"
                          cy="50"
                          fill="transparent"
                          r="38"
                          stroke="#60A5FA"
                          strokeDasharray={`${(reviewPct / 100) * 238.8} 238.8`}
                          strokeDashoffset={`-${(failPct / 100) * 238.8}`}
                          strokeLinecap="round"
                          strokeWidth="11"
                        />
                        {/* Pass slice */}
                        <circle
                          cx="50"
                          cy="50"
                          fill="transparent"
                          r="38"
                          stroke="#10B981"
                          strokeDasharray={`${(passPct / 100) * 238.8} 238.8`}
                          strokeDashoffset={`-${((failPct + reviewPct) / 100) * 238.8}`}
                          strokeLinecap="round"
                          strokeWidth="11"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                        <span className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none font-mono">
                          {decided}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mt-1">
                          Evaluated
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-center">
                      <span className="text-[11px] font-medium text-slate-600">Overall Qualification Rate:</span>{" "}
                      <strong className="text-[11px] text-[#0D5F4A] font-bold">{passPct}%</strong>
                    </div>
                  </div>

                  {/* Right breakdown cards */}
                  <div className="md:col-span-7 space-y-3">
                    {/* Advance Card */}
                    <div className="group p-3 rounded-xl bg-emerald-50/40 border border-emerald-200/80 hover:bg-emerald-50/70 transition-all flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs shadow-xs">
                          <CheckCircle2 className="w-4 h-4 text-[#0D5F4A]" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Advance to Next Stage</div>
                          <span className="text-[11px] text-emerald-800 font-medium">
                            {passCount} candidates passed benchmark
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-extrabold text-emerald-700 font-mono block">{passPct}%</span>
                        <span className="text-[10px] text-slate-500 font-mono">{passCount} / {decided}</span>
                      </div>
                    </div>

                    {/* Requires Human Review Card (Soft Blue styling) */}
                    <div
                      className="group p-3 rounded-xl border transition-all flex items-center justify-between"
                      style={{ backgroundColor: "rgba(59, 130, 246, 0.08)", borderColor: "rgba(59, 130, 246, 0.3)" }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs"
                          style={{ backgroundColor: "rgba(59, 130, 246, 0.18)", color: "#2563EB" }}
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Requires Human Review</div>
                          <span className="text-[11px] font-medium text-blue-700">
                            {reviewCount} flagged for review / verification
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-extrabold font-mono block text-blue-600">
                          {reviewPct}%
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{reviewCount} / {decided}</span>
                      </div>
                    </div>

                    {/* Declined by Rubric Card */}
                    <div className="group p-3 rounded-xl bg-rose-50/40 border border-rose-200/80 hover:bg-rose-50/70 transition-all flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-[#F87171] font-bold text-xs shadow-xs">
                          <XCircle className="w-4 h-4 text-rose-600" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Declined by Rubric</div>
                          <span className="text-[11px] text-rose-800 font-medium">
                            {failCount} did not satisfy required criteria
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-extrabold text-rose-700 font-mono block">{failPct}%</span>
                        <span className="text-[10px] text-slate-500 font-mono">{failCount} / {decided}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actionable Insight Box (Soft Blue styling) */}
                <div
                  className="mt-5 p-3 rounded-xl flex items-start gap-3"
                  style={{ backgroundColor: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.25)" }}
                >
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: "rgba(59, 130, 246, 0.2)", color: "#2563EB" }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs leading-relaxed text-blue-900">
                    <span className="font-bold text-blue-800">Actionable Insight:</span>{" "}
                    {reviewCount > 0
                      ? `${reviewCount} candidates currently flagged for human review. Evaluating interview transcripts and claim evidence may advance qualified talent.`
                      : decided > 0
                      ? "All screening runs are currently categorized. Rubric criteria and automated thresholds are operating at benchmark."
                      : "No candidates evaluated yet in this period."}
                  </div>
                </div>
              </div>

              {/* Card 2: Score Distribution Histogram (Purely Data-Driven) */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_4px_14px_-2px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        Score Distribution &amp; Normal Curve
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                        Cohort Density
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Distribution curve computed across {dist.scored} candidate assessments
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-slate-600">
                      <span className="w-3 h-1 rounded-full bg-slate-400" />
                      <span>Below 60 ({dist.scored > 0 ? share(dist.scored - dist.passedCount, dist.scored) : 0}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-[#0D5F4A]">
                      <span className="w-3 h-1 rounded-full bg-[#10B981]" />
                      <span>Pass ≥ 60 ({dist.scored > 0 ? share(dist.passedCount, dist.scored) : 0}%)</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 relative pt-4 pb-2">
                  {/* PASS >= 60 Reference Cutoff Line at exactly 60% */}
                  <div className="absolute top-0 bottom-10 left-[60%] w-px border-l-2 border-dashed border-[#10B981] z-20 pointer-events-none">
                    <div className="absolute -top-4 -left-9 bg-[#0D5F4A] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-md whitespace-nowrap ring-2 ring-emerald-300/40 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" /> PASS ≥ 60
                    </div>
                  </div>

                  {/* SVG Chart with Real Mathematical Heights */}
                  <div className="h-52 w-full relative">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 600 200">
                      <defs>
                        <linearGradient id="sub60Grad" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.02" />
                        </linearGradient>
                        <linearGradient id="passGrad" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
                          <stop offset="100%" stopColor="#0D5F4A" stopOpacity="0.05" />
                        </linearGradient>
                        <linearGradient id="lineGrad" x1="0" x2="1" y1="0" y2="0">
                          <stop offset="0%" stopColor="#64748B" />
                          <stop offset="59%" stopColor="#64748B" />
                          <stop offset="60%" stopColor="#0D5F4A" />
                          <stop offset="100%" stopColor="#10B981" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Gridlines */}
                      <line stroke="#F1F5F9" strokeWidth="1" x1="0" x2="600" y1="35" y2="35" />
                      <line stroke="#F1F5F9" strokeWidth="1" x1="0" x2="600" y1="85" y2="85" />
                      <line stroke="#F1F5F9" strokeWidth="1" x1="0" x2="600" y1="135" y2="135" />
                      <line stroke="#E2E8F0" strokeWidth="1" x1="0" x2="600" y1="185" y2="185" />

                      {dist.scored === 0 ? (
                        /* Graceful empty baseline when no candidates have been scored */
                        <text x="300" y="110" textAnchor="middle" className="text-xs fill-slate-400 font-medium">
                          No candidate test scores recorded in this period
                        </text>
                      ) : (
                        <>
                          {/* Real Histogram Bars for each of the 10 deciles */}
                          {dist.points.map((pt) => {
                            const isPassed = pt.i >= 6;
                            const barWidth = 46;
                            const barX = pt.x - barWidth / 2;
                            const barH = Math.max(pt.h, pt.count > 0 ? 4 : 0);
                            return (
                              <g key={pt.i}>
                                <rect
                                  x={barX}
                                  y={185 - barH}
                                  width={barWidth}
                                  height={barH}
                                  rx="4"
                                  fill={isPassed ? "#10B981" : "#94A3B8"}
                                  fillOpacity={pt.count > 0 ? (isPassed ? 0.35 : 0.25) : 0.05}
                                  stroke={pt.count > 0 ? (isPassed ? "#10B981" : "#94A3B8") : "none"}
                                  strokeWidth="1"
                                >
                                  <title>{`${pt.lo}–${pt.hi} pts: ${pt.count} candidates (${share(pt.count, dist.scored)}%)`}</title>
                                </rect>
                              </g>
                            );
                          })}

                          {/* Continuous Curve through real data points */}
                          <path
                            d={dist.curvePath}
                            fill="none"
                            stroke="url(#lineGrad)"
                            strokeLinecap="round"
                            strokeWidth="2.5"
                          />

                          {/* Real Datapoint indicators only where candidates exist */}
                          {dist.points
                            .filter((pt) => pt.count > 0)
                            .map((pt) => {
                              const isPassed = pt.i >= 6;
                              return (
                                <g key={`pt-${pt.i}`}>
                                  <circle
                                    cx={pt.x}
                                    cy={pt.y}
                                    r="5"
                                    fill={isPassed ? "#10B981" : "#64748B"}
                                    stroke="#ffffff"
                                    strokeWidth="2"
                                  />
                                  <text
                                    x={pt.x}
                                    y={Math.max(25, pt.y - 8)}
                                    textAnchor="middle"
                                    className="text-[10px] font-mono font-bold fill-slate-700"
                                  >
                                    {pt.count}
                                  </text>
                                </g>
                              );
                            })}
                        </>
                      )}
                    </svg>
                  </div>

                  {/* X-axis Labels */}
                  <div className="flex justify-between px-2 text-[11px] font-semibold text-slate-500 border-t border-slate-200/80 pt-2 font-mono">
                    <span>0</span>
                    <span>10</span>
                    <span>20</span>
                    <span>30</span>
                    <span>40</span>
                    <span>50</span>
                    <span className="text-[#0D5F4A] font-bold">60 (Cutoff)</span>
                    <span>70</span>
                    <span>80</span>
                    <span>90</span>
                    <span>100</span>
                  </div>
                </div>

                {/* Score Stats Summary Grid (Purely Real Data — No Fallback Placeholders) */}
                <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-100 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                      Median Cohort Score
                    </span>
                    <span className="text-sm font-extrabold text-slate-900 mt-0.5 block font-mono">
                      {dist.medianBand ? `${dist.medianBand.lo}–${dist.medianBand.hi} pts` : "—"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                      Passed Candidates (≥60)
                    </span>
                    <span className="text-sm font-extrabold text-[#0D5F4A] mt-0.5 block font-mono">
                      {dist.passedCount}{" "}
                      <span className="text-xs text-slate-500 font-normal">
                        ({dist.scored > 0 ? share(dist.passedCount, dist.scored) : 0}%)
                      </span>
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#0D5F4A] block">
                      Top Scored Result
                    </span>
                    <span className="text-sm font-extrabold text-[#0D5F4A] mt-0.5 block font-mono">
                      {dist.topScore != null && dist.scored > 0 ? `${dist.topScore} pts` : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Column Right: Stepped Funnel with Conversion Drop-off & Flow Nodes (Soft Blue) */}
            <div
              className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_4px_14px_-2px_rgba(15,23,42,0.05)] flex flex-col justify-between"
              data-purpose="stepped-funnel-visualization"
            >
              <div>
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">Stages Reached</h3>
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wider border border-blue-200/50">
                        Dynamic Funnel
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Cohort progression and conversion dropoffs across hiring gates
                    </p>
                  </div>
                  <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-[11px] font-semibold border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setFunnelTab("funnel")}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        funnelTab === "funnel" ? "bg-white text-[#0D5F4A] shadow-xs font-bold" : "text-slate-600 hover:text-slate-800"
                      }`}
                    >
                      Funnel
                    </button>
                    <button
                      type="button"
                      onClick={() => setFunnelTab("flow")}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        funnelTab === "flow" ? "bg-white text-[#0D5F4A] shadow-xs font-bold" : "text-slate-600 hover:text-slate-800"
                      }`}
                    >
                      Flow
                    </button>
                    <button
                      type="button"
                      onClick={() => setFunnelTab("velocity")}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        funnelTab === "velocity" ? "bg-white text-[#0D5F4A] shadow-xs font-bold" : "text-slate-600 hover:text-slate-800"
                      }`}
                    >
                      Velocity
                    </button>
                  </div>
                </div>

                {/* Velocity View Box (Active when Velocity tab selected) */}
                {funnelTab === "velocity" ? (
                  <div className="mt-4 p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-blue-900">Time to Hire Cycle</span>
                      </div>
                      <span className="text-[11px] font-mono text-blue-700 font-semibold">
                        {overview?.timeToHire?.n || 0} sample hires
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="bg-white p-2.5 rounded-lg border border-blue-100 shadow-xs">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Median Days</span>
                        <strong className="text-base font-extrabold text-slate-900 font-mono">
                          {overview?.timeToHire?.medianDays != null ? `${overview.timeToHire.medianDays}d` : "—"}
                        </strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-blue-100 shadow-xs">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Mean Days</span>
                        <strong className="text-base font-extrabold text-blue-700 font-mono">
                          {overview?.timeToHire?.meanDays != null ? `${overview.timeToHire.meanDays}d` : "—"}
                        </strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Terminal Declines Highlight */
                  <div className="mt-4 p-3 bg-rose-50/70 rounded-xl border border-rose-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs shadow-xs">
                        <XCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-rose-700 block">
                          {overview?.funnel?.rejected || 0} Terminal Declines
                        </span>
                        <span className="text-[11px] text-slate-600">
                          {failCount} rubric mismatch • {Math.max(0, (overview?.funnel?.rejected || 0) - failCount)} post-interview
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold bg-white text-rose-600 px-2 py-1 rounded-md border border-rose-200 shadow-xs">
                      {share(overview?.funnel?.rejected || 0, applications || 1)}% drop
                    </span>
                  </div>
                )}

                {/* Stepped Funnel Track (Soft Blue connections) */}
                <div className="mt-5 relative">
                  {/* Vertical Line with Soft Blue */}
                  <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gradient-to-b from-slate-700 via-blue-500 to-[#0D5F4A] pointer-events-none" />

                  <div className="space-y-3">
                    {/* Node 01: Applied */}
                    <Link
                      to={`/candidates?${funnelQuery("applied")}`}
                      className="relative flex items-center gap-3 group cursor-pointer block"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center ring-4 ring-white z-10 shadow-xs">
                        01
                      </div>
                      <div className="flex-1 bg-slate-50 group-hover:bg-slate-100/80 p-2.5 rounded-xl border border-slate-200/70 transition-colors">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                            Applied Applications
                          </span>
                          <div className="font-mono text-slate-700 font-semibold">
                            <strong className="text-slate-900 text-sm">{appliedCount}</strong>{" "}
                            <span className="text-slate-500 font-normal text-[11px]">(100%)</span>
                          </div>
                        </div>
                        <div className="mt-1.5 h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-2 bg-slate-700 rounded-full" style={{ width: "100%" }} />
                        </div>
                      </div>
                    </Link>

                    {/* Intermediate Throughput 1 */}
                    <div className="ml-10 pl-2 flex items-center justify-between text-[10px] font-mono -my-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                        ↓ {atsThroughput}% throughput
                      </span>
                      <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-medium border border-rose-200/60">
                        -{dropoffPct}% dropoff ({dropoffCount} screened out)
                      </span>
                    </div>

                    {/* Node 02: ATS Passed */}
                    <Link
                      to={`/candidates?${funnelQuery("ats_passed")}`}
                      className="relative flex items-center gap-3 group cursor-pointer block"
                    >
                      <div
                        className="w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center ring-4 ring-white z-10 shadow-xs"
                        style={{ backgroundColor: "#10B981" }}
                      >
                        02
                      </div>
                      <div className="flex-1 bg-emerald-50/40 group-hover:bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/60 transition-colors">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-emerald-700">ATS Passed</span>
                          <div className="font-mono text-emerald-700 font-semibold">
                            <strong className="text-sm">{atsPassedCount}</strong>{" "}
                            <span className="text-emerald-700 font-normal text-[11px]">
                              ({share(atsPassedCount, appliedCount || 1)}%)
                            </span>
                          </div>
                        </div>
                        <div className="mt-1.5 h-2 w-full bg-emerald-100 rounded-full overflow-hidden">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${share(atsPassedCount, appliedCount || 1)}%`,
                              backgroundColor: "#10B981",
                            }}
                          />
                        </div>
                      </div>
                    </Link>

                    {/* Node 03: AI Interview Completed (Soft Blue) */}
                    <Link
                      to={`/candidates?${funnelQuery("ai_interview_completed")}`}
                      className="relative flex items-center gap-3 group cursor-pointer block"
                    >
                      <div
                        className="w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center ring-4 ring-white z-10 shadow-xs"
                        style={{ backgroundColor: "#60A5FA" }}
                      >
                        03
                      </div>
                      <div
                        className="flex-1 p-2.5 rounded-xl transition-colors group-hover:opacity-95"
                        style={{ backgroundColor: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.3)" }}
                      >
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-900">AI Interview Completed</span>
                          <div className="font-mono font-semibold text-blue-600">
                            <strong className="text-sm">{aiInterviewCount}</strong>{" "}
                            <span className="text-slate-500 font-normal text-[11px]">
                              ({share(aiInterviewCount, appliedCount || 1)}%)
                            </span>
                          </div>
                        </div>
                        <div
                          className="mt-1.5 h-2 w-full rounded-full overflow-hidden"
                          style={{ backgroundColor: "rgba(59, 130, 246, 0.2)" }}
                        >
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${share(aiInterviewCount, appliedCount || 1)}%`,
                              backgroundColor: "#60A5FA",
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                          <span>Assessments active</span>
                          <span>{interviewsCompleted} interview sessions</span>
                        </div>
                      </div>
                    </Link>

                    {/* Intermediate Throughput 2 (Soft Blue) */}
                    <div className="ml-10 pl-2 flex items-center justify-between text-[10px] font-mono -my-1">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: "rgba(59, 130, 246, 0.12)", color: "#2563EB", border: "1px solid rgba(59, 130, 246, 0.25)" }}
                      >
                        ↓ {share(shortlistedCount, aiInterviewCount || 1)}% qualified
                      </span>
                      <span className="text-slate-500">{reviewCount} pending review</span>
                    </div>

                    {/* Node 04: Shortlisted (Soft Blue) */}
                    <Link
                      to={`/candidates?${funnelQuery("shortlisted")}`}
                      className="relative flex items-center gap-3 group cursor-pointer block"
                    >
                      <div
                        className="w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center ring-4 ring-white z-10 shadow-xs"
                        style={{ backgroundColor: "#60A5FA" }}
                      >
                        04
                      </div>
                      <div
                        className="flex-1 p-2.5 rounded-xl transition-colors group-hover:opacity-95"
                        style={{ backgroundColor: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.3)" }}
                      >
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-blue-900">Shortlisted for Rounds</span>
                          <div className="font-mono font-semibold text-blue-700">
                            <strong className="text-sm">{shortlistedCount}</strong>{" "}
                            <span className="font-normal text-[11px] text-blue-500">
                              ({share(shortlistedCount, appliedCount || 1)}%)
                            </span>
                          </div>
                        </div>
                        <div
                          className="mt-1.5 h-2 w-full rounded-full overflow-hidden"
                          style={{ backgroundColor: "rgba(59, 130, 246, 0.2)" }}
                        >
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${share(shortlistedCount, appliedCount || 1)}%`,
                              backgroundColor: "#60A5FA",
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] mt-1 text-blue-700">
                          <span>{shortlistedCount} advanced to evaluation</span>
                          <span>Active in pipeline</span>
                        </div>
                      </div>
                    </Link>

                    {/* Node 05: Cohort Conversion Stages */}
                    <div className="relative flex items-center gap-3 group">
                      <div
                        className="w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center ring-4 ring-white z-10 shadow-xs"
                        style={{ backgroundColor: "#10B981" }}
                      >
                        05
                      </div>
                      <div className="flex-1 bg-[#0D5F4A]/5 hover:bg-[#0D5F4A]/10 p-2.5 rounded-xl border border-[#0D5F4A]/20 transition-colors">
                        <div className="flex justify-between items-center text-xs mb-2">
                          <span className="font-bold text-[#0D5F4A]">Cohort Conversion Stages</span>
                          <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Joined: {joinedCount} ({share(joinedCount, appliedCount || 1)}%)
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                          <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-xs">
                            <span className="text-slate-500 block leading-tight">HR Round</span>
                            <strong className="text-slate-800 font-mono text-xs">{hrRoundCount}</strong>
                          </div>
                          <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-xs">
                            <span className="text-slate-500 block leading-tight">Tech Round</span>
                            <strong className="text-slate-800 font-mono text-xs">{techRoundCount}</strong>
                          </div>
                          <div
                            className="p-1.5 rounded-lg shadow-xs"
                            style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.25)" }}
                          >
                            <span className="block leading-tight text-blue-700">Offer Sent</span>
                            <strong className="font-mono text-xs text-blue-900">{offerSentCount}</strong>
                          </div>
                          <div
                            className="p-1.5 rounded-lg shadow-xs ring-2 ring-emerald-400/30 text-white"
                            style={{ backgroundColor: "#10B981" }}
                          >
                            <span className="text-emerald-100 block leading-tight">Joined</span>
                            <strong className="text-white font-mono text-xs">{joinedCount}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Funnel Footer */}
              <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between items-center">
                <span>
                  Cohort conversion rate: <strong className="text-slate-800">{share(joinedCount, appliedCount || 1)}%</strong>
                </span>
                <Link
                  to="/pipeline"
                  className="text-[#0D5F4A] font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Interactive Pipeline Board</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </section>
          {/* ── END: Row 2 Core Funnel & Scoring Grid ─────────────────────────── */}

          {/* ── BEGIN: Row 3 Evidence Intelligence ────────────────────────────── */}
          <section className="space-y-4" data-purpose="evidence-intelligence-section">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Scale className="w-5 h-5 text-[#0D5F4A]" />
                  <span>Evidence Intelligence</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Ranked criteria impact, disqualification metrics, and multi-turn interview claim verifications.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs font-medium">
                  Method: <strong className="text-[#0D5F4A]">Deterministic Rubric + AI Probes</strong>
                </span>
              </div>
            </div>

            {/* 2-Column Intelligence Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Decline Factors & Rubric Impact (6 cols) */}
              <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_4px_14px_-2px_rgba(15,23,42,0.05)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shadow-xs"
                        style={{ backgroundColor: "rgba(248, 113, 113, 0.15)", color: "#DC2626" }}
                      >
                        <Scale className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 tracking-tight">
                          Decline Factors &amp; Rubric Impact
                        </h3>
                        <p className="text-xs text-slate-600">
                          Ranked impact matrix of disqualifying evidence during screening
                        </p>
                      </div>
                    </div>
                    <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-[10px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setCriterionFilter("all")}
                        className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                          criterionFilter === "all"
                            ? "text-white shadow-xs font-bold bg-[#F87171]"
                            : "text-slate-600 hover:text-slate-800"
                        }`}
                      >
                        All ({evidence?.topEliminators?.length || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCriterionFilter("top3")}
                        className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                          criterionFilter === "top3"
                            ? "text-white shadow-xs font-bold bg-[#F87171]"
                            : "text-slate-600 hover:text-slate-800"
                        }`}
                      >
                        Top 3 ({Math.min(3, evidence?.topEliminators?.length || 0)})
                      </button>
                    </div>
                  </div>

                  {/* Grid of Ranked Elimination Driver Cards */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {topEliminators.length === 0 ? (
                      <div className="col-span-2 py-8 text-center text-xs text-slate-400 font-medium">
                        {evidenceError
                          ? "Could not load evidence data — try refreshing."
                          : "No rubric-driven decline factors recorded in this period yet."}
                      </div>
                    ) : (
                      topEliminators.map((e, idx) => {
                        const totalDeclines = failCount || 1;
                        const pct = share(e.eliminations, totalDeclines);
                        return (
                          <div
                            key={e.criterionId || idx}
                            className="p-3 rounded-xl border transition-all hover:shadow-xs"
                            style={{
                              backgroundColor: "rgba(248, 113, 113, 0.08)",
                              borderColor: "rgba(248, 113, 113, 0.35)",
                            }}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span
                                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-xs"
                                style={{
                                  backgroundColor: "#ffffff",
                                  color: idx < 3 ? "#2563EB" : "#64748B",
                                  border: idx < 3 ? "1px solid rgba(59, 130, 246, 0.3)" : "1px solid #E2E8F0",
                                }}
                              >
                                Rank #{idx + 1}
                              </span>
                              <span className="font-mono font-bold" style={{ color: "#DC2626" }}>
                                {pct}%
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 mt-2 leading-snug line-clamp-2" title={e.label}>
                              {e.label}
                            </h4>
                            <div className="mt-2.5 flex items-center gap-2">
                              <div
                                className="flex-1 h-2 rounded-full overflow-hidden"
                                style={{ backgroundColor: "rgba(248, 113, 113, 0.2)" }}
                              >
                                <div
                                  className="h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(100, Math.max(8, pct))}%`, backgroundColor: "#F87171" }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-slate-600 shrink-0">
                                {e.eliminations} / {totalDeclines}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600">
                    Calculated across {failCount} rubric declines
                  </span>
                  <Link
                    to="/jobs"
                    className="text-[#0D5F4A] font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>Customize Rubric Thresholds</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Right: Verification Radar & Skill Confidence Matrix (Soft Blue) */}
              <div
                className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_4px_14px_-2px_rgba(15,23,42,0.05)] flex flex-col justify-between"
                data-purpose="skill-confidence-matrix"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shadow-xs"
                        style={{ backgroundColor: "rgba(59, 130, 246, 0.12)", color: "#2563EB" }}
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 tracking-tight">Claim Verification by Skill</h3>
                        <p className="text-xs text-slate-600">
                          Multi-turn AI interview probe validation on resume statements
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                      {claims.probed} Claims Tested
                    </span>
                  </div>

                  {/* Summary Radial Gauge Header */}
                  {claims.probed === 0 ? (
                    <div className="mt-4 py-8 text-center text-xs text-slate-400 font-medium">
                      No assessed claim-probes recorded in this period yet.
                    </div>
                  ) : (
                    <div
                      className="mt-4 p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between flex-wrap gap-4"
                      style={{
                        background:
                          "linear-gradient(90deg, rgba(16, 185, 129, 0.08) 0%, #ffffff 50%, rgba(59, 130, 246, 0.08) 100%)",
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                          {/* 2 * pi * 15.9 ≈ 99.9 */}
                          <svg className="w-16 h-16 -rotate-90 transform" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" fill="none" r="15.9" stroke="#F1F5F9" strokeWidth="4" />
                            <circle
                              cx="18"
                              cy="18"
                              fill="none"
                              r="15.9"
                              stroke="#10B981"
                              strokeDasharray={`${verifiedClaimsPct} ${100 - verifiedClaimsPct}`}
                              strokeDashoffset="0"
                              strokeLinecap="round"
                              strokeWidth="4"
                            />
                            <circle
                              cx="18"
                              cy="18"
                              fill="none"
                              r="15.9"
                              stroke="#F87171"
                              strokeDasharray={`${contradictedClaimsPct} ${100 - contradictedClaimsPct}`}
                              strokeDashoffset={`-${verifiedClaimsPct}`}
                              strokeLinecap="round"
                              strokeWidth="4"
                            />
                            <circle
                              cx="18"
                              cy="18"
                              fill="none"
                              r="15.9"
                              stroke="#60A5FA"
                              strokeDasharray={`${unclearClaimsPct} ${100 - unclearClaimsPct}`}
                              strokeDashoffset={`-${verifiedClaimsPct + contradictedClaimsPct}`}
                              strokeLinecap="round"
                              strokeWidth="4"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center font-mono font-bold text-slate-800 text-xs">
                            {claims.probed}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">AI Probe Outcome Distribution</span>
                          <p className="text-[11px] text-slate-600">
                            Evaluated across {interviewsCompleted} candidate interview transcripts
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 text-[11px]">
                        <span className="font-semibold flex items-center gap-1.5" style={{ color: "#047857" }}>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#10B981" }} />
                          {claims.verified} Verified ({verifiedClaimsPct}%)
                        </span>
                        <span className="font-semibold flex items-center gap-1.5" style={{ color: "#DC2626" }}>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#F87171" }} />
                          {claims.contradicted} Contradicted ({contradictedClaimsPct}%)
                        </span>
                        <span className="font-semibold flex items-center gap-1.5" style={{ color: "#2563EB" }}>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#60A5FA" }} />
                          {claims.inconclusive} Unclear ({unclearClaimsPct}%)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Tested Skills List (Soft Blue for Unclear) */}
                  <div className="mt-3 space-y-2.5">
                    {(evidence?.claimVerificationBySkill || []).length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 font-medium">
                        {evidenceError
                          ? "Could not load claim verification — try refreshing."
                          : "No assessed claim-probes recorded in this period yet."}
                      </div>
                    ) : (
                      (evidence?.claimVerificationBySkill || []).slice(0, 4).map((s) => {
                        const totalProbes = s.probed || 1;
                        const vPct = share(s.verified, totalProbes);
                        const cPct = share(s.contradicted, totalProbes);
                        const isVerified = s.verified >= s.contradicted && s.verified >= s.inconclusive;
                        const isContradicted = s.contradicted > s.verified;

                        return (
                          <div
                            key={s.skill}
                            className="p-3 rounded-xl border transition-all hover:shadow-xs"
                            style={{
                              backgroundColor: isVerified
                                ? "rgba(16, 185, 129, 0.08)"
                                : isContradicted
                                ? "rgba(248, 113, 113, 0.08)"
                                : "rgba(59, 130, 246, 0.08)",
                              borderColor: isVerified
                                ? "rgba(16, 185, 129, 0.35)"
                                : isContradicted
                                ? "rgba(248, 113, 113, 0.35)"
                                : "rgba(59, 130, 246, 0.3)",
                            }}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{
                                    backgroundColor: isVerified ? "#10B981" : isContradicted ? "#F87171" : "#60A5FA",
                                  }}
                                />
                                <span className="font-bold text-slate-900 truncate">{s.skill}</span>
                              </div>
                              <span
                                className="font-bold px-2 py-0.5 rounded text-[11px] shrink-0"
                                style={
                                  isVerified
                                    ? { backgroundColor: "#D1FAE5", color: "#047857", border: "1px solid #6EE7B7" }
                                    : isContradicted
                                    ? { backgroundColor: "#FEE2E2", color: "#DC2626", border: "1px solid #FCA5A5" }
                                    : { backgroundColor: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" }
                                }
                              >
                                {isVerified
                                  ? `Verified ${vPct}%`
                                  : isContradicted
                                  ? `Contradicted ${cPct}%`
                                  : "Unclear Signal"}
                              </span>
                            </div>
                            <div
                              className="mt-1.5 flex items-center justify-between text-[11px] font-medium"
                              style={{
                                color: isVerified ? "#065F46" : isContradicted ? "#B91C1C" : "#1D4ED8",
                              }}
                            >
                              <span>{s.probed} multi-turn probes</span>
                              <span>
                                {isVerified
                                  ? "Demonstrated technical proficiency"
                                  : isContradicted
                                  ? "Discrepancies identified in claims"
                                  : "Flagged for follow-up evaluation"}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                  <span>Probes executed across {interviewsCompleted} interview sessions</span>
                  <span className="font-medium text-[#0D5F4A] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Cryptographically signed probe transcripts
                  </span>
                </div>
              </div>
            </div>
          </section>
          {/* ── END: Row 3 Evidence Intelligence ──────────────────────────────── */}

          {/* ── BEGIN: Bottom Data Lineage Footer Note ────────────────────────── */}
          <footer className="mt-8 pt-4 pb-6 border-t border-slate-200/60 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0D5F4A]" />
              <span>
                Scores read from verified ATS decision engine &amp; rubric sync •{" "}
                <strong className="text-slate-900">{period || "Selected dates"}</strong>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-slate-500">
                Application cohort and session activity use the date definitions shown above
              </span>
              <a href="#api" className="font-semibold text-[#0D5F4A] hover:underline">
                API &amp; Webhooks
              </a>
              <a href="#docs" className="font-semibold text-[#0D5F4A] hover:underline">
                Documentation
              </a>
            </div>
          </footer>
          {/* ── END: Bottom Data Lineage Footer Note ──────────────────────────── */}
        </>
      )}
    </div>
  );
}
