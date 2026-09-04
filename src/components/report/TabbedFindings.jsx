import { useState } from "react";
import { ArrowRight, CircleCheck, CircleAlert } from "lucide-react";

/**
 * Recommendations · Strengths · Gaps, as one list that switches in place.
 *
 * Three short lists stacked vertically is three headings, three empty states and
 * a lot of scroll for content a recruiter reads one of. Switching them in place
 * costs one click and puts the counts on the tabs, so you can see there are two
 * gaps without opening gaps.
 *
 * EVERY TAB RENDERS, INCLUDING THE EMPTY ONES. A tab that disappears when it has
 * nothing in it means an absent tab and a zero tab look identical, and "no gaps
 * were recorded" is a materially different statement from "gaps were not
 * assessed". The count on the pill says which, and the panel says it in words.
 *
 * The glyph is per-tab and not per-item, because the items inside one tab all
 * mean the same thing. Colour here is the reserved verdict channel and is spent
 * deliberately: a strength is a positive finding and a gap is a negative one,
 * which is exactly what that channel is reserved for.
 */
const TONE = {
  recommend: { icon: ArrowRight, glyph: "text-brand-600", chip: "bg-brand-600 text-white" },
  positive: { icon: CircleCheck, glyph: "text-[#FF6B2C]", chip: "bg-brand-600 text-white" },
  negative: { icon: CircleAlert, glyph: "text-[#C0392B]", chip: "bg-brand-600 text-white" },
};

export default function TabbedFindings({ tabs, emptyHint }) {
  const usable = (tabs || []).filter(Boolean);
  const [active, setActive] = useState(usable.find((t) => t.items?.length)?.key || usable[0]?.key);
  if (usable.length === 0) return null;
  const current = usable.find((t) => t.key === active) || usable[0];
  const tone = TONE[current.tone] || TONE.recommend;
  const Icon = tone.icon;

  return (
    <div>
      <div role="tablist" aria-label="Findings" className="flex flex-wrap gap-1.5">
        {usable.map((t) => {
          const isActive = t.key === current.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
                isActive ? "bg-[#FF6B2C] text-white" : "bg-[#F5F5F0] text-[#6B6B6B] hover:bg-[#FFE8DC] hover:text-[#FF6B2C]"
              }`}
            >
              {t.label}
              <span className={`tabular-nums ${isActive ? "text-white/70" : "text-[#9B9B9B]"}`}>{t.items?.length ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="mt-3">
        {current.items?.length > 0 ? (
          <ul className="space-y-2">
            {current.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${tone.glyph}`} aria-hidden="true" />
                <span className="min-w-0 text-sm leading-relaxed text-[#1A1A1A]">{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#6B6B6B] italic">{current.empty || emptyHint || "None recorded."}</p>
        )}
      </div>
    </div>
  );
}
