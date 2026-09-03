// Reports (Phase 12) — server-side analytics over date ranges, replacing the
// old client-side bars over whatever happened to be in memory. Includes the
// evidence-native reports only this engine can produce and the one-click
// Bias Audit Pack export.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  ShieldCheck,
  Scale,
  TrendingDown,
  Users,
  Bot,
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import api from "../../api/client.js";
import { Card, Badge, Skeleton, EmptyState, SectionHeader } from "../../components/ui/Card.jsx";
import { RecordCard, RecordGrid, Chip } from "../../components/ui/Panels.jsx";
import Button from "../../components/ui/Button.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import { useToast } from "../../components/ui/Toast.jsx";
import { stageLabel, stageTone } from "../../lib/pipeline.js";

const RANGES = [
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
  { key: "365", label: "1 year" },
];

// Fill color per semantic tone — mirrors Badge's tone vocabulary so a bar and
// its accompanying badge or stage color always agree. Reads from the same
// `chart-*` + verdict-ring tokens InterviewReport.jsx uses for its role-map
// and answer-run charts (DESIGN.md § The Pastel-Needs-An-Edge Rule): a
// saturated fill reads as an alarm and fails CVD separability without the
// ring, so no mark on this page uses a raw Tailwind color. `amber` has no
// dedicated chart token (the system's quaternary palette only covers
// positive/neutral/negative/brand), so it reuses the existing
// verdict-pending tint at the same ring weight rather than inventing one.
const TONE_FILL = {
  slate: "bg-chart-neutral ring-1 ring-inset ring-slate-400/70",
  brand: "bg-chart-brand ring-1 ring-inset ring-brand-600/60",
  green: "bg-chart-positive ring-1 ring-inset ring-verdict-positive/70",
  amber: "bg-verdict-pending-tint ring-1 ring-inset ring-verdict-pending/70",
  red: "bg-chart-negative ring-1 ring-inset ring-verdict-negative/70",
};

// A labelled proportion bar: value, share, and a fill on one row. Used for
// the funnel and the screening-decision breakdown, where every row needs to
// stand on its own without cross-referencing a legend. `to` is optional — the
// funnel passes it so a stage row drills into the candidate list filtered to
// that stage; the screening-decision breakdown has no equivalent record list
// to point at, so it stays a plain row there.
function ProportionRow({ icon: Icon, label, value, total, tone = "brand", to }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  const content = (
    <>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
        {/* `min-w-0` on the row and `truncate` on the label text (not the icon,
            which would otherwise get swallowed into the ellipsis too) — a
            criterion or stage label is arbitrary rubric text, not a fixed
            word, and the `value` on the right must never be the side that
            gives way. */}
        <span className="flex min-w-0 items-center gap-1.5 font-medium text-slate-700">
          {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />}
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 tabular-nums text-slate-500">
          <span className="font-semibold text-slate-800">{value}</span> <span className="text-slate-500">· {pct}%</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${TONE_FILL[tone]}`} style={{ width: `${pct}%` }} />
      </div>
    </>
  );
  if (!to) return <div>{content}</div>;
  return (
    <Link
      to={to}
      className="-m-1.5 block rounded-lg p-1.5 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
    >
      {content}
    </Link>
  );
}

// Compact ranked-list row — a proportional fill sits behind the label so
// relative magnitude reads at a glance without a second axis or a chart.
function RankedRow({ label, value, maxValue, tone = "brand" }) {
  const pct = maxValue ? Math.max(value ? 6 : 0, Math.round((value / maxValue) * 100)) : 0;
  return (
    <div className="relative overflow-hidden rounded-lg bg-slate-50">
      <div className={`absolute inset-y-0 left-0 ${TONE_FILL[tone]} opacity-[0.14]`} style={{ width: `${pct}%` }} />
      <div className="relative flex items-center justify-between gap-3 px-3 py-2 text-sm">
        {/* The wrapper above is `overflow-hidden` for the proportional fill
            behind it, which used to double as an unintentional (and
            ellipsis-free) clip for a long criterion label. `truncate` here
            makes that clipping visible and legible instead of a silent cut. */}
        <span className="min-w-0 truncate text-slate-700">{label}</span>
        <span className="shrink-0 tabular-nums font-semibold text-slate-800">{value}</span>
      </div>
    </div>
  );
}

// Verified / contradicted / inconclusive as a single stacked bar — the same
// "show the work" instinct as the per-candidate score explanation, applied
// to an aggregate instead of one person. Same three tokens InterviewReport.jsx
// uses for the identical tri-state read. `legend`: a bare set of colored
// segments is unreadable without one (DESIGN.md — "a chart that cannot label
// its marks does not get these fills"); pass it wherever the call site has no
// other adjacent text spelling out the counts.
function VerdictSplit({ verified, contradicted, inconclusive, total, legend = false, className = "" }) {
  if (!total) return <div className={`h-1.5 w-full rounded-full bg-slate-100 ${className}`} />;
  const seg = (n) => `${Math.max(0, (n / total) * 100)}%`;
  return (
    <div className={className}>
      {legend && (
        <p className="mb-1.5 text-xs text-slate-500">
          {verified} verified · {contradicted} contradicted · {inconclusive} unclear
        </p>
      )}
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="bg-chart-positive ring-1 ring-inset ring-verdict-positive/70" style={{ width: seg(verified) }} />
        <div className="bg-chart-negative ring-1 ring-inset ring-verdict-negative/70" style={{ width: seg(contradicted) }} />
        <div className="bg-verdict-pending-tint ring-1 ring-inset ring-verdict-pending/70" style={{ width: seg(inconclusive) }} />
      </div>
    </div>
  );
}

function KpiStat({ icon: Icon, label, value, hint }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 px-5 py-4">
      <div className="flex min-w-0 items-center gap-1.5 text-slate-500">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
        <span className="truncate text-xs font-semibold text-slate-500">{label}</span>
      </div>
      <p className="text-3xl font-bold tabular-nums text-slate-900">{value ?? "—"}</p>
      {hint && <p className="text-[11px] leading-snug text-slate-500">{hint}</p>}
    </div>
  );
}

// Score-distribution histogram with the count printed above each bar — a
// hover-only tooltip is not a legible primary reading for a recruiter
// scanning quickly.
function ScoreHistogram({ bins }) {
  const max = Math.max(1, ...bins.map((b) => b.count));
  return (
    <div>
      <div className="flex h-32 items-end gap-1.5 border-b border-slate-200">
        {bins.map((b) => {
          const summary = `${b.lo}–${b.hi}: ${b.count} candidate${b.count === 1 ? "" : "s"}`;
          return (
            <div key={b.lo} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] font-semibold tabular-nums text-slate-500" aria-hidden="true">
                {b.count || ""}
              </span>
              <div
                className="w-full rounded-t bg-chart-brand ring-1 ring-inset ring-brand-600/60"
                style={{ height: `${b.count ? Math.max(4, Math.round((b.count / max) * 100)) : 0}%` }}
                title={summary}
              >
                {/* `title` alone isn't reliably read by screen readers, touch,
                    or keyboard focus — this is the bar's real accessible name. */}
                <span className="sr-only">{summary}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {bins.map((b) => (
          <span key={b.lo} className="flex-1 text-center text-[10px] text-slate-500">
            {b.lo}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Reports() {
  const toast = useToast();
  const [days, setDays] = useState("90");
  const [overview, setOverview] = useState(null);
  const [evidence, setEvidence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const [sources, setSources] = useState(null);
  // Distinct from "overview/evidence/sources came back empty" — a fetch that
  // actually failed must not render identically to a clean period with
  // nothing in it (CLAUDE.md: a degraded result must never pass as a
  // measurement, and silence is the mildest form of that).
  const [evidenceError, setEvidenceError] = useState(false);
  const [sourcesError, setSourcesError] = useState(false);

  // Single source of truth for "from", shared by the on-screen fetches and
  // the audit-pack export — see downloadAuditPack below.
  const fromDate = useMemo(() => new Date(Date.now() - Number(days) * 86400000).toISOString().slice(0, 10), [days]);

  const load = useCallback(async () => {
    setLoading(true);
    setEvidenceError(false);
    setSourcesError(false);
    try {
      const [ov, ev, src] = await Promise.all([
        api.get("/analytics/overview", { params: { from: fromDate } }),
        api.get("/analytics/evidence", { params: { from: fromDate } }).catch(() => {
          setEvidenceError(true);
          return { data: null };
        }),
        api.get("/analytics/sources", { params: { from: fromDate } }).catch(() => {
          setSourcesError(true);
          return { data: null };
        }),
      ]);
      setOverview(ov.data);
      setEvidence(ev.data);
      setSources(src.data?.sources || null);
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
      // Matches whatever's on screen: the pack used to always cover a fixed
      // trailing 365 days regardless of the selected range, invisible
      // whenever "1 year" happened to be selected. A compliance export whose
      // whole value is "you can trust exactly what period this covers" can't
      // silently diverge from the range the recruiter is looking at.
      const res = await api.get("/analytics/audit-pack", { params: { from: fromDate }, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `bias-audit-pack-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not export the audit pack.");
    } finally {
      setDownloading(false);
    }
  }

  const totals = overview?.totals;
  const screening = overview?.screening;
  const funnelStages = useMemo(() => (overview?.funnel?.stages || []).filter((s) => s.count > 0), [overview]);
  const maxElimination = useMemo(
    () => Math.max(1, ...((evidence?.topEliminators || []).map((e) => e.eliminations))),
    [evidence]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Hiring funnel, score distribution, and evidence-quality signals for the selected period."
        action={
          <>
            {RANGES.map((r) => (
              <Chip key={r.key} active={days === r.key} onClick={() => setDays(r.key)}>
                {r.label}
              </Chip>
            ))}
            <Button variant="outline" size="sm" loading={downloading} onClick={downloadAuditPack}>
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Bias Audit Pack
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="space-y-6">
          <Card className="p-0">
            <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-5 sm:divide-x sm:divide-y-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-3 h-8 w-14" />
                </div>
              ))}
            </div>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card><Skeleton className="h-40 w-full" /></Card>
            <Card><Skeleton className="h-40 w-full" /></Card>
          </div>
        </div>
      ) : !overview || overview.totals.candidates === 0 ? (
        <Card>
          <EmptyState icon={BarChart3} title="No data in this period" description="Reports populate once candidates apply within the selected range." />
        </Card>
      ) : (
        <>
          {/* KPI strip — one ledger row rather than five same-size cards */}
          <Card className="p-0">
            <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-5 sm:divide-x sm:divide-y-0">
              <KpiStat icon={Users} label="Candidates" value={totals.candidates} />
              <KpiStat icon={Bot} label="AI interviews completed" value={totals.interviewsCompleted} />
              <KpiStat icon={CheckCircle2} label="Offers accepted" value={totals.offersAccepted} />
              <KpiStat icon={Award} label="Joined" value={totals.hires} />
              <KpiStat
                icon={Clock}
                label="Time to hire"
                value={overview.timeToHire.medianDays != null ? `${overview.timeToHire.medianDays}d` : "—"}
                hint={overview.timeToHire.n ? `median of ${overview.timeToHire.n} hires · mean ${overview.timeToHire.meanDays}d` : "no completed hires in range"}
              />
            </div>
          </Card>

          <SectionHeader title="Pipeline health" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-900">Screening decisions</h3>
                <Badge tone="slate">{screening.scoreSource === "evidence" ? "evidence engine" : "legacy ATS"}</Badge>
              </div>
              <div className="space-y-4">
                <ProportionRow icon={CheckCircle2} label="Advance" value={screening.decisions.pass} total={totals.candidates} tone="green" />
                <ProportionRow icon={AlertTriangle} label="Human review" value={screening.decisions.review} total={totals.candidates} tone="amber" />
                <ProportionRow icon={XCircle} label="Decline" value={screening.decisions.fail} total={totals.candidates} tone="red" />
              </div>
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                {screening.reviewRate != null ? `${Math.round(screening.reviewRate * 100)}%` : "—"} routed to human review. That band exists by
                design — ambiguous evidence goes to a person instead of a falsely confident score.
              </p>
            </Card>

            <Card>
              <h3 className="mb-1 text-base font-semibold text-slate-900">Score distribution</h3>
              <p className="mb-3 text-xs text-slate-500">Candidates by screening score, this period.</p>
              <ScoreHistogram bins={screening.scoreDistribution} />
            </Card>

            <Card>
              <h3 className="mb-1 text-base font-semibold text-slate-900">Funnel</h3>
              <p className="mb-3 text-xs text-slate-500">Stage reached, of {overview.funnel.total} candidates.</p>
              <div className="space-y-3">
                {funnelStages.map((s) => (
                  <ProportionRow
                    key={s.stage}
                    label={stageLabel(s.stage)}
                    value={s.count}
                    total={overview.funnel.total}
                    tone={stageTone(s.stage)}
                    to={`/candidates?stage=${s.stage}`}
                  />
                ))}
              </div>
              <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">{overview.funnel.rejected} rejected in period.</p>
            </Card>
          </div>

          {/* Evidence-native — reports only this architecture can produce */}
          <SectionHeader title="Evidence intelligence" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-900">
                <Scale className="h-4 w-4 text-brand-600" aria-hidden="true" /> What eliminates candidates
              </h3>
              <p className="mb-3 text-xs text-slate-500">Rubric criteria most often responsible for a decline, ranked by frequency.</p>
              <div className="space-y-2">
                {(evidence?.topEliminators || []).slice(0, 6).map((e) => (
                  <RankedRow key={e.criterionId} label={e.label} value={e.eliminations} maxValue={maxElimination} tone="red" />
                ))}
                {evidenceError ? (
                  <p className="text-sm text-amber-700">Couldn't load this data — try refreshing.</p>
                ) : (
                  (!evidence || evidence.topEliminators.length === 0) && (
                    <p className="text-sm text-slate-500">No evidence-engine declines in this period yet.</p>
                  )
                )}
              </div>
            </Card>

            <Card>
              <h3 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-900">
                <TrendingDown className="h-4 w-4 text-brand-600" aria-hidden="true" /> Claim verification by skill
              </h3>
              <p className="mb-3 text-xs text-slate-500">
                Skills claimed on a résumé but most often contradicted once tested in the interview — patterns of overstatement no keyword
                scanner can catch.
              </p>
              <div className="space-y-2.5">
                {(evidence?.claimVerificationBySkill || []).slice(0, 6).map((s) => (
                  <div key={s.skill} className="rounded-lg bg-slate-50 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-medium text-slate-700">{s.skill}</span>
                      <span className="shrink-0 tabular-nums text-xs text-slate-500">
                        {s.verified} verified · {s.contradicted} contradicted · {s.inconclusive} unclear
                      </span>
                    </div>
                    <VerdictSplit className="mt-2" verified={s.verified} contradicted={s.contradicted} inconclusive={s.inconclusive} total={s.probed} />
                  </div>
                ))}
                {evidenceError ? (
                  <p className="text-sm text-amber-700">Couldn't load this data — try refreshing.</p>
                ) : (
                  (!evidence || evidence.claimVerificationBySkill.length === 0) && (
                    <p className="text-sm text-slate-500">No assessed claim-probes in this period yet.</p>
                  )
                )}
              </div>
            </Card>

            {/* Phase 15.9 — source quality by downstream truth, not click volume */}
            {sourcesError && (
              <Card className="lg:col-span-2">
                <h3 className="mb-1 text-base font-semibold text-slate-900">Source quality</h3>
                <p className="text-sm text-amber-700">Couldn't load this data — try refreshing.</p>
              </Card>
            )}
            {!sourcesError && sources?.length > 0 && (
              <Card className="lg:col-span-2">
                <h3 className="mb-1 text-base font-semibold text-slate-900">Source quality</h3>
                <p className="mb-3 text-xs text-slate-500">
                  Pass rate, interview verification, and advance rate by source — measured by what happened after the click, not by volume.
                  Source never influences a score.
                </p>
                <RecordGrid>
                  {sources.map((s) => (
                    <RecordCard
                      key={s.channel}
                      title={s.channel}
                      subtitle={`${s.applied} applied`}
                      trailing={<Badge tone="slate">{s.hires} hired</Badge>}
                      meta={[
                        {
                          label: "Pass rate",
                          value: s.atsPassRate != null ? `${Math.round(s.atsPassRate * 100)}%` : null,
                        },
                        {
                          label: "Advance rate",
                          value: s.advanceRate != null ? `${Math.round(s.advanceRate * 100)}%` : null,
                        },
                        {
                          label: "Claims verified",
                          // "no probes yet" rather than 0/0: a source nobody has
                          // interviewed from has no verification record, which is
                          // not the same reading as one that failed verification.
                          value:
                            s.probed > 0 ? (
                              <span className="tabular-nums">
                                {s.verified}/{s.probed}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500">no probes yet</span>
                            ),
                        },
                      ]}
                    >
                      {/* `legend`: this bar has no adjacent sentence spelling out the
                          counts the way "Claim verification by skill" does above —
                          without it, the three colors are the only channel telling
                          verified apart from contradicted apart from unclear. */}
                      {s.probed > 0 && (
                        <VerdictSplit
                          className="mt-3"
                          legend
                          verified={s.verified}
                          contradicted={s.contradicted}
                          inconclusive={Math.max(0, s.probed - s.verified - s.contradicted)}
                          total={s.probed}
                        />
                      )}
                    </RecordCard>
                  ))}
                </RecordGrid>
              </Card>
            )}

            {evidence?.lowValueCriteria?.length > 0 && (
              <Card className="lg:col-span-2">
                <h3 className="mb-1 text-base font-semibold text-slate-900">Criteria with no predictive value</h3>
                <p className="mb-3 text-xs text-slate-500">
                  These criteria show no relationship to who actually advances — worth a look in the rubric editor. Nothing here is auto-tuned.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {evidence.lowValueCriteria.slice(0, 6).map((c) => {
                    const rowClass =
                      "flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2 text-sm";
                    const row = (
                      <>
                        <span className="min-w-0 truncate text-slate-700">{c.label}</span>
                        <Badge tone={c.insight === "inverse" ? "red" : "amber"}>
                          {c.insight === "inverse" ? "anti-predictive" : "no signal"}
                        </Badge>
                      </>
                    );
                    const key = `${c.rubricId}-${c.criterionId}`;
                    // The copy already promises "worth a look in the rubric
                    // editor" — link there when the row carries a job to point
                    // at. Older snapshots taken before this field existed won't
                    // have one, so the row degrades to plain text instead of a
                    // broken link.
                    return c.jobId ? (
                      <Link
                        key={key}
                        to={`/jobs/${c.jobId}/rubric`}
                        className={`${rowClass} transition-colors hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600`}
                      >
                        {row}
                      </Link>
                    ) : (
                      <div key={key} className={rowClass}>
                        {row}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
