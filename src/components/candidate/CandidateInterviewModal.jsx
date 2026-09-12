import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams, useLocation, Link } from "react-router-dom";
import { ArrowLeft, X, ExternalLink, Download, CheckCircle2, AlertTriangle, ChevronDown, Sparkles, User, FileText, BarChart3, Clock, Mic, ShieldAlert } from "lucide-react";
import api from "../../api/client.js";
import { Card, Badge, Skeleton } from "../ui/Card.jsx";
import Button from "../ui/Button.jsx";
import { useToast } from "../ui/Toast.jsx";
import { STAGES, stageLabel, stageTone } from "../../lib/pipeline.js";
import InterviewReport from "../../pages/InterviewReport.jsx";
import CandidatePortal from "./CandidatePortal.jsx";
import {
  EvaluationCard,
  IntegrityCard,
  InstrumentScores,
  RecommendedActionCard,
  CommunicationCompetencyCard,
  RECOMMENDATION,
} from "./InterviewReportCards.jsx";
import InsightPanel from "../report/InsightPanel.jsx";
import { InterviewSummary } from "./InterviewWorkspace.jsx";

export function CandidateInterviewModal({
  candidateId: propCandidateId,
  returnTo: propReturnTo,
  onClose,
  isOpen = true,
}) {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const candidateId = propCandidateId || params.id || params.candidateId;
  const returnTo = propReturnTo || searchParams.get("returnTo");

  const [candidate, setCandidate] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [session, setSession] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tab & Sub-tab navigation
  const [activeTab, setActiveTab] = useState("interview");
  const [activeSubTab, setActiveSubTab] = useState("evidence");
  const [stageMenuOpen, setStageMenuOpen] = useState(false);
  const [stageChanging, setStageChanging] = useState(false);

  const modalRef = useRef(null);

  // Close handler with URL / history cleanup
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }
    const returnTarget = returnTo || searchParams.get("returnTo");
    if (returnTarget) {
      if (returnTarget.startsWith("/candidates/") && !returnTarget.includes("/interview-report")) {
        const [path, query] = returnTarget.split("?");
        const candidatePathId = path.replace("/candidates/", "").split("/")[0];
        const queryParams = new URLSearchParams(query || "");
        const section = queryParams.get("section");
        let tab = "ai-interview";
        if (section === "resume" || section === "profile-cv") tab = "profile-cv";
        else if (section === "skill-assessment" || section === "assessments") tab = "assessments";
        else if (section === "ai-interview") tab = "ai-interview";
        else if (section === "timeline" || section === "activity") tab = "activity";
        else if (section === "overview") tab = "summary";
        else if (queryParams.get("tab")) tab = queryParams.get("tab");
        navigate(`/candidates?candidateId=${candidatePathId || candidateId}&tab=${tab}`);
      } else {
        navigate(returnTarget);
      }
    } else if (candidateId) {
      navigate(`/candidates?candidateId=${candidateId}&tab=ai-interview`);
    } else {
      navigate("/candidates");
    }
  }, [onClose, returnTo, searchParams, navigate, candidateId]);


  // ESC key listener
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") {
        handleClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  // Click outside listener
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Fetch candidate context
  const loadData = useCallback(async () => {
    if (!candidateId) return;
    setLoading(true);
    setError(null);
    try {
      const [cRes, tRes, sRes, aRes, rRes] = await Promise.all([
        api.get(`/candidates/${candidateId}`).catch(() => ({ data: null })),
        api.get(`/candidates/${candidateId}/timeline`).catch(() => ({ data: null })),
        api.get(`/interview-sessions/candidate/${candidateId}`).catch(() => ({ data: null })),
        api.get(`/assessments/candidate/${candidateId}`).catch(() => ({ data: null })),
        api.get(`/candidates/${candidateId}/interview-report`).catch(() => ({ data: null })),
      ]);
      setCandidate(cRes.data);
      setTimeline(tRes.data);
      setSession(sRes.data);
      setAssessment(aRes.data);
      setReport(rRes.data);
    } catch (err) {
      setError("Failed to load candidate information.");
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Stage transition action
  const handleStageChange = async (newStage) => {
    setStageChanging(true);
    try {
      await api.patch(`/candidates/${candidateId}/stage`, { stage: newStage });
      toast.success(`Candidate status moved to ${stageLabel(newStage)}`);
      setCandidate((prev) => (prev ? { ...prev, status: newStage } : prev));
      setStageMenuOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not update candidate stage");
    } finally {
      setStageChanging(false);
    }
  };

  // Scroll to Evidence Review in Interview Workspace
  const handleReviewEvidence = () => {
    setActiveTab("interview");
    setActiveSubTab("evidence");
    setTimeout(() => {
      const el = document.getElementById("sec-review") || document.querySelector("textarea");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus?.();
      }
    }, 150);
  };

  // Scroll to / focus review form on Record Evidence Review click
  const handleRecordReview = () => {
    handleReviewEvidence();
  };

  if (!isOpen) return null;

  const candidateName = candidate?.basicDetails?.name || candidate?.name || "Candidate";
  const candidateStatus = candidate?.status || "screen";

  const MAIN_TABS = [
    { id: "overview", label: "Overview" },
    { id: "profile", label: "Profile & CV" },
    { id: "assessments", label: "Assessments" },
    { id: "interview", label: "Interview" },
    { id: "activity", label: "Activity" },
  ];

  const INTERVIEW_SUB_TABS = [
    { id: "evidence", label: "Evidence & Review" },
    { id: "evaluation", label: "Evaluation & Scores" },
    { id: "communication", label: "Communication Skills" },
    { id: "criteria", label: "Criteria" },
    { id: "claims", label: "Claims & Probes" },
    { id: "monitoring", label: "Monitoring" },
  ];

  return (
    <div
      className="interview-report-backdrop"
      onClick={handleBackdropClick}
      data-testid="interview-modal-backdrop"
      role="presentation"
    >
      <div
        ref={modalRef}
        className="interview-report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="interview-modal-title"
        data-testid="interview-report-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Sticky Header */}
        <header className="modal-header !py-2.5 !px-5 bg-white border-b border-slate-200">
          {/* Row 1: Back button, Candidate Identity & Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Back button + Candidate info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-700 transition-colors shrink-0 py-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to candidates
              </button>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 border border-brand-200 text-xs font-bold text-brand-800">
                {candidateName.trim().slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 id="interview-modal-title" className="text-sm font-bold text-slate-900 truncate">
                    Interview Report - {candidateName}
                  </h2>
                  <Badge tone={stageTone(candidateStatus)}>{stageLabel(candidateStatus)}</Badge>
                </div>
                <p className="text-[11px] text-slate-500 truncate leading-none mt-0.5">
                  {candidate?.job?.title ? `Role: ${candidate.job.title}` : "Archived / General Application"}
                  {candidate?.basicDetails?.email ? ` · ${candidate.basicDetails.email}` : ""}
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="primary" size="sm" onClick={handleReviewEvidence} className="!py-1 !px-2.5 !text-xs !h-8">
                Review Evidence
              </Button>

              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStageMenuOpen(!stageMenuOpen)}
                  disabled={stageChanging}
                  className="!py-1 !px-2.5 !text-xs !h-8"
                >
                  Hiring Actions <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
                {stageMenuOpen && (
                  <div className="absolute right-0 mt-1 w-44 rounded-xl border border-slate-200 bg-white shadow-xl z-30 py-1 text-xs">
                    <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Move Application
                    </div>
                    {STAGES.filter((s) => s !== candidateStatus).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleStageChange(st)}
                        className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-between"
                      >
                        <span>{stageLabel(st)}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{st}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleClose}
                aria-label="Close interview report modal"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors ml-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Row 2: Navigation tabs and sub-tabs combined compactly */}
          <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            {/* Main Tabs */}
            <nav aria-label="Candidate modal navigation" className="flex items-center gap-1">
              {MAIN_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-current={activeTab === tab.id ? "page" : undefined}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-7 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    activeTab === tab.id
                      ? "bg-emerald-100 text-emerald-800 font-bold"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Sub-tabs (when Interview active) */}
            {activeTab === "interview" && (
              <nav aria-label="Interview subsections" className="flex items-center gap-1 text-xs bg-slate-100/70 p-0.5 rounded-lg border border-slate-200/60">
                {INTERVIEW_SUB_TABS.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    aria-current={activeSubTab === sub.id ? "page" : undefined}
                    onClick={() => setActiveSubTab(sub.id)}
                    className={`py-1 px-2 rounded-md text-xs transition-colors ${
                      activeSubTab === sub.id
                        ? "font-bold text-brand-900 bg-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </nav>
            )}
          </div>
        </header>

        {/* Scrollable Modal Content */}
        <main className="modal-content">
          {loading && !candidate && (
            <div className="space-y-4 py-8">
              <Skeleton className="h-8 w-60" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {error && (
            <Card role="alert" className="border-red-200 bg-red-50 text-red-700 my-4 text-center">
              <p className="font-semibold">{error}</p>
              <Button variant="outline" size="sm" onClick={loadData} className="mt-2">
                Retry loading
              </Button>
            </Card>
          )}

          {/* INTERVIEW TAB CONTENT */}
          {activeTab === "interview" && (
            <div className="space-y-6">
              {activeSubTab === "evidence" && (
                <div data-testid="interview-evidence-view">
                  <InterviewReport />
                </div>
              )}

              {activeSubTab === "evaluation" && (() => {
                const repInterview = report?.interview || session;
                const repEv = repInterview?.evaluation || report?.evaluation;
                const repRec = RECOMMENDATION[repEv?.recommendation] || (repEv?.recommendation ? { label: repEv.recommendation.replaceAll("_", " "), tone: "emerald" } : null);
                const repCoverage = report?.coverage;
                return (
                  <div data-testid="interview-evaluation-view" className="space-y-4">
                    {repEv?.overallScore == null || repEv?.generatedBy === "fallback" || repInterview?.sessionQuality?.degraded ? (
                      <InterviewSummary interview={repInterview} />
                    ) : (
                      <InstrumentScores
                        id="modal-sec-scores"
                        only="interview"
                        report={report || { hasInterview: true }}
                        interview={repInterview}
                        ev={repEv}
                        coverage={repCoverage}
                        interviewReadable={true}
                      />
                    )}
                    <EvaluationCard interview={repInterview || {}} ev={repEv} rec={repRec} />
                    {repInterview?.recommendedAction && (
                      <RecommendedActionCard action={repInterview.recommendedAction} />
                    )}
                  </div>
                );
              })()}

              {activeSubTab === "communication" && (() => {
                const repInterview = report?.interview || session;
                const repEv = repInterview?.evaluation || report?.evaluation;
                const repInsights = repInterview?.insights || report?.insights || repEv?.insights;
                return (
                  <div data-testid="interview-communication-view" className="space-y-4">
                    <CommunicationCompetencyCard interview={repInterview} ev={repEv} />
                    <InsightPanel
                      id="modal-sec-communication"
                      title="Communication Skills"
                      axes={repInsights?.communication}
                      unavailable={
                        !repInsights?.communication?.length && !repInterview?.competencyTriplet?.communication && !repEv?.delivery && !repEv?.confidence && !repEv?.spokenCommunication
                          ? "Not assessed for this session — communication analysis requires scored candidate answers."
                          : null
                      }
                      note="Scored from the transcript only — never from pace, hesitation or accent. Grammar is counted only where the transcription was reliable enough to attribute to the candidate rather than to the transcriber."
                    />
                  </div>
                );
              })()}

              {activeSubTab === "criteria" && (
                <div data-testid="interview-criteria-view" className="space-y-4">
                  <Card>
                    <h3 className="text-base font-bold text-slate-900 mb-2">Criteria & Rubric Assessment</h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Evaluation of candidate responses against defined competencies and criteria for this role.
                    </p>
                    {report?.coverage?.rows?.length ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase">
                            <tr>
                              <th className="py-2.5 px-3">Criterion</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3">Score</th>
                              <th className="py-2.5 px-3">Evidence Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {report.coverage.rows.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-medium text-slate-900">{row.criterionName || row.name || `Criterion ${idx + 1}`}</td>
                                <td className="py-2.5 px-3">
                                  <Badge tone={row.passed ? "green" : "amber"}>
                                    {row.passed ? "Satisfied" : "Partial / Review"}
                                  </Badge>
                                </td>
                                <td className="py-2.5 px-3 font-semibold">{row.score != null ? `${row.score}%` : "—"}</td>
                                <td className="py-2.5 px-3 text-slate-600 max-w-md break-words">{row.notes || row.rationale || "Evaluated from candidate answers."}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic py-4">No separate criteria rows available for this attempt.</p>
                    )}
                  </Card>
                </div>
              )}

              {activeSubTab === "claims" && (
                <div data-testid="interview-claims-view" className="space-y-4">
                  <Card>
                    <h3 className="text-base font-bold text-slate-900 mb-2">Claims Verification & Probes</h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Observations on candidate experience claims and responses to targeted probe questions.
                    </p>
                    {report?.claimVerification?.items?.length ? (
                      <div className="space-y-3">
                        {report.claimVerification.items.map((item, i) => (
                          <div key={i} className="rounded-xl border border-slate-200 p-4">
                            <p className="font-semibold text-sm text-slate-900">{item.claim}</p>
                            <p className="mt-1 text-xs text-slate-600">{item.verification || item.evidenceQuote}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <Badge tone={item.verdict === "supported" ? "green" : "amber"}>{item.verdict || "Assessed"}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic py-4">No specific claims verification items recorded for this attempt.</p>
                    )}
                  </Card>
                </div>
              )}

              {activeSubTab === "monitoring" && (
                <div data-testid="interview-monitoring-view" className="space-y-4">
                  {(report?.proctoring || session?.proctoring) && (
                    <IntegrityCard proctoring={report?.proctoring || session?.proctoring} candidateId={candidateId} />
                  )}
                  <Card>
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldAlert className="h-5 w-5 text-slate-700" />
                      <h3 className="text-base font-bold text-slate-900">Integrity & Monitoring Observations</h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">
                      Environmental and automated check observations during the interview session.
                    </p>
                    {report?.proctoring ? (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                          <p className="text-xs font-semibold text-slate-700">Identity Match</p>
                          <p className="text-sm font-medium text-slate-900 mt-1">
                            {report.proctoring.identityMatch?.matched ? "Identity confirmed" : "Standard verification"}
                          </p>
                        </div>
                        {report.proctoring.signals?.map((sig, idx) => (
                          <div key={idx} className="rounded-xl border border-slate-200 p-3">
                            <p className="text-xs font-semibold text-slate-900">{sig.type || "Signal"}</p>
                            <p className="text-xs text-slate-600 mt-0.5">{sig.detail || sig.message}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic py-4">No integrity or monitoring flags recorded for this session.</p>
                    )}
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* OTHER TABS: OVERVIEW, PROFILE, ASSESSMENTS, ACTIVITY */}
          {activeTab !== "interview" && candidate && (
            <div data-testid="candidate-portal-view" className="space-y-4">
              <CandidatePortal
                candidate={candidate}
                timeline={timeline}
                session={session}
                assessment={assessment}
                report={report}
                initialView={
                  activeTab === "overview"
                    ? "ai-summary"
                    : activeTab === "profile"
                    ? "resume"
                    : activeTab === "assessments"
                    ? "cv-screening"
                    : "timeline"
                }
                onReviewRecorded={(review) => {
                  setReport((current) => ({
                    ...current,
                    interview: { ...current?.interview, recruiterReview: review },
                  }));
                }}
                onReload={loadData}
              />
            </div>
          )}
        </main>

        {/* Sticky Footer */}
        <footer className="modal-footer">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Close
          </Button>
          <Button variant="primary" size="sm" onClick={handleRecordReview}>
            Record Evidence Review
          </Button>
        </footer>
      </div>
    </div>
  );
}

export default CandidateInterviewModal;

