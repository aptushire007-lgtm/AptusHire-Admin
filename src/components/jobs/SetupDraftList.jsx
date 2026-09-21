import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Sparkles, Trash2 } from "lucide-react";
import api from "../../api/client.js";
import Button from "../ui/Button.jsx";
import { useToast } from "../ui/Toast.jsx";

const STEP_INDEX = {
  role: 1,
  evaluation: 2,
  workflow: 3,
  communication: 4,
  review: 5,
  complete: 6,
};

function formatTimeAgo(dateString) {
  if (!dateString) return "recently";
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function SetupDraftList({ onResumeDraft }) {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [discardingId, setDiscardingId] = useState(null);

  const handleDiscard = async (draft) => {
    const draftTitle = draft.job?.title || draft.values?.title || "Untitled setup";
    setDiscardingId(draft._id);
    try {
      await api.delete(`/jobs/setup-drafts/${draft._id}`);
      setData((prev) => {
        if (!prev) return prev;
        const newItems = prev.items.filter((item) => item._id !== draft._id);
        return {
          ...prev,
          items: newItems,
          total: Math.max(0, (prev.total || 1) - 1),
        };
      });
      toast.success(`Setup draft "${draftTitle}" discarded`);
    } catch {
      toast.error("Failed to discard setup draft. Please try again.");
    } finally {
      setDiscardingId(null);
    }
  };

  useEffect(() => {
    let active = true;
    setError("");
    setLoading(true);
    api
      .get("/jobs/setup-drafts", { params: { page } })
      .then(({ data }) => {
        if (active) setData(data);
      })
      .catch(() => {
        if (active) setError("Your saved setups could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, reload]);

  if (loading) return <p role="status" className="text-sm text-slate-600">Loading your saved setups…</p>;
  if (!data?.items?.length && !error && page === 1) return null;

  return (
    <section
      aria-labelledby="saved-setups"
      className="rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/40 via-white to-white p-4.5 shadow-xs transition-all"
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100/70 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600"></span>
          </span>
          <h2
            id="saved-setups"
            className="text-xs font-bold uppercase tracking-wider text-emerald-950"
          >
            YOUR SAVED SETUPS
          </h2>
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 shadow-2xs">
            <Sparkles className="h-3 w-3 text-violet-600" />
            AI In-Progress
          </span>
        </div>
        <span className="text-xs font-medium text-slate-500">
          Private to you · saved on the server
        </span>
      </div>

      {error ? (
        <div className="mt-3">
          <p role="alert" className="text-sm text-red-700">{error}</p>
          <Button
            className="mt-2"
            variant="secondary"
            onClick={() => setReload((value) => value + 1)}
          >
            Retry saved setups
          </Button>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-slate-100">
            {data.items.map((draft) => {
              const stepNum = STEP_INDEX[draft.currentStep] || 2;
              const progressPct = Math.min(100, Math.round((stepNum / 6) * 100));
              const isPublished = draft.job?.status === "published";
              const isRecovery = draft.state === "creating";
              const hasJob = Boolean(draft.job);
              const setupUrl = `/jobs/setup/${draft._id}?step=${draft.currentStep}`;
              const draftTitle = draft.job?.title || draft.values?.title || "Untitled setup";

              return (
                <li
                  key={draft._id}
                  className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {onResumeDraft ? (
                        <button
                          type="button"
                          onClick={() => onResumeDraft(draft)}
                          className="font-bold text-left text-slate-900 transition-colors hover:text-brand-700 text-sm [overflow-wrap:anywhere] cursor-pointer"
                        >
                          {draftTitle}
                        </button>
                      ) : (
                        <Link
                          to={setupUrl}
                          className="font-bold text-slate-900 transition-colors hover:text-brand-700 text-sm [overflow-wrap:anywhere]"
                        >
                          {draftTitle}
                        </Link>
                      )}

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          isPublished
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                            : hasJob
                            ? "border border-blue-200 bg-blue-50 text-blue-800"
                            : "border border-amber-200 bg-amber-50 text-amber-800"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isPublished ? "bg-emerald-500" : hasJob ? "bg-blue-500" : "bg-amber-500"
                          }`}
                        />
                        {isPublished
                          ? "Published"
                          : isRecovery
                          ? "Job creation needs recovery"
                          : hasJob
                          ? `Draft Requisition • Step ${stepNum} of 6`
                          : `Setup In-Progress (No ATS Job Yet) • Step ${stepNum} of 6`}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                      <span>Saved {formatTimeAgo(draft.updatedAt)}</span>
                      <span className="text-slate-300">•</span>
                      {!hasJob ? (
                        <span className="text-slate-500 italic">
                          Wizard session saved on server · Not yet added to your active jobs list
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/50">
                          <Check className="h-3 w-3 text-emerald-600" />
                          AI generated screening rubric questions
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar + action buttons */}
                  <div className="flex items-center gap-3 sm:shrink-0">
                    <div className="hidden sm:block w-24 sm:w-28">
                      <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-500">
                        <span>Progress</span>
                        <span className="num font-bold text-slate-700">{progressPct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Discard / Delete draft button */}
                    <button
                      type="button"
                      onClick={() => handleDiscard(draft)}
                      disabled={discardingId === draft._id}
                      title="Discard this setup draft"
                      aria-label={`Discard setup draft for ${draftTitle}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 shadow-2xs hover:bg-rose-50 hover:text-rose-700 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      <span>Discard</span>
                    </button>

                    {/* Resume setup button */}
                    {onResumeDraft ? (
                      <button
                        type="button"
                        onClick={() => onResumeDraft(draft)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0E3B2E] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#154d3d] transition-all cursor-pointer"
                      >
                        {isPublished ? "Review setup" : "Resume setup"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <Link
                        to={setupUrl}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0E3B2E] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#154d3d] transition-all"
                      >
                        {isPublished ? "Review setup" : "Resume setup"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {data.totalPages > 1 && (
            <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous setups
              </Button>
              <span className="text-xs text-slate-600">
                Page {page} of {data.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next setups
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
