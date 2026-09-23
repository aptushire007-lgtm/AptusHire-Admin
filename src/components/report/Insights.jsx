import { CheckCircle2, ChevronDown, AlertTriangle, MinusCircle } from "lucide-react";

/**
 * The report's picture of a candidate against the job's rubric, and the short
 * list of what it adds up to. Rows come from lib/reportInsights.js.
 *
 * Axes are numbered, not labelled: rubric criteria are sentences ("Implement
 * features, fix bugs, and improve application performance"), and ten of them
 * around a circle is unreadable. The number matches the row below, and
 * hovering either one highlights both.
 */

const CX = 180;
const CY = 165;
const R = 118;

function point(i, n, pct) {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const r = (R * Math.max(0, Math.min(100, pct))) / 100;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

export function RubricRadar({ rows, focus, onFocus }) {
  const n = rows.length;
  if (n < 3) return null;
  const cvPath = rows.map((r, i) => point(i, n, r.cv ?? 0).join(",")).join(" ");
  const focused = rows.find((r) => r.id === focus);
  const tested = rows.filter((r) => r.test != null).length;
  return (
    <figure className="w-full">
      <svg
        viewBox="0 0 360 330"
        className="mx-auto block w-full max-w-[380px]"
        role="img"
        aria-label={`CV evidence across ${n} rubric criteria${tested ? `, with test results for ${tested}` : ""}. Details are listed below the chart.`}
        onMouseLeave={() => onFocus?.(null)}
      >
        {[25, 50, 75, 100].map((ring) => (
          <polygon
            key={ring}
            points={rows.map((_, i) => point(i, n, ring).join(",")).join(" ")}
            className={ring === 100 ? "fill-slate-50 stroke-slate-200" : "fill-none stroke-slate-200"}
            strokeWidth="1"
          />
        ))}
        {rows.map((r, i) => {
          const [x, y] = point(i, n, 100);
          return (
            <line key={r.id} x1={CX} y1={CY} x2={x} y2={y} strokeWidth={focus === r.id ? 2 : 1} className={focus === r.id ? "stroke-slate-500" : "stroke-slate-200"} />
          );
        })}
        <polygon points={cvPath} className="fill-sky-400/25 stroke-sky-500" strokeWidth="2" strokeLinejoin="round" />
        {rows.map((r, i) => {
          const [x, y] = point(i, n, r.cv ?? 0);
          return r.cvNone ? (
            <circle key={`cv-${r.id}`} cx={x} cy={y} r="3.5" className="fill-white stroke-sky-500" strokeWidth="1.5" />
          ) : (
            <circle key={`cv-${r.id}`} cx={x} cy={y} r="3.5" className="fill-sky-500" />
          );
        })}
        {rows.map((r, i) => {
          if (r.test == null) return null;
          const [x, y] = point(i, n, r.test);
          return <rect key={`t-${r.id}`} x={x - 4} y={y - 4} width="8" height="8" transform={`rotate(45 ${x} ${y})`} className="fill-rose-500 stroke-white" strokeWidth="1.5" />;
        })}
        {rows.map((r, i) => {
          const [x, y] = point(i, n, 114);
          const on = focus === r.id;
          return (
            <g key={`n-${r.id}`} onMouseEnter={() => onFocus?.(r.id)} onClick={() => onFocus?.(r.id, true)} className="cursor-pointer">
              <circle cx={x} cy={y} r="11" className={on ? "fill-slate-900" : r.importance === "must_have" ? "fill-white stroke-slate-400" : "fill-white stroke-slate-200"} strokeWidth="1.5" />
              <text x={x} y={y + 3.5} textAnchor="middle" className={`text-[10px] font-semibold ${on ? "fill-white" : "fill-slate-700"}`}>
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 min-h-10 text-center text-xs text-slate-600" aria-live="polite">
        {focused ? (
          <>
            <span className="font-semibold text-slate-900">{focused.label}</span>
            <br />
            CV {focused.cvNone ? "no evidence" : focused.cv != null ? `${focused.cv}/100` : "not assessed"} · Test{" "}
            {focused.test != null ? `${focused.testDetail} correct` : "not tested"}
          </>
        ) : (
          "Hover a number to see that criterion."
        )}
      </figcaption>
      <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> CV evidence</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-sky-500 bg-white" /> None found</span>
        {tested > 0 && <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rotate-45 bg-rose-500" /> Test result</span>}
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-[1.5px] border-slate-400 bg-white" /> Must have</span>
      </div>
    </figure>
  );
}

const GROUPS = [
  { key: "strengths", title: "Strengths", icon: CheckCircle2, cls: "text-emerald-600", empty: "Nothing stands out yet." },
  { key: "gaps", title: "Gaps", icon: MinusCircle, cls: "text-amber-600", empty: "No gaps found in what was measured." },
  { key: "watch", title: "Check before deciding", icon: AlertTriangle, cls: "text-red-600", empty: "Nothing flagged." },
];

/** Strengths, gaps and things to check — one line each, with where it came from. */
export function KeyPoints({ points, onOpen }) {
  return (
    <div className="space-y-4">
      {GROUPS.map((g) => (
        <section key={g.key} aria-labelledby={`kp-${g.key}`}>
          <h4 id={`kp-${g.key}`} className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-slate-500 uppercase">
            <g.icon className={`h-3.5 w-3.5 ${g.cls}`} aria-hidden="true" /> {g.title}
            <span className="num font-semibold text-slate-400">{points[g.key].length || ""}</span>
          </h4>
          {points[g.key].length ? (
            <ul className="mt-1.5 space-y-1">
              {points[g.key].map((p, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => onOpen?.(p.tab)}
                    className="group flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50"
                  >
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${g.key === "strengths" ? "bg-emerald-500" : g.key === "gaps" ? "bg-amber-500" : "bg-red-500"}`} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm leading-snug text-slate-900">{p.text}</span>
                      <span className="block text-xs text-slate-500">{p.detail}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 px-2 text-xs text-slate-400">{g.empty}</p>
          )}
        </section>
      ))}
    </div>
  );
}

const STATUS = {
  satisfied: { label: "Met", cls: "bg-emerald-100 text-emerald-800" },
  partial: { label: "Partly met", cls: "bg-amber-100 text-amber-800" },
  unmet: { label: "Not met", cls: "bg-red-100 text-red-700" },
  contradicted: { label: "Contradicted", cls: "bg-red-100 text-red-700" },
  absent: { label: "No evidence", cls: "bg-slate-100 text-slate-600" },
};

const QUOTE_STATUS = {
  contradicted_in_assessment: { label: "Test did not back this up", cls: "text-red-700" },
  verified_in_assessment: { label: "Confirmed by the test", cls: "text-emerald-700" },
  verified: { label: "Confirmed", cls: "text-emerald-700" },
};

function MiniBar({ value, hue, none, empty }) {
  if (value == null || none) {
    return (
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-full rounded-full border border-dashed border-slate-300" aria-hidden="true" />
        <span className="w-20 shrink-0 text-right text-[11px] font-medium normal-case tracking-normal text-slate-400">{none ? "None found" : empty}</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <span className={`block h-full rounded-full ${hue}`} style={{ width: `${value}%` }} />
      </span>
      <span className="num w-20 shrink-0 text-right text-[11px] font-semibold text-slate-700">{value}</span>
    </span>
  );
}

/** Each criterion as a row — CV and test bars side by side; open it for the why and the quotes. */
export function CriterionRows({ rows, focus, onFocus, open, onToggle }) {
  const anyTest = rows.some((r) => r.test != null);
  return (
    <ol className="divide-y divide-slate-100">
      {rows.map((r, i) => {
        const isOpen = open === r.id;
        const st = STATUS[r.status];
        return (
          <li key={r.id} onMouseEnter={() => onFocus?.(r.id)} className={focus === r.id ? "bg-slate-50/80" : ""}>
            <button
              type="button"
              onClick={() => onToggle?.(isOpen ? null : r.id)}
              aria-expanded={isOpen}
              className="grid w-full grid-cols-[24px_minmax(0,1fr)_20px] items-center gap-x-3 gap-y-1.5 px-3 py-2.5 text-left sm:grid-cols-[24px_minmax(0,1.4fr)_minmax(0,1fr)_20px]"
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${focus === r.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>{i + 1}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-900" title={r.label}>{r.label}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  {st && <span className={`rounded px-1.5 py-px text-[10px] font-semibold ${st.cls}`}>{st.label}</span>}
                  {r.tag && <span className="text-[11px] text-slate-500">{r.tag}</span>}
                </span>
              </span>
              <span className="col-span-3 col-start-2 space-y-1 sm:col-span-1 sm:col-start-auto">
                <span className="flex items-center gap-2 text-[10px] font-semibold tracking-wide text-sky-700 uppercase">
                  <span className="w-7 shrink-0">CV</span>
                  <span className="flex-1"><MiniBar value={r.cv} none={r.cvNone} hue="bg-sky-500" empty="Not assessed" /></span>
                </span>
                {anyTest && (
                  <span className="flex items-center gap-2 text-[10px] font-semibold tracking-wide text-rose-700 uppercase">
                    <span className="w-7 shrink-0">Test</span>
                    <span className="flex-1"><MiniBar value={r.test} hue="bg-rose-500" empty="Not tested" /></span>
                  </span>
                )}
              </span>
              <ChevronDown className={`col-start-3 row-start-1 h-4 w-4 text-slate-400 transition-transform sm:col-start-4 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {isOpen && (
              <div className="space-y-2 px-3 pb-3 pl-12 text-xs text-slate-600">
                {r.reasoning && <p className="leading-relaxed">{r.reasoning}</p>}
                {r.test != null && (
                  <p>
                    <span className="font-semibold text-rose-700">Test:</span> {r.testDetail} questions on this correct.
                  </p>
                )}
                {r.quotes.slice(0, 2).map((q, qi) => (
                  <blockquote key={qi} className="rounded-lg border-l-2 border-sky-300 bg-sky-50/60 px-3 py-2">
                    <p className="italic text-slate-700">“{q.quote}”</p>
                    {QUOTE_STATUS[q.status] && <p className={`mt-1 text-[11px] font-semibold ${QUOTE_STATUS[q.status].cls}`}>{QUOTE_STATUS[q.status].label}</p>}
                  </blockquote>
                ))}
                {!r.reasoning && !r.quotes.length && r.test == null && <p className="text-slate-400">No further detail recorded.</p>}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
