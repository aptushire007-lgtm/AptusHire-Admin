// Platform console (BUILD-PLAN Phase 16) — superadmin operations surface:
// tenant directory (suspend/reactivate with a mandatory typed reason),
// the first-ever viewers for AuditLog / EmailLog / UsageEvent, demo-request
// leads, and the AI trust dashboard. Read-only "view as tenant" hands off to
// the normal dashboard with the server rejecting every mutation.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  ShieldCheck,
  History,
  Mail,
  Gauge,
  Cpu,
  LogOut,
  Eye,
  Inbox,
  Link2,
} from "lucide-react";
import api, { setViewAsCompany } from "../../api/client.js";
import { clearAdminAuth } from "../../auth/adminAuth.js";
import { Card, Badge, Skeleton, EmptyState } from "../../components/ui/Card.jsx";
import { RecordCard, RecordGrid } from "../../components/ui/Panels.jsx";
import Button from "../../components/ui/Button.jsx";
import { Input, Label, FormGroup, Textarea, Select } from "../../components/ui/Field.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { useToast } from "../../components/ui/Toast.jsx";

const TABS = [
  { key: "tenants", label: "Tenants", icon: Building2 },
  { key: "trust", label: "AI Trust", icon: ShieldCheck },
  { key: "audit", label: "Audit Logs", icon: History },
  { key: "email", label: "Email Logs", icon: Mail },
  { key: "usage", label: "Usage", icon: Gauge },
  { key: "leads", label: "Demo Leads", icon: Inbox },
  { key: "demo", label: "Demo Interviews", icon: Link2 },
];

const STATUS_TONE = {
  active: "green",
  suspended: "red",
  pending_verification: "amber",
  pending_payment: "amber",
  sent: "green",
  failed: "red",
  queued: "amber",
  retrying: "amber",
  scheduled: "slate",
  in_progress: "amber",
  completed: "green",
  expired: "red",
  cancelled: "red",
};

function Pager({ page, total, limit, onPage }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm text-slate-500">
      <span>
        {total} rows · page {page}/{pages}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Prev
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

function TenantsTab() {
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [reasonFor, setReasonFor] = useState(null); // { tenant, action }
  const [reason, setReason] = useState("");
  const [voiceModeFor, setVoiceModeFor] = useState(null); // { tenant, mode }
  const [voiceModeReason, setVoiceModeReason] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get("/platform/tenants", { params: { page, q: q || undefined } });
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not load tenants");
    }
  }, [page, q, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitStatusChange() {
    const { tenant, action } = reasonFor;
    try {
      await api.post(`/platform/tenants/${tenant.id}/${action}`, { reason });
      toast.success(`${tenant.name} ${action === "suspend" ? "suspended" : "reactivated"}`);
      setReasonFor(null);
      setReason("");
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Action failed");
    }
  }

  async function submitVoiceModeChange() {
    const { tenant, mode } = voiceModeFor;
    try {
      await api.post(`/platform/tenants/${tenant.id}/voice-mode`, { voiceMode: mode, reason: voiceModeReason });
      toast.success(`${tenant.name} voice mode → ${mode === "livekit" ? "LiveKit agent" : mode === "turn_based" ? "Turn-based" : "platform default"}`);
      setVoiceModeFor(null);
      setVoiceModeReason("");
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Voice mode change failed");
    }
  }

  function viewAsTenant(t) {
    setViewAsCompany({ id: t.id, name: t.name });
    navigate("/");
  }

  return (
    <Card>
      <div className="mb-4 flex items-center gap-3">
        <Input placeholder="Search tenants…" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} className="max-w-xs" />
      </div>
      {!data ? (
        <Skeleton className="h-40 w-full" />
      ) : data.items.length === 0 ? (
        <EmptyState icon={Building2} title="No tenants" description="Tenant workspaces appear here once companies register." />
      ) : (
        <>
          <RecordGrid columns={2}>
            {data.items.map((t) => (
              <RecordCard
                key={t.id}
                icon={Building2}
                title={t.name}
                subtitle={`${t.companyCode} · ${t.city || "—"}, ${t.country || "—"}`}
                trailing={<Badge tone={STATUS_TONE[t.status] || "slate"}>{t.status}</Badge>}
                meta={[
                  {
                    label: "Plan",
                    value: t.subscription ? `${t.subscription.plan || "—"} (${t.subscription.status})` : "none",
                  },
                  { label: "Jobs", value: t.counts.jobs },
                  { label: "Candidates", value: t.counts.candidates },
                ]}
                actions={
                  <>
                    <Button variant="outline" size="sm" onClick={() => viewAsTenant(t)} title="Read-only view of this tenant's dashboard">
                      <Eye className="h-3.5 w-3.5" /> View as
                    </Button>
                    <Select
                      compact
                      className="w-auto"
                      aria-label={`Voice interview pipeline for ${t.name}`}
                      title="Voice interview pipeline"
                      value={t.voiceMode || ""}
                      onChange={(e) => setVoiceModeFor({ tenant: t, mode: e.target.value })}
                    >
                      <option value="">Platform default</option>
                      <option value="turn_based">Turn-based</option>
                      <option value="livekit">LiveKit agent</option>
                    </Select>
                    {t.status === "active" ? (
                      <Button variant="ghost" size="sm" onClick={() => setReasonFor({ tenant: t, action: "suspend" })}>
                        Suspend
                      </Button>
                    ) : t.status === "suspended" ? (
                      <Button variant="ghost" size="sm" onClick={() => setReasonFor({ tenant: t, action: "reactivate" })}>
                        Reactivate
                      </Button>
                    ) : null}
                  </>
                }
              />
            ))}
          </RecordGrid>
          <Pager page={data.page} total={data.total} limit={data.limit} onPage={setPage} />
        </>
      )}

      <Modal
        open={Boolean(reasonFor)}
        onClose={() => setReasonFor(null)}
        size="md"
        title={
          reasonFor ? `${reasonFor.action === "suspend" ? "Suspend" : "Reactivate"} ${reasonFor.tenant.name}` : ""
        }
        description="Every platform mutation requires a reason — it lands in the audit trail with your name on it."
      >
        <FormGroup className="mt-3">
          <Label required>Reason</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. non-payment escalation #4821" />
        </FormGroup>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setReasonFor(null)}>
            Cancel
          </Button>
          <Button size="sm" disabled={reason.trim().length < 4} onClick={submitStatusChange}>
            Confirm
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(voiceModeFor)}
        onClose={() => setVoiceModeFor(null)}
        size="md"
        title={voiceModeFor ? `Set voice mode — ${voiceModeFor.tenant.name}` : ""}
        description={
          voiceModeFor
            ? `Switches this tenant's interview pipeline to ${
                voiceModeFor.mode === "livekit"
                  ? "the LiveKit realtime agent"
                  : voiceModeFor.mode === "turn_based"
                    ? "the turn-based pipeline"
                    : "the platform default"
              }. Takes effect on their next interview session — nothing already in progress is interrupted. Every platform mutation requires a reason, logged to the audit trail.`
            : ""
        }
      >
        <FormGroup className="mt-3">
          <Label required>Reason</Label>
          <Input
            value={voiceModeReason}
            onChange={(e) => setVoiceModeReason(e.target.value)}
            placeholder="e.g. LiveKit pilot for this tenant"
          />
        </FormGroup>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setVoiceModeFor(null)}>
            Cancel
          </Button>
          <Button size="sm" disabled={voiceModeReason.trim().length < 4} onClick={submitVoiceModeChange}>
            Confirm
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

function TrustTab() {
  const toast = useToast();
  const [data, setData] = useState(null);

  useEffect(() => {
    api
      .get("/platform/trust")
      .then((res) => setData(res.data))
      .catch((err) => toast.error(err.response?.data?.error || "Could not load trust metrics"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) return <Card><Skeleton className="h-40 w-full" /></Card>;

  const breakerTone = data.breaker === "closed" ? "green" : data.breaker === "half_open" ? "amber" : "red";
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-medium text-slate-500">LLM circuit breaker</p>
          <p className="mt-1"><Badge tone={breakerTone}>{data.breaker}</Badge></p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-slate-500">Assessments (30d)</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 [overflow-wrap:anywhere]">{data.assessments.total}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-slate-500">Review rate</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 [overflow-wrap:anywhere]">
            {data.assessments.reviewRate != null ? `${Math.round(data.assessments.reviewRate * 100)}%` : "—"}
          </p>
          <p className="text-[11px] text-slate-500">0% would mean overconfidence</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-slate-500">Ensemble agreement</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 [overflow-wrap:anywhere]">{data.assessments.meanEnsembleAgreement ?? "—"}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-base font-semibold text-slate-900">Counterfactual bias probes (30d)</h3>
          <p className="text-sm text-slate-600">
            Ran on {data.assessments.counterfactuals.ran} assessment(s) · identical result{" "}
            {data.assessments.counterfactuals.identical} · <span className="font-semibold text-red-600">{data.assessments.counterfactuals.leaks} leak(s)</span>
          </p>
          <p className="mt-2 text-xs text-slate-500">
            A leak = swapping demographic proxies changed the outcome. Anything above zero is an incident, not a statistic.
          </p>
        </Card>
        <Card>
          <h3 className="mb-3 text-base font-semibold text-slate-900">Scoring engine mix (30d)</h3>
          <div className="space-y-1.5 text-sm text-slate-600">
            {Object.entries(data.engineMix).length === 0 && <p className="text-slate-500">No scored candidates in range.</p>}
            {Object.entries(data.engineMix).map(([engine, n]) => (
              <p key={engine}>
                <Badge tone={engine === "evidence" ? "green" : engine === "fallback-legacy" ? "amber" : "slate"}>{engine}</Badge>{" "}
                {n} candidate(s)
              </p>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">fallback-legacy = the labelled no-AI path carried the decision — uncertainty stays visible.</p>
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 text-base font-semibold text-slate-900">LLM spend by kind (30d)</h3>
        <RecordGrid>
          {data.spendByKind.map((r) => (
            <RecordCard
              key={r.kind}
              title={r.kind}
              trailing={<Badge tone="slate">₹{(r.costCents / 100).toFixed(2)}</Badge>}
              meta={[
                { label: "Calls", value: r.calls },
                { label: "Fallback calls", value: r.fallback },
              ]}
              metaColumns={2}
            />
          ))}
          {data.spendByKind.length === 0 && <p className="text-sm text-slate-500">No LLM spend in range.</p>}
        </RecordGrid>
      </Card>

      <Card>
        <h3 className="mb-3 text-base font-semibold text-slate-900">Per-tenant assessment volume (30d)</h3>
        <div className="space-y-1.5 text-sm">
          {data.tenants.map((t) => (
            <div key={t.company} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
              <span className="min-w-0 truncate text-slate-700">{t.companyName}</span>
              <span className="shrink-0 text-xs text-slate-500">
                {t.assessments} assessed · review {t.reviewRate != null ? `${Math.round(t.reviewRate * 100)}%` : "—"}
              </span>
            </div>
          ))}
          {data.tenants.length === 0 && <p className="text-slate-500">No evidence-engine assessments in range.</p>}
        </div>
      </Card>
    </div>
  );
}

/**
 * A paged log viewer rendered as record cards.
 *
 * `columns` keeps the `{ label, render }` shape it always had; two optional
 * flags decide where each field lands on the card. `primary` is the card's
 * title, `trailing` is the badge in the top-right, everything else falls into
 * the meta grid in declared order. Without either flag the first column becomes
 * the title, so a tab that doesn't care still renders sensibly.
 *
 * A log is the one genuinely columnar thing in this console, and cards trade
 * some cross-row comparability for room to breathe. That trade is worth it here
 * because these rows are read one at a time — you come to the audit log to
 * answer "what happened to tenant X", not to scan a column of timestamps.
 */
function LogTab({ endpoint, columns, filters }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [filterValues, setFilterValues] = useState({});

  const primaryCol = columns.find((c) => c.primary) || columns[0];
  const trailingCol = columns.find((c) => c.trailing);
  const metaCols = columns.filter((c) => c !== primaryCol && c !== trailingCol);

  const load = useCallback(async () => {
    try {
      const params = { page };
      for (const [k, v] of Object.entries(filterValues)) if (v) params[k] = v;
      const res = await api.get(endpoint, { params });
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not load");
    }
  }, [endpoint, page, filterValues, toast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      {filters?.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          {filters.map((f) => (
            <Input
              key={f.key}
              placeholder={f.label}
              value={filterValues[f.key] || ""}
              onChange={(e) => {
                setPage(1);
                setFilterValues((v) => ({ ...v, [f.key]: e.target.value }));
              }}
              className="max-w-[200px]"
            />
          ))}
        </div>
      )}
      {!data ? (
        <Skeleton className="h-40 w-full" />
      ) : (data.items || data.rows || []).length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No rows in range.</p>
      ) : (
        <>
          <RecordGrid columns={2}>
            {(data.items || data.rows).map((row, i) => (
              <RecordCard
                key={row._id || i}
                title={primaryCol.render(row)}
                subtitle={primaryCol.label}
                trailing={trailingCol ? trailingCol.render(row) : null}
                meta={metaCols.map((c) => ({ label: c.label, value: c.render(row) }))}
                metaColumns={metaCols.length > 3 ? 4 : 3}
              />
            ))}
          </RecordGrid>
          {data.total != null && <Pager page={data.page} total={data.total} limit={data.limit} onPage={setPage} />}
        </>
      )}
    </Card>
  );
}

// Generate a fresh /interview/:token link for a prospect/tester on demand — no real tenant's
// apply/ATS pipeline involved. The raw link is only ever returned once (create or reissue), so
// it's surfaced prominently right after the call and never stored client-side afterward.
function DemoInterviewsTab() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ reason: "", jobTitle: "", jobDescription: "", expiresInDays: 7, linkBase: "" });
  const [showCustomRole, setShowCustomRole] = useState(false);
  const [justCreated, setJustCreated] = useState(null);
  const [reasonFor, setReasonFor] = useState(null); // { session, action: "reissue" | "revoke" }
  const [actionReason, setActionReason] = useState("");
  const [actionResult, setActionResult] = useState(null); // { link, expiresAt } after a reissue

  const load = useCallback(async () => {
    try {
      const res = await api.get("/platform/demo-interviews", { params: { page } });
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not load demo interviews");
    }
  }, [page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  function copy(link) {
    navigator.clipboard?.writeText(link);
    toast.success("Link copied");
  }

  async function generate() {
    setCreating(true);
    try {
      const { data: result } = await api.post("/platform/demo-interviews", {
        reason: form.reason,
        jobTitle: showCustomRole ? form.jobTitle : undefined,
        jobDescription: showCustomRole ? form.jobDescription : undefined,
        expiresInDays: form.expiresInDays,
        linkBase: form.linkBase || undefined,
      });
      setJustCreated(result);
      setForm({ reason: "", jobTitle: "", jobDescription: "", expiresInDays: 7, linkBase: form.linkBase });
      setShowCustomRole(false);
      toast.success("Demo interview link generated");
      setPage(1);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not generate the link");
    } finally {
      setCreating(false);
    }
  }

  async function submitAction() {
    const { session, action } = reasonFor;
    try {
      const { data: result } = await api.post(`/platform/demo-interviews/${session._id}/${action}`, { reason: actionReason });
      toast.success(action === "reissue" ? "New link generated" : "Link revoked");
      setReasonFor(null);
      setActionReason("");
      if (action === "reissue") setActionResult(result);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Action failed");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-3 text-base font-semibold text-slate-900">Generate a demo interview link</h3>
        <FormGroup>
          <Label required>Reason / who is this for</Label>
          <Input
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            placeholder="e.g. prospect call with Acme Corp"
          />
        </FormGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormGroup>
            <Label>Link valid for (days)</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={form.expiresInDays}
              onChange={(e) => setForm((f) => ({ ...f, expiresInDays: e.target.value }))}
            />
          </FormGroup>
          <FormGroup>
            <Label>Link domain (optional)</Label>
            <Input
              value={form.linkBase}
              onChange={(e) => setForm((f) => ({ ...f, linkBase: e.target.value }))}
              placeholder="https://recruitment-ai-vfkn.vercel.app"
            />
          </FormGroup>
        </div>
        <p className="-mt-2 mb-3 text-xs text-slate-500">
          Leave blank to use this server's own configured candidate URL — set this when generating from a local/dev
          admin session so the link points at the real public candidate site instead.
        </p>
        <button
          type="button"
          onClick={() => setShowCustomRole((v) => !v)}
          className="mb-3 text-sm font-medium text-brand-700 hover:underline"
        >
          {showCustomRole ? "Use the default demo role instead" : "Customize the role for this link"}
        </button>
        {showCustomRole && (
          <div className="mb-3 space-y-3">
            <FormGroup>
              <Label>Role title</Label>
              <Input
                value={form.jobTitle}
                onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                placeholder="e.g. Sales Executive Demo"
              />
            </FormGroup>
            <FormGroup>
              <Label>Role description</Label>
              <Textarea
                rows={3}
                value={form.jobDescription}
                onChange={(e) => setForm((f) => ({ ...f, jobDescription: e.target.value }))}
              />
            </FormGroup>
          </div>
        )}
        <Button onClick={generate} loading={creating} disabled={form.reason.trim().length < 4}>
          Generate link
        </Button>

        {justCreated && (
          <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
            <p className="text-sm font-semibold text-brand-800">Link generated — copy it now, it won't be shown again</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 text-xs text-slate-700">{justCreated.link}</code>
              <Button variant="outline" size="sm" onClick={() => copy(justCreated.link)}>
                Copy
              </Button>
            </div>
            <p className="mt-2 text-xs text-brand-700">
              {justCreated.jobTitle} · valid until {new Date(justCreated.expiresAt).toLocaleString()}
            </p>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="mb-3 text-base font-semibold text-slate-900">Generated demo interviews</h3>
        {!data ? (
          <Skeleton className="h-40 w-full" />
        ) : data.items.length === 0 ? (
          <EmptyState icon={Link2} title="No demo interviews yet" description="Links you generate above will appear here." />
        ) : (
          <>
            <RecordGrid columns={2}>
              {data.items.map((s) => (
                <RecordCard
                  key={s._id}
                  icon={Link2}
                  title={s.candidate?.basicDetails?.name || "Demo candidate"}
                  subtitle={s.job?.title || "—"}
                  trailing={<Badge tone={STATUS_TONE[s.status] || "slate"}>{s.status}</Badge>}
                  meta={[
                    { label: "Created", value: new Date(s.createdAt).toLocaleDateString() },
                    { label: "Expires", value: new Date(s.expiresAt).toLocaleDateString() },
                  ]}
                  actions={
                    <>
                      {s.status !== "completed" && s.status !== "cancelled" && (
                        <Button variant="outline" size="sm" onClick={() => setReasonFor({ session: s, action: "reissue" })}>
                          Reissue
                        </Button>
                      )}
                      {s.status !== "cancelled" && (
                        <Button variant="ghost" size="sm" onClick={() => setReasonFor({ session: s, action: "revoke" })}>
                          Revoke
                        </Button>
                      )}
                    </>
                  }
                />
              ))}
            </RecordGrid>
            <Pager page={data.page} total={data.total} limit={data.limit} onPage={setPage} />
          </>
        )}
      </Card>

      <Modal
        open={Boolean(reasonFor)}
        onClose={() => setReasonFor(null)}
        size="md"
        title={reasonFor ? `${reasonFor.action === "reissue" ? "Reissue" : "Revoke"} this demo link` : ""}
        description="Every platform mutation requires a reason — it lands in the audit trail with your name on it."
      >
        <FormGroup className="mt-3">
          <Label required>Reason</Label>
          <Input value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder="e.g. previous tester lost the link" />
        </FormGroup>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setReasonFor(null)}>
            Cancel
          </Button>
          <Button size="sm" disabled={actionReason.trim().length < 4} onClick={submitAction}>
            Confirm
          </Button>
        </div>
      </Modal>

      <Modal open={Boolean(actionResult)} onClose={() => setActionResult(null)} size="md" title="New link generated" description="Copy it now — it won't be shown again.">
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">{actionResult?.link}</code>
          <Button variant="outline" size="sm" onClick={() => copy(actionResult?.link)}>
            Copy
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function PlatformConsole() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("tenants");

  function logout() {
    clearAdminAuth();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-900 px-5 py-3 text-white">
        {/* `min-w-0`/`truncate` on the wordmark, `shrink-0` on Log out: at 360px
            "AptusHire — Platform Console" plus the icon and the button don't
            both fit one row, and this header has no shared drawer/hamburger to
            fall back to the way DashboardShell's does. */}
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-2 font-display text-base font-bold">
            <Cpu className="h-4.5 w-4.5 shrink-0 text-brand-300" aria-hidden="true" />
            <span className="truncate">AptusHire — Platform Console</span>
          </p>
          <button onClick={logout} className="flex shrink-0 items-center gap-1.5 text-sm text-slate-300 hover:text-white">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-5 py-6">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
                tab === t.key ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "tenants" && <TenantsTab />}
        {tab === "trust" && <TrustTab />}
        {tab === "audit" && (
          <LogTab
            endpoint="/platform/audit-logs"
            filters={[
              { key: "action", label: "Action prefix" },
              { key: "actorEmail", label: "Actor email" },
            ]}
            columns={[
              { label: "Action", primary: true, render: (r) => r.action },
              { label: "Status", trailing: true, render: (r) => <Badge tone="slate">{r.statusCode || "—"}</Badge> },
              { label: "When", render: (r) => new Date(r.createdAt).toLocaleString() },
              { label: "Actor", render: (r) => r.actorEmail || "system" },
              { label: "Target", render: (r) => (r.resourceType ? `${r.resourceType} ${r.resourceId || ""}` : "—") },
            ]}
          />
        )}
        {tab === "email" && (
          <LogTab
            endpoint="/platform/email-logs"
            filters={[
              { key: "to", label: "Recipient email" },
              { key: "status", label: "Status (sent/failed…)" },
              { key: "category", label: "Category" },
            ]}
            columns={[
              { label: "Subject", primary: true, render: (r) => r.subject },
              { label: "Status", trailing: true, render: (r) => <Badge tone={STATUS_TONE[r.status] || "slate"}>{r.status}</Badge> },
              { label: "To", render: (r) => r.to },
              { label: "When", render: (r) => new Date(r.createdAt).toLocaleString() },
              { label: "Category", render: (r) => r.category || "—" },
              { label: "Error", render: (r) => r.error || "—" },
            ]}
          />
        )}
        {tab === "usage" && (
          <LogTab
            endpoint="/platform/usage"
            filters={[]}
            columns={[
              { label: "Tenant", primary: true, render: (r) => r.companyName },
              { label: "Cost", trailing: true, render: (r) => <Badge tone="slate">₹{(r.costCents / 100).toFixed(2)}</Badge> },
              { label: "Kind", render: (r) => r.kind },
              { label: "Calls", render: (r) => r.calls },
              { label: "Tokens", render: (r) => r.totalTokens },
              { label: "Cached", render: (r) => r.cached },
              { label: "Fallback", render: (r) => r.fallback },
            ]}
          />
        )}
        {tab === "demo" && <DemoInterviewsTab />}
        {tab === "leads" && (
          <LogTab
            endpoint="/platform/demo-requests"
            filters={[]}
            columns={[
              { label: "Company", primary: true, render: (r) => r.companyName },
              { label: "Size", trailing: true, render: (r) => <Badge tone="slate">{r.companySize || "size unknown"}</Badge> },
              { label: "Email", render: (r) => r.email },
              { label: "Phone", render: (r) => r.phone || "—" },
              { label: "When", render: (r) => new Date(r.createdAt).toLocaleString() },
              { label: "Message", render: (r) => <span className="line-clamp-3">{r.message || "—"}</span> },
            ]}
          />
        )}
      </main>
    </div>
  );
}
