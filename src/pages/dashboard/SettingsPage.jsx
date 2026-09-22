import { useEffect, useState } from "react";
import { Building2, User, Mail, Phone, Bot, ShieldCheck, BellRing, Palette, Save, AlertTriangle, Globe2, Copy, Microscope, CreditCard, ChevronRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import api from "../../api/client.js";
import { useAdminAuth } from "../../auth/useAdminAuth.js";
import { useCompanyData } from "../../context/CompanyDataContext.jsx";
import { Card, Badge, Skeleton } from "../../components/ui/Card.jsx";
import { Input, Select, Label, FormGroup } from "../../components/ui/Field.jsx";
import Button from "../../components/ui/Button.jsx";
import { useToast } from "../../components/ui/Toast.jsx";

// A small inline switch — the UI kit has no toggle, and a checkbox reads poorly for on/off policy.
function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 disabled:opacity-50 ${
        checked ? "bg-brand-600" : "bg-slate-300"
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function ToggleRow({ label, description, checked, onChange, tone }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div>
        <p className={`text-sm font-medium ${tone === "warn" ? "text-amber-800" : "text-slate-800"}`}>{label}</p>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      <Toggle label={label} checked={checked} onChange={onChange} />
    </div>
  );
}

const EMPTY = {
  atsEngine: "",
  aiModel: "",
  aiTemperature: "0",
  aiBudgetUsd: "0",
  aiHardCap: true,
  consentRequired: true,
  autoReject: false,
  retentionDays: "365",
  dpoName: "",
  dpoEmail: "",
  dpoPhone: "",
  notifNewApp: true,
  notifAts: true,
  notifInterview: true,
  brandingCustom: false,
  brandingColor: "#1a2a44",
};

// Map the API settings document → flat form state (budget shown in USD, not cents).
function fromSettings(s) {
  return {
    atsEngine: s.ai?.atsEngine || "",
    aiModel: s.ai?.model || "",
    aiTemperature: String(s.ai?.temperature ?? 0),
    aiBudgetUsd: String((s.ai?.monthlyBudgetCents ?? 0) / 100),
    aiHardCap: s.ai?.hardCap !== false,
    consentRequired: s.compliance?.aiConsentRequired !== false,
    autoReject: s.compliance?.autoRejectAllowed === true,
    retentionDays: String(s.compliance?.retentionDays ?? 365),
    dpoName: s.compliance?.dpo?.name || "",
    dpoEmail: s.compliance?.dpo?.email || "",
    dpoPhone: s.compliance?.dpo?.phone || "",
    notifNewApp: s.notificationPreferences?.emailOnNewApplication !== false,
    notifAts: s.notificationPreferences?.emailOnAtsResult !== false,
    notifInterview: s.notificationPreferences?.emailOnInterviewCompleted !== false,
    brandingCustom: s.branding?.useCustomBranding === true,
    brandingColor: s.branding?.primaryColor || "#1a2a44",
  };
}

// Flat form state → the nested payload the PUT endpoint validates.
function toPayload(f) {
  return {
    ai: {
      atsEngine: f.atsEngine,
      model: f.aiModel.trim(),
      temperature: Number(f.aiTemperature),
      monthlyBudgetCents: Math.round(Number(f.aiBudgetUsd) * 100),
      hardCap: f.aiHardCap,
    },
    compliance: {
      aiConsentRequired: f.consentRequired,
      autoRejectAllowed: f.autoReject,
      retentionDays: Math.round(Number(f.retentionDays)),
      dpo: { name: f.dpoName.trim(), email: f.dpoEmail.trim(), phone: f.dpoPhone.trim() },
    },
    notificationPreferences: {
      emailOnNewApplication: f.notifNewApp,
      emailOnAtsResult: f.notifAts,
      emailOnInterviewCompleted: f.notifInterview,
    },
    branding: { useCustomBranding: f.brandingCustom, primaryColor: f.brandingColor },
  };
}

// Phase 15 — distribution: public careers/feed URLs + tenant board credentials.
// Credentials are WRITE-ONLY: the API never returns stored secrets, so the form
// always starts blank and only shows "configured / last test" status.
const CREDENTIAL_FIELDS = {
  naukri: [
    { key: "clientId", label: "Client ID" },
    { key: "apiKey", label: "API key" },
  ],
  webhook: [
    { key: "url", label: "Webhook URL" },
    { key: "secret", label: "Signing secret" },
  ],
  linkedin: [{ key: "accessToken", label: "Access token" }],
  indeed: [{ key: "accessToken", label: "Access token" }],
  ziprecruiter: [{ key: "accessToken", label: "Access token" }],
};

function IntegrationsSection() {
  const toast = useToast();
  const [careers, setCareers] = useState(null);
  const [boards, setBoards] = useState([]);
  const [drafts, setDrafts] = useState({}); // board → { field: value }
  const [busyBoard, setBusyBoard] = useState(null);
  const [boardsError, setBoardsError] = useState("");
  const [boardsLoading, setBoardsLoading] = useState(false);

  useEffect(() => {
    api.get("/company-settings/careers-info").then((res) => setCareers(res.data)).catch(() => {});
    loadBoards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBoards() {
    setBoardsLoading(true);
    try {
      const res = await api.get("/company-settings/board-credentials");
      setBoards(res.data.boards || []);
      setBoardsError("");
    } catch {
      setBoardsError("Could not load integration status. Existing connections may still be active.");
    } finally {
      setBoardsLoading(false);
    }
  }

  async function copyText(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy");
    }
  }

  async function saveCredential(board) {
    const fields = CREDENTIAL_FIELDS[board] || [];
    const secrets = {};
    for (const f of fields) {
      const v = (drafts[board]?.[f.key] || "").trim();
      if (!v) return toast.error(`${f.label} is required`);
      secrets[f.key] = v;
    }
    setBusyBoard(board);
    try {
      await api.put(`/company-settings/board-credentials/${board}`, { secrets });
      setDrafts((d) => ({ ...d, [board]: {} }));
      toast.success("Credentials saved (encrypted at rest — never shown again)");
      await loadBoards();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not save credentials");
    } finally {
      setBusyBoard(null);
    }
  }

  async function testCredential(board) {
    setBusyBoard(board);
    try {
      await api.post(`/company-settings/board-credentials/${board}/test`);
      toast.success("Connection OK");
    } catch (err) {
      toast.error(err.response?.data?.error || "Connection test failed");
    } finally {
      setBusyBoard(null);
      await loadBoards();
    }
  }

  async function disconnect(board) {
    if (!confirm(`Disconnect ${board}? The stored credentials are deleted.`)) return;
    setBusyBoard(board);
    try {
      await api.delete(`/company-settings/board-credentials/${board}`);
      toast.success("Disconnected");
      await loadBoards();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not disconnect");
    } finally {
      setBusyBoard(null);
    }
  }

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-900">
        <Globe2 className="h-4.5 w-4.5 text-brand-600" /> Integrations & Distribution
      </h2>
      <p className="mb-4 text-sm text-slate-500">
        Your public careers page and feeds need nobody's permission — Google for Jobs and the aggregator network index
        them for free. Board accounts you already pay for connect below.
      </p>

      {boardsLoading && <p role="status" className="mb-3 text-sm text-[#5B6B63]">Loading integration status…</p>}
      {boardsError && <div role="alert" className="mb-4 rounded-lg border border-amber-200 p-3 text-sm text-amber-900">
        <p>{boardsError}</p>
        <button type="button" disabled={boardsLoading} onClick={loadBoards} className="mt-2 rounded border border-amber-300 px-3 py-2 font-semibold">Retry integration status</button>
      </div>}
      {careers && (
        <div className="mb-5 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
          {[
            { label: "Careers page", value: careers.careersUrl },
            { label: "Jobs feed (XML)", value: careers.feedUrl },
            { label: "Jobs sitemap", value: careers.sitemapUrl },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3">
              <span className="shrink-0 text-slate-500">{row.label}</span>
              {/* `min-w-0`: a flex item's default `min-width: auto` holds it at
                  its content size, so `truncate` never engaged — a real feed/
                  sitemap URL just pushed the row past the card edge. */}
              <span className="min-w-0 truncate font-mono text-xs text-slate-600">{row.value}</span>
              <button onClick={() => copyText(row.value, row.label)} className="shrink-0 text-slate-500 hover:text-brand-700" title="Copy">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <p className="pt-1 text-xs text-slate-500">
            Submit the feed once to Adzuna, Jooble, Talent.com and Careerjet — no contract needed; they crawl it from
            then on.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {boards.map((b) => (
          <div key={b.board} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">
                {b.name} <Badge tone="slate">Tier {b.tier}</Badge>
              </p>
              <div className="flex items-center gap-2">
                {!b.enabled && <Badge tone="amber">{b.reason}</Badge>}
                {b.configured ? (
                  <Badge tone={b.lastTestOk === false ? "red" : "green"}>
                    connected{b.lastTestedAt ? ` · tested ${new Date(b.lastTestedAt).toLocaleDateString()}` : ""}
                  </Badge>
                ) : (
                  <Badge tone="slate">not connected</Badge>
                )}
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(CREDENTIAL_FIELDS[b.board] || []).map((f) => (
                <FormGroup key={f.key}>
                  <Label>{f.label}</Label>
                  <Input
                    type="password"
                    autoComplete="off"
                    placeholder={b.configured ? "•••••• (stored encrypted)" : ""}
                    value={drafts[b.board]?.[f.key] || ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [b.board]: { ...d[b.board], [f.key]: e.target.value } }))}
                  />
                </FormGroup>
              ))}
            </div>

            <div className="mt-1 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" loading={busyBoard === b.board} onClick={() => saveCredential(b.board)}>
                Save credentials
              </Button>
              {b.configured && (
                <>
                  <Button size="sm" variant="outline" loading={busyBoard === b.board} onClick={() => testCredential(b.board)}>
                    Test connection
                  </Button>
                  <Button size="sm" variant="outline" loading={busyBoard === b.board} onClick={() => disconnect(b.board)}>
                    Disconnect
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

const SETTINGS_SECTIONS = [
  { id: "organization", label: "Profile & organization", hint: "You, your company, and an overview", icon: Building2, tile: "bg-brand-100 text-brand-800" },
  { id: "screening", label: "Screening & interviews", hint: "Scoring engine and AI interviewer", icon: Microscope, tile: "bg-sky-100 text-sky-700" },
  { id: "privacy", label: "Data & privacy", hint: "Consent, retention, data officer", icon: ShieldCheck, tile: "bg-teal-100 text-teal-800" },
  { id: "notifications", label: "Email notifications", hint: "What your team is emailed about", icon: BellRing, tile: "bg-amber-100 text-amber-800" },
  { id: "branding", label: "Branding", hint: "Colours on candidate pages", icon: Palette, tile: "bg-fuchsia-100 text-fuchsia-800" },
  { id: "integrations", label: "Integrations", hint: "Job boards and careers page", icon: Globe2, tile: "bg-indigo-100 text-indigo-800" },
];

const ENGINE_LABEL = { "": "Platform default", legacy: "Keyword matching", shadow: "Shadow (comparing)", live: "Evidence engine" };

function initialsOf(name) {
  return (String(name || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2) || "?").toUpperCase();
}

/** One settings fact, read from the saved form, that links to where it is changed. */
function GlanceTile({ section, label, value, detail, tone = "text-slate-900" }) {
  const meta = SETTINGS_SECTIONS.find((x) => x.id === section);
  return (
    <Link
      to={`/settings?section=${section}`}
      className="group flex items-start gap-3 rounded-xl border border-hairline bg-white p-3.5 transition-colors hover:border-slate-300 hover:bg-canvas"
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.tile}`} aria-hidden="true">
        <meta.icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-slate-500">{label}</span>
        <span className={`block truncate text-sm font-semibold ${tone}`}>{value}</span>
        {detail && <span className="block truncate text-[11px] text-slate-500">{detail}</span>}
      </span>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500" aria-hidden="true" />
    </Link>
  );
}

export default function SettingsPage() {
  const [params] = useSearchParams();
  const section = SETTINGS_SECTIONS.some(item => item.id === params.get("section")) ? params.get("section") : "organization";
  const { user } = useAdminAuth();
  const { me, subscription, loading: companyLoading } = useCompanyData();
  const company = me?.company;
  const toast = useToast();

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedForm, setSavedForm] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const dirty = savedForm != null && JSON.stringify(savedForm) !== JSON.stringify(form);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    api
      .get("/company-settings")
      .then((res) => {
        if (active) { const value = fromSettings(res.data); setForm(value); setSavedForm(value); }
      })
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const onInput = (key) => (e) => set(key)(e.target.value);

  async function save() {
    // Light client-side guards; the server validates authoritatively.
    const temp = Number(form.aiTemperature);
    const budget = Number(form.aiBudgetUsd);
    const retention = Number(form.retentionDays);
    if (!Number.isFinite(temp) || temp < 0 || temp > 2) return toast.error("Temperature must be between 0 and 2.");
    if (!Number.isFinite(budget) || budget < 0) return toast.error("Monthly budget must be 0 or more.");
    if (!Number.isFinite(retention) || retention < 1) return toast.error("Retention must be at least 1 day.");

    setSaving(true);
    try {
      const res = await api.put("/company-settings", toPayload(form));
      const value = fromSettings(res.data);
      setForm(value);
      setSavedForm(value);
      toast.success("Settings saved.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your profile, your organization and how hiring runs." />
      <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="workspace-settings-nav grid gap-1 rounded-2xl border border-hairline bg-white p-2 sm:grid-cols-2 lg:sticky lg:top-20 lg:grid-cols-1">
          {SETTINGS_SECTIONS.map(item => (
            <Link key={item.id} to={`/settings?section=${item.id}`} aria-current={section === item.id ? "page" : undefined} className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm text-slate-700 hover:bg-canvas">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.tile}`} aria-hidden="true"><item.icon className="h-4 w-4" /></span>
              <span className="min-w-0">
                <span className="block truncate">{item.label}</span>
                <span className="block truncate text-[11px] font-normal text-slate-500" aria-hidden="true">{item.hint}</span>
              </span>
            </Link>
          ))}
          <Link to="/subscription" className="mt-1 flex items-center gap-3 rounded-xl border-t border-hairline px-2.5 py-2.5 text-sm text-slate-700 hover:bg-canvas">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600" aria-hidden="true"><CreditCard className="h-4 w-4" /></span>
            <span className="min-w-0">
              <span className="block">Plan and billing</span>
              <span className="block truncate text-[11px] text-slate-500">{subscription?.plan?.name ? `${subscription.plan.name} plan` : "Your subscription"}</span>
            </span>
          </Link>
        </nav>
        <div className="min-w-0 space-y-4">
        {loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">Company settings could not be loaded.<Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>Retry settings</Button></div>}
        <fieldset disabled={saving} className="min-w-0 space-y-4">
      {/* You, your company, and what is switched on — read-only here; each
          overview tile links to the section where it is changed. */}
      <section hidden={section !== "organization"} aria-label="Profile and organization" className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-800 text-lg font-bold text-white" aria-hidden="true">
                {initialsOf(user?.name)}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Your profile</p>
                <h2 className="truncate text-lg font-bold text-slate-900">{user?.name || "—"}</h2>
                <Badge tone="brand" className="mt-1 capitalize">{user?.role || "member"}</Badge>
              </div>
            </div>
            <dl className="mt-5 grid gap-3 border-t border-hairline pt-4 text-sm sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="flex items-center gap-1.5 text-xs text-slate-500"><Mail className="h-3.5 w-3.5" aria-hidden="true" /> Email</dt>
                <dd className="mt-0.5 truncate font-medium text-slate-800" title={user?.email}>{user?.email || "—"}</dd>
              </div>
              <div className="min-w-0">
                <dt className="flex items-center gap-1.5 text-xs text-slate-500"><Phone className="h-3.5 w-3.5" aria-hidden="true" /> Phone</dt>
                <dd className="mt-0.5 truncate font-medium text-slate-800">{user?.phone || "Not added"}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            {companyLoading ? (
              <Skeleton className="h-28 w-full" />
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-lg font-bold text-teal-800" aria-hidden="true">
                    {initialsOf(company?.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Organization</p>
                    <h2 className="truncate text-lg font-bold text-slate-900">{company?.name || "—"}</h2>
                    <Badge tone={company?.status === "active" ? "green" : "amber"} className="mt-1 capitalize">{company?.status || "unknown"}</Badge>
                  </div>
                </div>
                <dl className="mt-5 grid gap-3 border-t border-hairline pt-4 text-sm sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">Company code</dt>
                    <dd className="mt-0.5 flex items-center gap-1.5">
                      <span className="font-mono text-xs font-semibold text-slate-800">{company?.companyCode || "—"}</span>
                      {company?.companyCode && (
                        <button
                          type="button"
                          aria-label="Copy company code"
                          onClick={() => navigator.clipboard?.writeText(company.companyCode).then(() => toast.success("Company code copied"), () => {})}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">Plan</dt>
                    <dd className="mt-0.5 truncate font-medium text-slate-800">
                      {subscription?.plan?.name ? (
                        <Link to="/subscription" className="hover:text-brand-800 hover:underline">
                          {subscription.plan.name}
                          {subscription.currentPeriodEnd && <span className="font-normal text-slate-500"> · renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>}
                        </Link>
                      ) : (
                        "No active plan"
                      )}
                    </dd>
                  </div>
                </dl>
              </>
            )}
          </Card>
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-900">How your workspace is set up</h2>
          <p className="mt-0.5 text-xs text-slate-500">The settings that shape every hire, at a glance. Click one to change it.</p>
          {loading ? (
            <Skeleton className="mt-3 h-40 w-full" />
          ) : loadError ? null : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <GlanceTile section="screening" label="Screening engine" value={ENGINE_LABEL[form.atsEngine] ?? form.atsEngine} />
              <GlanceTile
                section="screening"
                label="AI interview budget"
                value={Number(form.aiBudgetUsd) > 0 ? `$${Number(form.aiBudgetUsd).toLocaleString()} / month` : "Uncapped"}
                detail={Number(form.aiBudgetUsd) > 0 ? (form.aiHardCap ? "Hard cap on" : "Soft cap") : null}
              />
              <GlanceTile
                section="privacy"
                label="Automatic rejection"
                value={form.autoReject ? "On — no human review" : "Off — a person decides"}
                tone={form.autoReject ? "text-amber-800" : "text-slate-900"}
              />
              <GlanceTile
                section="privacy"
                label="Data retention"
                value={`${form.retentionDays} days`}
                detail={form.consentRequired ? "AI consent required" : "AI consent not asked"}
              />
              <GlanceTile
                section="notifications"
                label="Email notifications"
                value={`${[form.notifNewApp, form.notifAts, form.notifInterview].filter(Boolean).length} of 3 on`}
              />
              <GlanceTile section="branding" label="Branding" value={form.brandingCustom ? `Custom · ${form.brandingColor}` : "AptusHire default"} />
            </div>
          )}
        </div>
      </section>

      {loading ? (
        <Card><Skeleton className="h-64 w-full" /></Card>
      ) : loadError ? null : (
        <>
          <section hidden={section !== "screening"} aria-label="Screening and interview settings" className="space-y-4">
          {/* Screening engine — the switch that decides whether the evidence
              engine (rubric × claim-graph × deterministic scorer) actually
              scores candidates, or only the legacy keyword matcher runs. */}
          <Card>
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-900">
              <Microscope className="h-4.5 w-4.5 text-brand-600" /> Screening Engine
            </h2>
            <p className="mb-4 text-sm text-slate-500">
              How applicants are scored. The evidence engine scores each candidate against your approved rubric with
              cited proof for every point — jobs without an approved rubric always use the keyword engine.
            </p>
            <FormGroup className="mb-0 max-w-md">
              <Label>Engine mode</Label>
              <Select value={form.atsEngine} onChange={onInput("atsEngine")}>
                <option value="">Platform default</option>
                <option value="legacy">Legacy — keyword matching only</option>
                <option value="shadow">Shadow — evidence engine runs silently for comparison</option>
                <option value="live">Live — evidence engine scores candidates</option>
              </Select>
              <p className="mt-2 text-xs text-slate-500">
                {form.atsEngine === "shadow" &&
                  "Shadow mode: candidates are still scored and decided by the keyword engine, while the evidence engine runs in parallel and records what it would have scored. Use this to compare the two before going live — nothing changes for candidates."}
                {form.atsEngine === "live" &&
                  "Live mode: the evidence engine's score is the candidate's score wherever a job has an approved rubric. Jobs without one fall back to the keyword engine, labelled as such."}
                {form.atsEngine === "legacy" &&
                  "Legacy mode: only the deterministic keyword engine runs. Rubrics, claim verification and evidence scoring are not used."}
                {form.atsEngine === "" &&
                  "The platform-wide default applies. Pick a mode to control it per company."}
              </p>
            </FormGroup>
          </Card>

          {/* AI interview */}
          <Card>
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-900">
              <Bot className="h-4.5 w-4.5 text-brand-600" /> AI Interview
            </h2>
            <p className="mb-4 text-sm text-slate-500">How the AI conducts and pays for interviews. Leave the model blank to use the platform default.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormGroup className="mb-0">
                <Label>Model override</Label>
                <Input value={form.aiModel} onChange={onInput("aiModel")} placeholder="e.g. anthropic/claude-3.5-sonnet (blank = default)" />
              </FormGroup>
              <FormGroup className="mb-0">
                <Label>Temperature (0–2)</Label>
                <Input type="number" min="0" max="2" step="0.1" value={form.aiTemperature} onChange={onInput("aiTemperature")} />
              </FormGroup>
              <FormGroup className="mb-0">
                <Label>Monthly AI budget (USD)</Label>
                <Input type="number" min="0" step="0.01" value={form.aiBudgetUsd} onChange={onInput("aiBudgetUsd")} />
                <p className="mt-1 text-xs text-slate-500">0 = uncapped. Interview LLM spend is metered against this each month.</p>
              </FormGroup>
              <div className="flex items-center">
                <ToggleRow
                  label="Hard budget cap"
                  description="When the budget is spent, fall back to the offline engine instead of continuing to spend."
                  checked={form.aiHardCap}
                  onChange={set("aiHardCap")}
                />
              </div>
            </div>
          </Card>

          </section>
          <section hidden={section !== "privacy"} aria-label="Data and privacy settings" className="space-y-4">
          {/* Compliance & DPDP */}
          <Card>
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-900">
              <ShieldCheck className="h-4.5 w-4.5 text-brand-600" /> Compliance & Data Protection
            </h2>
            <p className="mb-3 text-sm text-slate-500">Controls that govern candidate PII and fair-hiring safeguards (India DPDP).</p>
            <div className="divide-y divide-slate-100">
              <ToggleRow
                label="Require AI consent"
                description="Ask candidates to consent before any resume/answer text is sent to the external AI. Without consent the interview runs fully offline."
                checked={form.consentRequired}
                onChange={set("consentRequired")}
              />
              <ToggleRow
                label="Allow automatic rejection"
                description="Let the ATS auto-reject and email below-threshold candidates without human review. Off keeps a person in the loop (recommended)."
                checked={form.autoReject}
                onChange={set("autoReject")}
                tone={form.autoReject ? "warn" : undefined}
              />
            </div>
            {form.autoReject && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Automatic rejection is enabled — candidates below the ATS threshold will be rejected and emailed with no human review.
              </div>
            )}
            <FormGroup className="mb-0 mt-4 max-w-xs">
              <Label>Data retention (days)</Label>
              <Input type="number" min="1" max="3650" step="1" value={form.retentionDays} onChange={onInput("retentionDays")} />
              <p className="mt-1 text-xs text-slate-500">Interview & resume data untouched for longer than this is permanently deleted by the nightly job.</p>
            </FormGroup>
          </Card>

          {/* DPO contact */}
          <Card>
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-900">
              <ShieldCheck className="h-4.5 w-4.5 text-brand-600" /> Data Protection Officer
            </h2>
            <p className="mb-4 text-sm text-slate-500">Shown to candidates on the application form for data-rights requests (DPDP §5.2).</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormGroup className="mb-0">
                <Label>Name</Label>
                <Input value={form.dpoName} onChange={onInput("dpoName")} placeholder="Full name" />
              </FormGroup>
              <FormGroup className="mb-0">
                <Label>Email</Label>
                <Input type="email" value={form.dpoEmail} onChange={onInput("dpoEmail")} placeholder="dpo@company.com" />
              </FormGroup>
              <FormGroup className="mb-0">
                <Label>Phone</Label>
                <Input value={form.dpoPhone} onChange={onInput("dpoPhone")} placeholder="+91 …" />
              </FormGroup>
            </div>
          </Card>

          </section>
          <section hidden={section !== "notifications"} aria-label="Email notification settings">
          {/* Notifications */}
          <Card>
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-900">
              <BellRing className="h-4.5 w-4.5 text-brand-600" /> Email Notifications
            </h2>
            <p className="mb-3 text-sm text-slate-500">Which recruiter emails your team receives.</p>
            <div className="divide-y divide-slate-100">
              <ToggleRow label="New application" description="Email when a candidate applies to one of your jobs." checked={form.notifNewApp} onChange={set("notifNewApp")} />
              <ToggleRow label="ATS result" description="Email when a candidate passes or fails ATS screening." checked={form.notifAts} onChange={set("notifAts")} />
              <ToggleRow label="Interview completed" description="Email when an AI interview finishes and a report is ready." checked={form.notifInterview} onChange={set("notifInterview")} />
            </div>
          </Card>

          </section>
          <section hidden={section !== "branding"} aria-label="Branding settings">
          {/* Branding */}
          <Card>
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-900">
              <Palette className="h-4.5 w-4.5 text-brand-600" /> Branding
            </h2>
            <p className="mb-3 text-sm text-slate-500">Apply your brand colour to candidate-facing pages and emails.</p>
            <ToggleRow label="Use custom branding" checked={form.brandingCustom} onChange={set("brandingCustom")} />
            <FormGroup className="mb-0 mt-3 max-w-xs">
              <Label>Primary colour</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.brandingColor}
                  onChange={onInput("brandingColor")}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                />
                <Input value={form.brandingColor} onChange={onInput("brandingColor")} className="font-mono" />
              </div>
            </FormGroup>
          </Card>

          </section>
          <section hidden={section !== "integrations"} aria-label="Integration settings"><IntegrationsSection /></section>
        </>
      )}
      </fieldset>
      {/* The save bar belongs to sections with something to save — or to any
          section while edits made elsewhere are still unsaved. */}
      {!loading && !loadError && (dirty || !["organization", "integrations"].includes(section)) && <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-hairline bg-white px-4 py-3">
        <p role="status" className="text-xs text-slate-500">{dirty ? "Unsaved changes across settings sections" : "All changes saved"}</p>
        <div className="flex items-center gap-2">
          {dirty && <Button variant="secondary" disabled={saving} onClick={() => setForm(savedForm)}>Discard changes</Button>}
          <Button onClick={save} loading={saving} disabled={!dirty}><Save className="h-4 w-4" aria-hidden="true" />Save changes</Button>
        </div>
      </div>}
      </div>
      </div>
    </div>
  );
}
