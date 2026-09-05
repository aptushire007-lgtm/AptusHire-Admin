import { useState } from "react";
import { ChevronDown, FileText, Flag, Compass } from "lucide-react";
import { Card } from "../ui/Card.jsx";

/**
 * The three CV analysis cards: Document Professionalism, CV Red Flag Analysis,
 * Key Attributes.
 *
 * Every row is arithmetic over evidence that was cited when the claim graph was
 * built, so expanding one shows the verbatim span rather than a generated
 * paragraph. Nothing on these cards came from a model call made for them — see
 * backend/utils/resumeSignals.js.
 *
 * Two rendering rules that carry policy, not taste:
 *
 *   - `tone: "neutral"` and `tone: "note"` never take a verdict colour. This is
 *     what keeps an employment gap from being drawn like a contradiction. The
 *     engine decides tone; this file only paints it, so a CSS change here cannot
 *     turn a recorded fact into a flag.
 *   - A row's chip says its state in WORDS as well as colour ("Nothing
 *     contradictory", "2 to check"), because the same green/red pair is the
 *     verdict channel used everywhere else on this page.
 */

const TONE = {
  flag: "text-[#C95C5C]",
  positive: "text-[#176B45]",
  neutral: "text-[#64736A]",
  note: "text-[#64736A]",
};

const BULLET = {
  flag: "bg-verdict-negative",
  positive: "bg-verdict-positive",
  neutral: "bg-slate-300",
  note: "bg-transparent",
};

// The right-hand chip on a red-flag row. "clear" is deliberately not green-on-
// green: a clean row is the unremarkable case and should not read as an
// achievement, so it gets a quiet positive rather than the full verdict weight.
const ROW_TONE = {
  flag: "bg-[#F8EAEA] text-[#C95C5C]",
  clear: "bg-[#F8FAF9] text-[#64736A]",
};

function Stars({ score }) {
  if (score == null) return null;
  return (
    <span className="flex items-center gap-1">
      <span className="flex text-[#176B45]" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.max(0, Math.min(1, score - i));
          return (
            <span key={i} className="relative inline-block h-3 w-3 leading-none">
              <span className="absolute inset-0 text-slate-200">★</span>
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                ★
              </span>
            </span>
          );
        })}
      </span>
      <span className="text-[11px] font-semibold tabular-nums text-[#64736A]">{score}/5</span>
    </span>
  );
}

function Row({ row }) {
  const [open, setOpen] = useState(false);
  const findings = row.findings || [];
  const hasDetail = findings.length > 0;

  return (
    <div className="rounded-lg border border-[#E5EBE7]">
      <button
        type="button"
        onClick={() => hasDetail && setOpen((v) => !v)}
        aria-expanded={hasDetail ? open : undefined}
        disabled={!hasDetail}
        className={`flex w-full items-center gap-2 px-2.5 py-2 text-left ${hasDetail ? "hover:bg-[#F8FAF9]" : "cursor-default"}`}
      >
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#17221C]" title={row.hint || undefined}>
          {row.label}
        </span>

        {row.score != null ? (
          <Stars score={row.score} />
        ) : row.value ? (
          <span
            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
              row.tone ? ROW_TONE[row.tone] || "text-[#64736A]" : "text-[#64736A]"
            }`}
          >
            {row.value}
          </span>
        ) : null}

        {hasDetail && (
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-[#9BAAA1] transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <ul className="space-y-1.5 border-t border-[#E5EBE7] px-2.5 py-2">
          {findings.map((f, i) => (
            <li key={i} className="flex gap-2 text-[11px] leading-relaxed">
              <span
                aria-hidden="true"
                className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${BULLET[f.tone] || BULLET.neutral}`}
              />
              <span className={`min-w-0 ${TONE[f.tone] || TONE.neutral} ${f.tone === "note" ? "italic" : ""}`}>
                {f.text}
                {f.quote && (
                  <span className="mt-0.5 block border-l-2 border-[#E5EBE7] pl-2 text-[#64736A] italic [overflow-wrap:anywhere]">
                    &ldquo;{f.quote}&rdquo;
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Panel({ icon: Icon, title, rows, badge, footer }) {
  if (!rows?.length) return null;
  return (
    <Card className="flex flex-col">
      <div className="mb-1 flex items-start justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[#17221C]">
          <Icon className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
          {title}
        </h3>
        {badge && (
          <span
            className="shrink-0 rounded-md bg-[#E8F2EC] px-1.5 py-0.5 text-[11px] font-semibold text-brand-700"
            title={badge.detail}
          >
            {badge.label}
          </span>
        )}
      </div>
      <p className="mb-3 text-[11px] text-[#64736A]">Based on CV</p>
      <div className="space-y-2">
        {rows.map((r) => (
          <Row key={r.key} row={r} />
        ))}
      </div>
      {footer && <p className="mt-3 text-[11px] leading-relaxed text-[#64736A]">{footer}</p>}
    </Card>
  );
}

export default function CvAnalysisCards({ analysis, id }) {
  if (!analysis) return null;
  const { professionalism, redFlags, attributes } = analysis;
  if (!professionalism && !redFlags && !attributes) return null;

  return (
    <section id={id} aria-label="CV analysis" className="grid scroll-mt-32 gap-6 md:grid-cols-2 xl:grid-cols-3">
      <Panel icon={FileText} title="Document Professionalism" rows={professionalism?.rows} />
      <Panel
        icon={Flag}
        title="CV Red Flag Analysis"
        rows={redFlags?.rows}
        footer="Every line here is a property of the document, checked in code. Nothing on this card can reject anyone by itself."
      />
      <Panel
        icon={Compass}
        title="Key Attributes"
        rows={attributes?.rows}
        badge={attributes?.model}
        // Said on the card, because its absence is the notable thing about it
        // next to the product this is modelled on.
        footer="What the CV evidences, not what it suggests about the person. Traits and career ceilings aren't estimated here — a CV can't support that, and the ratings would mostly track how confidently someone writes about themselves."
      />
    </section>
  );
}
