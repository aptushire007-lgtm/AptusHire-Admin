import { useCallback, useEffect, useRef, useState } from "react";
import { Mail, Plus, Pencil, Copy, Trash2, AlertTriangle } from "lucide-react";
import api from "../../api/client.js";
import { useCompanyName } from "../../context/companyDataContextObject.js";
import Modal from "../../components/ui/Modal.jsx";
import Button from "../../components/ui/Button.jsx";
import { Card, Skeleton, EmptyState } from "../../components/ui/Card.jsx";
import { Input, Textarea, Select, Label, FieldHint } from "../../components/ui/Field.jsx";
import { useToast } from "../../components/ui/Toast.jsx";
import { TEMPLATE_CATEGORIES, PLACEHOLDERS, SAMPLE_VALUES, STARTERS, fillTemplate } from "../../lib/templates.js";

const CATEGORY_LABEL = Object.fromEntries(TEMPLATE_CATEGORIES.map((c) => [c.value, c.label]));
const EMPTY = { name: "", category: "offer", subject: "", body: "" };

/**
 * Saved messages — offer letters, invites, rejections — written once and
 * reused. Placeholders are filled in when a template is used (the offer dialog
 * on the pipeline), so the preview here shows them with sample values.
 */
export default function Templates() {
  const toast = useToast();
  const [templates, setTemplates] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null); // { _id?, name, category, subject, body }

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const { data } = await api.get("/templates");
      setTemplates(data.templates || []);
    } catch (err) {
      setLoadError(err.response?.data?.error || "Could not load templates.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(t) {
    if (!window.confirm(`Delete “${t.name}”? This cannot be undone.`)) return;
    try {
      await api.delete(`/templates/${t._id}`);
      toast.success("Template deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not delete template");
    }
  }

  const shown = (templates || []).filter((t) => filter === "all" || t.category === filter);
  const counts = (templates || []).reduce((m, t) => ({ ...m, [t.category]: (m[t.category] || 0) + 1 }), {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0C1F1B]">Message templates</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Save the messages you send again and again. Use placeholders like {"{candidate_name}"} and they are filled in
            for each candidate — offer templates appear when you send an offer from the pipeline.
          </p>
        </div>
        <Button onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="h-4 w-4" aria-hidden="true" /> New template
        </Button>
      </div>

      {templates?.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by type">
          {[{ value: "all", label: "All" }, ...TEMPLATE_CATEGORIES].map((c) => {
            const n = c.value === "all" ? templates.length : counts[c.value] || 0;
            if (c.value !== "all" && !n) return null;
            return (
              <button
                key={c.value}
                type="button"
                aria-pressed={filter === c.value}
                onClick={() => setFilter(c.value)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  filter === c.value ? "bg-brand-800 text-white" : "bg-white text-slate-700 ring-1 ring-hairline hover:bg-canvas-deep"
                }`}
              >
                {c.label} <span className="num opacity-70">{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {templates?.length > 0 && (
        <StarterRow templates={templates} onPick={(t) => setEditing({ ...t })} />
      )}

      {templates === null && !loadError ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : loadError ? (
        <Card>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
            <div>
              <h3 className="text-base font-semibold text-slate-900">Could not load templates</h3>
              <p className="mt-1 text-sm text-slate-600">{loadError} This is not the same as having none.</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={load}>
                Try again
              </Button>
            </div>
          </div>
        </Card>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No templates yet"
          description="Start from an example and make it yours, or write one from scratch. Nothing is saved until you save it."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((s) => (
                <Button key={s.name} variant="secondary" size="sm" onClick={() => setEditing({ ...s })}>
                  {s.name}
                </Button>
              ))}
            </div>
          }
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map((t) => (
            <li key={t._id} className="flex flex-col rounded-xl border border-hairline bg-white p-4 shadow-2xs">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{t.name}</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">{CATEGORY_LABEL[t.category] || "Other"}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <IconButton label={`Edit ${t.name}`} icon={Pencil} onClick={() => setEditing({ ...t })} />
                  <IconButton
                    label={`Duplicate ${t.name}`}
                    icon={Copy}
                    onClick={() => setEditing({ name: `${t.name} (copy)`, category: t.category, subject: t.subject, body: t.body })}
                  />
                  <IconButton label={`Delete ${t.name}`} icon={Trash2} onClick={() => remove(t)} />
                </div>
              </div>
              {t.subject && <p className="mt-3 truncate text-sm font-medium text-slate-800">{t.subject}</p>}
              <p className="mt-1 line-clamp-3 text-sm whitespace-pre-line text-slate-500">{t.body}</p>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <TemplateEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

/** Examples not yet saved, one click to open in the editor — so every kind of message has a starting point. */
function StarterRow({ templates, onPick }) {
  const saved = new Set(templates.map((t) => t.name.toLowerCase()));
  const left = STARTERS.filter((s) => !saved.has(s.name.toLowerCase()));
  if (!left.length) return null;
  return (
    <section aria-label="Examples">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Start from an example</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {left.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => onPick(s)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-brand-400 hover:text-brand-800"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {s.name}
            <span className="text-xs text-slate-400">· {CATEGORY_LABEL[s.category]}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function IconButton({ label, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label.split(" ")[0]}
      onClick={onClick}
      className="rounded-md p-1.5 text-slate-500 hover:bg-canvas-deep hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

function TemplateEditor({ initial, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const bodyRef = useRef(null);
  const dirty = ["name", "category", "subject", "body"].some((k) => (form[k] || "") !== ((initial[k] ?? EMPTY[k]) || ""));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const companyName = useCompanyName();
  const sample = { ...SAMPLE_VALUES, ...(companyName ? { company_name: companyName } : {}) };

  // Insert at the caret, then put the caret after the placeholder.
  function insert(key) {
    const el = bodyRef.current;
    const token = `{${key}}`;
    const start = el?.selectionStart ?? form.body.length;
    const end = el?.selectionEnd ?? form.body.length;
    setForm((f) => ({ ...f, body: f.body.slice(0, start) + token + f.body.slice(end) }));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = { name: form.name, category: form.category, subject: form.subject, body: form.body };
    try {
      if (initial._id) await api.put(`/templates/${initial._id}`, payload);
      else await api.post("/templates", payload);
      toast.success("Template saved");
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={initial._id ? "Edit template" : "New template"}
      size="4xl"
      // Title and footer stay put; only the form scrolls between them, so fields
      // never slide under the panel's top edge.
      panelClassName="flex flex-col overflow-hidden"
      dirty={dirty}
      busy={saving}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="template-form" loading={saving}>
            Save template
          </Button>
        </div>
      }
    >
      <form id="template-form" onSubmit={save} className="-mx-1 grid min-h-0 flex-1 gap-6 overflow-y-auto px-1 md:grid-cols-2">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
            <div>
              <Label htmlFor="tpl-name" required>
                Name
              </Label>
              <Input id="tpl-name" value={form.name} onChange={set("name")} maxLength={120} required />
            </div>
            <div>
              <Label htmlFor="tpl-category">Type</Label>
              <Select id="tpl-category" value={form.category} onChange={set("category")}>
                {TEMPLATE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="tpl-subject">Subject</Label>
            <Input id="tpl-subject" value={form.subject} onChange={set("subject")} maxLength={200} />
          </div>
          <div>
            <Label htmlFor="tpl-body" required>
              Message
            </Label>
            <Textarea id="tpl-body" ref={bodyRef} rows={11} value={form.body} onChange={set("body")} maxLength={10000} required />
            <FieldHint>Click a placeholder to insert it where your cursor is.</FieldHint>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => insert(p.key)}
                  className="rounded-md bg-brand-50 px-2 py-1 font-mono text-xs text-brand-800 ring-1 ring-brand-200 ring-inset hover:bg-brand-100"
                >
                  {`{${p.key}}`}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
        <section aria-label="Preview" className="rounded-xl border border-hairline bg-canvas p-4">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Preview · sample candidate</p>
          <p className="mt-3 text-sm font-semibold text-slate-900">{fillTemplate(form.subject, sample) || "No subject"}</p>
          <div className="mt-3 border-t border-hairline pt-3 text-sm leading-relaxed whitespace-pre-line text-slate-700">
            {fillTemplate(form.body, sample) || <span className="text-slate-400">Your message appears here.</span>}
          </div>
        </section>
      </form>
    </Modal>
  );
}
