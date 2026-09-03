import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Users, AlertTriangle } from "lucide-react";
import api from "../api/client.js";
import { Card, Badge, Avatar, Skeleton, EmptyState } from "../components/ui/Card.jsx";
import { RecordRow, RecordList, Chip, ChipRow } from "../components/ui/Panels.jsx";
import StageMenu from "../components/ui/StageMenu.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { stageLabel, stageTone, normalizeStage } from "../lib/pipeline.js";

export default function CandidateList() {
  const { id } = useParams();
  const toast = useToast();
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState(null);
  const [stageFilter, setStageFilter] = useState("all");
  // Without this, a failed fetch left `candidates` at its initial [] and the page rendered
  // "No candidates yet" — indistinguishable from a job that genuinely has zero applicants, on
  // a screen a recruiter reads to decide whether a posting needs attention.
  const [loadError, setLoadError] = useState("");

  function load() {
    setLoading(true);
    // A stale or malformed link (e.g. a candidate whose job was deleted) can land here with
    // no real job id — fail fast with a plain message instead of round-tripping a request the
    // server can only ever 404/400 on.
    if (!id || id === "undefined") {
      setLoadError("This job could not be found — the link may be out of date.");
      setLoading(false);
      return;
    }
    Promise.all([api.get(`/jobs/${id}`), api.get(`/jobs/${id}/candidates`)])
      .then(([jobRes, candRes]) => {
        setLoadError("");
        setJob(jobRes.data);
        setCandidates(candRes.data);
      })
      .catch((err) => {
        setLoadError(err.response?.data?.error || "Could not load candidates for this job.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // A stage filter left over from a previous job would silently hide
    // everyone the moment the recruiter clicks into a different role's list.
    setStageFilter("all");
  }, [id]);

  const filtered =
    stageFilter === "all" ? candidates : candidates.filter((c) => normalizeStage(c.status) === stageFilter);

  async function handleStatusChange(candidateId, currentStatus, stage) {
    if (!stage || stage === currentStatus) return;
    setMovingId(candidateId);
    try {
      await api.patch(`/candidates/${candidateId}/stage`, { stage });
      toast.success(`Moved to ${stageLabel(stage)}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not move candidate");
    } finally {
      setMovingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-700">
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 [overflow-wrap:anywhere]">Candidates{job ? ` — ${job.title}` : ""}</h1>
        <p className="mt-1 text-sm text-slate-500">Filter down to who&rsquo;s ready for a shortlist on this role.</p>
      </div>

      {job && job.rubricStatus && job.rubricStatus !== "approved" && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
          <div>
            <p className="font-medium">This job has no approved scoring rubric.</p>
            <p className="mt-0.5">
              Every candidate below is being scored by the legacy keyword matcher, not the evidence-based rubric
              engine.{" "}
              <Link to={`/jobs/${job._id}/rubric`} className="font-medium underline hover:text-amber-900">
                Review and approve the rubric
              </Link>{" "}
              to switch this job to evidence-based scoring.
            </p>
          </div>
        </div>
      )}

      {/* Same shortcut as CandidatesAll — the states a recruiter actually
          narrows to on the way to a shortlist for this one role. */}
      {!loading && candidates.length > 0 && (
        <ChipRow label="Quick filter">
          <Chip active={stageFilter === "all"} onClick={() => setStageFilter("all")}>
            All candidates
          </Chip>
          <Chip active={stageFilter === "ats_passed"} onClick={() => setStageFilter("ats_passed")}>
            Passed ATS
          </Chip>
          <Chip active={stageFilter === "ai_interview_completed"} onClick={() => setStageFilter("ai_interview_completed")}>
            Interview done
          </Chip>
          <Chip active={stageFilter === "shortlisted"} onClick={() => setStageFilter("shortlisted")}>
            Shortlisted
          </Chip>
        </ChipRow>
      )}

      {loading ? (
        <Card padding="none" className="divide-y divide-slate-100 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-3">
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </Card>
      ) : loadError ? (
        <Card>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-slate-900">Could not load candidates</h3>
              <p className="text-sm text-slate-600">{loadError}</p>
              <button
                type="button"
                onClick={load}
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Try again
              </button>
            </div>
          </div>
        </Card>
      ) : candidates.length === 0 ? (
        <EmptyState icon={Users} title="No candidates yet" description="Applicants for this job will appear here." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No candidates in this stage"
          description="Try a different quick filter, or clear it to see everyone for this role."
        />
      ) : (
        <>
          <p className="text-xs text-slate-500">
            {filtered.length} of {candidates.length} candidate{candidates.length === 1 ? "" : "s"}
          </p>
          <RecordList label={`Candidates for ${job?.title || "this job"}`}>
            {filtered.map((c) => (
              <RecordRow
                key={c._id}
                avatar={<Avatar name={c.basicDetails?.name} size="sm" />}
                title={c.basicDetails?.name || "Unnamed applicant"}
                subtitle={c.basicDetails?.email}
                link={{ as: Link, to: `/candidates/${c._id}` }}
                meta={[{ label: "Applied", value: new Date(c.createdAt).toLocaleDateString() }]}
                trailing={
                  <>
                    {/* Own sub-column, right-aligned — see CandidatesAll. */}
                    <span className="flex justify-end xl:min-w-24">
                      {c.ats?.overallScore != null ? (
                        <Badge
                          tone={c.ats.decision === "pass" ? "green" : c.ats.decision === "fail" ? "red" : "slate"}
                          className="tabular-nums"
                        >
                          {c.ats.overallScore}%
                        </Badge>
                      ) : (
                        <Badge tone="slate">Not scored</Badge>
                      )}
                    </span>
                    <Badge tone={stageTone(c.status)}>{stageLabel(c.status)}</Badge>
                  </>
                }
                note={
                  // The old table showed this as a lone amber triangle with a
                  // `title` tooltip — invisible on touch, invisible to a screen
                  // reader, and exactly the kind of caveat the Honest Reading
                  // Rule says must not be decorative. Here it is a sentence.
                  c.ats?.overallScore != null && c.ats.engine !== "evidence" ? (
                    <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      Legacy keyword match — rubric not approved
                    </span>
                  ) : null
                }
                actions={
                  <StageMenu
                    status={c.status}
                    name={c.basicDetails?.name}
                    busy={movingId === c._id}
                    onMove={(stage) => handleStatusChange(c._id, c.status, stage)}
                  />
                }
              />
            ))}
          </RecordList>
        </>
      )}
    </div>
  );
}
