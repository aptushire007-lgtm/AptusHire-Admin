import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client.js";
import { Card, Badge } from "../ui/Card.jsx";
import { stageLabel, stageTone } from "../../lib/pipeline.js";

const PIPELINE_EXIT_LABELS = {
  hired_for_other_role: "Hired elsewhere",
  job_filled: "Role filled",
  job_closed: "Role closed",
  job_deleted: "Role deleted",
};

function formatDay(date) {
  if (!date) return "";
  const d = new Date(date);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString() : "";
}

// Company-scoped by the API, so it can never leak another company's applications.
export default function RelatedApplications({ candidateId }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setData(null);
    setFailed(false);
    if (!candidateId) return;
    api
      .get(`/candidates/${candidateId}/related`)
      .then((res) => alive && setData(res.data))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [candidateId, attempt]);

  if (failed) return (
    <section role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <h3 className="font-semibold">Related applications could not be loaded</h3>
      <p className="mt-1">This does not mean the candidate has no other applications.</p>
      <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-3 rounded border border-amber-400 px-3 py-1.5 text-xs font-semibold hover:bg-amber-100">
        Retry related applications
      </button>
    </section>
  );
  if (!data) return <p role="status" className="py-2 text-xs text-[#5B6B63]">Checking related applications…</p>;
  if (!Array.isArray(data.applications) || data.applications.length === 0 || data.count === 0) return null;

  return (
    <Card>
      <h3 className="mb-1 text-sm font-semibold text-[#0C1F1B]">
        {data.identityBasis === "account" ? "Other applications from this candidate" : "Potential related applications"}
      </h3>
      <p className="mb-3 text-xs text-[#5B6B63]">
        {data.identityBasis === "account"
          ? `Same account, ${data.count === 1 ? "one other role" : `${data.count} other roles`} at this company.`
          : "These applications share an email address. Confirm identity before treating them as the same person; no records have been merged."}
      </p>
      <ul className="divide-y divide-[#E3EBE4] overflow-hidden rounded-xl border border-[#E3EBE4]">
        {data.applications.map((a) => (
          <li key={a._id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3.5 py-2.5">
            <Link
              to={`/candidates/${a._id}`}
              className="min-w-0 flex-1 truncate text-xs font-medium text-[#0C1F1B] hover:text-brand-700"
            >
              {a.job?.title || "Role no longer listed"}
              {a.job?.department ? <span className="text-[#5B6B63]"> · {a.job.department}</span> : null}
            </Link>
            <span className="flex shrink-0 items-center gap-2">
              {a.pipelineExit ? (
                <Badge tone="slate">
                  {PIPELINE_EXIT_LABELS[a.pipelineExit.reason] || "Closed"}
                </Badge>
              ) : (
                <Badge tone={stageTone(a.status)}>{stageLabel(a.status)}</Badge>
              )}
              <span className="text-xs tabular-nums text-[#5B6B63]">{formatDay(a.appliedAt)}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
