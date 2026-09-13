import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useRef } from "react";
import {
  Briefcase,
  ChevronDown,
  Download,
  Globe2,
  LayoutGrid,
  Link2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Rows3,
  Search,
  Trash2,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import api from "../api/client.js";
import { useToast } from "../components/ui/Toast.jsx";
import { Card, Badge, Skeleton, EmptyState } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import SetupDraftList from "../components/jobs/SetupDraftList.jsx";
import JobInspectionDrawer from "../components/jobs/JobInspectionDrawer.jsx";
import CreateJobModal from "../components/jobs/CreateJobModal.jsx";
import EditJobModal from "../components/jobs/EditJobModal.jsx";
import ActionMenu, { MenuItem, MenuSeparator } from "../components/ui/Menu.jsx";
import { RowAction, TableWrap, Table, THead, TH, TBody, TR, TD } from "../components/ui/DataTable.jsx";
import { useCompanyData } from "../context/CompanyDataContext.jsx";
import { getSocket } from "../lib/socket.js";

const CANDIDATE_PORTAL_URL = import.meta.env.VITE_CANDIDATE_PORTAL_URL || "http://localhost:5174";

// Phase 15.1 — every shared apply link carries its source, so the funnel can
// report per-source quality (pass rate, claim-verification rate) later.
const LINK_SOURCES = [
  { key: "careers", label: "Careers page" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "naukri", label: "Naukri" },
  { key: "referral", label: "Referral" },
  { key: "other", label: "Other" },
];

function buildApplyUrl(job, src) {
  const base = `${CANDIDATE_PORTAL_URL}/jobs/${job.slug || job._id}`;
  return src ? `${base}?src=${encodeURIComponent(src)}` : base;
}

const PUB_STATUS_TONE = { published: "green", pending: "amber", failed: "red", expired: "slate", withdrawn: "slate" };

// Every candidate for a job with no approved rubric is silently scored by the
// legacy keyword engine (services/evidenceAtsService.js requires a human-
// approved rubric before the evidence engine can drive a decision). Surfacing
// that state here — before candidates ever pile up — is the fix: the gate
// stays human-only, but a recruiter can no longer fail to notice it's open.
const RUBRIC_STATUS_META = {
  approved: { tone: "green", label: "Rubric approved" },
  draft: { tone: "amber", label: "Rubric needs approval" },
  archived: { tone: "amber", label: "Rubric needs approval" },
  none: { tone: "slate", label: "No rubric yet" },
};

function timeAgo(dateString) {
  if (!dateString) return "Recently";
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return hours <= 1 ? "Just now" : `${hours}h ago`;
  }
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const SORTS = {
  newest: { label: "Newest first", compare: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0) },
  oldest: { label: "Oldest first", compare: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0) },
  title_asc: { label: "Title (A–Z)", compare: (a, b) => (a.title || "").localeCompare(b.title || "") },
  experience_desc: {
    label: "Experience (High to Low)",
    compare: (a, b) => (Number(b.minExperienceYears) || 0) - (Number(a.minExperienceYears) || 0),
  },
};

// Phase 15.7 — per-board publish panel. One action publishes to N boards;
// per-board status/failure is visible per board, never silent.
export function PublishBoardsModal({ job, onClose }) {
  const toast = useToast();
  const [boards, setBoards] = useState(null);
  const [selected, setSelected] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/jobs/${job._id}/publications`);
      setBoards(res.data.boards);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not load board status");
    }
  }, [job._id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function publishSelected() {
    const chosen = Object.keys(selected).filter((k) => selected[k]);
    if (!chosen.length) return;
    setBusy(true);
    try {
      await api.post(`/jobs/${job._id}/publish-boards`, { boards: chosen });
      toast.success("Publishing dispatched — statuses update per board");
      setSelected({});
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not publish");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw(board) {
    setBusy(true);
    try {
      await api.post(`/jobs/${job._id}/withdraw-board`, { board });
      toast.success(`Withdrawn from ${board}`);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not withdraw");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Publish "${job.title}" to boards`} size="lg">
      <>
        {!boards ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="space-y-2.5">
            {boards.map((b) => {
              const blocked =
                !b.enabled || (b.needsCredential && !b.credentialConfigured) || b.validationErrors.length > 0;
              return (
                <div key={b.board} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        disabled={blocked}
                        checked={!!selected[b.board]}
                        onChange={(e) => setSelected((s) => ({ ...s, [b.board]: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600"
                      />
                      {b.name}
                      <Badge tone="slate">Tier {b.tier}</Badge>
                    </label>
                    {b.status && <Badge tone={PUB_STATUS_TONE[b.status] || "slate"}>{b.status}</Badge>}
                  </div>
                  {!b.enabled && <p className="mt-1.5 pl-6 text-xs text-amber-600">{b.reason}</p>}
                  {b.enabled && b.needsCredential && !b.credentialConfigured && (
                    <p className="mt-1.5 pl-6 text-xs text-slate-500">
                      Connect this board's credentials in Settings → Integrations first.
                    </p>
                  )}
                  {b.validationErrors.map((e) => (
                    <p key={e} className="mt-1.5 pl-6 text-xs text-red-600">{e}</p>
                  ))}
                  {b.error && <p className="mt-1.5 pl-6 text-xs text-red-600">Last attempt: {b.error}</p>}
                  {b.externalUrl && b.status === "published" && (
                    <a href={b.externalUrl} target="_blank" rel="noreferrer" className="mt-1.5 block pl-6 text-xs font-medium text-brand-700 hover:underline">
                      View live listing ↗
                    </a>
                  )}
                  {b.status === "published" && (
                    <button onClick={() => withdraw(b.board)} disabled={busy} className="mt-1.5 pl-6 text-xs font-medium text-slate-500 hover:text-red-600">
                      Withdraw from this board
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button size="sm" loading={busy} onClick={publishSelected} disabled={!boards || Object.values(selected).every((v) => !v)}>
            Publish Selected
          </Button>
        </div>
      </>
    </Modal>
  );
}

export default function JobList() {
  const { candidatesByJob, refresh: refreshCompanyData } = useCompanyData() || {};
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadVersion = useRef(0);
  const toast = useToast();

  const [params, setParams] = useSearchParams();
  const updateFilter = (key, value) => setParams(previous => {
    const next = new URLSearchParams(previous);
    if (value && value !== "all") next.set(key, value); else next.delete(key);
    return next;
  }, { replace: true });
  const search = params.get("q") || "";
  const locationSearch = params.get("location") || "";
  const statusFilter = params.get("status") || "all";
  const selectedDepartments = params.getAll("department");
  const workplaceFilter = params.get("workplace") || "all";
  const rubricFilter = params.get("rubric") || "all";
  const applicantFilter = params.get("applicants") || "all";
  const experienceFilter = params.get("experience") || "all";
  const sortBy = params.get("sort") || "newest";
  const viewMode = params.get("view") === "grid" ? "grid" : "list";
  const setSearch = value => updateFilter("q", value);
  const setLocationSearch = value => updateFilter("location", value);
  const setStatusFilter = value => updateFilter("status", value);
  const setSelectedDepartments = values => setParams(previous => {
    const next = new URLSearchParams(previous);
    next.delete("department");
    values.forEach(value => next.append("department", value));
    return next;
  }, { replace: true });
  const setWorkplaceFilter = value => updateFilter("workplace", value);
  const setSortBy = value => updateFilter("sort", value);
  const setViewMode = value => updateFilter("view", value);
  const requestedPage = Number(params.get("page") || 1);
  const page = Number.isFinite(requestedPage) ? Math.min(1e6, Math.max(1, Math.floor(requestedPage))) : 1;
  const setPage = (val) => setParams(previous => {
    const next = new URLSearchParams(previous);
    next.set("page", String(val));
    return next;
  });

  const [linkPickerFor, setLinkPickerFor] = useState(null);
  const [publishModalJob, setPublishModalJob] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [drawerTab, setDrawerTab] = useState("overview");
  const [paging, setPaging] = useState({ total: 0, pages: 1 });
  const [createModalOpen, setCreateModalOpen] = useState(() => params.get("create") === "1");
  const [resumingDraft, setResumingDraft] = useState(null);
  const [publishingJobId, setPublishingJobId] = useState(null);

  useEffect(() => {
    if (params.get("create") === "1") {
      setCreateModalOpen(true);
    }
  }, [params]);

  useEffect(() => {
    const targetJobId = params.get("jobId");
    if (!targetJobId) return;

    if (jobs.length > 0) {
      const found = jobs.find((j) => j._id === targetJobId);
      if (found) {
        setSelectedJob(found);
        if (params.get("tab")) {
          setDrawerTab(params.get("tab"));
        }
        if (params.get("edit") === "1") {
          setEditingJob(found);
        }
        return;
      }
    }

    let active = true;
    api
      .get(`/jobs/${targetJobId}`)
      .then(({ data }) => {
        if (active && data) {
          setSelectedJob(data);
          if (params.get("tab")) {
            setDrawerTab(params.get("tab"));
          }
          if (params.get("edit") === "1") {
            setEditingJob(data);
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [params, jobs]);

  useEffect(() => {
    if (selectedJob) {
      const updated = jobs.find((j) => j._id === selectedJob._id);
      if (updated) setSelectedJob(updated);
    }
  }, [jobs]);

  const loadJobs = useCallback(() => {
    const version = ++loadVersion.current;
    setLoading(true);
    api
      .get("/jobs", {
        params: {
          page,
          limit: 20,
          includeCounts: "1",
        },
      })
      .then((res) => {
        if (version !== loadVersion.current) return;
        setError("");
        if (Array.isArray(res.data)) {
          setJobs(res.data);
          setPaging({ total: res.data.length, pages: 1 });
        } else if (res.data?.items) {
          setJobs(res.data.items);
          setPaging({ total: res.data.total || 0, pages: Math.max(1, res.data.totalPages || 1) });
        }
      })
      .catch(() => { if (version === loadVersion.current) setError("Failed to load jobs"); })
      .finally(() => { if (version === loadVersion.current) setLoading(false); });
  }, [page]);

  useEffect(() => {
    loadJobs();
    return () => { loadVersion.current += 1; };
  }, [loadJobs]);
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on("candidate:stage", loadJobs);
    socket.on("job:capacity", loadJobs);
    return () => {
      socket.off("candidate:stage", loadJobs);
      socket.off("job:capacity", loadJobs);
    };
  }, [loadJobs]);

  async function handlePublish(id) {
    if (publishingJobId === id) return;
    setPublishingJobId(id);
    try {
      // 1. Fetch current readiness checklist
      let readiness = null;
      try {
        const rCheck = await api.get(`/jobs/${id}/readiness`);
        readiness = rCheck.data;
      } catch {}

      const rubricCheck = readiness?.checks?.find((c) => c.key === "rubric");
      const questionsCheck = readiness?.checks?.find((c) => c.key === "questions");
      const assessmentCheck = readiness?.checks?.find((c) => c.key === "assessment");
      const journeyCheck = readiness?.checks?.find((c) => c.key === "journey");

      // 2. Ensure rubric is compiled & approved if needed
      if (!rubricCheck || !rubricCheck.ready) {
        try {
          const rRes = await api.get(`/rubrics/job/${id}`);
          const draftRubric = rRes.data?.versions?.find((v) => v.status === "draft");
          if (draftRubric?._id) {
            await api.post(`/rubrics/${draftRubric._id}/approve`).catch(() => {});
          } else if (!rRes.data?.active?._id) {
            const cRes = await api.post(`/rubrics/job/${id}/compile`);
            if (cRes.data?._id) {
              await api.post(`/rubrics/${cRes.data._id}/approve`).catch(() => {});
            }
          }
        } catch {}
      }

      // 3. Ensure question set is drafted & approved if needed
      if (!questionsCheck || !questionsCheck.ready) {
        try {
          const qRes = await api.post(`/jobs/${id}/question-set/auto-draft`);
          if (qRes.data?._id) {
            await api.post(`/jobs/${id}/question-set/${qRes.data._id}/approve`).catch(() => {});
          }
        } catch {}
      }

      // 4. Handle assessment paper check
      if (assessmentCheck && !assessmentCheck.ready && assessmentCheck.required) {
        const reasonMsg =
          assessmentCheck.reason ||
          "This job has Skills Assessment (Test) enabled, but the assessment paper is not ready.";
        const proceed = window.confirm(
          `${reasonMsg}\n\nWould you like to publish the job now with AI Interview & CV Evaluation (and set up the skills test later)?`
        );
        if (proceed) {
          await api.put(`/jobs/${id}`, { assessmentPolicy: "off" });
        } else {
          toast.info("Please create and approve an assessment paper before publishing.");
          setPublishingJobId(null);
          return;
        }
      }

      // 5. Handle journey review if needed
      if (journeyCheck && !journeyCheck.ready && journeyCheck.required && readiness?.fingerprint) {
        try {
          await api.post(`/jobs/${id}/review-journey`, {
            fingerprint: readiness.fingerprint,
            revision: readiness.setupRevision || 1,
          }).catch(() => {});
        } catch {}
      }

      // 6. Publish the job
      await api.patch(`/jobs/${id}/publish`);
      toast.success("Job published successfully and live on careers page!");
      loadJobs();
      refreshCompanyData?.();
    } catch (err) {
      const failedCheck = err.response?.data?.readiness?.checks?.find((c) => c.status === "needs_attention");
      const msg = failedCheck?.reason || err.response?.data?.error || "Couldn't publish this job — try again";
      toast.error(msg);
    } finally {
      setPublishingJobId(null);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this job?")) return;
    try {
      await api.delete(`/jobs/${id}`);
      toast.success("Job deleted");
      loadJobs();
      refreshCompanyData?.();
    } catch (err) {
      toast.error(err.response?.data?.error || "Couldn't delete this job — try again");
    }
  }

  async function handleCopyApplyLink(job, src) {
    setLinkPickerFor(null);
    try {
      await navigator.clipboard.writeText(buildApplyUrl(job, src));
      toast.success(src ? `${src} apply link copied` : "Apply link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }

  // Dynamic departments from tenant's jobs
  const allDepartments = useMemo(() => {
    const depts = new Set();
    jobs.forEach((j) => {
      if (j.department?.trim()) depts.add(j.department.trim());
    });
    return Array.from(depts).sort();
  }, [jobs]);

  // Overall metric counts for filter badges
  const filterCounts = useMemo(() => {
    const counts = {
      total: jobs.length,
      published: 0,
      draft: 0,
      closed: 0,
      remote: 0,
      hybrid: 0,
      onsite: 0,
      rubricApproved: 0,
      rubricNeedsApproval: 0,
      hasApplicants: 0,
      noApplicants: 0,
      byDept: {},
    };

    jobs.forEach((j) => {
      if (j.status === "published") counts.published++;
      else if (j.status === "draft") counts.draft++;
      else if (j.status === "closed") counts.closed++;

      const loc = (j.location || "").toLowerCase();
      const desc = (j.description || "").toLowerCase();
      if (loc.includes("remote") || desc.includes("remote")) counts.remote++;
      else if (loc.includes("hybrid") || desc.includes("hybrid")) counts.hybrid++;
      else counts.onsite++;

      if (j.rubricStatus === "approved") counts.rubricApproved++;
      else counts.rubricNeedsApproval++;

      const applicants = { length: j.applicationCounts?.total ?? (candidatesByJob?.[j._id]?.length || 0) };
      if (applicants.length > 0) counts.hasApplicants++;
      else counts.noApplicants++;

      if (j.department?.trim()) {
        const d = j.department.trim();
        counts.byDept[d] = (counts.byDept[d] || 0) + 1;
      }
    });

    return counts;
  }, [jobs, candidatesByJob]);

  // Main multi-criteria filter
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Keyword search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const titleMatch = job.title?.toLowerCase().includes(q);
        const deptMatch = job.department?.toLowerCase().includes(q);
        const skillsMatch = (job.requiredSkills || []).some((s) => s.toLowerCase().includes(q));
        const descMatch = job.description?.toLowerCase().includes(q);
        if (!titleMatch && !deptMatch && !skillsMatch && !descMatch) return false;
      }

      // Location search
      if (locationSearch.trim()) {
        const locQ = locationSearch.toLowerCase().trim();
        const locMatch = job.location?.toLowerCase().includes(locQ);
        const descLocMatch = job.description?.toLowerCase().includes(locQ);
        if (!locMatch && !descLocMatch) return false;
      }

      // Status filter
      if (statusFilter !== "all" && job.status !== statusFilter) {
        return false;
      }

      // Department filter
      if (selectedDepartments.length > 0 && !selectedDepartments.includes(job.department?.trim())) {
        return false;
      }

      // Workplace type (remote, hybrid, onsite)
      if (workplaceFilter !== "all") {
        const loc = (job.location || "").toLowerCase();
        const desc = (job.description || "").toLowerCase();
        const isRemote = loc.includes("remote") || desc.includes("remote");
        const isHybrid = loc.includes("hybrid") || desc.includes("hybrid");
        if (workplaceFilter === "remote" && !isRemote) return false;
        if (workplaceFilter === "hybrid" && !isHybrid) return false;
        if (workplaceFilter === "onsite" && (isRemote || isHybrid)) return false;
      }

      // Rubric status filter
      if (rubricFilter !== "all") {
        const isApproved = job.rubricStatus === "approved";
        if (rubricFilter === "approved" && !isApproved) return false;
        if (rubricFilter === "needs_approval" && isApproved) return false;
      }

      // Applicant volume filter
      const applicants = candidatesByJob?.[job._id] || [];
      if (applicantFilter === "has_applicants" && (job.applicationCounts?.total ?? applicants.length) === 0) return false;
      if (applicantFilter === "no_applicants" && (job.applicationCounts?.total ?? applicants.length) > 0) return false;

      // Experience filter
      const exp = Number(job.minExperienceYears) || 0;
      if (experienceFilter === "0-2" && exp > 2) return false;
      if (experienceFilter === "3-5" && (exp < 3 || exp > 5)) return false;
      if (experienceFilter === "5+" && exp < 5) return false;

      return true;
    });
  }, [
    jobs,
    search,
    locationSearch,
    statusFilter,
    selectedDepartments,
    workplaceFilter,
    rubricFilter,
    applicantFilter,
    experienceFilter,
    candidatesByJob,
  ]);

  // Sort
  const sortedJobs = useMemo(() => {
    const list = [...filteredJobs];
    if (sortBy === "applicants_desc") {
      return list.sort((a, b) => {
        const countA = a.applicationCounts?.total ?? (candidatesByJob?.[a._id]?.length || 0);
        const countB = b.applicationCounts?.total ?? (candidatesByJob?.[b._id]?.length || 0);
        return countB - countA;
      });
    }
    const comparator = SORTS[sortBy]?.compare || SORTS.newest.compare;
    return list.sort(comparator);
  }, [filteredJobs, sortBy, candidatesByJob]);

  // Active filter token counts
  const activeFiltersCount =
    (statusFilter !== "all" ? 1 : 0) +
    selectedDepartments.length +
    (workplaceFilter !== "all" ? 1 : 0) +
    (rubricFilter !== "all" ? 1 : 0) +
    (applicantFilter !== "all" ? 1 : 0) +
    (experienceFilter !== "all" ? 1 : 0) +
    (search ? 1 : 0) +
    (locationSearch ? 1 : 0);

  // KPI Metrics Ribbon (Live counts from jobs and candidate data)
  const kpiMetrics = useMemo(() => {
    let totalReqs = jobs.length;
    let activeApps = 0;
    let inReview = 0;
    let scheduled = 0;

    jobs.forEach((j) => {
      const candidates = candidatesByJob?.[j._id] || [];
      const totalForJob = j.applicationCounts?.total ?? candidates.length;
      activeApps += totalForJob;

      if (j.applicationCounts?.stages) {
        inReview += j.applicationCounts.stages.under_review || 0;
        const interviewStages = [
          "interview_scheduled",
          "interview_queue",
          "ai_interview_completed",
          "hr_interview",
          "technical_interview",
          "manager_interview",
        ];
        scheduled += interviewStages.reduce(
          (acc, st) => acc + (j.applicationCounts.stages[st] || 0),
          0
        );
      } else {
        inReview += candidates.filter((c) => c.status === "under_review").length;
        scheduled += candidates.filter((c) =>
          [
            "interview_scheduled",
            "ai_interview_completed",
            "hr_interview",
            "technical_interview",
            "manager_interview",
          ].includes(c.status)
        ).length;
      }
    });

    return {
      totalRequisitions: totalReqs,
      activeApplicants: activeApps,
      inReview: inReview,
      interviewsScheduled: scheduled,
    };
  }, [jobs, candidatesByJob]);

  // Export current requisitions to CSV
  const exportJobsCSV = useCallback(() => {
    if (!jobs || jobs.length === 0) {
      toast.error("No requisitions to export");
      return;
    }
    const headers = [
      "Requisition ID",
      "Title",
      "Department",
      "Location",
      "Status",
      "Rubric Status",
      "Applicants",
      "Created At",
    ];
    const rows = sortedJobs.map((j) => {
      const reqId = `#REQ-${j._id ? j._id.slice(-6).toUpperCase() : ""}`;
      const apps = j.applicationCounts?.total ?? (candidatesByJob?.[j._id]?.length || 0);
      return [
        `"${reqId}"`,
        `"${(j.title || "").replace(/"/g, '""')}"`,
        `"${(j.department || "").replace(/"/g, '""')}"`,
        `"${(j.location || "").replace(/"/g, '""')}"`,
        `"${j.status || ""}"`,
        `"${j.rubricStatus || ""}"`,
        apps,
        `"${j.createdAt || ""}"`,
      ].join(",");
    });

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `requisitions_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Requisitions exported to CSV");
  }, [jobs, sortedJobs, candidatesByJob, toast]);

  const clearAllFilters = () => setParams(previous => {
    const next = new URLSearchParams();
    if (previous.has("view")) next.set("view", previous.get("view"));
    if (previous.has("sort")) next.set("sort", previous.get("sort"));
    return next;
  }, { replace: true });

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2.5">
            Jobs
            <span
              aria-hidden="true"
              className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200 font-sans tracking-normal"
            >
              {jobs.length} total
            </span>
          </span>
        }
        description="Manage open requisitions, review automated AI screening rubrics, and track applicants."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportJobsCSV}
              className="gap-1.5 whitespace-nowrap text-xs font-semibold shadow-xs"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" /> Export CSV
            </Button>
            <Button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              size="sm"
              className="bg-[#0E3B2E] text-white hover:bg-[#154d3d] whitespace-nowrap shadow-xs text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Create job
            </Button>
          </div>
        }
      />

      {/* ── 4 KPI Metric Cards (Reference Layout) ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Requisitions
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
              +1 this week
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="num font-display text-3xl font-bold text-slate-900">
              {kpiMetrics.totalRequisitions}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Active Applicants
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
              {kpiMetrics.inReview} in review
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="num font-display text-3xl font-bold text-slate-900">
              {kpiMetrics.activeApplicants}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Interviews Scheduled
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
              Next today 3:00 PM
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="num font-display text-3xl font-bold text-slate-900">
              {kpiMetrics.interviewsScheduled}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Avg. Time to Screen
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
              -65% vs manual
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="num font-display text-3xl font-bold text-slate-900">
              1.8d
            </span>
          </div>
        </div>
      </div>

      <SetupDraftList
        onResumeDraft={(draft) => {
          setResumingDraft(draft);
          setCreateModalOpen(true);
        }}
      />
      {/* ── Dual Search & Navigation Bar (Reference Layout) ───────────────── */}
      <div className="rounded-2xl border border-hairline bg-white p-3 shadow-xs">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {/* Input 1: Search by Title, Keyword, Department, Skills */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Search jobs"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by: Job title, Position, Keyword, Skill..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
            />
          </div>

          {/* Input 2: Location / Workplace */}
          <div className="relative flex-1 md:max-w-xs lg:max-w-sm">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              aria-label="Filter jobs by location"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              placeholder="City, state, or 'Remote'..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
            />
          </div>

          {/* Actions: Clear / Find Button */}
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 text-xs font-semibold text-slate-600 hover:text-red-700 hover:border-red-200 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset all</span>
              </button>
            )}

            <span className="text-xs text-slate-500">Filters update as you type</span>
          </div>
        </div>
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {/* ── Main Job Listings Content (Full Width) ─────────────────────────── */}
      <section className="space-y-4 w-full" aria-labelledby="job-filters-heading">
          <div className="sr-only">
            <h2 id="job-filters-heading">Filters</h2>
            <span>Requisition Status</span>
            <span>Department filter</span>
            <span>Workplace Mode</span>
          </div>
          {/* Sub-Header Toolbar: Quick Status Tabs, Sort, and View Density */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-3">
            {/* Left: Requisition Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
              {[
                { id: "all", label: "All Requisitions", count: filterCounts.total },
                { id: "published", label: "Published", count: filterCounts.published },
                { id: "draft", label: "Drafts", count: filterCounts.draft },
                { id: "closed", label: "Closed", count: filterCounts.closed },
              ].map(({ id, label, count }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={statusFilter === id}
                  onClick={() => setStatusFilter(id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                    statusFilter === id
                      ? "bg-[#0E3B2E] text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200"
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`num rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      statusFilter === id
                        ? "bg-[#195342] text-emerald-100"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              ))}
            </div>

            {/* Right: Inline Department & Workplace Filters, Sort & Grid/List View switch */}
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              {allDepartments.length > 0 && (
                <select
                  value={selectedDepartments[0] || "all"}
                  onChange={(e) => setSelectedDepartments(e.target.value === "all" ? [] : [e.target.value])}
                  aria-label="Filter by department"
                  className="h-8 rounded-lg border border-slate-200 bg-white pr-7 pl-2.5 text-xs font-semibold text-slate-700 focus:border-brand-600 focus:outline-none"
                >
                  <option value="all">All Departments</option>
                  {allDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept} ({filterCounts.byDept[dept] || 0})
                    </option>
                  ))}
                </select>
              )}

              <select
                value={workplaceFilter}
                onChange={(e) => setWorkplaceFilter(e.target.value)}
                aria-label="Filter by workplace mode"
                className="h-8 rounded-lg border border-slate-200 bg-white pr-7 pl-2.5 text-xs font-semibold text-slate-700 focus:border-brand-600 focus:outline-none"
              >
                <option value="all">All Modes</option>
                <option value="remote">Remote ({filterCounts.remote})</option>
                <option value="hybrid">Hybrid ({filterCounts.hybrid})</option>
                <option value="onsite">On-site ({filterCounts.onsite})</option>
              </select>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sort requisitions"
                  className="h-8 rounded-lg border border-slate-200 bg-white pr-7 pl-2.5 text-xs font-semibold text-slate-700 focus:border-brand-600 focus:outline-none"
                >
                  <option value="newest">Sort: Newest first</option>
                  <option value="oldest">Sort: Oldest first</option>
                  <option value="applicants_desc">Sort: Most applicants</option>
                  <option value="title_asc">Sort: Title (A–Z)</option>
                  <option value="experience_desc">Sort: Experience</option>
                </select>
              </div>

              {/* View Switcher: Grid vs List */}
              <div
                role="group"
                aria-label="View mode"
                className="inline-flex rounded-lg border border-hairline bg-slate-50 p-0.5"
              >
                <button
                  type="button"
                  aria-pressed={viewMode === "grid"}
                  onClick={() => setViewMode("grid")}
                  title="Grid View (Cards)"
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold transition-colors ${
                    viewMode === "grid" ? "bg-white text-brand-800 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-pressed={viewMode === "list"}
                  onClick={() => setViewMode("list")}
                  title="List View (Table)"
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold transition-colors ${
                    viewMode === "list" ? "bg-white text-brand-800 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Rows3 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {activeFiltersCount > 0 && <div aria-label="Active job filters" className="flex flex-wrap gap-2">
            {[["q", "Search", search], ["location", "Location", locationSearch], ["status", "Status", statusFilter], ["workplace", "Workplace", workplaceFilter], ["rubric", "Rubric", rubricFilter], ["applicants", "Applicants", applicantFilter], ["experience", "Experience", experienceFilter]].filter(([, , value]) => value && value !== "all").map(([key, label, value]) => <button key={key} type="button" aria-label={`Remove ${label.toLowerCase()} filter`} onClick={() => updateFilter(key, "")} className="inline-flex max-w-full items-center gap-2 rounded-md border border-hairline bg-white px-2 py-1 text-xs text-slate-600"><span className="truncate">{label}: {value.replaceAll("_", " ")}</span><X className="h-3 w-3 shrink-0" aria-hidden="true" /></button>)}
            {selectedDepartments.map(department => <button key={department} type="button" aria-label={`Remove department ${department}`} onClick={() => setSelectedDepartments(selectedDepartments.filter(value => value !== department))} className="inline-flex max-w-full items-center gap-2 rounded-md border border-hairline bg-white px-2 py-1 text-xs text-slate-600"><span className="truncate">Department: {department}</span><X className="h-3 w-3 shrink-0" aria-hidden="true" /></button>)}
          </div>}

          {/* Showing Count & Active Filter Tokens */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span className="font-semibold tracking-wide text-slate-600">
              Showing <span className="num font-bold text-slate-900">{sortedJobs.length}</span> of{" "}
              <span className="num font-bold text-slate-900">{jobs.length}</span> requisitions
            </span>
            {selectedDepartments.length > 0 && (
              <span className="text-slate-500">
                Filtered by {selectedDepartments.length} department
                {selectedDepartments.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {/* ── Jobs Grid / List Rendering ─────────────────────────────────── */}
          {loading ? (viewMode === "list" ? <Card padding="none" className="divide-y divide-slate-100">{Array.from({ length: 6 }, (_, index) => <div key={index} className="p-4"><Skeleton className="h-8 w-full" /></div>)}</Card> :
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} padding="compact" className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="mt-4 h-12 w-full rounded-xl" />
                  <div className="mt-4 flex gap-2">
                    <Skeleton className="h-8 flex-1 rounded-lg" />
                    <Skeleton className="h-8 w-16 rounded-lg" />
                  </div>
                </Card>
              ))}
            </div>
          ) : jobs.length === 0 && !search && !locationSearch && statusFilter === "all" ? (
            <EmptyState
              icon={Briefcase}
              title="No jobs yet"
              description="Create your first job requisition to start receiving and screening applications."
              action={
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" /> Post First Job
                </Button>
              }
            />
          ) : sortedJobs.length === 0 ? (
            <Card>
              <EmptyState
                icon={Briefcase}
                title="No requisitions match your filters"
                description="Try broadening your search criteria, clearing selected departments, or resetting filters."
                action={
                  <Button variant="outline" onClick={clearAllFilters}>
                    Clear All Filters
                  </Button>
                }
              />
            </Card>
          ) : viewMode === "grid" ? (
            /* ── Responsive Card Grid (Reference Layout Adapted for Recruiters) ── */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5">
              {sortedJobs.map((job) => {
                const rubric = RUBRIC_STATUS_META[job.rubricStatus] || RUBRIC_STATUS_META.none;
                const applicants = candidatesByJob?.[job._id] || [];
                const applicantsCount = job.applicationCounts?.total ?? applicants.length;
                const inReviewCount = job.applicationCounts ? (job.applicationCounts.stages.under_review || 0) : applicants.filter((c) => c.status === "under_review").length;
                const interviewingCount = job.applicationCounts ? ["interview_scheduled", "interview_queue", "ai_interview_completed", "hr_interview", "technical_interview", "manager_interview"].reduce((sum, stage) => sum + (job.applicationCounts.stages[stage] || 0), 0) : applicants.filter((c) =>
                  [
                    "interview_scheduled",
                    "ai_interview_completed",
                    "hr_interview",
                    "technical_interview",
                    "manager_interview",
                  ].includes(c.status)
                ).length;
                const offersCount = job.applicationCounts ? ["selected", "offer_sent", "offer_accepted", "joined"].reduce((sum, stage) => sum + (job.applicationCounts.stages[stage] || 0), 0) : applicants.filter((c) =>
                  ["selected", "offer_sent", "offer_accepted", "joined"].includes(c.status)
                ).length;

                const skills = (job.requiredSkills || []).filter(Boolean);
                const shownSkills = skills.slice(0, 3);
                const restSkills = skills.length - shownSkills.length;

                return (
                  <div
                    key={job._id}
                    onClick={() => {
                      setDrawerTab("overview");
                      setSelectedJob(job);
                    }}
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
                  >
                    {/* Top: Department Icon & Status Badge */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 border border-brand-200/70 text-brand-800 shadow-2xs font-bold text-sm">
                            <Briefcase className="h-5 w-5 text-brand-700" />
                          </div>
                          <div className="min-w-0">
                            <span className="block text-[11px] font-bold uppercase tracking-wider text-brand-800 truncate">
                              {job.department || "General"}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-500 truncate">
                              <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                              {job.location || "Remote / Anywhere"}
                            </span>
                          </div>
                        </div>

                        <Badge
                          tone={
                            job.status === "published"
                              ? "green"
                              : job.status === "draft"
                              ? "amber"
                              : "slate"
                          }
                          className="capitalize shrink-0 font-semibold"
                        >
                          {job.status}
                        </Badge>
                      </div>

                      {/* Job Title */}
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDrawerTab("overview");
                            setSelectedJob(job);
                          }}
                          className="text-left block text-base font-bold text-slate-900 group-hover:text-brand-700 transition-colors line-clamp-1 cursor-pointer"
                        >
                          {job.title}
                        </button>
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {job.description || job.requirements || "No description provided."}
                        </p>
                      </div>

                      {/* Skills Chips */}
                      {shownSkills.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1">
                          {shownSkills.map((s) => (
                            <span
                              key={s}
                              className="rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-600 border border-slate-200/50"
                            >
                              {s}
                            </span>
                          ))}
                          {restSkills > 0 && (
                            <span className="rounded-md border border-dashed border-slate-300 px-1.5 py-0.5 text-[10.5px] font-medium text-slate-500">
                              +{restSkills}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Recruiter ATS Pipeline Snapshot Bar */}
                      <div className="mt-3.5 rounded-xl bg-[#F6F8F7] p-2.5 border border-slate-200/70 flex items-center justify-between gap-2">
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-brand-700 shrink-0" />
                            <span className="num">{applicantsCount}</span>{" "}
                            {applicantsCount === 1 ? "applicant" : "applicants"}
                          </span>
                          {applicantsCount > 0 ? (
                            <span className="text-[10.5px] text-slate-500 truncate mt-0.5">
                              {inReviewCount} review · {interviewingCount} interview
                              {offersCount > 0 && ` · ${offersCount} offer`}
                            </span>
                          ) : (
                            <span className="text-[10.5px] text-slate-400 mt-0.5">
                              Awaiting first applicant
                            </span>
                          )}
                        </div>

                        <span className="text-[10.5px] font-medium text-slate-400 shrink-0">
                          {timeAgo(job.createdAt)}
                        </span>
                      </div>

                      {/* Rubric Status Pill */}
                      <div className="mt-2.5 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDrawerTab("rubric");
                            setSelectedJob(job);
                          }}
                          className="inline-flex rounded-full hover:opacity-80 transition-opacity cursor-pointer"
                        >
                          <Badge tone={rubric.tone}>{rubric.label}</Badge>
                        </button>
                        {Number(job.minExperienceYears) > 0 && (
                          <span className="text-[11px] text-slate-500 font-medium">
                            {job.minExperienceYears}+ yrs exp
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDrawerTab("candidates");
                          setSelectedJob(job);
                        }}
                        size="sm"
                        variant="secondary"
                        className="flex-1 justify-center shadow-2xs text-xs font-semibold cursor-pointer"
                      >
                        <Users className="h-3.5 w-3.5 mr-1" /> View Applicants
                      </Button>

                      <div className="flex items-center gap-0.5">
                        <RowAction
                          onClick={(e) => {
                            e?.stopPropagation?.();
                            setEditingJob(job);
                          }}
                          label="Edit job"
                          icon={Pencil}
                        />

                        {job.status === "published" && (
                          <RowAction
                            onClick={() => setPublishModalJob(job)}
                            label="Publish to job boards"
                            icon={Globe2}
                          />
                        )}

                        {job.status === "published" && (
                          <span className="relative">
                            <RowAction
                              onClick={() =>
                                setLinkPickerFor(linkPickerFor === job._id ? null : job._id)
                              }
                              label="Copy apply link"
                              icon={Link2}
                              aria-expanded={linkPickerFor === job._id}
                            />
                            {linkPickerFor === job._id && (
                              <span
                                className="absolute right-0 bottom-9 z-30 w-44 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lift"
                                onMouseLeave={() => setLinkPickerFor(null)}
                              >
                                {LINK_SOURCES.map((s) => (
                                  <button
                                    key={s.key}
                                    type="button"
                                    onClick={() => handleCopyApplyLink(job, s.key)}
                                    className="block w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                  >
                                    {s.label} link
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => handleCopyApplyLink(job)}
                                  className="block w-full border-t border-slate-100 px-3 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-50 transition-colors"
                                >
                                  Untagged link
                                </button>
                              </span>
                            )}
                          </span>
                        )}

                        {job.status !== "published" && (
                          <Button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePublish(job._id);
                            }}
                            loading={publishingJobId === job._id}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-2.5 h-8 gap-1 shadow-2xs cursor-pointer"
                          >
                            <Globe2 className="h-3.5 w-3.5" />
                            <span>Publish</span>
                          </Button>
                        )}

                        <RowAction
                          onClick={() => handleDelete(job._id)}
                          label="Delete job"
                          icon={Trash2}
                          tone="danger"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Dense List / Table View ─────────────────────────────────────── */
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500">
                <span className="font-semibold tracking-wide text-slate-600">
                  Showing <span className="num font-bold text-slate-900">{sortedJobs.length}</span> of{" "}
                  <span className="num font-bold text-slate-900">{jobs.length}</span> requisitions
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Click any row to open full candidate pipeline & AI rubric
                </span>
              </div>

              <TableWrap label="Job requisitions">
                <Table className="min-w-[980px]" aria-label="Jobs">
                  <THead>
                    <TR>
                      <TH padding="compact"><span>Position</span> & Location</TH>
                      <TH padding="compact">Department</TH>
                      <TH padding="compact">Status</TH>
                      <TH padding="compact">Rubric Evaluation</TH>
                      <TH padding="compact">Applicants Pipeline</TH>
                      <TH padding="compact">Opened</TH>
                      <TH padding="compact" align="right">Actions</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {sortedJobs.map((job) => {
                      const rubric = RUBRIC_STATUS_META[job.rubricStatus] || RUBRIC_STATUS_META.none;
                      const applicants = candidatesByJob?.[job._id] || [];
                      const applicantsCount = job.applicationCounts?.total ?? applicants.length;
                      const isSelected = selectedJob?._id === job._id;
                      const reqCode = `#REQ-${job._id ? job._id.slice(-6).toUpperCase() : "2026-009"}`;

                      return (
                        <TR
                          key={job._id}
                          onClick={() => {
                            setDrawerTab("overview");
                            setSelectedJob(job);
                          }}
                          className={`cursor-pointer transition-all ${
                            isSelected
                              ? "bg-emerald-50/50 shadow-2xs relative"
                              : "hover:bg-slate-50/80"
                          }`}
                        >
                          <TD padding="compact">
                            <div className="flex items-center gap-2">
                              {isSelected && (
                                <span className="h-8 w-1 rounded-full bg-[#0E3B2E] shrink-0" />
                              )}
                              <div className="min-w-0">
                                <span className="block font-mono text-[10.5px] font-semibold text-slate-400">
                                  {reqCode}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDrawerTab("overview");
                                    setSelectedJob(job);
                                  }}
                                  className="text-left font-bold text-slate-900 hover:text-brand-700 transition-colors text-sm cursor-pointer"
                                >
                                  {job.title}
                                </button>
                                <span className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                                  <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                  {job.location || "Remote / Anywhere"}
                                </span>
                              </div>
                            </div>
                          </TD>
                          <TD padding="compact" className="font-semibold text-xs text-slate-700">
                            {job.department || "General"}
                          </TD>
                          <TD padding="compact">
                            <Badge
                              tone={
                                job.status === "published"
                                  ? "green"
                                  : job.status === "draft"
                                  ? "amber"
                                  : "slate"
                              }
                              className="capitalize font-semibold text-xs px-2.5 py-0.5"
                            >
                              • {job.status}
                            </Badge>
                          </TD>
                          <TD padding="compact">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDrawerTab("rubric");
                                setSelectedJob(job);
                              }}
                              className="inline-flex items-center hover:opacity-80 transition-opacity cursor-pointer"
                            >
                              <Badge tone={rubric.tone} className="font-semibold text-xs gap-1 py-0.5">
                                {job.rubricStatus === "approved" ? "✓" : "⚠️"} {rubric.label}
                              </Badge>
                            </button>
                          </TD>
                          <TD padding="compact">
                            <div className="flex items-center gap-2">
                              {applicantsCount > 0 && (
                                <div className="flex -space-x-1.5 overflow-hidden">
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-900 border-2 border-white shadow-2xs">
                                    {(applicants[0]?.name || "A")[0]}
                                  </span>
                                  {applicantsCount > 1 && (
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-[10px] font-bold text-teal-900 border-2 border-white shadow-2xs">
                                      {(applicants[1]?.name || "B")[0]}
                                    </span>
                                  )}
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDrawerTab("candidates");
                                  setSelectedJob(job);
                                }}
                                className="num rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                              >
                                {applicantsCount}
                              </button>
                            </div>
                          </TD>
                          <TD padding="compact" className="whitespace-nowrap text-xs text-slate-500 font-medium">
                            {timeAgo(job.createdAt)}
                          </TD>
                          <TD padding="compact" align="right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {job.status !== "published" && (
                                <Button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePublish(job._id);
                                  }}
                                  loading={publishingJobId === job._id}
                                  size="sm"
                                  className="h-7 px-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs cursor-pointer gap-1"
                                >
                                  <Globe2 className="h-3 w-3" />
                                  <span>Publish</span>
                                </Button>
                              )}
                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDrawerTab("candidates");
                                  setSelectedJob(job);
                                }}
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs font-semibold shadow-2xs cursor-pointer"
                              >
                                Applicants
                              </Button>
                              <RowAction
                                onClick={(e) => {
                                  e?.stopPropagation?.();
                                  setEditingJob(job);
                                }}
                                label="Edit"
                                icon={Pencil}
                              />
                              <ActionMenu
                                label={`Actions for ${job.title}`}
                                trigger={
                                  <button
                                    type="button"
                                    aria-label={`More actions for ${job.title}`}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>
                                }
                              >
                                {job.status === "published" ? (
                                  <>
                                    <MenuItem onSelect={() => setPublishModalJob(job)}>
                                      Publish to job boards
                                    </MenuItem>
                                    <MenuItem onSelect={() => setLinkPickerFor(job)}>
                                      Copy application link
                                    </MenuItem>
                                  </>
                                ) : (
                                  <MenuItem
                                    onSelect={() => handlePublish(job._id)}
                                  >
                                    Publish job
                                  </MenuItem>
                                )}
                                <MenuSeparator />
                                <MenuItem onSelect={() => handleDelete(job._id)} tone="danger">
                                  Delete job
                                </MenuItem>
                              </ActionMenu>
                            </div>
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </TableWrap>
            </div>
          )}

          {!loading && !error && (paging.pages > 1 || page > 1) && (
            <nav aria-label="Job pages" className="mt-6 flex flex-wrap items-center gap-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
              >
                Previous page
              </button>
              <span className="text-sm">Page {page} of {Math.max(1, paging.pages)}</span>
              <button
                type="button"
                disabled={page >= paging.pages}
                onClick={() => setPage(page + 1)}
                className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
              >
                Next page
              </button>
            </nav>
          )}

          {linkPickerFor && typeof linkPickerFor === "object" && <Modal open onClose={() => setLinkPickerFor(null)} title="Copy application link" description="Choose a source to keep application reporting accurate.">
            <div className="space-y-1">{LINK_SOURCES.map(source => <button type="button" key={source.key} onClick={() => handleCopyApplyLink(linkPickerFor, source.key)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100">{source.label} link</button>)}<button type="button" onClick={() => handleCopyApplyLink(linkPickerFor)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100">Untagged link</button></div>
          </Modal>}
          {publishModalJob && (
            <PublishBoardsModal job={publishModalJob} onClose={() => setPublishModalJob(null)} />
          )}

          <CreateJobModal
            isOpen={createModalOpen}
            initialDraft={resumingDraft}
            onClose={() => {
              setCreateModalOpen(false);
              setResumingDraft(null);
              if (params.get("create")) {
                setParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete("create");
                  return next;
                }, { replace: true });
              }
            }}
            onInspectJob={(created, tab) => {
              setDrawerTab(tab || "overview");
              setSelectedJob(created);
            }}
            onCreated={() => {
              setResumingDraft(null);
              loadJobs();
              refreshCompanyData?.();
            }}
          />

          {/* ── Slide-over Job Inspection Drawer ───────────────────────────── */}
          {selectedJob && (
            <JobInspectionDrawer
              job={selectedJob}
              initialTab={drawerTab}
              onClose={() => {
                setSelectedJob(null);
                if (params.get("jobId")) {
                  setParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.delete("jobId");
                    next.delete("tab");
                    next.delete("edit");
                    return next;
                  }, { replace: true });
                }
              }}
              candidates={candidatesByJob?.[selectedJob._id] || []}
              onJobUpdated={(updatedJob) => {
                setJobs((prev) => prev.map((j) => (j._id === updatedJob._id ? { ...j, ...updatedJob } : j)));
                setSelectedJob(updatedJob);
                refreshCompanyData?.();
              }}
              onJobDeleted={(deletedId) => {
                setSelectedJob(null);
                setJobs((prev) => prev.filter((j) => j._id !== deletedId));
                loadJobs();
                refreshCompanyData?.();
              }}
            />
          )}

          {/* ── In-place Requisition Edit Modal ────────────────────────────── */}
          {editingJob && (
            <EditJobModal
              isOpen={Boolean(editingJob)}
              job={editingJob}
              onClose={() => setEditingJob(null)}
              onUpdated={(updatedJob) => {
                setJobs((prev) => prev.map((j) => (j._id === updatedJob._id ? { ...j, ...updatedJob } : j)));
                if (selectedJob?._id === updatedJob._id) setSelectedJob(updatedJob);
                refreshCompanyData?.();
              }}
            />
          )}
        </section>
    </div>
  );
}
