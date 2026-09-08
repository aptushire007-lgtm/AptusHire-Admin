import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Link2, Globe, FileText, Mail, Phone, MapPin, Download, Clock, CheckCircle2, XCircle, Cpu, Trash2, Send, CalendarClock, Scale, AlertTriangle, RefreshCw } from "lucide-react";
import api from "../api/client.js";
import { getSocket } from "../lib/socket.js";
import { downloadFile } from "../lib/download.js";
import { Card, Badge, Skeleton } from "../components/ui/Card.jsx";
import { Select, Input, Textarea, Label, FormGroup } from "../components/ui/Field.jsx";
import Button from "../components/ui/Button.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { STAGES, stageLabel, stageTone, normalizeStage, isTerminal } from "../lib/pipeline.js";
import ScorecardPanel from "../components/dashboard/ScorecardPanel.jsx";
import { useCompanyData } from "../context/CompanyDataContext.jsx";
import CandidatePortal from "../components/candidate/CandidatePortal.jsx";

function Section({ title, children }) {
  return (
    <Card>
      <h3 className="mb-3 text-base font-semibold text-[#17221C]">{title}</h3>
      {children}
    </Card>
  );
}

// Where a profile field came from. A recruiter reading "8 years at Zerodha"
// should be able to tell at a glance whether the candidate typed that or whether
// a machine read it off their résumé and the candidate approved it — those are
// different kinds of evidence, and only one of them is independent of the
// document the engine already scored.
const PROVENANCE_LABELS = {
  autofill_accepted: {
    label: "From résumé",
    title: "Read from the résumé by the extraction engine and accepted by the candidate without changes. Not independent corroboration of the résumé — it is the résumé restated.",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  autofill_edited: {
    label: "From résumé · edited",
    title: "Read from the résumé, then changed by the candidate before submitting. Compare the entry against the quoted source below.",
    // Slate, not violet. This tag used to be violet back when the brand was
    // blue and violet was a free hue; now that the brand ramp *is* violet, a
    // violet chip here would read as a brand accent rather than as a
    // provenance warning about where a field came from.
    className: "border-[#E5EBE7] bg-[#F8FAF9] text-[#64736A]",
  },
};

function ProvenanceTag({ provenance }) {
  const meta = PROVENANCE_LABELS[provenance?.source];
  if (!meta) return null;
  return (
    <span
      title={meta.title}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}
    >
      <Cpu className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

// The cited span behind an autofilled field, quoted verbatim from the résumé.
function ProvenanceSource({ provenance }) {
  if (!provenance?.spans?.length) return null;
  return (
    <div className="mt-2 space-y-1">
      {provenance.spans.map((s, i) => (
        <blockquote key={i} className="border-l-2 border-[#E5EBE7]-mid pl-2 text-xs italic text-[#64736A]">
          “{s.quote}”
        </blockquote>
      ))}
    </div>
  );
}

function formatWhen(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatDay(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

// Short label for why an application left the active pipeline (Phase 17).
const PIPELINE_EXIT_LABELS = {
  hired_for_other_role: "Closed — hired for another role",
  job_filled: "Closed — role filled",
  job_closed: "Closed — role closed",
  job_deleted: "Closed — role deleted",
  application_removed: "Removed from this role",
};

// Other applications this same person has made to OTHER roles at this company
// (Phase 17 multi-role). One person, many applications — this makes that
// legible on the recruiter side without treating them as unrelated candidates.
// Company-scoped by the API, so it can never leak another company's applications.
function RelatedApplications({ candidateId }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setData(null);
    setFailed(false);
    api
      .get(`/candidates/${candidateId}/related`)
      .then((res) => alive && setData(res.data))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [candidateId]);

  if (failed || !data || data.count === 0) return null;

  return (
    <Card>
      <h3 className="mb-1 text-base font-semibold text-[#17221C]">
        Other applications from this candidate
      </h3>
      <p className="mb-3 text-xs text-[#64736A]">
        Same person, {data.count === 1 ? "one other role" : `${data.count} other roles`} at this company.
      </p>
      <ul className="divide-y divide-[#E5EBE7] overflow-hidden rounded-xl border border-[#E5EBE7]">
        {data.applications.map((a) => (
          <li key={a._id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3.5 py-2.5">
            <Link
              to={`/candidates/${a._id}`}
              className="min-w-0 flex-1 truncate text-sm font-medium text-[#17221C] hover:text-brand-700"
            >
              {a.job?.title || "Role no longer listed"}
              {a.job?.department ? <span className="text-[#64736A]"> · {a.job.department}</span> : null}
            </Link>
            <span className="flex shrink-0 items-center gap-2">
              {a.pipelineExit ? (
                <Badge tone="slate">
                  {PIPELINE_EXIT_LABELS[a.pipelineExit.reason] || "Closed"}
                </Badge>
              ) : (
                <Badge tone={stageTone(a.status)}>{stageLabel(a.status)}</Badge>
              )}
              <span className="text-xs tabular-nums text-[#9BAAA1]">{formatDay(a.appliedAt)}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// Format a Date as the `YYYY-MM-DDTHH:mm` string a datetime-local input expects,
// in the browser's local timezone (toISOString would shift it to UTC).
function toLocalInputValue(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const SESSION_STATUS_TONE = {
  scheduled: "brand",
  in_progress: "amber",
  completed: "green",
  expired: "red",
  cancelled: "slate",
};

// Compact horizontal stepper across the ordered pipeline. The terminal
// `rejected` stage is rendered as a standalone red marker.
/**
 * Where this candidate is in the pipeline.
 *
 * This used to render all fifteen stages as equal-weight pills, which wrapped
 * onto two or three lines and gave the eye nothing to land on: "AI Interview
 * Completed" in brand-600 was one pill among fifteen, and finding it meant
 * reading every label. The information was all there and none of it was legible.
 *
 * Now the answer comes first — the stage they are on, and how far through that
 * is — with a segmented track underneath for the shape of it. The full list is
 * still one click away, because "which stages does this pipeline even have" is a
 * real question, just not the one this block is usually asked.
 */
function StageProgress({ status }) {
  const [expanded, setExpanded] = useState(false);
  const current = normalizeStage(status);
  const rejected = current === "rejected";
  const currentIdx = STAGES.indexOf(current);
  const next = !rejected && currentIdx >= 0 ? STAGES[currentIdx + 1] : null;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-xs font-semibold tracking-[0.06em] text-[#64736A] uppercase">Hiring progress</p>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[11px] font-medium text-brand-700 hover:underline"
          aria-expanded={expanded}
        >
          {expanded ? "Hide all stages" : `All ${STAGES.length} stages`}
        </button>
      </div>

      {rejected ? (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-sm font-semibold text-red-700">
          <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> Rejected
        </p>
      ) : (
        <>
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-lg font-bold tracking-tight text-[#17221C]">{stageLabel(current)}</span>
            {currentIdx >= 0 && (
              <span className="text-xs text-[#64736A]">                stage {currentIdx + 1} of {STAGES.length}
                {next ? ` · next: ${stageLabel(next)}` : " · final stage"}
              </span>
            )}
          </p>

          {/* One segment per stage. Colour carries "reached", width carries
              nothing — every stage is the same width because they are not the
              same length in time and pretending otherwise would be a chart. */}
          <div
            className="mt-2.5 flex gap-1"
            role="img"
            aria-label={currentIdx >= 0 ? `Stage ${currentIdx + 1} of ${STAGES.length}: ${stageLabel(current)}` : stageLabel(current)}
          >
            {STAGES.map((st, i) => (
              <span
                key={st}
                title={stageLabel(st)}
                className={`h-1.5 flex-1 rounded-full ${
                  i < currentIdx ? "bg-brand-300" : i === currentIdx ? "bg-brand-600" : "bg-[#F8FAF9]-deep"
                }`}
              />
            ))}
          </div>
        </>
      )}

      {expanded && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[#E5EBE7] pt-3">
          {STAGES.map((st, i) => {
            const reached = !rejected && currentIdx >= i;
            const isCurrent = !rejected && currentIdx === i;
            return (
              <span
                key={st}
                className={
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium " +
                  (isCurrent
                    ? "bg-brand-600 text-white"
                    : reached
                      ? "bg-[#E8F2EC] text-brand-700"
                      : "bg-[#F8FAF9] text-[#9BAAA1]")
                }
              >
                {reached && !isCurrent && <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
                {stageLabel(st)}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CandidateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { me, refresh } = useCompanyData();
  const [candidate, setCandidate] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [session, setSession] = useState(null);
  const [report, setReport] = useState(null);
  // A failed initial load has to be VISIBLE. Before this, the 404 from
  // /candidates/:id escaped Promise.all as an unhandled rejection and the page sat
  // on its loading skeleton forever — a placeholder rendered as if the fetch were
  // still in flight, which is precisely the failure mode this product refuses to ship.
  const [loadError, setLoadError] = useState(null);
  const [selectedStage, setSelectedStage] = useState("");
  const [note, setNote] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [moving, setMoving] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [resending, setResending] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [newInterviewAt, setNewInterviewAt] = useState("");
  // The freshly-minted interview link, shown right after resend/reschedule so the
  // recruiter can copy it directly (it can't be re-fetched later — only its hash is stored).
  const [lastLink, setLastLink] = useState("");
  // Skills assessment (ASSESSMENT-ENGINE-PLAN): { session, decision, paper } or null.
  const [assessment, setAssessment] = useState(null);
  const [assessmentBusy, setAssessmentBusy] = useState(false);
  const [assessmentDifficulty, setAssessmentDifficulty] = useState("");

  async function handleSendAssessment() {
    setAssessmentBusy(true);
    try {
      await api.post(`/assessments/candidate/${id}/send`, {
        difficultyOverride: assessmentDifficulty || undefined,
      });
      toast.success("Assessment sent — invitation email on its way");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Send failed");
    } finally {
      setAssessmentBusy(false);
    }
  }

  async function handleSkipAssessment() {
    setAssessmentBusy(true);
    try {
      await api.post(`/assessments/candidate/${id}/skip`);
      toast.success("Skipped to AI interview — recorded as your decision");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Skip failed");
    } finally {
      setAssessmentBusy(false);
    }
  }

  const load = useCallback(async () => {
    try {
      const [cRes, tRes, sRes, aRes, rRes] = await Promise.all([
        api.get(`/candidates/${id}`),
        api.get(`/candidates/${id}/timeline`).catch(() => ({ data: null })),
        // 404 = candidate never reached the interview stage — no session yet.
        api.get(`/interview-sessions/candidate/${id}`).catch(() => ({ data: null })),
        // 404 also covers the assessment engine being disabled — section just hides.
        api.get(`/assessments/candidate/${id}`).catch(() => ({ data: null })),
        // Reuse the existing report payload for the Overall → Know More cards.
        api.get(`/candidates/${id}/interview-report`).catch(() => ({ data: null })),
      ]);
      setLoadError(null);
      setCandidate(cRes.data);
      setTimeline(tRes.data);
      setSession(sRes.data);
      setAssessment(aRes.data);
      setReport(rRes.data);
    } catch (err) {
      // Only /candidates/:id is left un-caught above, so anything arriving here means the
      // record itself could not be read. A 401 never reaches this branch — the axios
      // client refreshes the access token and replays, or forces a logout.
      const status = err.response?.status;
      setLoadError({
        status,
        message:
          status === 404
            ? "This candidate is not in your workspace — it may belong to another company account, or the record was erased."
            : err.response?.data?.error || "Could not load this candidate.",
      });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Live-refresh if this candidate's stage changes elsewhere.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function onStage(payload) {
      if (payload?.candidateId === id) load();
    }
    socket.on("candidate:stage", onStage);
    return () => socket.off("candidate:stage", onStage);
  }, [id, load]);

  async function handleMove() {
    if (!selectedStage) return;
    setMoving(true);
    try {
      await api.patch(`/candidates/${id}/stage`, {
        stage: selectedStage,
        note: note || undefined,
        offerMessage: selectedStage === "offer_sent" ? offerMessage || undefined : undefined,
      });
      toast.success(`Moved to ${stageLabel(selectedStage)}`);
      setSelectedStage("");
      setNote("");
      setOfferMessage("");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not move candidate");
    } finally {
      setMoving(false);
    }
  }

  // Re-send the interview invitation. Rotates the magic-link token and refreshes the
  // validity window, keeping the currently scheduled time — the candidate gets a fresh
  // working link by email + in-app notification. `force` overrides the backend's default
  // refusal to touch a link that's live mid-interview; only ever passed after the recruiter
  // confirms the "this ends their current session" prompt below.
  async function handleResend(force = false) {
    if (force && !confirm("The candidate is currently in this interview. Sending a new link now ends their current session immediately — the old link stops working. Continue?")) {
      return;
    }
    setResending(true);
    try {
      const { data } = await api.post(`/interview-sessions/candidate/${id}/resend`, { force });
      if (data?.interviewUrl) setLastLink(data.interviewUrl);
      toast.success(force ? "Current session ended — a new interview link was sent" : "Interview link re-sent to the candidate");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not resend the interview link");
    } finally {
      setResending(false);
    }
  }

  // Reschedule to a new date/time. `newInterviewAt` is a datetime-local value (local
  // time, no zone); new Date() interprets it as local and toISOString() normalizes to
  // UTC for the API.
  async function handleReschedule(force = false) {
    if (!newInterviewAt) return;
    if (force && !confirm("The candidate is currently in this interview. Rescheduling now ends their current session immediately — the old link stops working. Continue?")) {
      return;
    }
    setRescheduling(true);
    try {
      const { data } = await api.post(`/interview-sessions/candidate/${id}/reschedule`, {
        interviewAt: new Date(newInterviewAt).toISOString(),
        force,
      });
      if (data?.interviewUrl) setLastLink(data.interviewUrl);
      toast.success("Interview rescheduled and a new link was sent");
      setNewInterviewAt("");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not reschedule the interview");
    } finally {
      setRescheduling(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(lastLink);
      toast.success("Interview link copied to clipboard");
    } catch {
      toast.error("Could not copy — select the link and copy it manually");
    }
  }

  // DPDP right-to-erasure. Irreversible hard-delete of the candidate + all artifacts
  // (resume, identity photo, interview transcript, queue, usage). Double-confirmed.
  // Re-scores against whatever rubric is approved NOW — the natural follow-up once
  // a recruiter approves a rubric for a job whose candidates were screened while it
  // was still a draft (they don't get a fair evaluation retroactively otherwise).
  // The rerun endpoint acks with 202 and scores in the background, because a
  // rubric-based rescore is minutes of LLM work — longer than the server's
  // request timeout. So the POST returning is NOT the result: poll until the
  // score's timestamp actually moves, and say plainly if it's still running
  // rather than reporting a success the engine hasn't delivered yet.
  async function handleRescore() {
    setRescoring(true);
    try {
      const { data } = await api.post(`/candidates/${id}/ats/rerun`);
      const previous = data?.previousScoredAt ?? candidate?.ats?.scoredAt ?? null;
      toast.success("Rescoring started — evidence scoring takes a minute or two");

      const deadline = Date.now() + 6 * 60 * 1000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 5000));
        const { data: fresh } = await api.get(`/candidates/${id}`);
        if ((fresh?.ats?.scoredAt ?? null) !== previous) {
          setCandidate(fresh);
          await load();
          toast.success(
            fresh?.ats?.engine === "evidence"
              ? "Rescored against the approved rubric"
              : "Rescored — evidence engine unavailable, keyword score shown"
          );
          return;
        }
      }
      toast.error("Rescore is taking longer than expected — reload the page shortly to see the result");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not rescore candidate");
    } finally {
      setRescoring(false);
    }
  }

  async function handleErase() {
    if (!window.confirm("Permanently erase ALL data for this candidate (resume, interview, everything)? This cannot be undone.")) {
      return;
    }
    setErasing(true);
    try {
      await api.delete(`/data-rights/candidates/${id}`, {
        data: { reason: "data-principal erasure request" },
      });
      toast.success("Candidate data erased");
      navigate(jobCandidatesHref, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not erase candidate data");
      setErasing(false);
    }
  }

  async function handleRemoveFromJob() {
    const jobId = candidate?.job?._id || (typeof candidate?.job === "string" ? candidate.job : null);
    if (!jobId) {
      toast.error("This application is not linked to a job");
      return;
    }
    if (!window.confirm("Remove this application from this job's Hiring Pipeline? The candidate and other applications will remain.")) {
      return;
    }
    setRemoving(true);
    try {
      await api.delete(`/candidates/${id}/applications/${jobId}`);
      await refresh();
      toast.success("Application removed from this job");
      navigate(`/jobs/${jobId}/candidates`, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not remove this application");
      setRemoving(false);
    }
  }

  // Bearer-authenticated downloads — a plain <a href> to these endpoints has no
  // Authorization header and always 401s in the new tab.
  async function handleResumeDownload() {
    try {
      await downloadFile(`/candidates/${id}/resume`, candidate.resumeOriginalName || "resume");
    } catch {
      toast.error("Could not download the resume");
    }
  }

  async function handleExport() {
    const safeName = String(candidate.basicDetails?.name || "candidate").replace(/[^a-z0-9]+/gi, "_");
    try {
      await downloadFile(`/candidates/${id}/export`, `${safeName}_report.json`);
    } catch {
      toast.error("Could not export candidate data");
    }
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <Link
          to="/candidates"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64736A] hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to candidates
        </Link>
        <Card>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-[#17221C]">
                {loadError.status === 404 ? "Candidate not found" : "Could not load candidate"}
              </h3>
              <p className="text-sm text-[#64736A]">{loadError.message}</p>
              {/* The id and status are shown deliberately: this is the string a recruiter
                  has to quote to get the record traced, and hiding it turns a diagnosable
                  fault into "the page is broken". */}
              <p className="text-xs text-[#9BAAA1]">
                Reference {id}
                {loadError.status ? ` · HTTP ${loadError.status}` : ""}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Button variant="outline" onClick={load}>
              Try again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const { basicDetails, experience, education, skills, projects, certificates, ats, offer, autofill } = candidate;
  // Some candidates (legacy imports, or a job that was later deleted) carry no linked job at
  // all — `candidate.job` is null, not an unpopulated id. Every "back to the job" link below
  // falls back to the all-candidates list instead of building `/jobs/undefined/...`.
  const jobId = candidate.job?._id || (typeof candidate.job === "string" ? candidate.job : null);
  const jobCandidatesHref = jobId ? `/jobs/${jobId}/candidates` : "/candidates";
  // Skills are a flat string array, so their provenance rides in a parallel
  // array keyed by value (indices shift when a candidate removes one).
  const skillSources = new Map(
    (candidate.skillProvenance || []).map((s) => [String(s.value).trim().toLowerCase(), s.source])
  );
  const nextStages = timeline?.allowedNextStages || [];
  const terminal = isTerminal(candidate.status);

  // Mirrors the backend guard (interviewInvitationService): a completed interview is
  // final, full stop. An in-progress interview whose link has EXPIRED is a locked-out
  // candidate — resending is the ordinary recovery path (the interview resumes where
  // they left off). A live in-progress attempt on a still-valid link normally keeps its
  // token, but the recruiter can force a new one anyway (interviewLive) — the confirm
  // prompt in handleResend/handleReschedule is the only thing standing between them and
  // ending the candidate's current session.
  const interviewCompleted = session?.status === "completed" || session?.aiInterview?.status === "completed";
  const interviewExpired = session?.status === "expired" || (session?.expiresAt && new Date(session.expiresAt) < new Date());
  const interviewInProgress = session?.status === "in_progress" || session?.aiInterview?.status === "in_progress";
  const interviewLive = interviewInProgress && !interviewExpired;
  const interviewLocked = interviewCompleted;

  return (
    <div className="space-y-6">
      <Link
        to={jobCandidatesHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64736A] hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to candidates
      </Link>

      <CandidatePortal
        candidate={candidate}
        timeline={timeline}
        session={session}
        assessment={assessment}
        report={report}
        onResumeDownload={handleResumeDownload}
      />

      <RelatedApplications candidateId={id} />

      <details className="group rounded-2xl border border-[#DCE5DF] bg-[#F8FAF9]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-[#415048] marker:content-none hover:text-brand-700">
          Recruiter controls and source data
          <span className="text-xs font-medium text-[#7A8A80] group-open:hidden">Open</span>
          <span className="hidden text-xs font-medium text-[#7A8A80] group-open:inline">Close</span>
        </summary>
        <div className="space-y-6 border-t border-[#DCE5DF] p-4 sm:p-5">

      <Card>
        {/* THREE ZONES, NOT ONE WRAPPING ROW.
            Identity, then state, then actions. Previously all of it — score
            badge, stage badge, a full-sentence failure warning, "why this
            score", rescore, AI report, export and erase — sat in one
            `flex-wrap` row at identical weight, and on a normal laptop it
            wrapped into a block with no entry point: the destructive Erase
            button carried the same visual weight as Export, and a red failure
            message sat between two badges where it read as a third badge.

            Now: the name owns the top line, the state badges sit under it as
            metadata, the actions group right by weight, and anything that is
            actually WRONG gets its own full-width row below with the fix
            attached to it. */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-[#17221C] [overflow-wrap:anywhere]">{basicDetails.name}</h1>
            <p className="mt-1 text-sm text-[#64736A]">
              Applied for <span className="font-medium text-[#17221C]">{candidate.job?.title}</span>
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {ats?.overallScore != null && (
                <Badge tone={ats.decision === "pass" ? "green" : ats.decision === "fail" ? "red" : "slate"}>
                  {ats.engine === "evidence" ? "ATS" : "Legacy Match"} {ats.overallScore}%
                </Badge>
              )}
              <Badge tone={stageTone(candidate.status)}>{stageLabel(candidate.status)}</Badge>
              {(candidate.ats?.engine === "evidence" || candidate.ats?.decision === "review") && (
                <Link
                  to={`/candidates/${candidate._id}/score`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                >
                  <Scale className="h-3.5 w-3.5" aria-hidden="true" /> Why this score
                </Link>
              )}
            </div>
          </div>

          {/* Primary reads first, secondary supports it, destructive is pushed
              past a divider so it is never the button beside the one you meant.
              Erase is irreversible and is deliberately the quietest control on
              the card. */}
          <div className="flex flex-wrap items-center gap-2">
            {ats?.overallScore != null && (
              <button
                type="button"
                onClick={handleRescore}
                disabled={rescoring}
                title="Re-run scoring now — picks up the job's currently approved rubric (also works after fixing a rubric on an evidence-scored candidate)"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5EBE7] px-3 py-1.5 text-sm font-medium text-[#64736A] hover:bg-[#DDECE3] disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${rescoring ? "animate-spin" : ""}`} aria-hidden="true" />
                {rescoring ? "Rescoring…" : "Rescore"}
              </button>
            )}
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5EBE7] px-3 py-1.5 text-sm font-medium text-[#64736A] hover:bg-[#DDECE3]"
            >
              <Download className="h-4 w-4" aria-hidden="true" /> Export
            </button>
            <button
              type="button"
              onClick={handleRemoveFromJob}
              disabled={removing || erasing}
              title="Remove only this application from this job's Hiring Pipeline"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5EBE7] px-3 py-1.5 text-sm font-medium text-[#64736A] hover:bg-[#DDECE3] disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" aria-hidden="true" /> {removing ? "Removing…" : "Remove from job"}
            </button>
            <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-[#F8FAF9]-deep" />
            <button
              type="button"
              onClick={handleErase}
              disabled={erasing}
              title="Erase all data for this candidate (DPDP right to erasure)"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#64736A] hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" /> {erasing ? "Erasing…" : "Erase"}
            </button>
          </div>
        </div>

        {/* THE SCORING WARNINGS, ON THEIR OWN ROW, WITH THE FIX ATTACHED.
            Two very different reasons produce a legacy score, and collapsing
            them into one "approve a rubric" prompt actively misdirects: it told
            recruiters to approve a rubric that was already approved, while the
            real fault (the evidence engine erroring out) stayed invisible.
              engine "legacy"          — no approved rubric; approving one is the fix.
              engine "fallback-legacy" — rubric IS approved and the engine failed;
                                         Rescore is the fix, not the rubric editor. */}
        {ats?.overallScore != null && ats.engine === "fallback-legacy" && (
          <div className="mt-4 flex flex-wrap items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-800">Evidence scoring failed — the score above is a keyword match</p>
              <p className="mt-0.5 text-xs leading-relaxed text-red-700">
                This job has an approved rubric, but the evidence engine errored on this candidate, so the percentage
                shown came from the legacy keyword matcher and is not rubric-based. Rescore to retry; if it keeps
                failing, the backend logs and notifications will say why.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRescore}
              disabled={rescoring}
              className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              {rescoring ? "Rescoring…" : "Rescore now"}
            </button>
          </div>
        )}

        {ats?.overallScore != null && ats.engine !== "evidence" && ats.engine !== "fallback-legacy" && jobId && (
          <div className="mt-4 flex flex-wrap items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">Scored by keyword match, not by rubric</p>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
                This job has no approved scoring rubric, so this candidate went through the legacy keyword matcher
                instead of the evidence-based engine.
              </p>
            </div>
            <Link
              to={`/jobs/${jobId}/rubric`}
              className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
            >
              Approve a rubric
            </Link>
          </div>
        )}

        <div className="mt-5 border-t border-[#E5EBE7] pt-5">
          <StageProgress status={candidate.status} />
        </div>

        <div className="mt-5 grid gap-3 border-t border-[#E5EBE7] pt-5 sm:grid-cols-2">
          {/* `min-w-0` on each cell, `shrink-0` on each icon, `overflow-wrap:
              anywhere` on each value: an address and an uploaded filename are
              unbreakable tokens, and as a grid item's min-content they sized the
              track to themselves and pushed the card off a phone screen. */}
          <div className="flex min-w-0 items-center gap-2 text-sm text-[#64736A]">
            <Mail className="h-4 w-4 shrink-0 text-[#64736A]" />{" "}
            <span className="[overflow-wrap:anywhere]">{basicDetails.email}</span>
          </div>
          <div className="flex min-w-0 items-center gap-2 text-sm text-[#64736A]">
            <Phone className="h-4 w-4 shrink-0 text-[#64736A]" />{" "}
            <span className="[overflow-wrap:anywhere]">{basicDetails.phone || "—"}</span>
          </div>
          <div className="flex min-w-0 items-center gap-2 text-sm text-[#64736A]">
            <MapPin className="h-4 w-4 shrink-0 text-[#64736A]" />{" "}
            <span className="[overflow-wrap:anywhere]">{basicDetails.location || "—"}</span>
          </div>
          <div className="flex min-w-0 items-center gap-2 text-sm text-[#64736A]">
            <FileText className="h-4 w-4 shrink-0 text-[#64736A]" />
            <button
              type="button"
              onClick={handleResumeDownload}
              className="min-w-0 text-left font-medium text-brand-700 [overflow-wrap:anywhere] hover:underline"
            >
              {candidate.resumeOriginalName || "Download resume"}
            </button>
          </div>
          {basicDetails.linkedinUrl && (
            <div className="flex min-w-0 items-center gap-2 text-sm text-[#64736A]">
              <Link2 className="h-4 w-4 shrink-0 text-[#64736A]" />
              <a href={basicDetails.linkedinUrl} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">
                LinkedIn
              </a>
            </div>
          )}
          {basicDetails.portfolioUrl && (
            <div className="flex min-w-0 items-center gap-2 text-sm text-[#64736A]">
              <Globe className="h-4 w-4 shrink-0 text-[#64736A]" />
              <a href={basicDetails.portfolioUrl} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">
                Portfolio
              </a>
            </div>
          )}
        </div>
      </Card>

      {/* Stage control */}
      <Section title="Move candidate">
        {terminal ? (
          <p className="text-sm text-[#64736A]">
            This candidate is at a final stage (<span className="font-medium">{stageLabel(candidate.status)}</span>). No further
            transitions are available.
          </p>
        ) : nextStages.length === 0 ? (
          <p className="text-sm text-[#64736A]">No stage transitions available.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormGroup>
              <Label>Next stage</Label>
              <Select value={selectedStage} onChange={(e) => setSelectedStage(e.target.value)}>
                <option value="">Select a stage…</option>
                {nextStages.map((s) => (
                  <option key={s.stage} value={s.stage}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </FormGroup>
            <FormGroup>
              <Label>Note (optional)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Internal note / reason" />
            </FormGroup>
            {selectedStage === "offer_sent" && (
              <FormGroup className="sm:col-span-2">
                <Label>Offer message</Label>
                <Textarea
                  rows={3}
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  placeholder="Details included in the offer email to the candidate."
                />
              </FormGroup>
            )}
            <div className="sm:col-span-2">
              <Button onClick={handleMove} loading={moving} disabled={!selectedStage}>
                Move to {selectedStage ? stageLabel(selectedStage) : "stage"}
              </Button>
            </div>
          </div>
        )}
      </Section>

      {/* Skills assessment — the recruiter gate + result (ASSESSMENT-ENGINE-PLAN) */}
      {(assessment?.session || assessment?.decision || normalizeStage(candidate.status) === "ats_passed") && (
        <Section title="Skills Assessment">
          {/* Gate: ATS-passed, no decision yet → Send / Skip inline */}
          {!assessment?.session && !assessment?.decision && normalizeStage(candidate.status) === "ats_passed" && (
            <div className="flex flex-wrap items-end gap-3">
              {/* Paper not approved yet: Send is disabled with the reason, Skip
                  always works — the candidate parks here until YOU decide. */}
              {!assessment?.paperReady && (
                <p className="w-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  {jobId ? (
                    <>
                      No approved assessment paper for this job yet — the candidate waits for your decision either
                      way.{" "}
                      <Link to={`/jobs/${jobId}/assessment`} className="font-semibold underline">
                        Generate &amp; approve a paper
                      </Link>{" "}
                      to enable Send, or skip straight to the AI interview.
                    </>
                  ) : (
                    "This candidate has no linked job, so no assessment paper can be generated — skip straight to the AI interview."
                  )}
                </p>
              )}
              <div>
                <Label>Difficulty</Label>
                <Select value={assessmentDifficulty} onChange={(e) => setAssessmentDifficulty(e.target.value)} className="min-w-[16rem]">
                  <option value="">Auto (derived from résumé claims)</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </Select>
              </div>
              <Button onClick={handleSendAssessment} loading={assessmentBusy} disabled={!assessment?.paperReady}>
                <Send className="h-4 w-4" /> Send assessment
              </Button>
              <Button variant="secondary" onClick={handleSkipAssessment} disabled={assessmentBusy}>
                Skip to AI interview
              </Button>
              <p className="w-full text-xs text-[#64736A]">
                Both choices are recorded as your decision. A skip goes through today's normal interview invitation — it never reads
                as missing data and costs nothing.
              </p>
            </div>
          )}

          {/* Honest skip rendering — a decision, never a gap */}
          {assessment?.decision?.action === "skipped" && (
            <div className="rounded-xl bg-[#E8F2EC] p-3 text-sm text-[#64736A]">
              Assessment: <strong>skipped by recruiter decision</strong> — {assessment.decision.byName},{" "}
              {new Date(assessment.decision.at).toLocaleString()}. Not required for this candidate; this is not missing data and
              carries no penalty.
            </div>
          )}

          {assessment?.session && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-[#E8F2EC] p-3">
                  <p className="text-xs text-[#64736A]">Status</p>
                  <p className="mt-1 text-sm font-semibold text-[#17221C]">{assessment.session.status}</p>
                </div>
                <div className="rounded-xl bg-[#E8F2EC] p-3">
                  <p className="text-xs text-[#64736A]">Assigned by</p>
                  <p className="mt-1 text-sm font-semibold text-[#17221C]">
                    {assessment.session.assignment?.assignedByName} ({assessment.session.assignment?.mode})
                  </p>
                </div>
                <div className="rounded-xl bg-[#E8F2EC] p-3">
                  <p className="text-xs text-[#64736A]">Difficulty tier</p>
                  <p className="mt-1 text-sm font-semibold text-[#17221C]">{assessment.session.difficultyTier?.value || "—"}</p>
                  <p className="text-xs text-[#64736A]">{assessment.session.difficultyTier?.basis}</p>
                </div>
              </div>
              {assessment.session.result?.scoredAt && (
                <div className="rounded-xl border border-[#E5EBE7] p-3">
                  <p className="text-sm font-semibold text-[#17221C]">
                    Result: {assessment.session.result.totalCorrect}/{assessment.session.result.totalItems} correct
                    {assessment.session.result.completedBy === "expiry" && (
                      <Badge tone="amber">partial — closed by expiry</Badge>
                    )}
                    {assessment.session.result.completedBy === "integrity_violation" && (
                      <Badge tone="amber">auto-submitted — integrity flags</Badge>
                    )}
                  </p>
                  <div className="mt-2 space-y-1 text-xs text-[#64736A]">
                    {(assessment.session.result.perCriterion || []).map((c) => (
                      <p key={c.criterionId}>
                        {c.criterionId}: {c.correctCount}/{c.itemCount}
                      </p>
                    ))}
                  </div>
                  {(assessment.session.result.claimVerdicts || []).length > 0 && (
                    <div className="mt-2 border-t border-[#E5EBE7] pt-2 text-xs text-[#64736A]">
                      <p className="font-semibold text-[#64736A]">Résumé-claim verdicts (targeted items):</p>
                      {assessment.session.result.claimVerdicts.map((v) => (
                        <p key={v.claimId}>
                          {v.claimId}: <strong>{v.verdict}</strong> — {v.correctCount}/{v.itemCount} targeted items correct
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-[11px] text-[#64736A]">
                    Scored deterministically (key-match, scorer {assessment.session.result.scorerVersion}); reproducibility{" "}
                    {String(assessment.session.result.reproducibilityHash || "").slice(0, 12)}
                  </p>
                </div>
              )}
            </div>
          )}
        </Section>
      )}

      {/* AI interview link — resend / reschedule */}
      {session && (
        <Section title="AI Interview">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-[#E8F2EC] p-3">
              <p className="text-xs text-[#64736A]">Scheduled for</p>
              <p className="mt-1 text-sm font-semibold text-[#17221C]">{formatWhen(session.interviewAt)}</p>
            </div>
            <div className="rounded-xl bg-[#E8F2EC] p-3">
              <p className="text-xs text-[#64736A]">Link valid until</p>
              <p className="mt-1 text-sm font-semibold text-[#17221C]">{formatWhen(session.expiresAt)}</p>
            </div>
            <div className="rounded-xl bg-[#E8F2EC] p-3">
              <p className="text-xs text-[#64736A]">Status</p>
              <p className="mt-1">
                <Badge tone={SESSION_STATUS_TONE[session.status] || "slate"}>
                  {session.status?.replace("_", " ") || "—"}
                </Badge>
              </p>
            </div>
          </div>

          {interviewLocked ? (
            <p className="mt-4 text-sm text-[#64736A]">
              The candidate has already completed this interview, so the link can no longer be resent or rescheduled.
            </p>
          ) : (
            <>
              {interviewLive && (
                <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  The candidate is taking this interview right now on a valid link. Resending or rescheduling will end
                  their current session immediately and the old link will stop working — you'll be asked to confirm.
                </p>
              )}
              {interviewExpired && (
                <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-amber-600">
                  <Clock className="h-4 w-4" />
                  {interviewInProgress
                    ? "The link expired while the interview was underway — resend to let the candidate continue where they left off."
                    : "This link has expired. Resend it or pick a new time to give the candidate a fresh link."}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={() => handleResend(interviewLive)} loading={resending}>
                  <Send className="h-4 w-4" /> {interviewLive ? "Force resend link" : "Resend link"}
                </Button>
              </div>

              <div className="mt-5 grid items-end gap-3 border-t border-[#E5EBE7] pt-5 sm:grid-cols-[1fr_auto]">
                <FormGroup className="mb-0">
                  <Label>Reschedule to</Label>
                  <Input
                    type="datetime-local"
                    value={newInterviewAt}
                    min={toLocalInputValue(new Date())}
                    onChange={(e) => setNewInterviewAt(e.target.value)}
                  />
                </FormGroup>
                <Button onClick={() => handleReschedule(interviewLive)} loading={rescheduling} disabled={!newInterviewAt}>
                  <CalendarClock className="h-4 w-4" /> Reschedule & send
                </Button>
              </div>
              <p className="mt-2 text-xs text-[#64736A]">
                Rescheduling and resending both generate a brand-new interview link — any previously shared link will stop working.
              </p>

              {lastLink && (
                <div className="mt-4 rounded-xl border border-[#E8F2EC] bg-[#E8F2EC] p-3">
                  <p className="mb-1.5 text-xs font-medium text-brand-700">
                    New interview link (also emailed to the candidate — copy it to open on another device):
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={lastLink}
                      onFocus={(e) => e.target.select()}
                      className="min-w-0 flex-1 truncate rounded-lg border border-[#E5EBE7] bg-white px-2.5 py-1.5 text-xs text-[#17221C]"
                    />
                    <Button variant="outline" size="sm" onClick={handleCopyLink}>
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Section>
      )}

      {/* Human interview rounds. `me.scorecardEngineEnabled` (from /auth/me) mirrors the
          SCORECARD_ENGINE_ENABLED flag server-side — when it's off, ScorecardPanel never
          fires a request at all instead of probing the unmounted route and eating a 404
          on every candidate page. */}
      <ScorecardPanel candidateId={id} enabled={!!me?.scorecardEngineEnabled} />

      {/* Timeline */}
      <Section title="Application Timeline">
        {!timeline?.stageHistory || timeline.stageHistory.length === 0 ? (
          <p className="text-sm text-[#64736A]">No timeline entries yet.</p>
        ) : (
          <ol className="relative space-y-4 border-l border-[#E5EBE7] pl-5">
            {[...timeline.stageHistory].reverse().map((h, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[27px] flex h-4 w-4 items-center justify-center rounded-full bg-[#E8F2EC]">
                  <CheckCircle2 className="h-3 w-3 text-brand-600" />
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[#17221C]">{stageLabel(h.stage)}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-[#64736A]">
                    <Clock className="h-3 w-3" /> {formatWhen(h.at)}
                  </span>
                </div>
                <p className="text-xs text-[#64736A]">                  by {h.by || "system"}
                  {h.note ? ` · ${h.note}` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
        {offer?.status && offer.status !== "none" && (
          <div className="mt-4 rounded-xl bg-[#E8F2EC] p-3 text-sm">
            <span className="font-medium text-[#17221C]">Offer:</span>{" "}
            <Badge tone={offer.status === "accepted" ? "green" : offer.status === "declined" ? "red" : "amber"}>{offer.status}</Badge>
            {offer.sentAt && <span className="ml-2 text-xs text-[#64736A]">sent {formatWhen(offer.sentAt)}</span>}
          </div>
        )}
      </Section>

      {ats && ats.overallScore != null && (
        <Section title="ATS Breakdown">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Skills Match", ats.skillsMatch],
              ["Experience Match", ats.experienceMatch],
              ["Education Match", ats.educationMatch],
              ["Projects Match", ats.projectsMatch],
              ["Certification Match", ats.certificationMatch],
              ["Keyword Match", ats.keywordMatch],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-[#E8F2EC] p-3">
                <p className="text-xs text-[#64736A]">{label}</p>
                <p className="mt-1 text-lg font-bold text-[#17221C]">{value}%</p>
              </div>
            ))}
          </div>
          {ats.missingSkills?.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-[#64736A]">Missing Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {ats.missingSkills.map((s) => (
                  <Badge key={s} tone="red">{s}</Badge>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {candidate.hostility?.signals?.length > 0 && (
        <Section title="Document Integrity Signals">
          <p className="mb-4 text-sm text-[#64736A]">
            Automated checks found the following in this résumé. These are observations for your judgement —{" "}
            <span className="font-medium text-[#17221C]">they never change a score and never auto-reject</span>.
          </p>
          <div className="space-y-3">
            {candidate.hostility.signals.map((sig, i) => {
              const tone =
                sig.severity === "critical"
                  ? "border-red-200 bg-red-50"
                  : sig.severity === "warning"
                  ? "border-amber-200 bg-amber-50"
                  : "border-[#E5EBE7] bg-[#E8F2EC]";
              const badgeTone = sig.severity === "critical" ? "red" : sig.severity === "warning" ? "amber" : "slate";
              return (
                <div key={i} className={`rounded-xl border p-4 ${tone}`}>
                  <div className="flex items-center gap-2">
                    <Badge tone={badgeTone}>{sig.severity === "advisory" ? "context" : sig.severity}</Badge>
                    <span className="text-xs font-mono text-[#64736A]">{sig.code}</span>
                  </div>
                  <p className="mt-2 text-sm text-[#17221C]">{sig.message}</p>
                  {sig.spans?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {sig.spans.map((span, j) => (
                        <blockquote
                          key={j}
                          className="rounded-lg border border-[#E5EBE7] bg-white px-3 py-2 font-mono text-xs text-[#64736A]"
                        >
                          “{span.quote}”
                          {span.page != null && <span className="ml-2 text-[#64736A]">(page {span.page})</span>}
                        </blockquote>
                      ))}
                    </div>
                  )}
                  {sig.meta?.samples?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {sig.meta.samples.map((s, j) => (
                        <blockquote key={j} className="rounded-lg border border-[#E5EBE7] bg-white px-3 py-2 font-mono text-xs text-[#64736A]">
                          “{s}”
                        </blockquote>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {autofill?.used && (
        <Section title="How this application was filled in">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="flex items-start gap-2">
              <Cpu className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                This candidate used résumé autofill. {autofill.accepted} suggestion
                {autofill.accepted === 1 ? " was" : "s were"} accepted as-is, {autofill.edited} edited, and{" "}
                {autofill.discarded} discarded, out of {autofill.suggested} offered. They attested that the details are
                accurate on {formatWhen(autofill.attestedAt)}.
              </span>
            </p>
            <p className="mt-3 border-t border-amber-200 pt-3 text-xs">
              Fields tagged <strong>From résumé</strong> below were read out of the attached document, so they are{" "}
              <strong>not independent corroboration of it</strong> — treat them as the résumé restated, not a second
              source. Fields tagged <strong>edited</strong> differ from what the document says; the quoted source is
              shown so you can compare.
            </p>
            {typeof autofill.scoreDelta === "number" && (
              <p className="mt-3 border-t border-amber-200 pt-3 text-xs">
                Screening score attributable to accepted suggestions:{" "}
                <strong>
                  {autofill.scoreDelta > 0 ? "+" : ""}
                  {autofill.scoreDelta} point{Math.abs(autofill.scoreDelta) === 1 ? "" : "s"}
                </strong>
                . Recorded for transparency, not subtracted — the candidate attested to these fields.
              </p>
            )}
          </div>
        </Section>
      )}

      <Section title="Experience">
        {experience.length === 0 && <p className="text-sm text-[#64736A]">—</p>}
        <div className="space-y-3">
          {experience.map((exp, i) => (
            <div className="rounded-xl border border-[#E5EBE7] bg-[#E8F2EC] p-4" key={i}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-[#17221C]">
                  {exp.role} @ {exp.company}
                </p>
                <ProvenanceTag provenance={exp.provenance} />
              </div>
              <p className="text-xs text-[#64736A]">                {exp.startDate} — {exp.currentlyWorking ? "Present" : exp.endDate}
              </p>
              {exp.description && <p className="mt-2 text-sm text-[#64736A]">{exp.description}</p>}
              <ProvenanceSource provenance={exp.provenance} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Education">
        {education.length === 0 && <p className="text-sm text-[#64736A]">—</p>}
        <div className="space-y-3">
          {education.map((edu, i) => (
            <div className="rounded-xl border border-[#E5EBE7] bg-[#E8F2EC] p-4" key={i}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-[#17221C]">
                  {edu.degree}
                  {edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ""} — {edu.institution}
                </p>
                <ProvenanceTag provenance={edu.provenance} />
              </div>
              <p className="text-xs text-[#64736A]">                {edu.startYear} — {edu.endYear} {edu.grade && `· Grade: ${edu.grade}`}
              </p>
              <ProvenanceSource provenance={edu.provenance} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Skills">
        {skills.length === 0 ? (
          <p className="text-sm text-[#64736A]">—</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s, i) => {
              const fromResume = skillSources.get(String(s).trim().toLowerCase()) === "autofill_accepted";
              return (
                <Badge key={i} tone={fromResume ? "amber" : "slate"}>
                  {fromResume && <Cpu className="mr-1 inline h-3 w-3" />}
                  {s}
                </Badge>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Projects">
        {projects.length === 0 && <p className="text-sm text-[#64736A]">—</p>}
        <div className="space-y-3">
          {projects.map((proj, i) => (
            <div className="rounded-xl border border-[#E5EBE7] bg-[#E8F2EC] p-4" key={i}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-[#17221C]">{proj.title}</p>
                <ProvenanceTag provenance={proj.provenance} />
              </div>
              {proj.techStack && <p className="text-xs text-[#64736A]">Tech: {proj.techStack}</p>}
              {proj.description && <p className="mt-2 text-sm text-[#64736A]">{proj.description}</p>}
              {proj.link && (
                <a href={proj.link} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-medium text-brand-700 hover:underline">
                  {proj.link}
                </a>
              )}
              <ProvenanceSource provenance={proj.provenance} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Certificates">
        {certificates.length === 0 && <p className="text-sm text-[#64736A]">—</p>}
        <div className="space-y-3">
          {certificates.map((cert, i) => (
            <div className="rounded-xl border border-[#E5EBE7] bg-[#E8F2EC] p-4" key={i}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-[#17221C]">{cert.name}</p>
                <ProvenanceTag provenance={cert.provenance} />
              </div>
              <p className="text-xs text-[#64736A]">                {cert.issuer} {cert.issueDate && `· ${cert.issueDate}`}
              </p>
              {cert.credentialUrl && (
                <a href={cert.credentialUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-medium text-brand-700 hover:underline">
                  {cert.credentialUrl}
                </a>
              )}
              <ProvenanceSource provenance={cert.provenance} />
            </div>
          ))}
        </div>
      </Section>
        </div>
      </details>
    </div>
  );
}
