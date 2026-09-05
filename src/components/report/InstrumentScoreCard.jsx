import { Card } from "../ui/Card.jsx";
import ScoreGauge from "./ScoreGauge.jsx";
import TabbedFindings from "./TabbedFindings.jsx";

/**
 * One instrument's headline: the gauge, the sentence, and the three lists.
 *
 * This is the template the reference deck applies once per evidence source, and
 * adopting it is the single biggest structural change in this pass. What we had
 * was one page-length scroll with the interview's figures at the top and the
 * résumé's evidence four sections down, so a recruiter comparing "what the CV
 * said" against "what the interview showed" had to hold one of them in their
 * head. One card per instrument, all built from the same component, means the
 * comparison is a glance instead of a memory exercise.
 *
 * THE NARRATIVE SITS UNDER THE GAUGE, NOT BESIDE IT. It is prose and the gauge
 * is a figure; putting them side by side makes the eye choose, and the number is
 * always going to win that. Under it, the paragraph reads as the number's
 * explanation, which is what it is.
 *
 * A missing narrative renders nothing rather than a placeholder line. There is
 * no sentence this component can honestly write on the model's behalf.
 */
export default function InstrumentScoreCard({ id, title, gauge, narrative, tabs, provenance, footer }) {
  return (
    <Card id={id} className="flex flex-col">
      <h3 className="font-display text-base font-bold tracking-tight text-[#17221C]">{title}</h3>
      {provenance}

      <div className="mt-4">
        <ScoreGauge {...gauge} label={title} />
      </div>

      {narrative && (
        <p className="mt-4 rounded-xl bg-[#F8FAF9] px-4 py-3 text-sm leading-relaxed text-[#17221C]">{narrative}</p>
      )}

      {tabs?.length > 0 && (
        <div className="mt-4 border-t border-[#E5EBE7] pt-4">
          <TabbedFindings tabs={tabs} />
        </div>
      )}

      {footer && <div className="mt-4 border-t border-[#E5EBE7] pt-3">{footer}</div>}
    </Card>
  );
}
