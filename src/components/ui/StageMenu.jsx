import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, Mail, XCircle } from "lucide-react";
import Button from "./Button.jsx";
import Modal from "./Modal.jsx";
import Menu, { MenuGroup, MenuItem, MenuSeparator } from "./Menu.jsx";
import {
  REJECTED,
  DECISIONS,
  stageDecisions,
  isTerminal,
  notifiesCandidate,
  stageLabel,
} from "../../lib/pipeline.js";

// The board's own phase names, in pipeline order, so the menu groups moves the
// way the recruiter already sees them grouped on the board.
const PHASE_ORDER = ["Assessments", "Interviews", "Offers & Hires"];

/**
 * The candidate stage control — the one place a recruiter moves a person
 * through the pipeline from a list or a board.
 *
 * This replaced a <select> holding every legal destination, which is what every
 * ATS ships and what the incumbents get wrong. That control made a rejection
 * cost exactly the same gesture as a promotion, one line apart, with nothing on
 * screen saying which moves reach the candidate's inbox and which are internal
 * bookkeeping. Three things change here, and all three are the product thesis
 * applied to a widget:
 *
 *  1. **The expected move is not in a menu at all.** The next stage in pipeline
 *     order is a button. The overwhelmingly common action costs one click, and
 *     the menu stops being a tax on the normal path.
 *  2. **Every move states its consequence.** Items carry their pipeline
 *     position, so a menu of twelve reads as an ordered pipeline; a move that
 *     skips stages says so; and a move that emails the candidate is marked
 *     before the click, not discovered afterwards from the sent folder.
 *  3. **Terminal moves are separated and confirmed.** `rejected` and `joined`
 *     are one-way — `canTransition` refuses to leave them. An irreversible,
 *     candidate-visible adverse action does not get to share a hover row with
 *     "Under Review". CLAUDE.md's rule is that a human owns every adverse
 *     action; this is what owning it looks like at the click.
 *
 * The transition rules themselves are NOT re-derived here. `stageDecisions`
 * (pipeline.js) filters every offer through `canTransition`, which mirrors the
 * backend guard, and the server re-checks anyway — this component only decides
 * how the permitted decisions are presented.
 *
 * Props:
 *   status  — the candidate's current stage
 *   name    — used in the accessible names and the confirmation copy
 *   busy    — a move for this candidate is in flight
 *   onMove  — (stage) => void; the caller owns the request and the refresh
 *   compact — narrow trigger for the pipeline board's 288px columns
 */
const PHASE_TINT = {
  Assessments: "!border-rose-200 !bg-rose-50 !text-rose-700 hover:!bg-rose-100",
  Interviews: "!border-violet-200 !bg-violet-50 !text-violet-700 hover:!bg-violet-100",
  "Offers & Hires": "!border-emerald-200 !bg-emerald-50 !text-emerald-800 hover:!bg-emerald-100",
  none: "!border-slate-200 !bg-slate-50 !text-slate-700 hover:!bg-slate-100",
};

export default function StageMenu({ status, name, busy = false, onMove, compact = false, className = "" }) {
  const [confirming, setConfirming] = useState(null);
  const [showOther, setShowOther] = useState(false);
  const who = name || "this candidate";

  // Decisions, not stages: see stageDecisions() in pipeline.js. The menu used
  // to list every later stage by its internal name — up to fourteen, including
  // "AI Interview Completed", which records an event and must never be chosen.
  const { next, other, canReject } = useMemo(() => stageDecisions(status), [status]);
  const primary = next[0] || null;
  const byPhase = PHASE_ORDER.map((phase) => [phase, next.filter((s) => DECISIONS[s].phase === phase)]).filter(
    ([, list]) => list.length > 0
  );

  // A candidate at a terminal stage has nowhere to go. Saying so is better than
  // an empty cell, which reads as a control that failed to render.
  if (!primary && other.length === 0 && !canReject) {
    return <span className={`text-xs font-medium text-slate-500 ${className}`}>Final stage</span>;
  }

  function request(stage) {
    if (isTerminal(stage)) {
      setConfirming(stage);
      return;
    }
    onMove(stage);
  }

  function commit() {
    const stage = confirming;
    setConfirming(null);
    if (stage) onMove(stage);
  }

  const menu = (
    <>
      {byPhase.map(([phase, list], gi) => (
        <div key={phase}>
          {gi > 0 && <MenuSeparator />}
          <MenuGroup label={phase}>
            {list.map((s) => (
              <MenuItem
                key={s}
                onSelect={() => request(s)}
                trailing={<Consequence stage={s} next={s === primary} />}
              >
                {DECISIONS[s].label}
              </MenuItem>
            ))}
          </MenuGroup>
        </div>
      ))}

      {other.length > 0 && (
        <>
          <MenuSeparator />
          {/* The unusual moves — skipping ahead, say, to record an offline
              hire — stay reachable but folded away, so the handful above is
              the menu. A plain button, not a menuitem: <Menu> closes on any
              item selection, and this only reveals more of the list. */}
          <button
            type="button"
            onClick={() => setShowOther((v) => !v)}
            aria-expanded={showOther}
            className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-canvas"
          >
            <span>{showOther ? "Fewer options" : `More options (${other.length})`}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showOther ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {showOther &&
            other.map((s) => (
              <MenuItem key={s} onSelect={() => request(s)} trailing={<Consequence stage={s} />}>
                {DECISIONS[s].label}
              </MenuItem>
            ))}
        </>
      )}
    </>
  );

  // Pinned below the scroll area — see <Menu>'s `footer`. The destructive
  // command and the legend that explains the envelope are the two things that
  // must never be a scroll away.
  const footer = (
    <>
      {canReject && (
        <MenuItem
          tone="danger"
          onSelect={() => request(REJECTED)}
          leading={<XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />}
          trailing={<Consequence stage={REJECTED} />}
          description="Final — cannot be undone"
        >
          Reject {who === "this candidate" ? "candidate" : who.split(" ")[0]}
        </MenuItem>
      )}
      {/* The legend earns its line: it is what makes the envelope a stated fact
          rather than a glyph the reader has to guess at. */}
      <p className="flex items-start gap-1.5 px-2.5 pt-2 pb-1 text-[11px] leading-relaxed text-slate-500">
        <Mail className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
        Marks a move that emails the candidate.
      </p>
    </>
  );

  // Compact (on a card) the button wears its destination's colour — rose for
  // an assessment, violet for an interview, the same hues those steps carry
  // everywhere else — so the next move reads at a glance, and shrinks to fit.
  const tint = compact ? PHASE_TINT[DECISIONS[primary]?.phase] || PHASE_TINT.none : "";
  const moreTrigger = (
    <Button
      variant="secondary"
      size="sm"
      disabled={busy}
      aria-label={`More stage moves for ${who}`}
      className={`${primary ? "rounded-l-none px-2" : ""} ${compact ? `!h-7 !min-h-0 !min-w-0 !px-1.5 ${tint}` : ""}`}
    >
      {!primary && "Move…"}
      <ChevronDown className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden="true" />
    </Button>
  );

  return (
    <>
      <div className={`inline-flex items-stretch ${className}`}>
        {primary && (
          <Button
            variant="secondary"
            size="sm"
            loading={busy}
            onClick={() => request(primary)}
            // The visible label goes generic in a kanban column, so the full
            // destination moves into the accessible name rather than being lost:
            // "Advance" alone is not a description of what the button does.
            aria-label={`${DECISIONS[primary].label} for ${who}`}
            title={DECISIONS[primary].label}
            className={`rounded-r-none border-r-0 ${compact ? `!h-7 !min-h-0 !gap-1 !px-2 text-xs ${tint}` : ""}`}
          >
            {!busy && <ArrowRight className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden="true" />}
            <span aria-hidden="true">{compact ? DECISIONS[primary].short : DECISIONS[primary].label}</span>
          </Button>
        )}
        <Menu trigger={moreTrigger} footer={footer} label={`Stage moves for ${who}`} align="end">
          {menu}
        </Menu>
      </div>

      <Modal
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        size="sm"
        title={confirming === REJECTED ? `Reject ${who}?` : `Mark ${who} as ${stageLabel(confirming || "")}?`}
      >
        <p className="text-sm leading-relaxed text-slate-600">
          <span className="font-medium text-slate-800">{stageLabel(confirming || "")}</span> is a final stage. Once set,{" "}
          {who} cannot be moved to any other stage from the pipeline.
          {confirming && notifiesCandidate(confirming) && " The candidate is emailed about this move."}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfirming(null)}>
            Cancel
          </Button>
          <Button variant={confirming === REJECTED ? "danger" : "primary"} size="sm" onClick={commit}>
            {confirming === REJECTED ? "Reject candidate" : `Move to ${stageLabel(confirming || "")}`}
          </Button>
        </div>
      </Modal>
    </>
  );
}

/**
 * What this move does beyond changing a label: is it next, and does it mail.
 *
 * There is deliberately no "skips 4 stages" line here, though it was the first
 * thing tried. The ordinals already encode distance against the stage badge the
 * recruiter is looking at, and a second line per item made the menu tall enough
 * to scroll — which pushed Reject out of sight. Height is not free in a menu
 * that has a destructive item to keep visible.
 */
function Consequence({ stage, next = false }) {
  const mails = notifiesCandidate(stage);
  if (!next && !mails) return null;
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {next && (
        <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">Next</span>
      )}
      {mails && (
        <>
          <Mail className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <span className="sr-only">Emails the candidate</span>
        </>
      )}
    </span>
  );
}
