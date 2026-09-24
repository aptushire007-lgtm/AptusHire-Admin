import { useRef, useState } from "react";
import { Building2, Loader2, Trash2, UploadCloud } from "lucide-react";
import api from "../../api/client.js";
import Button from "../ui/Button.jsx";
import { useToast } from "../ui/Toast.jsx";
import { useCompanyData } from "../../context/CompanyDataContext.jsx";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

function isAcceptedImage(file) {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/**
 * The company's own branding picture — read on the PUBLIC job listing and job
 * detail pages a candidate visits (JobListings.jsx/JobDetail.jsx in the
 * candidate app render `company.logoPath` straight into an <img>), so a
 * change here shows up there the moment it's saved, with nothing further to
 * wire up on that side.
 */
export default function CompanyLogoUploader() {
  const toast = useToast();
  const { me, refresh } = useCompanyData();
  const logoPath = me?.company?.logoPath;
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    if (!isAcceptedImage(file)) {
      toast.error("Only PNG, JPG or WEBP images are allowed.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Logo must be 2 MB or smaller.");
      return;
    }
    const body = new FormData();
    body.append("logo", file);
    setUploading(true);
    try {
      await api.post("/company-settings/logo", body, { headers: { "Content-Type": "multipart/form-data" } });
      await refresh();
      toast.success("Logo updated — it's now live on your job listings.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not upload the logo. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await api.delete("/company-settings/logo");
      await refresh();
      toast.success("Logo removed.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not remove the logo.");
    } finally {
      setRemoving(false);
    }
  }

  const busy = uploading || removing;

  return (
    <div className="flex items-center gap-4">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-hairline bg-white">
        {logoPath ? (
          <img src={logoPath} alt="Company logo" className="h-full w-full object-contain p-1.5" />
        ) : (
          <Building2 className="h-6 w-6 text-slate-300" aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {logoPath ? "Replace logo" : "Upload logo"}
          </Button>
          {logoPath && (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={handleRemove}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Remove
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-xs text-slate-500">PNG, JPG or WEBP, up to 2 MB. Shown on your public job listings.</p>
      </div>
    </div>
  );
}
