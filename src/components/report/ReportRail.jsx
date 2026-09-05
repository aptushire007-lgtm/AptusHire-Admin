import { useEffect, useMemo, useRef, useState } from "react";

/**
 * The report's in-page rail.
 *
 * WHAT IT REPLACES. Every section of this report used to sit behind ONE
 * expander — Evaluation, claim verification, assessment, integrity and the
 * transcript, all inside a single `DetailDisclosure`. Two things followed from
 * that. You could not reach Integrity without opening everything, and you could
 * not see that Integrity had anything in it without opening everything. A
 * recruiter asking "did the camera flag anything" had to read a report to find
 * out whether there was a report to read.
 *
 * THE FIGURE IS THE POINT, NOT THE LINK. Each row carries the one number or word
 * that section resolves to, so the rail answers the three questions a recruiter
 * actually arrives with — how did they do, what did we prove, was anything
 * flagged — before a single click. A rail of bare section names would be
 * navigation; a rail of resolved figures is a summary that also navigates.
 *
 * `null` figures render as an em dash rather than an empty cell, and a section
 * with nothing in it is not passed at all (the caller filters), because a row
 * that goes nowhere is worse than a missing row.
 *
 * SCROLL-SPY. IntersectionObserver against a band near the top of the viewport
 * rather than scroll-position arithmetic: sections here vary from one card to a
 * full transcript, and any fixed-offset calculation gets the long ones wrong.
 * Clicking a row scrolls and pins the highlight for the duration of the scroll,
 * otherwise the observer fights the animation and the highlight flickers through
 * every section it passes.
 */
export default function ReportRail({ sections }) {
  const [active, setActive] = useState(sections[0]?.id || null);
  const pinnedUntil = useRef(0);

  const ids = useMemo(() => sections.map((s) => s.id).join("|"), [sections]);

  useEffect(() => {
    const list = ids.split("|").filter(Boolean);
    const nodes = list.map((id) => document.getElementById(id)).filter(Boolean);
    if (nodes.length === 0) return undefined;

    const seen = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e);
        if (Date.now() < pinnedUntil.current) return;
        // The topmost section currently crossing the band wins. Falling back to
        // the last one that did keeps the rail from blanking at the very bottom
        // of the page, where nothing intersects the band at all.
        const visible = [...seen.values()]
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // Top of the band sits just under the sticky header + breadcrumb; the
      // bottom cuts most of the viewport so a tall section doesn't hold the
      // highlight while the next one fills the screen.
      { rootMargin: "-124px 0px -55% 0px", threshold: 0 }
    );
    for (const n of nodes) observer.observe(n);
    return () => observer.disconnect();
  }, [ids]);

  function go(e, id) {
    e.preventDefault();
    const node = document.getElementById(id);
    if (!node) return;
    setActive(id);
    pinnedUntil.current = Date.now() + 900;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
    // Move focus for keyboard and screen-reader users — a smooth scroll alone
    // leaves the caret where it was, so the next Tab goes back up the page.
    node.setAttribute("tabindex", "-1");
    node.focus({ preventScroll: true });
  }

  let lastGroup = null;

  return (
    <nav aria-label="Report sections" className="lg:sticky lg:top-[6.75rem]">
      <ul className="space-y-0.5">
        {sections.map((s) => {
          const isActive = s.id === active;
          const header = s.group && s.group !== lastGroup ? s.group : null;
          lastGroup = s.group || lastGroup;
          return (
            <li key={s.id}>
              {header && (
                <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold tracking-[0.08em] text-[#9BAAA1] uppercase first:pt-0">
                  {header}
                </p>
              )}
              <a
                href={`#${s.id}`}
                onClick={(e) => go(e, s.id)}
                aria-current={isActive ? "true" : undefined}
                className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
                  isActive ? "bg-brand-600 text-white" : "text-[#64736A] hover:bg-[#DDECE3]"
                }`}
              >
                <span className="min-w-0 truncate text-[13px] font-medium">{s.label}</span>
                <span
                  className={`shrink-0 text-[11px] font-bold tabular-nums ${
                    isActive ? "text-white/80" : s.tone === "flag" ? "text-[#C95C5C]" : "text-[#64736A]"
                  }`}
                >
                  {s.figure ?? "—"}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
