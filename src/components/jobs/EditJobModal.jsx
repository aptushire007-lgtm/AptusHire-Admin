import { useState, useEffect } from "react";
import { X, Briefcase, AlertCircle, Save } from "lucide-react";
import api from "../../api/client.js";
import { useToast } from "../ui/Toast.jsx";
import { validateJobForm } from "../../lib/jobForm.js";
import Modal from "../ui/Modal.jsx";

export default function EditJobModal({ isOpen, job, onClose, onUpdated }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: "",
    department: "",
    location: "",
    numberOfOpenings: 1,
    minExperienceYears: 3,
    atsThreshold: 60,
    assessmentPolicy: "off",
    description: "",
    requirements: "",
    requiredSkills: "",
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (job) {
      setForm({
        title: job.title || "",
        department: job.department || "General",
        location: job.location || "Remote / Hybrid",
        numberOfOpenings: job.numberOfOpenings || 1,
        minExperienceYears: job.minExperienceYears ?? 3,
        atsThreshold: job.atsThreshold ?? 60,
        assessmentPolicy: job.assessmentPolicy || "off",
        description: job.description || "",
        requirements: job.requirements || "",
        requiredSkills: Array.isArray(job.requiredSkills)
          ? job.requiredSkills.join(", ")
          : job.requiredSkills || "",
      });
      setErrors({});
      setServerError("");
    }
  }, [job]);

  if (!job) return null;

  function handleChange(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (errors[field]) {
        const clientErrors = validateJobForm(next);
        setErrors((errs) => ({ ...errs, [field]: clientErrors[field] }));
      }
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;
    setServerError("");

    const clientErrors = validateJobForm(form);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      const firstMsg = Object.values(clientErrors)[0];
      toast.error(firstMsg);
      return;
    }

    setIsSubmitting(true);

    const skillsArray = form.requiredSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      title: form.title.trim(),
      department: form.department.trim(),
      location: form.location.trim(),
      numberOfOpenings: Number(form.numberOfOpenings),
      minExperienceYears: Number(form.minExperienceYears),
      atsThreshold: Number(form.atsThreshold),
      assessmentPolicy: form.assessmentPolicy,
      description: form.description.trim(),
      requirements: form.requirements.trim(),
      requiredSkills: skillsArray,
      revision: job.__v,
    };

    try {
      const res = await api.put(`/jobs/${job._id}`, payload);
      toast.success("Requisition updated successfully");
      onUpdated?.(res.data);
      onClose();
    } catch (err) {
      const respData = err.response?.data;
      if (respData?.code === "JOB_CONFLICT") {
        setServerError("This requisition was modified in another tab. Please reload to review current changes.");
      } else if (respData?.fieldErrors) {
        setErrors(respData.fieldErrors);
        setServerError("Please resolve the highlighted fields.");
      } else {
        setServerError(respData?.error || "Failed to update requisition. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={isOpen && Boolean(job)}
      onClose={onClose}
      label="Edit Requisition"
      size="2xl"
      busy={isSubmitting}
      showClose={false}
      panelClassName="max-h-[90vh] flex flex-col rounded-2xl p-0 overflow-hidden"
    >
      {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h2 id="edit-job-modal-title" className="text-base font-bold text-slate-900 leading-tight">
                Edit Requisition
              </h2>
              <p className="text-xs text-slate-500">
                #REQ-{job._id?.slice(-6).toUpperCase()} · Updates reflect immediately across your workspace
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="edit-job-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {serverError && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Row 1: Title & Department */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-job-title" className="block text-xs font-semibold text-slate-700 mb-1">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-job-title"
                type="text"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-4 transition ${
                  errors.title ? "border-red-400 focus:ring-red-100" : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                }`}
                placeholder="e.g. Senior Frontend Engineer"
              />
              {errors.title && <p className="mt-1 text-[11px] text-red-600">{errors.title}</p>}
            </div>

            <div>
              <label htmlFor="edit-job-dept" className="block text-xs font-semibold text-slate-700 mb-1">
                Department
              </label>
              <input
                id="edit-job-dept"
                type="text"
                value={form.department}
                onChange={(e) => handleChange("department", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition"
                placeholder="e.g. Engineering"
              />
            </div>
          </div>

          {/* Row 2: Location & Number of Openings & Experience */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="edit-job-location" className="block text-xs font-semibold text-slate-700 mb-1">
                Location
              </label>
              <input
                id="edit-job-location"
                type="text"
                value={form.location}
                onChange={(e) => handleChange("location", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition"
                placeholder="e.g. Remote / Hybrid"
              />
            </div>

            <div>
              <label htmlFor="edit-job-openings" className="block text-xs font-semibold text-slate-700 mb-1">
                Number of Openings
              </label>
              <input
                id="edit-job-openings"
                type="number"
                min="1"
                max="10000"
                value={form.numberOfOpenings}
                onChange={(e) => handleChange("numberOfOpenings", e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-4 transition ${
                  errors.numberOfOpenings ? "border-red-400 focus:ring-red-100" : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                }`}
              />
              {errors.numberOfOpenings && <p className="mt-1 text-[11px] text-red-600">{errors.numberOfOpenings}</p>}
            </div>

            <div>
              <label htmlFor="edit-job-experience" className="block text-xs font-semibold text-slate-700 mb-1">
                Min Experience (Years)
              </label>
              <input
                id="edit-job-experience"
                type="number"
                min="0"
                max="50"
                value={form.minExperienceYears}
                onChange={(e) => handleChange("minExperienceYears", e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-4 transition ${
                  errors.minExperienceYears ? "border-red-400 focus:ring-red-100" : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                }`}
              />
              {errors.minExperienceYears && <p className="mt-1 text-[11px] text-red-600">{errors.minExperienceYears}</p>}
            </div>
          </div>

          {/* Row 3: ATS Screening Threshold & Skills */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="edit-job-threshold" className="block text-xs font-semibold text-slate-700 mb-1">
                Screening Threshold (%)
              </label>
              <input
                id="edit-job-threshold"
                type="number"
                min="0"
                max="100"
                value={form.atsThreshold}
                onChange={(e) => handleChange("atsThreshold", e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-4 transition ${
                  errors.atsThreshold ? "border-red-400 focus:ring-red-100" : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                }`}
              />
              {errors.atsThreshold && <p className="mt-1 text-[11px] text-red-600">{errors.atsThreshold}</p>}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="edit-job-skills" className="block text-xs font-semibold text-slate-700 mb-1">
                Required Skills <span className="text-slate-400 font-normal">(comma-separated)</span>
              </label>
              <input
                id="edit-job-skills"
                type="text"
                value={form.requiredSkills}
                onChange={(e) => handleChange("requiredSkills", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition"
                placeholder="e.g. React, TypeScript, Node.js, TailwindCSS"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="edit-job-description" className="block text-xs font-semibold text-slate-700 mb-1">
              Job Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="edit-job-description"
              rows={4}
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-slate-900 shadow-xs focus:outline-none focus:ring-4 transition leading-relaxed ${
                errors.description ? "border-red-400 focus:ring-red-100" : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
              }`}
              placeholder="Describe core mission, deliverables, and expectations..."
            />
            {errors.description && <p className="mt-1 text-[11px] text-red-600">{errors.description}</p>}
          </div>

          {/* Requirements */}
          <div>
            <label htmlFor="edit-job-requirements" className="block text-xs font-semibold text-slate-700 mb-1">
              Qualifications & Requirements
            </label>
            <textarea
              id="edit-job-requirements"
              rows={3}
              value={form.requirements}
              onChange={(e) => handleChange("requirements", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition leading-relaxed"
              placeholder="Specify essential educational background, technical stack experience, etc."
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-job-form"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-xl bg-[#0E3B2E] hover:bg-[#154d3d] text-white px-5 py-2 text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {isSubmitting ? "Saving changes..." : "Save Changes"}
          </button>
        </div>
    </Modal>
  );
}
