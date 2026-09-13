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
// A gap list scored across every rubric criterion can run past a dozen lines —
// more than a recruiter reading a report needs at a glance. Capped at the most
// load-bearing five; the count on the tab pill still shows the true total, so
// "5 shown" never reads as "5 exist".
const MAX_VISIBLE_ITEMS = 5;

const TONE = {
  recommend: { icon: ArrowRight, glyph: "text-brand-600", chip: "bg-brand-600 text-white", card: "border-brand-200/70 bg-gradient-to-br from-white to-brand-50/60" },
  positive: { icon: CircleCheck, glyph: "text-verdict-positive", chip: "bg-brand-600 text-white", card: "border-emerald-200/70 bg-gradient-to-br from-white to-emerald-50/60" },
  negative: { icon: CircleAlert, glyph: "text-verdict-negative", chip: "bg-brand-600 text-white", card: "border-red-200/70 bg-gradient-to-br from-white to-red-50/60" },
};

export default function TabbedFindings({ tabs, emptyHint }) {
  const usable = (tabs || []).filter(Boolean);
  const [active, setActive] = useState(usable.find((t) => t.items?.length)?.key || usable[0]?.key);
  if (usable.length === 0) return null;
  const current = usable.find((t) => t.key === active) || usable[0];
  const tone = TONE[current.tone] || TONE.recommend;
  const Icon = tone.icon;
  const visibleItems = current.items?.slice(0, MAX_VISIBLE_ITEMS) || [];
  const hiddenCount = (current.items?.length || 0) - visibleItems.length;

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
              aria-label={`${t.label} ${t.items?.length ?? 0}`}
              aria-selected={isActive}
              onClick={() => setActive(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
                isActive ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              {t.label}
              <span className={`tabular-nums ${isActive ? "text-white/70" : "text-slate-400"}`}>{t.items?.length ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="mt-3">
        {visibleItems.length > 0 ? (
          <ul className="space-y-2.5">
            {/* Pop-out / 3D treatment: a raised, gradient-tinted tile per finding
                rather than a plain bulleted line, so Recommendations / Strengths /
                Gaps read as the report's headline findings rather than as prose. A
                layered shadow plus a 1px lighter top edge is the whole "3D" effect
                — no chart or shadow library required. */}
            {visibleItems.map((item, i) => (
              <li
                key={i}
                style={{ boxShadow: "0 1px 0 0 rgba(255,255,255,0.8) inset, 0 6px 14px -6px rgba(15,23,42,0.18), 0 2px 4px -1px rgba(15,23,42,0.08)" }}
                className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 transition-transform duration-150 hover:-translate-y-0.5 ${tone.card}`}
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.glyph}`} aria-hidden="true" />
                <span className="min-w-0 text-sm leading-relaxed text-slate-700">{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500 italic">{current.empty || emptyHint || "None recorded."}</p>
        )}
        {hiddenCount > 0 && (
          <p className="mt-2 text-xs text-slate-400">+{hiddenCount} more not shown — see the PDF for the full list.</p>
        )}
      </div>
    </div>
  );
}
