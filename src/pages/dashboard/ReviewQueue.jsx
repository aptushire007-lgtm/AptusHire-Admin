import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Inbox, CheckCircle2, XCircle, Scale, AlertTriangle } from "lucide-react";
import api from "../../api/client.js";
import { getSocket } from "../../lib/socket.js";
import { Card, Badge, Skeleton, EmptyState } from "../../components/ui/Card.jsx";
import { Textarea } from "../../components/ui/Field.jsx";
import Button from "../../components/ui/Button.jsx";
import { useToast } from "../../components/ui/Toast.jsx";

// Human review queue (BUILD-PLAN Phase 7.6): everything the pipeline is NOT
// confident about — review-band scores, low model agreement, ambiguous
// knock-out gates — each with its reason and evidence, resolved in one click.
// Every resolution is recorded as a labelled signal (engine said X, human
// decided Y) that later calibrates the score.

const REASON_LABELS = {
  score_in_review_band: "Score in the review band",
  low_model_agreement: "Model runs disagreed — genuinely ambiguous",
  counterfactual_leak: "Bias check flagged an input anomaly",
};

function reasonLabel(r) {
  if (REASON_LABELS[r]) return REASON_LABELS[r];
  if (r?.startsWith("disqualifier_ambiguous:")) return `Knock-out gate ambiguous: ${r.split(":")[1]}`;
  if (r?.startsWith("critic_refuted:")) return "Adversarial check weakened some evidence";
  return r;
}

export default function ReviewQueue() {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [notes, setNotes] = useState({});
  const [busy, setBusy] = useState("");
  // A failed fetch used to collapse to items=[] — the SAME state as "the queue is genuinely
  // empty" — which is the one false negative this page cannot afford: it exists specifically to
  // surface the ambiguous-score/low-agreement candidates that need a human decision, and hiding
  // them behind "Queue is clear" on a transient failure is worse than showing nothing at all.
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    const res = await api.get("/review-queue");
    setLoadError("");
    setItems(res.data);
  }, []);

  useEffect(() => {
    load().catch((err) => setLoadError(err.response?.data?.error || "Could not load the review queue."));
  }, [load]);

  // Live-sync: a candidate's stage can change from outside this page (their
  // profile, the Hiring Pipeline board) — the backend auto-resolves the
  // matching review item when that happens, so refetch here to drop it from
  // view instead of leaving a stale entry until the next manual reload.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onStage = () => load().catch(() => {});
    socket.on("candidate:stage", onStage);
    return () => socket.off("candidate:stage", onStage);
  }, [load]);

  async function resolve(item, decision) {
    setBusy(item._id + decision);
    try {
      await api.post(`/review-queue/${item._id}/resolve`, { decision, note: notes[item._id] || undefined });
      toast.success(decision === "advance" ? "Candidate advanced to interview" : "Candidate declined");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not resolve");
      // A 404 means this item is no longer actionable — resolved in another
      // tab, or its candidate/job was deleted out from under the queue. The
      // card is stale either way, so refetch instead of leaving a row on screen
      // whose only remaining behaviour is to raise the same toast again.
      if (err.response?.status === 404) await load().catch(() => {});
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#17221C] [overflow-wrap:anywhere]">Review Queue</h1>
        <p className="mt-1 text-sm text-[#64736A]">
          Candidates the screening engine is <span className="font-medium text-[#17221C]">honestly unsure about</span> —
          it routed them to you instead of forcing a confident answer. Your decision is recorded and used to calibrate
          future scores.
        </p>
      </div>

      {items === null && !loadError ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : loadError ? (
        <Card>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-[#17221C]">Could not load the review queue</h3>
              <p className="text-sm text-[#64736A]">{loadError} This is not the same as an empty queue — try again.</p>
              <button
                type="button"
                onClick={() => load().catch((err) => setLoadError(err.response?.data?.error || "Could not load the review queue."))}
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Try again
              </button>
            </div>
          </div>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={Inbox} title="Queue is clear" description="Nothing needs a human decision right now." />
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item._id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Link to={`/candidates/${item.candidate?._id}`} className="text-base font-semibold text-[#17221C] hover:text-brand-700">
                    {item.candidate?.basicDetails?.name || "Candidate"}
                  </Link>
                  <p className="mt-0.5 text-sm text-[#64736A]">{item.job?.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  {item.assessment?.overallScore != null && (
                    <Badge tone="amber">Score {item.assessment.overallScore}</Badge>
                  )}
                  <Link
                    to={`/candidates/${item.candidate?._id}/score`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5EBE7] px-3 py-1.5 text-sm font-medium text-[#64736A] hover:bg-[#DDECE3]"
                  >
                    <Scale className="h-4 w-4" /> Why this score
                  </Link>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {(item.reasons || []).map((r) => (
                  <Badge key={r} tone="slate">{reasonLabel(r)}</Badge>
                ))}
              </div>
              {item.summary && <p className="mt-2 text-sm text-[#64736A]">{item.summary}</p>}

              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-[#E5EBE7] pt-4">
                <div className="min-w-64 flex-1">
                  <Textarea
                    rows={1}
                    placeholder="Decision note (optional, recorded in the timeline)"
                    value={notes[item._id] || ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [item._id]: e.target.value }))}
                  />
                </div>
                <Button
                  onClick={() => resolve(item, "advance")}
                  disabled={busy !== ""}
                  className="inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" /> {busy === item._id + "advance" ? "Advancing…" : "Advance to interview"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => resolve(item, "decline")}
                  disabled={busy !== ""}
                  className="inline-flex items-center gap-1.5 !text-red-600"
                >
                  <XCircle className="h-4 w-4" /> {busy === item._id + "decline" ? "Declining…" : "Decline"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
