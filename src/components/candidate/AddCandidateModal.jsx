import { useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import api from "../../api/client.js";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import { useToast } from "../ui/Toast.jsx";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

function isAcceptedResume(file) {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

const EMPTY_FORM = { name: "", email: "", phone: "" };

/**
 * Recruiter-initiated candidate: a referral, an inbound email, a résumé
 * handed over off-platform — added straight into ONE job's pipeline rather
 * than arriving through the public apply form. `job` is fixed when opened
 * from a job-scoped pipeline; otherwise the caller must supply `jobOptions`
 * and the recruiter picks one here.
 */
export default function AddCandidateModal({ open, onClose, job, jobOptions = [], onAdded }) {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [jobId, setJobId] = useState(job?._id || "");
  const [resumeFile, setResumeFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const dirty = Boolean(form.name || form.email || form.phone || resumeFile);
  const effectiveJobId = job?._id || jobId;

  function reset() {
    setForm(EMPTY_FORM);
    setJobId(job?._id || "");
    setResumeFile(null);
    setError("");
  }

  function close() {
    if (submitting) return;
    reset();
    onClose?.();
  }

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function pickFile(file) {
    if (!file) return;
    if (!isAcceptedResume(file)) {
      setError("Only PDF or DOCX resumes are allowed.");
      return;
    }
    if (file.size > MAX_RESUME_BYTES) {
      setError("Resume must be 5 MB or smaller.");
      return;
    }
    setError("");
    setResumeFile(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (!effectiveJobId) {
      setError("Choose a job to add this candidate to.");
      return;
    }
    if (!resumeFile) {
      setError("A resume file is required.");
      return;
    }

    const body = new FormData();
    body.append("name", form.name.trim());
    body.append("email", form.email.trim());
    if (form.phone.trim()) body.append("phone", form.phone.trim());
    body.append("resume", resumeFile);

    setSubmitting(true);
    setError("");
    try {
      const { data: candidate } = await api.post(`/jobs/${effectiveJobId}/candidates`, body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`${form.name.trim()} added to the pipeline`);
      reset();
      onAdded?.(candidate);
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.error || "Could not add this candidate. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add candidate"
      description={job ? `Adds directly to ${job.title}'s pipeline, at the Applied stage.` : "Adds directly to a job's pipeline, at the Applied stage."}
      size="md"
      dirty={dirty}
      busy={submitting}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!job && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Job</span>
            <select
              required
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="h-10 w-full rounded-lg border border-hairline bg-white px-3 text-sm text-slate-800 focus:border-brand-700 focus:outline-none"
            >
              <option value="" disabled>
                Select a job…
              </option>
              {jobOptions.map((j) => (
                <option key={j._id} value={j._id}>
                  {j.title}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Full name</span>
          <input
            required
            type="text"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="e.g. Priya Sharma"
            className="h-10 w-full rounded-lg border border-hairline bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-700 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            placeholder="priya@example.com"
            className="h-10 w-full rounded-lg border border-hairline bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-700 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Phone (optional)</span>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setField("phone", e.target.value)}
            placeholder="+91 98765 43210"
            className="h-10 w-full rounded-lg border border-hairline bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-700 focus:outline-none"
          />
        </label>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Resume</span>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              pickFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
              dragOver ? "border-brand-700 bg-brand-50" : "border-hairline hover:border-slate-300"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            {resumeFile ? (
              <>
                <FileText className="h-6 w-6 text-brand-700" aria-hidden="true" />
                <span className="text-sm font-medium text-slate-800">{resumeFile.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setResumeFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Remove
                </button>
              </>
            ) : (
              <>
                <UploadCloud className="h-6 w-6 text-slate-400" aria-hidden="true" />
                <span className="text-sm text-slate-600">
                  <span className="font-semibold text-brand-800">Click to upload</span> or drag and drop
                </span>
                <span className="text-xs text-slate-400">PDF or DOCX, up to 5 MB</span>
              </>
            )}
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            Add candidate
          </Button>
        </div>
      </form>
    </Modal>
  );
}
