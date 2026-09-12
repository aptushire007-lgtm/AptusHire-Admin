import { Card } from "../ui/Card.jsx";
import EvidenceRadar from "./EvidenceRadar.jsx";
import RatedAxisList from "./RatedAxisList.jsx";

/**
 * Cognitive Insights and Communication Skills — one template, rendered twice.
 *
 * Radar on the left as the index, the rated list on the right as the finding.
 * The split is the reference's and it is a good one: the shape is what you see
 * from across the room, the list is what you act on, and putting them side by
 * side means you never have to hold one in your head while you look at the other.
 *
 * Below `lg` the radar goes above the list rather than beside it — at phone width
 * a 13-label radar is unreadable and the list is the part that still works.
 */
export default function InsightPanel({ id, title, axes, note, unavailable }) {
  // The panel is absent, not empty. Communication is only rated when the role's
  // approved rubric declares it assesses how someone communicates and a human
  // wrote down why, so its absence is a fact about the ROLE and is stated as one
  // rather than rendered as a card with nothing in it.
  if (unavailable) {
    return (
      <Card id={id} className="scroll-mt-32">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-1.5 text-sm text-slate-600">{unavailable}</p>
      </Card>
    );
  }

  const list = (axes || []).filter(Boolean);
  if (!list.length) return null;

  const titleId = `${id}-radar`;
  const measured = list.filter((a) => typeof a.score === "number").length;

  return (
    <Card id={id} className="scroll-mt-32">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={titleId} className="text-base font-semibold text-slate-900">
          {title}
        </h3>
        {/* What the shape is over. A radar drawn from 5 of 8 axes looks exactly
            like one drawn from 8, and the difference matters. */}
        {measured < list.length && (
          <span className="text-xs text-slate-500">
            {measured} of {list.length} measured
          </span>
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <div className="flex justify-center lg:sticky lg:top-32">
          <EvidenceRadar axes={list} titleId={titleId} />
        </div>
        <RatedAxisList axes={list} />
      </div>

      {note && <p className="mt-4 text-xs text-slate-500">{note}</p>}
    </Card>
  );
}
