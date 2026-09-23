import { useState } from "react";
import { Link } from "react-router-dom";
import { Bot, ExternalLink, Cpu } from "lucide-react";
import api from "../../api/client.js";
import { StepStrip } from "../../components/ui/PageHeader.jsx";
import { useCompanyData } from "../../context/CompanyDataContext.jsx";
import { Card, Badge, Avatar, Skeleton, EmptyState } from "../../components/ui/Card.jsx";
import { RecordCard, RecordGrid } from "../../components/ui/Panels.jsx";
import Button from "../../components/ui/Button.jsx";
import { useToast } from "../../components/ui/Toast.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { useRef } from "react";

export default function AIInterviews() {
  const { queue, loading, loadError, refresh } = useCompanyData();
  const toast = useToast();
  const [busyId, setBusyId] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [removeError, setRemoveError] = useState("");
  const cancelRef = useRef(null);

  async function removeFromQueue(id) {
    setBusyId(id);
    setRemoveError("");
    try {
      await api.patch(`/interview-queue/${id}`, { status: "removed" });
      toast.success("Removed from interview queue");
      setRemoving(null);
      await refresh();
    } catch (err) {
      setRemoveError(err.response?.data?.error || "Could not confirm the queue update. Refresh the queue before trying again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-[-0.025em] text-slate-900 [overflow-wrap:anywhere]">Interviews</h1>
        <StepStrip
          steps={[
            "A shortlisted candidate is queued",
            "They complete the interview in their portal",
            "The scored report lands on their profile",
          ]}
        />
        <p className="mt-1 text-sm text-slate-600">Manage candidates waiting for an interview. Review previous attempts from the candidate’s interview evidence.</p>
        <nav aria-label="Interview views" className="mt-4 flex flex-wrap gap-2"><Link aria-current="page" to="/ai-interviews" className="rounded-lg bg-brand-800 px-3 py-2 text-sm font-medium text-white">Queue</Link><Link to="/recordings" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white">Recordings</Link></nav>
      </div>

      {loading ? (
        <RecordGrid>
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} padding="compact">
              <Skeleton className="h-28 w-full" />
            </Card>
          ))}
        </RecordGrid>
      ) : loadError ? (
        <Card><h2 className="font-semibold">Interview queue could not be loaded</h2><p role="alert" className="mt-2 text-sm text-red-700">{loadError}</p><Button className="mt-4" onClick={refresh}>Retry queue</Button></Card>
      ) : queue.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No one in the queue yet"
          description="There are no queued entries. Candidates reach this queue according to each job’s screening and assessment policy. Completed attempts remain in their candidate profiles."
        />
      ) : (
        <RecordGrid>
          {queue.map((entry) => (
            <RecordCard
              key={entry._id}
              avatar={<Avatar name={entry.candidate?.basicDetails?.name} />}
              title={entry.candidate?.basicDetails?.name || "Unnamed candidate"}
              subtitle={entry.job?.title || "No job on record"}
              link={entry.candidate?._id ? { as: Link, to: `/candidates/${entry.candidate._id}?returnTo=%2Fai-interviews` } : undefined}
              trailing={
                (entry.atsScore ?? entry.candidate?.ats?.overallScore) != null ? (
                  <Badge tone="brand">{entry.atsScore ?? entry.candidate?.ats?.overallScore}%</Badge>
                ) : (
                  <Badge tone="slate">Not scored</Badge>
                )
              }
              footer={`Queued ${new Date(entry.createdAt).toLocaleDateString()}`}
              actions={
                <>
                  {entry.candidate?._id ? <><Button as={Link} to={`/candidates/${entry.candidate._id}?returnTo=%2Fai-interviews`} variant="outline" size="sm">
                    View <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    as={Link}
                    to={`/candidates/${entry.candidate._id}?section=ai-interview&returnTo=%2Fai-interviews`}
                    variant="ghost"
                    size="sm"
                  >
                    <Cpu className="h-3.5 w-3.5" /> Interview evidence
                  </Button>
                  </> : <span className="text-xs text-slate-600">Candidate record unavailable</span>}
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={busyId === entry._id}
                    onClick={() => { setRemoveError(""); setRemoving(entry); }}
                  >
                    Remove
                  </Button>
                </>
              }
            />
          ))}
        </RecordGrid>
      )}
      <Modal open={Boolean(removing)} onClose={() => setRemoving(null)} title="Remove from interview queue?" description={`${removing?.candidate?.basicDetails?.name || "This candidate"} · ${removing?.job?.title || "Job unavailable"}`} role="alertdialog" initialFocusRef={cancelRef} busy={Boolean(busyId)}>
        <p className="text-sm text-slate-600">This removes the queue entry. It does not cancel an active interview or change the application stage.</p>
        {removeError && <p role="alert" className="mt-3 text-sm text-red-700">{removeError}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2"><Button ref={cancelRef} variant="secondary" disabled={Boolean(busyId)} onClick={() => setRemoving(null)}>Keep in queue</Button><Button variant="danger" loading={Boolean(busyId)} onClick={() => removeFromQueue(removing._id)}>Remove queue entry</Button></div>
      </Modal>
    </div>
  );
}
