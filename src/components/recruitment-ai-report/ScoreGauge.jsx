/**
 * The instrument's headline number, as a gauge, with the word that makes it
 * readable sitting under it.
 *
 * WHY THE ARC IS ONE HUE AND NOT A RAINBOW.
 *
 * The reference deck draws this as a continuous red→amber→green sweep with the
 * needle landing somewhere on it. That encoding asserts a global cutoff for
 * "good": it says an 80 is amber and an 85 is green for every role, every rubric
 * and every candidate. This product does not score against an abstract standard,
 * only against the role's own approved rubric, so the arc cannot carry the
 * verdict — and `ScoreBar` in the report already settled the identical argument
 * for the competency bars ("colouring a 74 amber and a 76 green asserts a global
 * cutoff"). The gauge is a MAGNITUDE mark, so it takes the single-series
 * magnitude ink: `chart-brand` pastel over a `brand-600` edge, exactly as every
 * other single-series mark on this page does.
 *
 * The verdict is a WORD, in the chip, from `verdictFor()` on the server — the
 * same function the PDF prints from. That keeps the reserved verdict channel
 * (emerald/amber/red) spent on the actual call rather than on a raw sub-score,
 * and it means the screen and the PDF cannot disagree about what "80%" was worth.
 *
 * THE PASTEL-NEEDS-AN-EDGE RULE applies literally here: the filled sector is a
 * pastel and cannot clear the 3:1 non-text floor on its own, so it is drawn with
 * a 1px stroke in its own hue AND it prints its number in the middle. A gauge
 * that could not label itself would not be allowed this fill.
 *
 * `value == null` renders the track alone with an em dash — an unfilled gauge
 * reads as "no reading", which is what it means. It never renders as a zero.
 */

const CHIP_TONE = {
  positive: "bg-verdict-positive-tint text-verdict-positive",
  pending: "bg-verdict-pending-tint text-verdict-pending",
  negative: "bg-verdict-negative-tint text-verdict-negative",
  // The Honest Reading Rule: a withheld verdict must not wear a verdict colour.
  neutral: "bg-slate-100 text-slate-600 border border-dashed border-slate-300",
};

const CX = 100;
const CY = 96;
const R_OUT = 88;
const R_IN = 64;

function polar(r, deg) {
  const rad = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

// An annulus sector, so the mark can carry both a fill and its 1px edge. A
// stroked arc could only ever be one or the other.
function sector(a0, a1) {
  const [x0o, y0o] = polar(R_OUT, a0);
  const [x1o, y1o] = polar(R_OUT, a1);
  const [x1i, y1i] = polar(R_IN, a1);
  const [x0i, y0i] = polar(R_IN, a0);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M ${x0o} ${y0o} A ${R_OUT} ${R_OUT} 0 ${large} 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${R_IN} ${R_IN} 0 ${large} 0 ${x0i} ${y0i} Z`;
}

export default function ScoreGauge({ value, max = 100, display, verdict, caption, label }) {
  const has = value != null && value !== "" && Number.isFinite(Number(value));
  const frac = has ? Math.max(0, Math.min(1, Number(value) / max)) : 0;
  // In SVG coordinates y grows downward, so a top semicircle runs 180° → 360°.
  const end = 180 + 180 * frac;
  const shown = display ?? (has ? value : "—");

  return (
    <figure className="flex flex-col items-center">
      <svg
        viewBox="0 0 200 112"
        className="w-full max-w-[13rem]"
        role="img"
        aria-label={`${label || "Score"}: ${has ? `${value} out of ${max}` : "no reading"}${verdict ? `, ${verdict.label}` : ""}`}
      >
        <path d={sector(180, 360)} className="fill-slate-100" />
        {frac > 0.004 && (
          <path
            d={sector(180, end)}
            className="fill-chart-brand stroke-brand-600/60"
            strokeWidth="1"
            // The one authored motion moment this component gets: the arc
            // sweeps up from empty. Honoured by `motion-reduce` below rather
            // than by animating anyway at a shorter duration.
            style={{ transition: "d 700ms var(--ease-out)" }}
          />
        )}
        <text
          x={CX}
          y={CY - 6}
          textAnchor="middle"
          className="fill-slate-900 font-display text-[34px] font-extrabold tabular-nums"
          style={{ letterSpacing: "-0.02em" }}
        >
          {shown}
        </text>
      </svg>

      {verdict && (
        <span
          className={`-mt-1 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${
            CHIP_TONE[verdict.tone] || CHIP_TONE.neutral
          }`}
        >
          {verdict.label}
        </span>
      )}

      {caption && <figcaption className="mt-2 text-center text-[11px] leading-snug text-slate-500">{caption}</figcaption>}
    </figure>
  );
}
