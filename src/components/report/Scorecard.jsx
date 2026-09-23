/**
 * The visual vocabulary of a candidate's report: a ring for a score, a strip
 * that places it among real applicants, a bar for right / wrong / unanswered,
 * and a bar per criterion.
 *
 * Hand-rolled SVG and CSS, like every other mark in this app — each of these is
 * a few shapes, and a chart library would cost more to keep on-token than it
 * saves.
 *
 * Every component here has an honest "no figure" state, and it is drawn
 * differently from a low figure: a dashed empty ring, a withheld label, a grey
 * "no evidence" bar. A missing score must never look like a measured zero
 * (PRODUCT.md), and on a chart the easiest way to break that rule is to draw
 * nothing as an empty bar that reads as 0.
 */

const RING_STROKE = {
  sky: "stroke-sky-500",
  rose: "stroke-rose-500",
  violet: "stroke-violet-500",
  amber: "stroke-amber-500",
  brand: "stroke-brand-600",
};

/**
 * A score out of 100 as a ring, in its step's colour (lib/featureHues.js), so
 * the CV score is the same sky blue here as on the pipeline card and in job
 * creation.
 *
 * `value == null` draws a dashed empty ring with `emptyLabel` — "Not run",
 * "Withheld" — in place of a figure.
 */
export function ScoreRing({ value, hue = "brand", size = 88, emptyLabel = "—", label }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const has = value != null && Number.isFinite(Number(value));
  const pct = has ? Math.max(0, Math.min(100, Number(value))) : 0;
  return (
    <svg
      viewBox="0 0 88 88"
      width={size}
      height={size}
      role="img"
      aria-label={label ? `${label}: ${has ? `${Math.round(pct)} out of 100` : emptyLabel}` : undefined}
      className="shrink-0"
    >
      <circle
        cx="44"
        cy="44"
        r={r}
        fill="none"
        strokeWidth="8"
        className="stroke-slate-100"
        strokeDasharray={has ? undefined : "4 5"}
      />
      {has && (
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={`${RING_STROKE[hue] || RING_STROKE.brand} transition-[stroke-dashoffset] duration-700`}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          transform="rotate(-90 44 44)"
        />
      )}
      <text
        x="44"
        y={has ? 48 : 47}
        textAnchor="middle"
        className={has ? "fill-slate-900 text-[20px] font-semibold" : "fill-slate-500 text-[11px] font-medium"}
      >
        {has ? Math.round(pct) : emptyLabel}
      </text>
    </svg>
  );
}

/**
 * Where this candidate's score sits among everyone else scored for the role.
 *
 * One dot per REAL applicant — the scores come from this job's own applications
 * — with this candidate's drawn larger and in the step's colour. It is the
 * honest version of a "you are in the 70–80th percentile" bell curve: a smooth
 * curve over eight people is a shape the data does not have, while eight dots
 * are exactly the data.
 *
 * The caption always states its denominator. With fewer than three others there
 * is nothing meaningful to compare against, so it says that instead of
 * producing a percentile from two data points.
 */
export function DistributionStrip({ values, mine, hue = "sky" }) {
  const others = (values || []).filter((v) => Number.isFinite(v));
  if (mine == null || !Number.isFinite(mine)) return null;
  const beaten = others.filter((v) => v < mine).length;
  const enough = others.length >= 3;
  const dot = { sky: "bg-sky-500", rose: "bg-rose-500", violet: "bg-violet-500", brand: "bg-brand-600" }[hue] || "bg-brand-600";
  return (
    <figure className="w-full">
      <div className="relative h-7" role="img" aria-label={`This candidate scored ${mine}; ${others.length} other scored applicants for this role`}>
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-200" aria-hidden="true" />
        {others.map((v, i) => (
          <span
            key={i}
            className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300"
            style={{ left: `${Math.max(0, Math.min(100, v))}%` }}
            aria-hidden="true"
          />
        ))}
        <span
          className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white ${dot}`}
          style={{ left: `${Math.max(0, Math.min(100, mine))}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="flex justify-between text-[11px] text-slate-400" aria-hidden="true">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
      <figcaption className="mt-1 text-xs text-slate-600">
        {enough ? (
          <>
            Scored higher than <span className="font-semibold text-slate-900">{beaten}</span> of {others.length} other
            scored applicants for this role.
          </>
        ) : (
          <>Too few other scored applicants ({others.length}) to compare against yet.</>
        )}
      </figcaption>
    </figure>
  );
}

/**
 * Right, wrong and unanswered as one proportional bar with the counts under it.
 * Unanswered is its own segment and its own colour: a question the candidate
 * never reached is not a question they got wrong.
 */
export function ResultBar({ correct = 0, incorrect = 0, unanswered = 0 }) {
  const total = correct + incorrect + unanswered;
  if (!total) return null;
  const seg = [
    { n: correct, label: "Correct", bar: "bg-emerald-500", dot: "bg-emerald-500" },
    { n: incorrect, label: "Incorrect", bar: "bg-red-400", dot: "bg-red-400" },
    { n: unanswered, label: "Unanswered", bar: "bg-slate-300", dot: "bg-slate-300" },
  ];
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${correct} correct, ${incorrect} incorrect, ${unanswered} unanswered`}>
        {seg.map((s) => (s.n ? <span key={s.label} className={s.bar} style={{ width: `${(s.n / total) * 100}%` }} /> : null))}
      </div>
      <dl className="mt-2.5 grid grid-cols-3 gap-2">
        {seg.map((s) => (
          <div key={s.label}>
            <dt className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden="true" />
              {s.label}
            </dt>
            <dd className="num pt-0.5 text-lg font-semibold text-slate-900">{s.n}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * One horizontal bar per criterion, named — never by its internal id.
 *
 *   { label, value (0–100) | null, detail, note, tone }
 *
 * `value == null` renders the row with a dashed empty track and its `note`
 * ("No evidence in CV", "Not tested") instead of a 0% bar. `detail` is the
 * right-hand figure in words ("3 of 5"), which a percentage alone would hide.
 */
export function CriterionBars({ rows, hue = "brand" }) {
  const fill = { sky: "bg-sky-500", rose: "bg-rose-500", violet: "bg-violet-500", brand: "bg-brand-600" }[hue] || "bg-brand-600";
  return (
    <ul className="space-y-3">
      {rows.map((row, i) => {
        const has = row.value != null && Number.isFinite(Number(row.value));
        const pct = has ? Math.max(0, Math.min(100, Number(row.value))) : 0;
        return (
          <li key={row.key ?? i}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-sm text-slate-800">
                {row.label}
                {row.tag && (
                  <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 align-middle text-[10px] font-semibold tracking-wide text-slate-600 uppercase">
                    {row.tag}
                  </span>
                )}
              </span>
              <span className={`shrink-0 text-xs ${has ? "num font-semibold text-slate-900" : "text-slate-500"}`}>
                {has ? row.detail ?? `${Math.round(pct)}%` : row.note ?? "No figure"}
              </span>
            </div>
            <div
              className={`mt-1.5 h-2 overflow-hidden rounded-full ${has ? "bg-slate-100" : "border border-dashed border-slate-300 bg-transparent"}`}
              aria-hidden="true"
            >
              {/* Exactly the value — no minimum stub. A measured 0 is an empty
                  SOLID track; "not measured" is the DASHED one above. A 2% sliver
                  on a real zero read as "a little", which it is not. */}
              {has && <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />}
            </div>
            {row.hint && <p className="mt-1 text-xs leading-relaxed text-slate-500">{row.hint}</p>}
          </li>
        );
      })}
    </ul>
  );
}
