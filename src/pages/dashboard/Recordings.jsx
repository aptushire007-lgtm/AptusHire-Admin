import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Video, AlertTriangle } from "lucide-react";
import api from "../../api/client.js";
import { Card, Badge, Avatar, Skeleton, EmptyState } from "../../components/ui/Card.jsx";
import { RecordRow, RecordList, Chip, ChipRow } from "../../components/ui/Panels.jsx";
import Button from "../../components/ui/Button.jsx";

// "partial" is amber, not red: the footage was captured and is stored, only the assembly into one
// playable file did not finish. Colouring it as a failure would tell a recruiter the interview
// video is gone when it is recoverable — and would bury the one status on this page that someone
// can actually do something about.
const STATUS_TONE = { completed: "green", recording: "amber", partial: "amber", failed: "red", pending: "slate" };
const STATUS_LABEL = {
  completed: "Completed",
  recording: "Recording",
  partial: "Not assembled",
  failed: "Failed",
  pending: "Pending",
};

function formatDuration(ms) {
  if (!ms) return null;
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatWhen(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// Browse-all index into every candidate's recording (Phase 7, default-off feature). Deliberately
// does NOT play video itself — selecting a row hands off to InterviewReport.jsx's existing
// CandidateRecording player, so there is exactly one audit-logged playback surface in the app, not
// two competing ones.
export default function Recordings() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/interview-sessions/recordings", {
        params: { page, limit: 20, status: status === "all" ? undefined : status },
      });
      setLoadError("");
      setData(res.data);
    } catch (err) {
      setLoadError(err.response?.data?.error || "Could not load recordings.");
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  function selectStatus(next) {
    setPage(1);
    setStatus(next);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 [overflow-wrap:anywhere]">Recordings</h1>
        <p className="mt-1 text-sm text-slate-500">Every candidate with an interview recording — select one to watch it on their report.</p>
      </div>

      <ChipRow label="Quick filter">
        <Chip active={status === "all"} onClick={() => selectStatus("all")}>
          All
        </Chip>
        <Chip active={status === "completed"} onClick={() => selectStatus("completed")}>
          Completed
        </Chip>
        <Chip active={status === "recording"} onClick={() => selectStatus("recording")}>
          Recording
        </Chip>
        <Chip active={status === "partial"} onClick={() => selectStatus("partial")}>
          Not assembled
        </Chip>
        <Chip active={status === "failed"} onClick={() => selectStatus("failed")}>
          Failed
        </Chip>
      </ChipRow>

      {loading ? (
        <Card padding="none" className="divide-y divide-slate-100 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4">
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </Card>
      ) : loadError ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-800">{loadError}</p>
            <button type="button" onClick={load} className="text-sm font-semibold text-red-700 hover:text-red-900">
              Try again
            </button>
          </div>
        </div>
      ) : data?.recordings.length === 0 ? (
        <EmptyState icon={Video} title="No recordings yet" description="Recordings appear here once video interviews are enabled and completed." />
      ) : (
        <>
          <RecordList label="Candidate recordings">
            {data.recordings.map((r) => (
              <RecordRow
                key={r.sessionId}
                avatar={<Avatar name={r.candidateName} size="sm" />}
                title={r.candidateName}
                subtitle={r.candidateEmail}
                link={r.candidateId ? { as: Link, to: `/candidates/${r.candidateId}/interview-report` } : undefined}
                meta={[
                  { label: "Role", value: r.jobTitle },
                  { label: "Duration", value: formatDuration(r.durationMs) },
                  { label: "Updated", value: formatWhen(r.updatedAt) },
                ]}
                trailing={<Badge tone={STATUS_TONE[r.status] || "slate"}>{STATUS_LABEL[r.status] || r.status}</Badge>}
              />
            ))}
          </RecordList>

          {data.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Page {data.page} of {data.totalPages} ({data.total} total)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
