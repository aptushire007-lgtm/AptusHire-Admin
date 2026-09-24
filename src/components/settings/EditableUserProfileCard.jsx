import { useRef, useState } from "react";
import { Camera, Loader2, Mail, Pencil, Phone, Trash2 } from "lucide-react";
import api from "../../api/client.js";
import { updateAdminUser } from "../../auth/adminAuth.js";
import Button from "../ui/Button.jsx";
import { Input, Label, FormGroup } from "../ui/Field.jsx";
import { useToast } from "../ui/Toast.jsx";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

function isAcceptedImage(file) {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function initialsOf(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Avatar with a hover/tap camera button to upload or replace the photo, and
 * a remove button when one is already set — shown in both view and edit mode. */
function AvatarUploader({ user, size = "h-14 w-14" }) {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    if (!isAcceptedImage(file)) {
      toast.error("Only PNG, JPG or WEBP images are allowed.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("Photo must be 2 MB or smaller.");
      return;
    }
    const body = new FormData();
    body.append("photo", file);
    setBusy(true);
    try {
      const { data } = await api.post("/auth/me/photo", body, { headers: { "Content-Type": "multipart/form-data" } });
      updateAdminUser({ photoPath: data.photoPath });
      toast.success("Profile photo updated.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not upload the photo. Please try again.");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove(e) {
    e.stopPropagation();
    setBusy(true);
    try {
      const { data } = await api.delete("/auth/me/photo");
      updateAdminUser({ photoPath: data.photoPath });
      toast.success("Profile photo removed.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not remove the photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className={`group relative ${size} shrink-0`}>
      <span className={`flex ${size} items-center justify-center overflow-hidden rounded-2xl bg-brand-800 text-lg font-bold text-white`} aria-hidden="true">
        {user?.photoPath ? (
          <img src={user.photoPath} alt="" className="h-full w-full object-cover" />
        ) : (
          initialsOf(user?.name)
        )}
      </span>
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        aria-label={user?.photoPath ? "Replace profile photo" : "Upload profile photo"}
        disabled={busy}
        onClick={() => fileInputRef.current?.click()}
        className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-700 text-white shadow-sm hover:bg-slate-900 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Camera className="h-3 w-3" aria-hidden="true" />}
      </button>
      {user?.photoPath && (
        <button
          type="button"
          aria-label="Remove profile photo"
          disabled={busy}
          onClick={handleRemove}
          className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
        >
          <Trash2 className="h-2.5 w-2.5" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

export default function EditableUserProfileCard({ user }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "" });

  function startEdit() {
    setForm({ name: user?.name || "", phone: user?.phone || "" });
    setEditing(true);
  }

  async function save() {
    const name = form.name.trim();
    if (!name) return toast.error("Name cannot be empty.");
    setSaving(true);
    try {
      const { data } = await api.patch("/auth/me", { name, phone: form.phone.trim() });
      updateAdminUser({ name: data.name, phone: data.phone });
      toast.success("Profile updated.");
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <AvatarUploader user={user} />
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Your profile</p>
            <p className="text-sm font-medium text-slate-600">Editing</p>
          </div>
        </div>
        <div className="grid gap-3 border-t border-hairline pt-4 sm:grid-cols-2">
          <FormGroup className="mb-0">
            <Label required>Full name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={120} />
          </FormGroup>
          <FormGroup className="mb-0">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
          </FormGroup>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" variant="primary" size="sm" loading={saving} onClick={save}>
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <AvatarUploader user={user} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Your profile</p>
          <h2 className="truncate text-lg font-bold text-slate-900">{user?.name || "—"}</h2>
        </div>
        <button
          type="button"
          onClick={startEdit}
          aria-label="Edit your profile"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
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
    </>
  );
}
