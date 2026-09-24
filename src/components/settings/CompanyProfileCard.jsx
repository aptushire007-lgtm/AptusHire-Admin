import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import api from "../../api/client.js";
import { useCompanyData } from "../../context/CompanyDataContext.jsx";
import { Card, Skeleton } from "../ui/Card.jsx";
import Button from "../ui/Button.jsx";
import { Input, Select, Label, FormGroup } from "../ui/Field.jsx";
import { useToast } from "../ui/Toast.jsx";

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

const FIELDS = [
  { key: "industry", label: "Industry" },
  { key: "companySize", label: "Company size", type: "select" },
  { key: "website", label: "Website" },
  { key: "gstNumber", label: "GST number" },
  { key: "country", label: "Country", required: true },
  { key: "state", label: "State", required: true },
  { key: "city", label: "City", required: true },
  { key: "address", label: "Address", required: true, wide: true },
];

const EMPTY = { name: "", industry: "", companySize: "", website: "", gstNumber: "", country: "", state: "", city: "", address: "" };

function fromDoc(doc) {
  return {
    name: doc.name || "",
    industry: doc.industry || "",
    companySize: doc.companySize || "",
    website: doc.website || "",
    gstNumber: doc.gstNumber || "",
    country: doc.country || "",
    state: doc.state || "",
    city: doc.city || "",
    address: doc.address || "",
  };
}

/**
 * Full read/write view of the company profile (models/Company.js) — name,
 * industry, size, website, GST, address. Separate from the AI/compliance/
 * branding CompanySettings form elsewhere on this page: this is a different
 * document (/company-settings/profile), and until this card existed it was
 * only ever written once, at registration.
 */
export default function CompanyProfileCard() {
  const toast = useToast();
  const { refresh: refreshWorkspace } = useCompanyData();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saved, setSaved] = useState(EMPTY);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get("/company-settings/profile")
      .then((res) => {
        if (!active) return;
        const value = fromDoc(res.data);
        setSaved(value);
        setForm(value);
      })
      .catch(() => active && setLoadError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  function startEdit() {
    setForm(saved);
    setEditing(true);
  }

  function set(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function save() {
    if (!form.name.trim()) return toast.error("Company name cannot be empty.");
    for (const field of FIELDS) {
      if (field.required && !String(form[field.key] || "").trim()) {
        return toast.error(`${field.label} is required.`);
      }
    }
    setSaving(true);
    try {
      const { data } = await api.put("/company-settings/profile", form);
      const value = fromDoc(data);
      setSaved(value);
      setForm(value);
      setEditing(false);
      toast.success("Company profile updated.");
      await refreshWorkspace();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not save the company profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Card><Skeleton className="h-56 w-full" /></Card>;
  if (loadError) return <Card><p className="text-sm text-red-700">Company profile could not be loaded.</p></Card>;

  return (
    <Card>
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">Company profile</h2>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            aria-label="Edit company profile"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="mb-4 text-sm text-slate-500">Company details shown on your careers page and used across job postings.</p>

      {editing ? (
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormGroup className="mb-0 sm:col-span-2">
              <Label required>Company name</Label>
              <Input value={form.name} onChange={set("name")} maxLength={200} />
            </FormGroup>
            {FIELDS.map((field) => (
              <FormGroup key={field.key} className={`mb-0 ${field.wide ? "sm:col-span-2" : ""}`}>
                <Label required={field.required}>{field.label}</Label>
                {field.type === "select" ? (
                  <Select value={form[field.key]} onChange={set(field.key)}>
                    <option value="" disabled>Select…</option>
                    {COMPANY_SIZES.map((size) => (
                      <option key={size} value={size}>{size} employees</option>
                    ))}
                  </Select>
                ) : (
                  <Input value={form[field.key]} onChange={set(field.key)} maxLength={field.key === "address" ? 300 : 100} />
                )}
              </FormGroup>
            ))}
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="sm" loading={saving} onClick={save}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <dl className="grid gap-3 border-t border-hairline pt-4 text-sm sm:grid-cols-2">
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-xs text-slate-500">Company name</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{saved.name || "—"}</dd>
          </div>
          {FIELDS.map((field) => (
            <div key={field.key} className={`min-w-0 ${field.wide ? "sm:col-span-2" : ""}`}>
              <dt className="text-xs text-slate-500">{field.label}</dt>
              <dd className="mt-0.5 truncate font-medium text-slate-800">{saved[field.key] || "Not added"}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}
