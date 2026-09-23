import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Plug, ExternalLink } from "lucide-react";
import api from "../../api/client.js";
import { Skeleton } from "../ui/Card.jsx";

/**
 * Where this job can be posted, as a row of platform tiles.
 *
 * Only platforms this workspace can actually post to appear: a board is here
 * when its driver is enabled AND its credentials are connected (or it needs
 * none). A board awaiting partner approval, or one nobody has connected, is
 * not shown as a dead control — the link to Settings is the way in.
 *
 * Monograms rather than the boards' logos: a wordmark we redraw is a wordmark
 * we get wrong, and these read the same at 32px.
 */
export const BOARD_META = {
  careers: { short: "CP", label: "Careers page", cls: "bg-brand-100 text-brand-800 ring-brand-200" },
  naukri: { short: "N", label: "Naukri", cls: "bg-sky-100 text-sky-800 ring-sky-200" },
  linkedin: { short: "in", label: "LinkedIn", cls: "bg-blue-100 text-blue-800 ring-blue-200" },
  indeed: { short: "ind", label: "Indeed", cls: "bg-indigo-100 text-indigo-800 ring-indigo-200" },
  ziprecruiter: { short: "ZR", label: "ZipRecruiter", cls: "bg-violet-100 text-violet-800 ring-violet-200" },
  webhook: { short: "⇢", label: "Webhook", cls: "bg-slate-100 text-slate-700 ring-slate-200" },
};

export function boardMeta(board, name) {
  return BOARD_META[board] || { short: (name || board || "?").slice(0, 2).toUpperCase(), label: name || board, cls: "bg-slate-100 text-slate-700 ring-slate-200" };
}

/** A board is offerable when it works and is connected. */
export function isConnected(b) {
  return b.enabled !== false && (b.credentialConfigured || !b.needsCredential);
}

export function BoardTile({ board, name, state = "idle", onClick, disabled, sublabel }) {
  const meta = boardMeta(board, name);
  const selected = state === "selected";
  const live = state === "live";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || live}
      aria-pressed={live ? undefined : selected}
      // The tile's own words are the platform name and a state; the label says
      // what pressing it does.
      aria-label={live ? `${meta.label} — already live` : `Post to ${meta.label}`}
      title={live ? `${meta.label} — already live` : `Post to ${meta.label}`}
      className={`relative flex min-w-[104px] flex-1 items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors ${
        live
          ? "border-emerald-200 bg-emerald-50/70 cursor-default"
          : selected
          ? "border-brand-400 bg-brand-50/70 ring-1 ring-brand-200"
          : "border-hairline bg-white hover:border-slate-300"
      } ${disabled && !live ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ring-1 ring-inset ${meta.cls}`} aria-hidden="true">
        {meta.short}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold text-slate-900">{meta.label}</span>
        <span className={`block truncate text-[11px] ${live ? "text-emerald-700" : "text-slate-500"}`}>
          {live ? "Live" : sublabel || (selected ? "Will be posted" : "Not selected")}
        </span>
      </span>
      {(selected || live) && (
        <Check className={`absolute top-1.5 right-1.5 h-3.5 w-3.5 ${live ? "text-emerald-600" : "text-brand-700"}`} aria-hidden="true" />
      )}
    </button>
  );
}

/**
 * `value` / `onChange` carry the selected board keys. Boards already published
 * are shown as Live and cannot be selected again — publishing twice is what
 * creates duplicate listings.
 */
export default function PublishTargets({ jobId, value = [], onChange, heading = "Post to", className = "" }) {
  const [boards, setBoards] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/jobs/${jobId}/publications`);
      setBoards(data.boards || []);
    } catch {
      setFailed(true);
    }
  }, [jobId]);

  useEffect(() => {
    if (jobId) load();
  }, [jobId, load]);

  if (!jobId || failed) return null;
  if (boards === null) return <Skeleton className={`h-16 w-full ${className}`} />;

  const usable = boards.filter(isConnected);
  const settingsLink = (
    <Link to="/settings?section=integrations" className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline">
      <Plug className="h-3 w-3" aria-hidden="true" /> Connect more
    </Link>
  );

  if (!usable.length) {
    return (
      <div className={className}>
        <p className="text-[11px] text-slate-500">
          No job boards connected yet. {settingsLink}
        </p>
      </div>
    );
  }

  const toggle = (key) => onChange?.(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">{heading}</span>
        {settingsLink}
      </div>
      <div className="flex flex-wrap gap-2">
        {usable.map((b) => {
          const live = b.status === "published";
          return (
            <BoardTile
              key={b.board}
              board={b.board}
              name={b.name}
              state={live ? "live" : value.includes(b.board) ? "selected" : "idle"}
              onClick={() => toggle(b.board)}
              disabled={b.validationErrors?.length > 0}
              sublabel={b.validationErrors?.length ? b.validationErrors[0] : undefined}
            />
          );
        })}
      </div>
      {usable.some((b) => b.externalUrl) && (
        <div className="mt-2 flex flex-wrap gap-3">
          {usable
            .filter((b) => b.externalUrl)
            .map((b) => (
              <a
                key={b.board}
                href={b.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-brand-700 hover:underline"
              >
                {boardMeta(b.board, b.name).label} listing <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            ))}
        </div>
      )}
    </div>
  );
}
