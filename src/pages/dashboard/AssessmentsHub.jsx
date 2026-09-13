import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileQuestion,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Users,
  AlertTriangle,
  FileCode,
  Lock,
  RefreshCw,
  Sliders,
  PlayCircle,
  Eye,
} from "lucide-react";
import api from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.jsx";
import { Card, Badge, Skeleton, EmptyState } from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import JobInspectionDrawer from "../../components/jobs/JobInspectionDrawer.jsx";

const POLICY_META = {
  manual: { label: "Required (Manual Gate)", tone: "brand", desc: "Recruiter reviews and sends test to passed candidates." },
  auto: { label: "Auto-Send on ATS Pass", tone: "green", desc: "Test invitation is sent automatically when candidate clears ATS threshold." },
  off: { label: "Assessment Off", tone: "slate", desc: "No skills assessment required for this job." },
};

const DIFFICULTY_LABELS = {
  adaptive: "Adaptive (Seniority-based)",
  easy: "Foundational (Junior)",
  medium: "Intermediate (Mid-level)",
  hard: "Advanced (Senior/Staff)",
};

export default function AssessmentsHub() {
  const toast = useToast();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [papersByJob, setPapersByJob] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [policyFilter, setPolicyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create assessment modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedJobIdForCreate, setSelectedJobIdForCreate] = useState("");
  const [testDifficulty, setTestDifficulty] = useState("adaptive");
  const [testDuration, setTestDuration] = useState(45);
  const [proctoringEnabled, setProctoringEnabled] = useState(true);
  const [softLockEnabled, setSoftLockEnabled] = useState(true);
  const [compilingJobId, setCompilingJobId] = useState(null);

  // Inspection Drawer
  const [inspectingJob, setInspectingJob] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/jobs", { params: { limit: 50, includeCounts: "1" } });
      const jobList = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setJobs(jobList);

      // Fetch papers for active/draft jobs
      const papersMap = {};
      await Promise.all(
        jobList.slice(0, 30).map(async (j) => {
          try {
            const pRes = await api.get(`/assessments/papers/job/${j._id}`);
            if (Array.isArray(pRes.data) && pRes.data.length > 0) {
              papersMap[j._id] = pRes.data[0]; // Active or latest version
            }
          } catch {
            // Paper might not exist yet
          }
        })
      );
      setPapersByJob(papersMap);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load assessments data");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quick policy toggle
  async function handleTogglePolicy(job, currentPolicy) {
    const nextPolicy = currentPolicy === "off" ? "manual" : "off";
    try {
      await api.put(`/jobs/${job._id}`, { assessmentPolicy: nextPolicy });
      toast.success(
        nextPolicy === "manual"
          ? `Skills Assessment required for "${job.title}". An approved paper will be needed before publishing.`
          : `Skills Assessment disabled for "${job.title}". Candidates will bypass the test stage.`
      );
      setJobs((prev) =>
        prev.map((j) => (j._id === job._id ? { ...j, assessmentPolicy: nextPolicy } : j))
      );
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update assessment policy");
    }
  }

  // Quick compile blueprint
  async function handleQuickCompile(jobId) {
    setCompilingJobId(jobId);
    try {
      const res = await api.post(`/assessments/papers/job/${jobId}/compile`);
      setPapersByJob((prev) => ({ ...prev, [jobId]: res.data }));
      toast.success("Assessment blueprint compiled successfully! Ready to generate questions.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not compile assessment blueprint. Ensure rubric is approved.");
    } finally {
      setCompilingJobId(null);
    }
  }

  // Submit create assessment modal
  async function handleCreateAssessmentSubmit(e) {
    e.preventDefault();
    if (!selectedJobIdForCreate) {
      toast.error("Please select a hiring project");
      return;
    }
    setCompilingJobId(selectedJobIdForCreate);
    try {
      // 1. Ensure policy is set to manual
      await api.put(`/jobs/${selectedJobIdForCreate}`, { assessmentPolicy: "manual" });
      
      // 2. Compile blueprint
      const res = await api.post(`/assessments/papers/job/${selectedJobIdForCreate}/compile`);
      const paper = res.data;

      // 3. Apply custom options if provided
      if (paper?._id) {
        await api.patch(`/assessments/papers/${paper._id}`, {
          difficultyPolicy: { mode: "fixed", fixedTier: testDifficulty === "adaptive" ? "medium" : testDifficulty },
          integrityDefaults: {
            proctoring: proctoringEnabled,
            softLock: { enabled: softLockEnabled, action: "pause", flagThreshold: 3 },
          },
        }).catch(() => {});

        // 4. Trigger item generation
        await api.post(`/assessments/papers/${paper._id}/items/generate`).catch(() => {});
        setPapersByJob((prev) => ({ ...prev, [selectedJobIdForCreate]: paper }));
      }

      setJobs((prev) =>
        prev.map((j) => (j._id === selectedJobIdForCreate ? { ...j, assessmentPolicy: "manual" } : j))
      );
      toast.success("Skills Assessment created and question synthesis initiated!");
      setCreateModalOpen(false);
      navigate(`/jobs?jobId=${selectedJobIdForCreate}&tab=assessment`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not create assessment. Please ensure rubric is approved.");
    } finally {
      setCompilingJobId(null);
    }
  }

  // Filtered list
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = !q || job.title?.toLowerCase().includes(q) || job.department?.toLowerCase().includes(q);
      const policyMatch =
        policyFilter === "all" ||
        (policyFilter === "required" && ["manual", "auto"].includes(job.assessmentPolicy)) ||
        (policyFilter === "off" && (!job.assessmentPolicy || job.assessmentPolicy === "off"));

      const paper = papersByJob[job._id];
      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "approved" && paper?.status === "approved") ||
        (statusFilter === "draft" && paper?.status === "draft") ||
        (statusFilter === "missing" && !paper);

      return titleMatch && policyMatch && statusMatch;
    });
  }, [jobs, papersByJob, searchQuery, policyFilter, statusFilter]);

  // Metrics
  const stats = useMemo(() => {
    let requiredCount = 0;
    let approvedPapers = 0;
    let draftPapers = 0;
    let totalItems = 0;

    jobs.forEach((j) => {
      if (["manual", "auto"].includes(j.assessmentPolicy)) requiredCount++;
      const p = papersByJob[j._id];
      if (p?.status === "approved") approvedPapers++;
      else if (p?.status === "draft") draftPapers++;
      if (p?.items?.length) totalItems += p.items.length;
    });

    return { requiredCount, approvedPapers, draftPapers, totalItems };
  }, [jobs, papersByJob]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-slate-900 flex items-center gap-2.5">
            <FileQuestion className="h-6 w-6 text-brand-700" />
            <span>Skills Assessments Studio</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Create, calibrate, and manage role-specific assessment tests, question pools, and proctoring policies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setSelectedJobIdForCreate(jobs[0]?._id || "");
              setCreateModalOpen(true);
            }}
            className="bg-[#0E3B2E] text-white hover:bg-[#154d3d] shadow-xs gap-1.5 cursor-pointer text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>New Skills Assessment</span>
          </Button>
        </div>
      </div>

      {/* KPI Overview Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="compact" className="bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Roles Requiring Test</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <FileCode className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{stats.requiredCount}</div>
          <span className="text-[11px] text-slate-500">out of {jobs.length} total roles</span>
        </Card>

        <Card padding="compact" className="bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Approved Test Papers</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{stats.approvedPapers}</div>
          <span className="text-[11px] text-emerald-700 font-medium">Ready for candidate testing</span>
        </Card>

        <Card padding="compact" className="bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Drafts In Progress</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{stats.draftPapers}</div>
          <span className="text-[11px] text-amber-700 font-medium">Awaiting item review/approval</span>
        </Card>

        <Card padding="compact" className="bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Verified Questions Pool</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Cpu className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{stats.totalItems}</div>
          <span className="text-[11px] text-blue-700 font-medium">Triple-solver blind vetted</span>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by job title or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={policyFilter}
            onChange={(e) => setPolicyFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white text-slate-700 font-medium focus:outline-none"
          >
            <option value="all">All Policies</option>
            <option value="required">Assessment Required</option>
            <option value="off">Assessment Off</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white text-slate-700 font-medium focus:outline-none"
          >
            <option value="all">All Paper States</option>
            <option value="approved">Approved & Frozen</option>
            <option value="draft">Draft Papers</option>
            <option value="missing">No Paper Configured</option>
          </select>

          <Button variant="ghost" size="sm" onClick={loadData} disabled={loading} className="cursor-pointer">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Requisitions Assessment List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-16 w-full" />
            </Card>
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title="No assessments match your filters"
          description="Try clearing search queries or filters to see all role assessment configurations."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setPolicyFilter("all");
                setStatusFilter("all");
              }}
            >
              Clear Filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job) => {
            const paper = papersByJob[job._id];
            const isPolicyOn = ["manual", "auto"].includes(job.assessmentPolicy);
            const policyMeta = POLICY_META[job.assessmentPolicy || "off"] || POLICY_META.off;
            const isCompiling = compilingJobId === job._id;

            return (
              <div
                key={job._id}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 hover:shadow-md transition-all duration-200"
              >
                <div>
                  {/* Top Bar: Title and Policy Switch */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {job.department || "General"}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-700 transition-colors line-clamp-1">
                        {job.title}
                      </h3>
                    </div>

                    <Badge
                      tone={
                        paper?.status === "approved"
                          ? "green"
                          : paper?.status === "draft"
                          ? "amber"
                          : isPolicyOn
                          ? "red"
                          : "slate"
                      }
                      className="shrink-0 text-[11px] font-semibold"
                    >
                      {paper?.status === "approved"
                        ? `v${paper.version} · Approved`
                        : paper?.status === "draft"
                        ? `v${paper.version} · Draft`
                        : isPolicyOn
                        ? "Test Required (No Paper)"
                        : "Test Off"}
                    </Badge>
                  </div>

                  {/* Policy Description */}
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 border border-slate-100">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <FileCode className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        {policyMeta.label}
                      </span>
                      <span className="text-[10.5px] text-slate-500 truncate mt-0.5">
                        {isPolicyOn ? "Candidate must clear test before offer" : "No assessment step for this role"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTogglePolicy(job, job.assessmentPolicy || "off")}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-md transition cursor-pointer border ${
                        isPolicyOn
                          ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                          : "border-brand-300 bg-brand-50 text-brand-800 hover:bg-brand-100"
                      }`}
                    >
                      {isPolicyOn ? "Turn Off" : "Enable"}
                    </button>
                  </div>

                  {/* Paper Specifications */}
                  {paper ? (
                    <div className="mt-3.5 space-y-2 text-xs text-slate-600">
                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Test Blueprint:</span>
                        <span className="font-semibold text-slate-800">
                          {paper.sections?.length || 0} sections ·{" "}
                          {paper.sections?.reduce((sum, s) => sum + (s.servedItemCount || 0), 0) || 0} questions
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Item Pool:</span>
                        <span className="font-semibold text-slate-800">
                          {paper.items?.length || 0} generated items
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-slate-500">Proctoring:</span>
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                          {paper.integrityDefaults?.proctoring ? "Active" : "Standard"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-center">
                      <FileQuestion className="h-6 w-6 text-slate-400 mx-auto" />
                      <p className="mt-1.5 text-xs text-slate-500">No assessment paper authored yet.</p>
                      {isPolicyOn && (
                        <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                          Publishing is gated until an assessment paper is approved.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  {paper ? (
                    <>
                      <Button
                        as={Link}
                        to={`/jobs?jobId=${job._id}&tab=assessment`}
                        size="sm"
                        variant="secondary"
                        className="flex-1 justify-center text-xs font-semibold shadow-2xs gap-1 cursor-pointer"
                      >
                        <Sliders className="h-3.5 w-3.5" />
                        <span>Manage Paper</span>
                      </Button>

                      <Button
                        as={Link}
                        to={`/jobs?jobId=${job._id}&tab=assessment`}
                        size="sm"
                        variant="outline"
                        className="text-xs font-semibold shadow-2xs gap-1 cursor-pointer"
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span>Sessions</span>
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => handleQuickCompile(job._id)}
                      disabled={isCompiling}
                      size="sm"
                      className="w-full justify-center bg-[#0E3B2E] text-white hover:bg-[#154d3d] text-xs font-semibold shadow-2xs gap-1.5 cursor-pointer"
                    >
                      <Cpu className="h-3.5 w-3.5" />
                      <span>{isCompiling ? "Compiling Blueprint..." : "Compile Assessment Blueprint"}</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: New Custom Assessment */}
      {createModalOpen && (
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Create Role Skills Assessment"
        >
          <form onSubmit={handleCreateAssessmentSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Hiring Project / Role
              </label>
              <select
                value={selectedJobIdForCreate}
                onChange={(e) => setSelectedJobIdForCreate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                {jobs.map((j) => (
                  <option key={j._id} value={j._id}>
                    {j.title} ({j.department || "General"})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                The assessment paper will compile evaluation criteria directly from this role's approved scoring rubric.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Difficulty Level
                </label>
                <select
                  value={testDifficulty}
                  onChange={(e) => setTestDifficulty(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                >
                  <option value="adaptive">Adaptive (Recommended)</option>
                  <option value="easy">Foundational (Junior)</option>
                  <option value="medium">Intermediate (Standard)</option>
                  <option value="hard">Advanced (Senior / Lead)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Test Duration
                </label>
                <select
                  value={testDuration}
                  onChange={(e) => setTestDuration(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                >
                  <option value={30}>30 min (Quick Screening)</option>
                  <option value={45}>45 min (Standard Comprehensive)</option>
                  <option value={60}>60 min (Deep Technical Analysis)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="block text-xs font-semibold text-slate-700">
                Anti-Cheat & Proctoring Integrity
              </span>

              <label className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={proctoringEnabled}
                  onChange={(e) => setProctoringEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-[#0E3B2E]"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800">Camera Proctoring Check-ins</span>
                  <p className="text-[11px] text-slate-500">Periodic webcam snapshots with candidate consent</p>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={softLockEnabled}
                  onChange={(e) => setSoftLockEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-[#0E3B2E]"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800">Tab-Switch Soft Lock</span>
                  <p className="text-[11px] text-slate-500">Warns and pauses the exam if the candidate navigates away</p>
                </div>
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                loading={Boolean(compilingJobId)}
                className="bg-[#0E3B2E] text-white hover:bg-[#154d3d]"
              >
                Create & Compile Blueprint
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Layered Job Inspection Drawer if opened */}
      {inspectingJob && (
        <JobInspectionDrawer
          job={inspectingJob}
          initialTab="assessment"
          onClose={() => setInspectingJob(null)}
          onJobUpdated={(updated) => {
            setJobs((prev) => prev.map((j) => (j._id === updated._id ? updated : j)));
          }}
        />
      )}
    </div>
  );
}

