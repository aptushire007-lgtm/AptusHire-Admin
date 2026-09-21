/**
 * One evidence state, said the same way everywhere.
 *
 * Before this, each screen invented its own way to render "we have no number
 * here": the board drew a grey "Not scored" pill, the drawer left a cell empty,
 * the report printed an em dash, and one card rendered a literal 0. A reader
 * moving between them had to re-learn the vocabulary on each screen, and the
 * one that printed 0 was making a claim nothing measured.
 *
 * Five states, one spelling, applied by <EvidenceChip> and <EvidenceRow>:
 *
 *   measured   a figure exists           emerald, the figure in the numeral face
 *   recorded   it happened, no figure    slate, a short factual label
 *   pending    waiting on someone        amber — the only state that is a to-do
 *   absent     never run                 quiet slate, "Not run"
 *   withheld   ran, not reportable       amber outline + the reason
 *   negative   ran, outcome was against  red — a recorded verdict, not an error
 *
 * Only `pending` is amber, because amber means "a human owes this something"
 * across the whole product (DESIGN.md § Reserved Verdict Rule). `absent` is
 * deliberately the QUIETEST of the five: a stage nobody has reached yet is not
 * a problem, and colouring it like one turns every new applicant into an alert.
 */

const STATE_STYLES = {
  measured: "bg-emerald-100 text-emerald-800 border-emerald-200/70",
  recorded: "bg-slate-100 text-slate-700 border-slate-200/70",
  pending: "bg-amber-100 text-amber-700 border-amber-200/70",
  absent: "bg-transparent text-slate-400 border-transparent",
  withheld: "bg-transparent text-amber-700 border-amber-300",
  negative: "bg-red-100 text-red-700 border-red-200/70",
};

export function EvidenceChip({ state = "absent", children, className = "" }) {
  const style = STATE_STYLES[state] ?? STATE_STYLES.absent;
  return (
    <span
      className={`inline-flex items-center rounded-[5px] border px-1.5 py-0.5 text-[10.5px] font-semibold whitespace-nowrap ${style} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * One stage of one application: what it is, and what we actually have for it.
 *
 * The right-hand slot holds a figure when there is one, an action when the
 * recruiter can start the stage, and the word "Not run" when neither is true.
 * That third case is the one that matters — it is why this is a row and not a
 * score: an empty right-hand side would read as a rendering gap rather than as
 * a fact about the candidate.
 *
 * `action` is a node, not a handler, so the caller owns what the button does
 * and this component never has to know about stage transitions.
 */
export function EvidenceRow({ label, state = "absent", value, note, action, className = "" }) {
  const isQuiet = state === "absent";
  return (
    <div className={`flex items-center gap-2 py-1 ${className}`}>
      <span className={`min-w-0 flex-1 truncate text-[11.5px] ${isQuiet ? "text-slate-400" : "text-slate-600"}`}>
        {label}
      </span>
      {action ? (
        <span className="shrink-0">{action}</span>
      ) : value != null ? (
        <EvidenceChip state={state} className="num shrink-0">
          {value}
        </EvidenceChip>
      ) : (
        <EvidenceChip state={state} className="shrink-0">
          {note || "Not run"}
        </EvidenceChip>
      )}
      {/* A caveat rides ALONGSIDE the figure rather than replacing it: a legacy
          engine's 82 is still an 82, and hiding the qualifier is what turns a
          degraded reading into an apparently clean one. */}
      {value != null && note && (
        <span className="shrink-0 text-[10px] text-slate-400" title={note}>
          {note}
        </span>
      )}
    </div>
  );
}
