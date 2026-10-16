import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import api from "../../api/client.js";
import { Badge, Card, EmptyState } from "../../components/ui/Card.jsx";
import { Input, Select, Textarea } from "../../components/ui/Field.jsx";
import Button from "../../components/ui/Button.jsx";
import { useToast } from "../../components/ui/Toast.jsx";

const EMPTY_FORM = { name: "", category: "other", subject: "", body: "" };
const CATEGORIES = ["offer", "interview", "rejection", "follow_up", "other"];

export default function Templates() {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/templates");
      setTemplates(response.data.templates || []);
      setLoadError("");
    } catch (error) {
      setLoadError(error.response?.data?.error || "Could not load message templates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startNew() {
    setForm(EMPTY_FORM);
    setEditingId("");
    setShowForm(true);
  }

  function startEdit(template) {
    setForm({
      name: template.name || "",
      category: template.category || "other",
      subject: template.subject || "",
      body: template.body || "",
    });
    setEditingId(template._id);
    setShowForm(true);
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId) await api.put(`/templates/${editingId}`, form);
      else await api.post("/templates", form);
      toast.success(editingId ? "Template updated" : "Template created");
      setShowForm(false);
      setEditingId("");
      setForm(EMPTY_FORM);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not save the template.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(template) {
    if (!window.confirm(`Delete "${template.name}"?`)) return;
    try {
      await api.delete(`/templates/${template._id}`);
      toast.success("Template deleted");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not delete the template.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17221C]">Message templates</h1>
          <p className="mt-1 text-sm text-[#64736A]">
            Save reusable messages for candidate communications.
          </p>
        </div>
        <Button onClick={startNew}><Plus className="h-4 w-4" /> New template</Button>
      </div>

      {showForm && (
        <Card>
          <form className="space-y-4" onSubmit={save}>
            <h2 className="text-lg font-semibold text-[#17221C]">
              {editingId ? "Edit template" : "New template"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-[#17221C]">
                Name
                <Input required maxLength={120} value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </label>
              <label className="space-y-1 text-sm font-medium text-[#17221C]">
                Category
                <Select value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category.replace("_", " ")}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="space-y-1 text-sm font-medium text-[#17221C] sm:col-span-2">
                Subject
                <Input maxLength={200} value={form.subject}
                  onChange={(event) => setForm({ ...form, subject: event.target.value })} />
              </label>
              <label className="space-y-1 text-sm font-medium text-[#17221C] sm:col-span-2">
                Message
                <Textarea required maxLength={10000} rows={6} value={form.body}
                  onChange={(event) => setForm({ ...form, body: event.target.value })} />
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" loading={saving}>Save template</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <Card><p className="text-sm text-[#64736A]">Loading templates…</p></Card>
      ) : loadError ? (
        <Card><p role="alert" className="text-sm text-red-700">{loadError}</p></Card>
      ) : templates.length === 0 ? (
        <EmptyState
          title="No message templates yet"
          description="Create a template to reuse common candidate messages."
        />
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <Card key={template._id} padding="compact">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-[#17221C]">{template.name}</h2>
                    <Badge>{(template.category || "other").replace("_", " ")}</Badge>
                  </div>
                  {template.subject && (
                    <p className="mt-1 text-sm font-medium text-[#17221C]">{template.subject}</p>
                  )}
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[#64736A]">{template.body}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => startEdit(template)}>
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => remove(template)}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
