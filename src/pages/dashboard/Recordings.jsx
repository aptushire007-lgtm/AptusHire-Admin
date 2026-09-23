import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Video, AlertTriangle } from "lucide-react";
import api from "../../api/client.js";
import { Card, Badge, Avatar, Skeleton, EmptyState } from "../../components/ui/Card.jsx";
import { RecordRow, RecordList, Chip, ChipRow } from "../../components/ui/Panels.jsx";
import Button from "../../components/ui/Button.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Modal from "../../components/ui/Modal.jsx";
import InterviewPlayback from "../../components/report/InterviewPlayback.jsx";

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

// Both this index and the AI report use the same explicitly loaded, audited player.
export default function Recordings() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState(null);

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
      <PageHeader
        title="Recordings"
        description="Watch interview recordings or open a candidate’s AI report to review the transcript and findings."
        steps={[
          "A candidate completes an AI interview",
          "Its recording is captured and retained",
          "Open the report to review the transcript and findings",
        ]}
      />

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
      ) : !data?.recordings?.length ? (
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
                note={`Attempt ${r.attempt || 1}${formatDuration(r.durationMs) ? ` · ${formatDuration(r.durationMs)}` : ""}`}
                link={{ as: "button", type: "button", onClick: () => setSelected(r) }}
                meta={[
                  { label: "Role", value: r.jobTitle },
                  { label: "Updated", value: formatWhen(r.updatedAt) },
                ]}
                trailing={<div className="flex flex-wrap items-center gap-3">
                  <Badge tone={STATUS_TONE[r.status] || "slate"}>{r.source === "egress" && r.status === "recording" ? "Check playback" : STATUS_LABEL[r.status] || r.status}</Badge>
                </div>}
                actions={<Button variant="outline" size="sm" onClick={() => setSelected(r)} aria-label={`Open recording for ${r.candidateName}, attempt ${r.attempt || 1}`}>Open recording</Button>}
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
      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? `${selected.candidateName} — interview recording` : "Interview recording"}
        description={selected ? [selected.jobTitle, `Attempt ${selected.attempt || 1}`, formatWhen(selected.updatedAt)].filter(Boolean).join(" · ") : undefined}
        size="4xl" panelClassName="admin-workspace">
        {selected && <div className="space-y-4">
          <InterviewPlayback sessionId={selected.sessionId} recordingOnly />
          {selected.candidateId && <Link to={`/candidates/${selected.candidateId}/interview-report?attempt=${selected.attempt || 1}#sec-playback`} className="inline-flex text-sm font-semibold text-brand-700 underline">Open AI report for this attempt</Link>}
        </div>}
      </Modal>
    </div>
  );
}
