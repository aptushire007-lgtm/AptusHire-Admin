import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  X,
  Bot,
  Sparkles,
  Users,
  CheckCircle2,
  Pencil,
  FileText,
  Activity,
  Layers,
  ShieldCheck,
  Check,
  AlertCircle,
  AlertTriangle,
  Briefcase,
  MapPin,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Save,
  RefreshCw,
  MessageSquareQuote,
  Globe,
  FileQuestion,
  Cpu,
  Clock,
  Sliders,
  ExternalLink,
  HelpCircle,
} from "lucide-react";
import Button from "../ui/Button.jsx";
import { Badge } from "../ui/Card.jsx";
import api from "../../api/client.js";
import { useToast } from "../ui/Toast.jsx";
import EditJobModal from "./EditJobModal.jsx";
import Modal from "../ui/Modal.jsx";
import CandidateDrawer from "../candidate/CandidateDrawer.jsx";
import ThreeDLoader from "../ui/ThreeDLoader.jsx";
import PaperEditor from "../../pages/dashboard/PaperEditor.jsx";
import { stageLabel } from "../../lib/pipeline.js";
import { scoreOf, scoreCaveat } from "../../lib/pipelineMetrics.js";

const TIER_COLORS = {
  critical: "bg-red-100 text-red-700 border-red-200",
  important: "bg-emerald-100 text-emerald-800 border-emerald-200",
  helpful: "bg-blue-100 text-blue-700 border-blue-200",
  bonus: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function JobInspectionDrawer({
  job: initialJob,
  onClose,
  initialTab = "overview",
  candidates = [],
  onJobUpdated,
  onJobDeleted,
}) {
  const toast = useToast();
  const [job, setJob] = useState(initialJob);
  const [activeTab, setActiveTab] = useState(initialTab || "overview");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [studioModalOpen, setStudioModalOpen] = useState(false);
  const [inspectingCandidateId, setInspectingCandidateId] = useState(null);
  const [deletingJob, setDeletingJob] = useState(false);
  const [publishingJob, setPublishingJob] = useState(false);

  // ── Rubric State ─────────────────────────────────────────────────────────────
  const [rubricData, setRubricData] = useState(null);
  const [rubricCriteria, setRubricCriteria] = useState([]);
  const [loadingRubric, setLoadingRubric] = useState(false);
  const [compilingRubric, setCompilingRubric] = useState(false);
  const [savingRubric, setSavingRubric] = useState(false);
  const [approvingRubric, setApprovingRubric] = useState(false);
  const [hasRubricChanges, setHasRubricChanges] = useState(false);
  const [editingCriterionIdx, setEditingCriterionIdx] = useState(null);
  const [showAddCriterion, setShowAddCriterion] = useState(false);
  const [newCriterion, setNewCriterion] = useState({
    label: "",
    importance: "important",
    rationale: "",
  });

  // ── Interview Questions State ───────────────────────────────────────────────
  const [questionSet, setQuestionSet] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [compilingQuestions, setCompilingQuestions] = useState(false);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [approvingQuestions, setApprovingQuestions] = useState(false);
  const [hasQuestionChanges, setHasQuestionChanges] = useState(false);
  const [editingQuestionIdx, setEditingQuestionIdx] = useState(null);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionTopic, setNewQuestionTopic] = useState("");

  // ── Skills Assessment State ────────────────────────────────────────────────
  const [assessmentPaper, setAssessmentPaper] = useState(null);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const [compilingAssessment, setCompilingAssessment] = useState(false);
  const [generatingPaperItems, setGeneratingPaperItems] = useState(false);
  const [approvingPaper, setApprovingPaper] = useState(false);
  const [updatingPolicy, setUpdatingPolicy] = useState(false);

  useEffect(() => {
    setJob(initialJob);
  }, [initialJob]);

  // Reset job-specific data when the inspected job changes so stale data from
  // the previous job never bleeds into the next one.
  useEffect(() => {
    setRubricData(null);
    setRubricCriteria([]);
    setLoadingRubric(false);
    setHasRubricChanges(false);
    setEditingCriterionIdx(null);
    setShowAddCriterion(false);

    setQuestionSet(null);
    setQuestions([]);
    setLoadingQuestions(false);
    setHasQuestionChanges(false);
    setEditingQuestionIdx(null);
    setShowAddQuestion(false);

    setAssessmentPaper(null);
    setLoadingAssessment(false);
  }, [initialJob?._id]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && !editModalOpen && !inspectingCandidateId) {
        onClose?.();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, editModalOpen, inspectingCandidateId]);

  // Load rubric data if available
  useEffect(() => {
    if (job?._id && !rubricData) {
      setLoadingRubric(true);
      api
        .get(`/rubrics/job/${job._id}`)
        .then((res) => {
          if (res.data) {
            const data = res.data.active || res.data;
            setRubricData(data);
            const list = data.criteria || [];
            setRubricCriteria(list);
          }
        })
        .catch(() => {
          // Rubric may not be compiled yet
        })
        .finally(() => setLoadingRubric(false));
    }
  }, [job?._id, rubricData]);

  // Load question set if available
  useEffect(() => {
    if (job?._id && !questionSet) {
      setLoadingQuestions(true);
      api
        .get(`/jobs/${job._id}/question-set`)
        .then((res) => {
          if (res.data) {
            const list = res.data.versions || [];
            const activeOrDraft =
              res.data.active ||
              list.find((v) => v.status === "draft") ||
              list[0] ||
              null;
            setQuestionSet(activeOrDraft);
            setQuestions(activeOrDraft?.questions || []);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingQuestions(false));
    }
  }, [job?._id, questionSet]);

  if (!job) return null;

  const reqCode = `#REQ-${job._id ? job._id.slice(-6).toUpperCase() : "2026-009"}`;
  const statusTone =
    job.status === "published"
      ? "green"
      : job.status === "draft"
      ? "amber"
      : "slate";

  // The APPROVED rubric, formatted for display — and nothing else.
  //
  // This used to fall back to criteria synthesised from `requiredSkills`, and
  // then to three invented competencies weighted 50/30/20. Both read exactly
  // like a real rubric on screen while the scoring engine used neither, so a
  // recruiter could approve a job believing candidates would be measured
  // against weights that existed only in this component. A job whose rubric has
  // not compiled yet has no rubric to show, and the panel says so.
  //
  // `weight` is likewise only rendered when the stored criterion carries one:
  // defaulting a missing weight to "25%" states a share of the score that no
  // record backs.
  const IMPORTANCE_TAGS = {
    critical: "MUST HAVE",
    important: "VERY IMPORTANT",
    helpful: "HELPFUL",
    bonus: "BONUS",
  };
  const criteria = rubricCriteria.map((c) => ({
    tag: IMPORTANCE_TAGS[c.importance] || "BONUS",
    title: c.label || c.title || "Competency",
    importance: c.importance || "important",
    weight: c.weight != null ? `${Math.round(c.weight * 100)}%` : null,
    pct: c.weight != null ? Math.round(c.weight * 100) : null,
    rationale: c.rationale || "",
  }));

  const primaryCandidate = candidates[0];

  function handleJobUpdatedInternal(updatedJob) {
    setJob(updatedJob);
    onJobUpdated?.(updatedJob);
  }

  // ── Publish Job ────────────────────────────────────────────────────────────
  async function handlePublishJob() {
    if (publishingJob) return;
    setPublishingJob(true);
    try {
      // 1. Fetch current readiness checklist
      let readiness = null;
      try {
        const rCheck = await api.get(`/jobs/${job._id}/readiness`);
        readiness = rCheck.data;
      } catch {}

      const rubricCheck = readiness?.checks?.find((c) => c.key === "rubric");
      const questionsCheck = readiness?.checks?.find((c) => c.key === "questions");
      const assessmentCheck = readiness?.checks?.find((c) => c.key === "assessment");
      const journeyCheck = readiness?.checks?.find((c) => c.key === "journey");

      // 2. Ensure rubric is compiled & approved if not ready
      if (!rubricCheck || !rubricCheck.ready) {
        try {
          const rRes = await api.get(`/rubrics/job/${job._id}`);
          const draftRubric = rRes.data?.versions?.find((v) => v.status === "draft");
          if (draftRubric?._id) {
            await api.post(`/rubrics/${draftRubric._id}/approve`).catch(() => {});
          } else if (!rRes.data?.active?._id) {
            const cRes = await api.post(`/rubrics/job/${job._id}/compile`);
            if (cRes.data?._id) {
              await api.post(`/rubrics/${cRes.data._id}/approve`).catch(() => {});
            }
          }
        } catch {}
      }

      // 3. Ensure questions are drafted & approved if not ready
      if (!questionsCheck || !questionsCheck.ready) {
        try {
          const qRes = await api.post(`/jobs/${job._id}/question-set/auto-draft`);
          if (qRes.data?._id) {
            await api.post(`/jobs/${job._id}/question-set/${qRes.data._id}/approve`).catch(() => {});
          }
        } catch {}
      }

      // 4. Handle assessment paper check
      if (assessmentCheck && !assessmentCheck.ready && assessmentCheck.required) {
        const isLocallyReady =
          assessmentPaper?.status === "approved" &&
          assessmentPaper.sections?.length > 0 &&
          assessmentPaper.sections?.every(
            (s) =>
              (assessmentPaper.items || []).filter(
                (i) => i.status === "active" && i.sectionId === s.id
              ).length >= s.servedItemCount
          );

        if (!isLocallyReady) {
          const reasonMsg =
            assessmentCheck.reason ||
            "This job has Skills Assessment (Test) enabled, but the assessment paper is not ready.";
          const proceed = window.confirm(
            `${reasonMsg}\n\nWould you like to publish the job now with AI Interview & CV Evaluation (and set up the skills test later)?`
          );
          if (proceed) {
            await api.put(`/jobs/${job._id}`, { assessmentPolicy: "off" });
          } else {
            toast.info("Please create and approve an assessment paper in the assessment workspace before publishing.");
            setPublishingJob(false);
            return;
          }
        }
      }

      // 5. Handle journey review if needed
      if (journeyCheck && !journeyCheck.ready && journeyCheck.required && readiness?.fingerprint) {
        try {
          await api.post(`/jobs/${job._id}/review-journey`, {
            fingerprint: readiness.fingerprint,
            revision: readiness.setupRevision || 1,
          }).catch(() => {});
        } catch {}
      }

      // 6. Publish the job
      const res = await api.patch(`/jobs/${job._id}/publish`);
      const updated = res.data || { ...job, status: "published" };
      setJob(updated);
      onJobUpdated?.(updated);
      toast.success(`"${updated.title}" is now published and live on your careers page!`);
    } catch (err) {
      const failedCheck = err.response?.data?.readiness?.checks?.find((c) => c.status === "needs_attention");
      const msg = failedCheck?.reason || err.response?.data?.error || "Could not publish job. Please check prerequisites.";
      toast.error(msg);
    } finally {
      setPublishingJob(false);
    }
  }

  // ── Delete Job ─────────────────────────────────────────────────────────────
  async function handleDeleteJob() {
    if (!window.confirm(`Are you sure you want to delete "${job.title}"? This cannot be undone.`)) {
      return;
    }
    setDeletingJob(true);
    try {
      await api.delete(`/jobs/${job._id}`);
      toast.success("Job deleted successfully");
      onJobDeleted?.(job._id);
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not delete this job");
    } finally {
      setDeletingJob(false);
    }
  }

  // ── Rubric Actions ─────────────────────────────────────────────────────────
  async function handleCompileRubric() {
    if (compilingRubric) return;
    setCompilingRubric(true);
    try {
      const res = await api.post(`/rubrics/job/${job._id}/compile`);
      if (res.data) {
        setRubricData(res.data);
        setRubricCriteria(res.data.criteria || []);
        setHasRubricChanges(false);
        toast.success("Evaluation rubric compiled with AI from Job Description!");
        if (job.rubricStatus !== "draft" && job.rubricStatus !== "approved") {
          const updated = { ...job, rubricStatus: "draft" };
          setJob(updated);
          onJobUpdated?.(updated);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not compile rubric from job description.");
    } finally {
      setCompilingRubric(false);
    }
  }

  function handleAddCriterion() {
    if (!newCriterion.label.trim()) {
      toast.error("Please enter a competency label");
      return;
    }
    if (!newCriterion.rationale.trim()) {
      toast.error("Please provide a rationale explaining why this matters");
      return;
    }
    const item = {
      id: `c${rubricCriteria.length + 1}`,
      label: newCriterion.label.trim(),
      importance: newCriterion.importance || "important",
      rationale: newCriterion.rationale.trim(),
      weight: 0.2,
    };
    setRubricCriteria((prev) => [...prev, item]);
    setHasRubricChanges(true);
    setNewCriterion({ label: "", importance: "important", rationale: "" });
    setShowAddCriterion(false);
  }

  function handleRemoveCriterion(index) {
    setRubricCriteria((prev) => prev.filter((_, i) => i !== index));
    setHasRubricChanges(true);
    if (editingCriterionIdx === index) setEditingCriterionIdx(null);
  }

  function handleUpdateCriterion(index, field, value) {
    setRubricCriteria((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
    setHasRubricChanges(true);
  }

  async function handleSaveRubric() {
    if (savingRubric) return;
    if (!rubricData?._id) {
      toast.error("Please compile a rubric first before saving custom edits.");
      return;
    }
    setSavingRubric(true);
    try {
      const res = await api.patch(`/rubrics/${rubricData._id}`, {
        criteria: rubricCriteria.map((c) => ({
          label: c.label || c.title,
          importance: c.importance || "important",
          rationale: c.rationale || "Required competency for role.",
        })),
      });
      if (res.data?.criteria) {
        setRubricData(res.data);
        setRubricCriteria(res.data.criteria);
      } else if (res.data?._id) {
        setRubricData(res.data);
      }
      setHasRubricChanges(false);
      setEditingCriterionIdx(null);
      toast.success("Rubric criteria saved successfully");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not save rubric changes");
    } finally {
      setSavingRubric(false);
    }
  }

  async function handleApproveRubric() {
    if (approvingRubric) return;
    setApprovingRubric(true);
    try {
      if (rubricData?._id) {
        await api.post(`/rubrics/${rubricData._id}/approve`).catch(() => {});
      }
      const updated = { ...job, rubricStatus: "approved" };
      setJob(updated);
      onJobUpdated?.(updated);
      toast.success("Evaluation Rubric approved successfully!");
    } catch {
      toast.error("Could not approve rubric. Please try again.");
    } finally {
      setApprovingRubric(false);
    }
  }

  // ── Questions Actions ──────────────────────────────────────────────────────
  async function handleAutoDraftQuestions() {
    if (compilingQuestions) return;
    setCompilingQuestions(true);
    try {
      const res = await api.post(`/jobs/${job._id}/question-set/auto-draft`);
      if (res.data) {
        setQuestionSet(res.data);
        setQuestions(res.data.questions || []);
        setHasQuestionChanges(false);
        toast.success("AI interview questions compiled successfully!");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not generate interview questions");
    } finally {
      setCompilingQuestions(false);
    }
  }

  function handleAddQuestion() {
    if (!newQuestionText.trim()) {
      toast.error("Please enter a question prompt");
      return;
    }
    const q = {
      id: `q${questions.length + 1}`,
      text: newQuestionText.trim(),
      topic: newQuestionTopic.trim() || "Core Evaluation",
    };
    setQuestions((prev) => [...prev, q]);
    setHasQuestionChanges(true);
    setNewQuestionText("");
    setNewQuestionTopic("");
    setShowAddQuestion(false);
  }

  function handleRemoveQuestion(index) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    setHasQuestionChanges(true);
    if (editingQuestionIdx === index) setEditingQuestionIdx(null);
  }

  function handleUpdateQuestionText(index, text) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, text } : q))
    );
    setHasQuestionChanges(true);
  }

  function handleUpdateQuestionTopic(index, topic) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, topic } : q))
    );
    setHasQuestionChanges(true);
  }

  function handleMoveQuestion(index, direction) {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    setQuestions((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
    setHasQuestionChanges(true);
  }

  async function handleSaveQuestions() {
    if (savingQuestions) return;
    setSavingQuestions(true);
    try {
      let res;
      if (questionSet?._id && questionSet.status === "draft") {
        res = await api.patch(`/jobs/${job._id}/question-set/${questionSet._id}`, {
          questions: questions.map((q) => ({ text: q.text, topic: q.topic, restatement: q.restatement })),
        });
      } else {
        res = await api.post(`/jobs/${job._id}/question-set`, {
          questions: questions.map((q) => ({ text: q.text, topic: q.topic, restatement: q.restatement })),
        });
      }
      if (res.data?.questions) {
        setQuestionSet(res.data);
        setQuestions(res.data.questions);
      } else if (res.data?._id) {
        setQuestionSet(res.data);
      }
      setHasQuestionChanges(false);
      setEditingQuestionIdx(null);
      toast.success("Interview questions saved successfully");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not save questions");
    } finally {
      setSavingQuestions(false);
    }
  }

  async function handleApproveQuestions() {
    if (approvingQuestions) return;
    if (!questionSet?._id) {
      toast.error("Please generate or save questions before approving");
      return;
    }
    setApprovingQuestions(true);
    try {
      const res = await api.post(`/jobs/${job._id}/question-set/${questionSet._id}/approve`);
      if (res.data) {
        setQuestionSet(res.data);
      }
      toast.success("Question set approved & frozen for live AI interviews!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not approve question set");
    } finally {
      setApprovingQuestions(false);
    }
  }

  // ── Skills Assessment Handlers ─────────────────────────────────────────────
  const loadAssessmentPaper = React.useCallback(async () => {
    if (!job?._id) return;
    setLoadingAssessment(true);
    try {
      const res = await api.get(`/assessments/papers/job/${job._id}`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        setAssessmentPaper(res.data[0]);
      } else {
        setAssessmentPaper(null);
      }
    } catch {
      // Paper might not exist yet
    } finally {
      setLoadingAssessment(false);
    }
  }, [job?._id]);

  useEffect(() => {
    if (activeTab === "assessment" && !assessmentPaper) {
      loadAssessmentPaper();
    }
  }, [activeTab, assessmentPaper, loadAssessmentPaper]);

  async function handleCompilePaper() {
    if (compilingAssessment) return;
    setCompilingAssessment(true);
    try {
      const res = await api.post(`/assessments/papers/job/${job._id}/compile`);
      setAssessmentPaper(res.data);
      toast.success("Assessment blueprint compiled from role rubric!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to compile assessment blueprint");
    } finally {
      setCompilingAssessment(false);
    }
  }
  const isPaperGenerating =
    generatingPaperItems ||
    (assessmentPaper?.generationRun?.status === "running");

  // Poll for paper generation progress when a generation run is active
  useEffect(() => {
    if (!assessmentPaper?._id || assessmentPaper?.generationRun?.status !== "running") return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/assessments/papers/${assessmentPaper._id}`);
        if (res.data) {
          setAssessmentPaper(res.data);
          if (res.data.generationRun?.status === "completed") {
            toast.success("Assessment questions generated and verified!");
          } else if (res.data.generationRun?.status === "failed") {
            toast.error(res.data.generationRun?.message || "Item generation failed");
          }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [assessmentPaper?._id, assessmentPaper?.generationRun?.status, toast]);

  async function handleGeneratePaperItems() {
    if (!assessmentPaper?._id || isPaperGenerating) return;
    setGeneratingPaperItems(true);
    try {
      await api.post(`/assessments/papers/${assessmentPaper._id}/items/generate`);
      toast.success("Question generation started! Generating 3-solver blind vetted test items.");
      const updated = await api.get(`/assessments/papers/${assessmentPaper._id}`);
      setAssessmentPaper(updated.data);
    } catch (err) {
      if (err.response?.status === 409 && String(err.response?.data?.error || "").toLowerCase().includes("running")) {
        toast.info("Question generation is already in progress in the background. Polling progress…");
        const updated = await api.get(`/assessments/papers/${assessmentPaper._id}`).catch(() => null);
        if (updated?.data) setAssessmentPaper(updated.data);
      } else {
        toast.error(err.response?.data?.error || "Could not generate test items");
      }
    } finally {
      setGeneratingPaperItems(false);
    }
  }

  async function handleApprovePaper() {
    if (!assessmentPaper?._id || approvingPaper) return;
    setApprovingPaper(true);
    try {
      const res = await api.post(`/assessments/papers/${assessmentPaper._id}/approve`);
      setAssessmentPaper(res.data);
      toast.success("Assessment Paper approved & frozen! Job is now test-ready.");
      onJobUpdated?.({ ...job });
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not approve paper. Ensure all sections have enough approved items.");
    } finally {
      setApprovingPaper(false);
    }
  }

  async function handleToggleAssessmentPolicy() {
    if (updatingPolicy) return;
    setUpdatingPolicy(true);
    const nextPolicy = job.assessmentPolicy === "manual" ? "off" : "manual";
    try {
      await api.put(`/jobs/${job._id}`, { assessmentPolicy: nextPolicy });
      const updated = { ...job, assessmentPolicy: nextPolicy };
      setJob(updated);
      onJobUpdated?.(updated);
      toast.success(
        nextPolicy === "manual"
          ? "Skills Assessment is now required for this role. An approved paper will be required before publishing."
          : "Skills Assessment disabled for this role. Candidates will not take a skills test."
      );
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not update assessment policy");
    } finally {
      setUpdatingPolicy(false);
    }
  }

  return (
    <>
      <Modal
        open={Boolean(job)}
        onClose={onClose}
        label={`Job Inspection: ${job.title}`}
        placement="center"
        size="4xl"
        showClose={false}
        panelClassName="w-full max-w-4xl p-0 flex flex-col h-[90vh] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
      >
        <div className="flex h-full w-full flex-col">
          {/* Drawer Header */}
          <div className="border-b border-slate-100 bg-[#FBFDFB] px-6 py-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge tone={statusTone} className="capitalize font-semibold text-[11px] px-2.5 py-0.5">
                  • {job.status}
                </Badge>
                <span className="font-mono text-xs font-semibold text-slate-400">
                  {reqCode}
                </span>
                {job.rubricStatus && (
                  <Badge
                    tone={job.rubricStatus === "approved" ? "green" : "amber"}
                    className="text-[11px] font-semibold"
                  >
                    Rubric: {job.rubricStatus}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {job.status !== "published" && (
                  <button
                    type="button"
                    onClick={handlePublishJob}
                    disabled={publishingJob}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>{publishingJob ? "Publishing..." : "Publish Job"}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDeleteJob}
                  disabled={deletingJob}
                  aria-label="Delete requisition"
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50/70 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                  <span>{deletingJob ? "Deleting..." : "Delete"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                >
                  <Pencil className="h-3.5 w-3.5 text-slate-500" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close drawer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-3">
              <h2 className="font-display text-xl font-bold text-slate-900 leading-snug">
                {job.title}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                  {job.department || "General"}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {job.location || "Remote / Anywhere"}
                </span>
                {Number(job.numberOfOpenings) > 0 && (
                  <span>• {job.numberOfOpenings} {job.numberOfOpenings === 1 ? "opening" : "openings"}</span>
                )}
                {job.minExperienceYears != null && (
                  <span>• {job.minExperienceYears}+ yrs exp</span>
                )}
              </div>
            </div>

            {/* Tab Navigation */}
            <div role="tablist" className="mt-5 -mb-5 flex border-b border-slate-200 gap-6 overflow-x-auto">
              {[
                { id: "overview", label: "Overview" },
                { id: "candidates", label: `Candidates (${candidates.length})` },
                { id: "rubric", label: "AI Rubric & Scoring" },
                { id: "questions", label: `Interview Questions (${questions.length})` },
                { id: "assessment", label: "Skills Assessment" },
                { id: "activity", label: "Activity" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 text-xs font-semibold transition-all relative cursor-pointer ${
                    activeTab === tab.id
                      ? "text-[#0E3B2E]"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0E3B2E] rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Drawer Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {activeTab === "overview" && (
              <>
                {/* Requisition Brief / Description */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Role Description
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {job.description || "No description provided."}
                  </p>

                  {job.requirements && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Requirements & Qualifications
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                        {job.requirements}
                      </p>
                    </div>
                  )}

                  {Array.isArray(job.requiredSkills) && job.requiredSkills.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Required Skills
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {job.requiredSkills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="rounded-md bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 text-xs font-semibold"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card 1: Aptus AI Rubric Evaluator Snapshot */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-2xs">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          Autonomous AI Rubric Evaluator
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {criteria.length > 0
                            ? `${criteria.length} core ${criteria.length === 1 ? "competency" : "competencies"} calibrated for scoring`
                            : "No approved rubric yet"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab("rubric")}
                      className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer"
                    >
                      View Rubric →
                    </button>
                  </div>

                  {/* Competencies Grid */}
                  {criteria.length === 0 ? (
                    <p className="mt-3.5 rounded-xl border border-slate-200/70 bg-[#F9FBFA] p-3 text-xs text-slate-600">
                      This role has no approved rubric yet, so there are no scoring
                      criteria to show. Open the Rubric tab to compile and approve one —
                      candidates cannot be screened against it until you do.
                    </p>
                  ) : (
                    <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {criteria.map((c, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-slate-200/70 bg-[#F9FBFA] p-3 transition-colors hover:bg-emerald-50/20"
                        >
                          <div className="flex items-center justify-between gap-2 text-[10.5px]">
                            <span
                              className={`font-bold tracking-wider ${
                                c.tag === "MUST HAVE"
                                  ? "text-rose-600"
                                  : c.tag === "VERY IMPORTANT"
                                  ? "text-amber-600"
                                  : "text-emerald-700"
                              }`}
                            >
                              {c.tag}
                            </span>
                            {/* No stored weight, no weight on screen. The
                                importance tag above already carries the ranking
                                the rubric actually recorded. */}
                            {c.weight && <span className="num font-bold text-slate-700">{c.weight}</span>}
                          </div>
                          <p className="mt-1 text-xs font-semibold text-slate-900 truncate" title={c.title}>
                            {c.title}
                          </p>
                          {c.pct != null && (
                            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-200/70">
                              <div
                                className="h-full rounded-full bg-emerald-600"
                                style={{ width: `${c.pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 2: Latest Active Applicants */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      CANDIDATE APPLICATIONS
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab("candidates")}
                      className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer"
                    >
                      View all ({candidates.length}) →
                    </button>
                  </div>

                  {primaryCandidate ? (
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {/* The /candidates payload nests these under
                              `basicDetails` and `ats` — reading flat `.name`,
                              `.headline` and `.score` off it always missed, so
                              every job showed the same placeholder applicant
                              ("AK", "Applicant") at a hardcoded 92%. */}
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 font-bold text-sm">
                            {(primaryCandidate.basicDetails?.name || "?")
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-slate-900 truncate">
                              {primaryCandidate.basicDetails?.name || "Unnamed candidate"}
                            </h4>
                            <p className="text-xs text-slate-500 truncate">
                              {primaryCandidate.basicDetails?.email || "No email on file"}
                            </p>
                          </div>
                        </div>

                        {/* `scoreOf` returns null unless a scoring run actually
                            completed — a candidate awaiting screening says so
                            rather than borrowing a number. */}
                        {scoreOf(primaryCandidate) != null ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200/60">
                            <Sparkles className="h-3 w-3 text-emerald-600" />
                            {scoreOf(primaryCandidate)}% Match
                            {scoreCaveat(primaryCandidate) && (
                              <span className="font-medium text-emerald-800/70">
                                ({scoreCaveat(primaryCandidate)})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
                            Not scored
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                        <span className="text-slate-500">
                          {/* String.replace swaps only the FIRST underscore, so
                              "ai_interview_completed" read "ai interview_completed".
                              stageLabel is the shared, correct mapping. */}
                          Stage: {stageLabel(primaryCandidate.status)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setInspectingCandidateId(primaryCandidate._id || primaryCandidate.id)}
                          className="rounded-lg bg-[#0E3B2E] text-white hover:bg-[#154d3d] px-3 py-1.5 text-xs font-semibold shadow-2xs transition cursor-pointer"
                        >
                          Review Candidate (Drawer)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-xs">
                      <Users className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-2 text-xs font-medium text-slate-600">
                        No active applicants yet for this requisition.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        New candidates will be screened automatically by Aptus AI.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === "candidates" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">
                    {candidates.length} {candidates.length === 1 ? "applicant" : "applicants"} enrolled
                  </span>
                </div>

                {candidates.length > 0 ? (
                  candidates.map((c) => (
                    <div
                      key={c._id || c.id}
                      onClick={() => setInspectingCandidateId(c._id || c.id)}
                      className="group flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition cursor-pointer"
                    >
                      {/* Same payload shape as the overview card: name and email
                          live under `basicDetails`, the score under `ats` via
                          scoreOf(). Reading flat `.name`/`.score` made every row
                          render as an unnamed "Candidate" with no score. */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 font-bold text-xs">
                          {(c.basicDetails?.name || "?")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition truncate">
                            {c.basicDetails?.name || "Unnamed candidate"}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Stage: {stageLabel(c.status)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {scoreOf(c) != null ? (
                          <span className="num font-bold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            {scoreOf(c)}%
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-500">Not scored</span>
                        )}
                        <span className="text-xs font-semibold text-blue-600">
                          Inspect →
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <Users className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-xs font-medium text-slate-600">
                      No candidates currently in the pipeline.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* AI RUBRIC & SCORING TAB */}
            {activeTab === "rubric" && (
              <div className="space-y-4">
                {/* Rubric Header Card with Compilation & Approval controls */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        AI Screening Rubric
                      </h4>
                      <p className="mt-1 text-xs text-slate-600">
                        {job.rubricStatus === "approved"
                          ? "Approved rubric is actively evaluating and ranking candidates."
                          : "Recruiter approval enables autonomous AI scoring for incoming applications."}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCompileRubric}
                        disabled={compilingRubric}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 px-3 py-1.5 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{compilingRubric ? "Compiling..." : "Recompile with AI"}</span>
                      </button>

                      {hasRubricChanges && (
                        <button
                          type="button"
                          onClick={handleSaveRubric}
                          disabled={savingRubric}
                          className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Save className="h-3.5 w-3.5" />
                          <span>{savingRubric ? "Saving..." : "Save Changes"}</span>
                        </button>
                      )}

                      {job.rubricStatus !== "approved" && (
                        <button
                          type="button"
                          onClick={handleApproveRubric}
                          disabled={approvingRubric}
                          className="rounded-xl bg-[#0E3B2E] hover:bg-[#154d3d] text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>{approvingRubric ? "Approving..." : "Approve Rubric"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Add Criterion Button / Form Toggle */}
                  {!showAddCriterion ? (
                    <button
                      type="button"
                      onClick={() => setShowAddCriterion(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add custom evaluation criterion</span>
                    </button>
                  ) : (
                    <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Add Evaluation Criterion</span>
                        <button
                          type="button"
                          onClick={() => setShowAddCriterion(false)}
                          className="text-slate-400 hover:text-slate-600 text-xs"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Competency title (e.g. Distributed IaC)"
                          value={newCriterion.label}
                          onChange={(e) => setNewCriterion({ ...newCriterion, label: e.target.value })}
                          className="sm:col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                        />
                        <select
                          value={newCriterion.importance}
                          onChange={(e) => setNewCriterion({ ...newCriterion, importance: e.target.value })}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-emerald-600 focus:outline-none"
                        >
                          <option value="critical">Critical (Must Have)</option>
                          <option value="important">Important (Core)</option>
                          <option value="helpful">Helpful (Nice to Have)</option>
                          <option value="bonus">Bonus (Tiebreaker)</option>
                        </select>
                      </div>

                      <textarea
                        placeholder="Rationale: why this criterion is evaluated..."
                        rows={2}
                        value={newCriterion.rationale}
                        onChange={(e) => setNewCriterion({ ...newCriterion, rationale: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={handleAddCriterion}
                        className="rounded-lg bg-[#0E3B2E] hover:bg-[#154d3d] text-white px-3 py-1.5 text-xs font-semibold transition cursor-pointer"
                      >
                        Add to Rubric
                      </button>
                    </div>
                  )}
                </div>

                {/* 3D AI Loader when compiling rubric */}
                {compilingRubric && (
                  <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-xs">
                    <ThreeDLoader
                      title="Synthesizing Evaluation Rubric with AI..."
                      subtitle="Decomposing job requirements into calibrated, testable evaluation criteria"
                      tone="emerald"
                      size="md"
                    />
                  </div>
                )}

                {/* Criteria Detail Cards */}
                <div className="space-y-2.5">
                  {!compilingRubric && criteria.length === 0 && (
                    <p className="rounded-xl border border-slate-200/80 bg-white p-3.5 text-xs text-slate-600 shadow-2xs">
                      No rubric criteria yet. Compile a rubric from the job description
                      above, then review and approve it — the approved version is what
                      the screening engine scores against.
                    </p>
                  )}
                  {criteria.map((c, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs space-y-2"
                    >
                      {editingCriterionIdx === i ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={rubricCriteria[i]?.label || c.title}
                              onChange={(e) => handleUpdateCriterion(i, "label", e.target.value)}
                              className="sm:col-span-2 rounded-lg border border-slate-300 p-1.5 text-xs font-bold text-slate-900"
                            />
                            <select
                              value={rubricCriteria[i]?.importance || c.importance}
                              onChange={(e) => handleUpdateCriterion(i, "importance", e.target.value)}
                              className="rounded-lg border border-slate-300 p-1.5 text-xs text-slate-700"
                            >
                              <option value="critical">Critical</option>
                              <option value="important">Important</option>
                              <option value="helpful">Helpful</option>
                              <option value="bonus">Bonus</option>
                            </select>
                          </div>
                          <textarea
                            value={rubricCriteria[i]?.rationale || c.rationale}
                            onChange={(e) => handleUpdateCriterion(i, "rationale", e.target.value)}
                            rows={2}
                            className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-700"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingCriterionIdx(null)}
                              className="rounded bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider border ${
                                  TIER_COLORS[c.importance] || "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {c.importance}
                              </span>
                              <span className="font-bold text-xs text-slate-900 truncate">{c.title}</span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {c.weight && (
                                <span className="text-[11px] font-bold text-slate-500 num">{c.weight}</span>
                              )}
                              <button
                                type="button"
                                onClick={() => setEditingCriterionIdx(i)}
                                title="Edit criterion"
                                className="text-slate-400 hover:text-slate-700 p-1 rounded transition"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveCriterion(i)}
                                title="Remove criterion"
                                className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {c.rationale && (
                            <p className="text-xs text-slate-500 leading-relaxed pl-1">
                              {c.rationale}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* INTERVIEW QUESTIONS TAB */}
            {activeTab === "questions" && (
              <div className="space-y-4">
                {/* Questions Header Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <MessageSquareQuote className="h-4 w-4 text-emerald-600" />
                        AI Interview Questions
                      </h4>
                      <p className="mt-1 text-xs text-slate-600">
                        {questionSet?.status === "approved"
                          ? "Approved question set is frozen and read verbatim to candidates during AI interviews."
                          : "Core questions asked to every candidate to guarantee fair, comparable evaluation."}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAutoDraftQuestions}
                        disabled={compilingQuestions}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 px-3 py-1.5 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{compilingQuestions ? "Compiling..." : "Generate with AI"}</span>
                      </button>

                      {hasQuestionChanges && (
                        <button
                          type="button"
                          onClick={handleSaveQuestions}
                          disabled={savingQuestions}
                          className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Save className="h-3.5 w-3.5" />
                          <span>{savingQuestions ? "Saving..." : "Save Questions"}</span>
                        </button>
                      )}

                      {questionSet?.status !== "approved" && questions.length > 0 && (
                        <button
                          type="button"
                          onClick={handleApproveQuestions}
                          disabled={approvingQuestions}
                          className="rounded-xl bg-[#0E3B2E] hover:bg-[#154d3d] text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>{approvingQuestions ? "Approving..." : "Approve Questions"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Add Question Button / Inline Form */}
                  {!showAddQuestion ? (
                    <button
                      type="button"
                      onClick={() => setShowAddQuestion(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add interview question</span>
                    </button>
                  ) : (
                    <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Add Question</span>
                        <button
                          type="button"
                          onClick={() => setShowAddQuestion(false)}
                          className="text-slate-400 hover:text-slate-600 text-xs"
                        >
                          Cancel
                        </button>
                      </div>

                      <textarea
                        placeholder="Type interview question prompt..."
                        rows={2}
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                      />

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Topic / Competency tag (optional)"
                          value={newQuestionTopic}
                          onChange={(e) => setNewQuestionTopic(e.target.value)}
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddQuestion}
                          className="rounded-lg bg-[#0E3B2E] hover:bg-[#154d3d] text-white px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer"
                        >
                          Add Question
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3D AI Loader when compiling questions */}
                {compilingQuestions && (
                  <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-xs">
                    <ThreeDLoader
                      title="Drafting Structured Interview Questions..."
                      subtitle="Synthesizing behavioral and technical probe questions mapped to competencies"
                      tone="blue"
                      size="md"
                    />
                  </div>
                )}

                {/* Questions List */}
                <div className="space-y-2.5">
                  {questions.length > 0 ? (
                    questions.map((q, i) => (
                      <div
                        key={q.id || i}
                        className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs space-y-2"
                      >
                        {editingQuestionIdx === i ? (
                          <div className="space-y-2">
                            <textarea
                              value={q.text}
                              onChange={(e) => handleUpdateQuestionText(i, e.target.value)}
                              rows={2}
                              className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800"
                            />
                            <div className="flex items-center justify-between">
                              <input
                                type="text"
                                value={q.topic || ""}
                                onChange={(e) => handleUpdateQuestionTopic(i, e.target.value)}
                                placeholder="Topic tag"
                                className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 w-48"
                              />
                              <button
                                type="button"
                                onClick={() => setEditingQuestionIdx(null)}
                                className="rounded bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                                {i + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-slate-900 leading-relaxed">
                                  {q.text}
                                </p>
                                {q.topic && (
                                  <span className="mt-1 inline-block text-[10px] font-semibold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60">
                                    {q.topic}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleMoveQuestion(i, -1)}
                                disabled={i === 0}
                                title="Move up"
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded transition"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveQuestion(i, 1)}
                                disabled={i === questions.length - 1}
                                title="Move down"
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded transition"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingQuestionIdx(i)}
                                title="Edit question"
                                className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveQuestion(i)}
                                title="Remove question"
                                className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <MessageSquareQuote className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-2 text-xs font-medium text-slate-600">
                        No interview questions drafted yet.
                      </p>
                      <button
                        type="button"
                        onClick={handleAutoDraftQuestions}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#0E3B2E] text-white px-3 py-1.5 text-xs font-semibold shadow-xs"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Generate with AI</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SKILLS ASSESSMENT TAB */}
            {activeTab === "assessment" && (
              <div className="space-y-5">
                {/* Policy Banner */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                        <FileQuestion className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            Assessment Testing Policy
                          </span>
                          <Badge
                            tone={job.assessmentPolicy === "manual" ? "brand" : "slate"}
                            className="text-[10.5px] font-semibold"
                          >
                            {job.assessmentPolicy === "manual" ? "Required for Candidates" : "Assessment Off"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {job.assessmentPolicy === "manual"
                            ? "Candidates must complete this skills test after ATS review before reaching offer stage."
                            : "Assessment test is not required for this role. Candidates skip directly to interviews."}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={updatingPolicy}
                      onClick={handleToggleAssessmentPolicy}
                      className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                    >
                      {updatingPolicy ? "Updating..." : job.assessmentPolicy === "manual" ? "Turn Off Test" : "Require Test"}
                    </button>
                  </div>
                </div>

                {/* 3D AI Loader for Assessment Compilation or Item Generation */}
                {(isPaperGenerating || compilingAssessment) && (
                  <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-xs">
                    <ThreeDLoader
                      title={compilingAssessment ? "Compiling Assessment Blueprint..." : "Generating & Vetting Test Questions..."}
                      subtitle={compilingAssessment ? "Allocating test sections, scoring weights, and timing limits" : "AI models authoring items and validating answers with 3 blind AI solvers"}
                      progress={assessmentPaper?.generationRun?.status === "running" ? `${assessmentPaper.generationRun.generated || 0} of ${assessmentPaper.generationRun.target || assessmentPaper.sections?.reduce((sum, s) => sum + (s.servedItemCount || 0), 0) || 18} questions verified` : null}
                      tone="emerald"
                      size="md"
                    />
                  </div>
                )}

                {/* Assessment Paper Content */}
                {loadingAssessment ? (
                  <div className="space-y-3 p-4">
                    <div className="h-6 w-1/3 bg-slate-100 animate-pulse rounded" />
                    <div className="h-24 w-full bg-slate-100 animate-pulse rounded-xl" />
                  </div>
                ) : assessmentPaper ? (
                  <div className="space-y-4">
                    {/* Paper Header */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">
                              Assessment Paper Blueprint
                            </span>
                            <Badge
                              tone={assessmentPaper.status === "approved" ? "green" : "amber"}
                              className="text-[11px] font-semibold"
                            >
                              v{assessmentPaper.version} · {assessmentPaper.status === "approved" ? "Approved & Frozen" : "Draft (Needs Approval)"}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Compiled from role rubric criteria and job requirements.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {assessmentPaper.status === "draft" && (
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={handleGeneratePaperItems}
                                disabled={isPaperGenerating}
                                className="text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
                              >
                                {isPaperGenerating ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Sparkles className="h-3.5 w-3.5" />
                                )}
                                <span>
                                  {isPaperGenerating
                                    ? `Generating (${assessmentPaper.generationRun?.generated || 0}/${assessmentPaper.generationRun?.target || assessmentPaper.sections?.reduce((sum, s) => sum + (s.servedItemCount || 0), 0) || "..."})…`
                                    : "Generate Items (AI)"}
                                </span>
                              </Button>

                              <Button
                                size="sm"
                                onClick={handleApprovePaper}
                                disabled={approvingPaper}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>{approvingPaper ? "Freezing..." : "Approve & Freeze"}</span>
                              </Button>
                            </>
                          )}

                          <Button
                            type="button"
                            onClick={() => setStudioModalOpen(true)}
                            size="sm"
                            variant="outline"
                            className="text-xs font-semibold gap-1 cursor-pointer"
                          >
                            <Sliders className="h-3.5 w-3.5" />
                            <span>Studio</span>
                          </Button>
                        </div>
                      </div>

                      {/* Specs Grid */}
                      <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10.5px]">Sections</span>
                          <span className="font-bold text-slate-800">{assessmentPaper.sections?.length || 0} Sections</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10.5px]">Questions Served</span>
                          <span className="font-bold text-slate-800">
                            {assessmentPaper.sections?.reduce((sum, s) => sum + (s.servedItemCount || 0), 0) || 0} items
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10.5px]">Item Pool</span>
                          <span className="font-bold text-slate-800">{assessmentPaper.items?.length || 0} generated</span>
                        </div>
                      </div>
                    </div>

                    {/* Sections List */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Test Sections ({assessmentPaper.sections?.length || 0})
                      </h4>
                      <div className="space-y-2">
                        {assessmentPaper.sections?.map((section, sIdx) => {
                          const sectionItems = assessmentPaper.items?.filter((i) => i.sectionId === section.id) || [];
                          return (
                            <div
                              key={section.id || sIdx}
                              className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-bold text-xs text-slate-900">
                                    {sIdx + 1}. {section.title}
                                  </span>
                                  <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                                    <span>Serves {section.servedItemCount} questions</span>
                                    <span>•</span>
                                    <span>{Math.round((section.timeLimitSec || 900) / 60)} min time limit</span>
                                    <span>•</span>
                                    <span className="text-brand-700 font-semibold">
                                      {sectionItems.length} items in pool
                                    </span>
                                  </div>
                                </div>

                                <Badge
                                  tone={sectionItems.length >= section.servedItemCount ? "green" : "amber"}
                                  className="text-[10px]"
                                >
                                  {sectionItems.length >= section.servedItemCount ? "Pool Ready" : "Need Items"}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Items Preview */}
                    {assessmentPaper.items?.length > 0 ? (
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Sample Questions in Pool ({assessmentPaper.items.length})
                          </h4>
                          <Link
                            to={`/jobs?jobId=${job._id}&tab=assessment`}
                            className="text-xs font-semibold text-brand-700 hover:underline flex items-center gap-1"
                          >
                            <span>Open in Full Editor</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>

                        <div className="space-y-2">
                          {assessmentPaper.items.slice(0, 5).map((item, idx) => (
                            <div
                              key={item._id || idx}
                              className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs text-xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-800 line-clamp-1">
                                  {idx + 1}. {item.stem}
                                </span>
                                <Badge tone="slate" className="text-[10px] shrink-0 capitalize">
                                  {item.type?.replace("_", " ")}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                <span className="text-emerald-700 font-medium">
                                  Answer Key: {item.key?.value || item.key?.optionIds?.join(", ") || "Verified"}
                                </span>
                                <span>•</span>
                                <span>Difficulty: {item.difficulty || "medium"}</span>
                              </div>
                            </div>
                          ))}
                          {assessmentPaper.items.length > 5 && (
                            <p className="text-center text-[11px] text-slate-500 pt-1">
                              +{assessmentPaper.items.length - 5} more questions in pool. Click "Studio" to view and edit all.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-4 text-center">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mx-auto" />
                        <p className="mt-1 text-xs font-semibold text-amber-900">
                          Blueprint compiled, but item pool is empty
                        </p>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          Generate items so candidates have vetted questions to answer.
                        </p>
                        <Button
                          size="sm"
                          onClick={handleGeneratePaperItems}
                          disabled={isPaperGenerating}
                          className="mt-2.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold shadow-xs"
                        >
                          {isPaperGenerating ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5 mr-1" />
                          )}
                          <span>
                            {isPaperGenerating
                              ? `Generating items (${assessmentPaper.generationRun?.generated || 0}/${assessmentPaper.generationRun?.target || "..."})…`
                              : "Generate Questions with AI"}
                          </span>
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-10 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
                    <FileQuestion className="mx-auto h-10 w-10 text-slate-300" />
                    <h3 className="mt-2 text-sm font-bold text-slate-800">
                      No Skills Assessment Configured
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                      Compile a blueprint from the role's approved scoring rubric. The AI engine will create sections and generate verified questions.
                    </p>
                    <Button
                      onClick={handleCompilePaper}
                      disabled={compilingAssessment}
                      className="mt-4 bg-[#0E3B2E] text-white hover:bg-[#154d3d] text-xs font-semibold shadow-xs"
                    >
                      <Cpu className="h-3.5 w-3.5 mr-1.5" />
                      <span>{compilingAssessment ? "Compiling Blueprint..." : "Compile Assessment Blueprint"}</span>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ACTIVITY TAB */}
            {activeTab === "activity" && (
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
                  <p className="font-semibold text-slate-900">Requisition Activity</p>
                  <ul className="mt-2 space-y-2 border-l border-slate-200 pl-3">
                    <li className="relative">
                      <span className="font-medium text-slate-900">Job created</span>
                      <span className="block text-[11px] text-slate-400">
                        {/* `|| Date.now()` stamped a missing createdAt with the
                            moment the drawer was opened — a timestamp that looks
                            like a record and is not one. */}
                        {job.createdAt ? new Date(job.createdAt).toLocaleString() : "Date not recorded"}
                      </span>
                    </li>
                    {criteria.length > 0 && (
                      <li className="relative">
                        <span className="font-medium text-slate-900">
                          Rubric configured with {criteria.length} evaluation{" "}
                          {criteria.length === 1 ? "criterion" : "criteria"}
                        </span>
                        <span className="block text-[11px] text-slate-400">Automated by Aptus AI</span>
                      </li>
                    )}
                    {questions.length > 0 && (
                      <li className="relative">
                        <span className="font-medium text-slate-900">
                          Question set compiled with {questions.length} structured interview questions
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          {questionSet?.status === "approved" ? "Approved & Frozen" : "Draft"}
                        </span>
                      </li>
                    )}
                    {job.rubricStatus === "approved" && (
                      <li className="relative">
                        <span className="font-medium text-emerald-700 font-semibold">
                          Rubric approved for autonomous evaluation
                        </span>
                        <span className="block text-[11px] text-slate-400">Verified</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer Actions */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4 shadow-lift">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDeleteJob}
                disabled={deletingJob}
                className="text-red-600 hover:bg-red-50 hover:text-red-700 gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                <span>Delete Job</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {job.status !== "published" && (
                <Button
                  type="button"
                  onClick={handlePublishJob}
                  disabled={publishingJob}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-2xs font-semibold cursor-pointer"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>{publishingJob ? "Publishing..." : "Publish Job"}</span>
                </Button>
              )}
              <Button
                type="button"
                onClick={() => setEditModalOpen(true)}
                variant="secondary"
                size="sm"
                className="gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit Requisition
              </Button>
              <Button
                type="button"
                onClick={() => setActiveTab("candidates")}
                size="sm"
                className="bg-[#0E3B2E] text-white hover:bg-[#154d3d] shadow-xs gap-1.5"
              >
                <Users className="h-3.5 w-3.5" />
                <span>Applicants ({candidates.length})</span>
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Layered Edit Job Modal */}
      {editModalOpen && (
        <EditJobModal
          isOpen={editModalOpen}
          job={job}
          onClose={() => setEditModalOpen(false)}
          onUpdated={handleJobUpdatedInternal}
        />
      )}

      {/* Layered Candidate Drawer */}
      {inspectingCandidateId && (
        <CandidateDrawer
          candidateId={inspectingCandidateId}
          reviewIds={candidates.map((c) => c._id || c.id)}
          onClose={() => setInspectingCandidateId(null)}
          onSelectCandidate={(id) => setInspectingCandidateId(id)}
          onCandidateUpdated={() => {}}
        />
      )}

      {/* Layered Assessment Studio Modal */}
      {studioModalOpen && (
        <Modal
          open={studioModalOpen}
          onClose={() => {
            setStudioModalOpen(false);
            loadAssessmentPaper();
          }}
          label={`Assessment Studio: ${job.title}`}
          placement="center"
          size="4xl"
          showClose={false}
          panelClassName="w-full max-w-5xl p-0 flex flex-col h-[92vh] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
        >
          <PaperEditor
            jobId={job._id}
            isModal={true}
            onClose={() => {
              setStudioModalOpen(false);
              loadAssessmentPaper();
            }}
          />
        </Modal>
      )}
    </>
  );
}
