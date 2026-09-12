/**
 * Applications-over-time area chart.
 * Hand-built SVG with the shared AptusHire chart palette.
 */

import { VISUALIZATION_COLORS } from "../../lib/visualizationColors.js";

const W = 720;
const H = 180;
const PAD_Y = 16;

function buildPath(values, max) {
  const step = values.length > 1 ? W / (values.length - 1) : W;
  return values.map((v, i) => {
    const x = i * step;
    const y = H - PAD_Y - (max === 0 ? 0 : (v / max) * (H - PAD_Y * 2));
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  });
}

export default function TrendChart({ buckets, emptyLabel = "No applications yet" }) {
  const values = buckets.map((b) => b.count);
  const total = values.reduce((a, b) => a + b, 0);

  if (!buckets.length || total === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
        <p className="text-xs font-medium text-slate-400">{emptyLabel}</p>
      </div>
    );
  }

  const max = Math.max(...values);
  const line = buildPath(values, max);
  const area = [...line, `L${W} ${H - PAD_Y}`, `L0 ${H - PAD_Y}`, "Z"].join(" ");
  const peakIndex = values.indexOf(max);
  const step = values.length > 1 ? W / (values.length - 1) : W;
  const peakX = (peakIndex * step).toFixed(1);
  const peakY = (H - PAD_Y - (max === 0 ? 0 : (max / max) * (H - PAD_Y * 2))).toFixed(1);

  return (
    <figure className="mt-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-48 w-full overflow-visible"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Applications per period. Peak of ${max} in ${buckets[peakIndex]?.label}. ${total} in total.`}
      >
        {/* Subtle grid lines */}
        <g stroke="currentColor" className="text-slate-200" strokeWidth="1" vectorEffect="non-scaling-stroke">
          <line x1="0" y1={H - PAD_Y} x2={W} y2={H - PAD_Y} />
          <line x1="0" y1={(H - PAD_Y) / 2} x2={W} y2={(H - PAD_Y) / 2} strokeDasharray="4 4" />
        </g>

        {/* Gradient fill */}
        <path d={area} fill="#EAF8E4" fillOpacity="0.45" />

        {/* Main spline line */}
        <path
          d={line.join(" ")}
          fill="none"
          stroke={VISUALIZATION_COLORS.green}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Peak highlight indicator */}
        {max > 0 && (
          <g transform={`translate(${peakX}, ${peakY})`}>
            <circle r="6" fill={VISUALIZATION_COLORS.green} opacity="0.35" />
            <circle r="4" fill={VISUALIZATION_COLORS.green} stroke="#ffffff" strokeWidth="1.5" />
          </g>
        )}
      </svg>

      <figcaption className="mt-3 flex justify-between text-xs num tabular-nums text-slate-500">
        <span>{buckets[0]?.label}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-700">
          Peak: {max} applicants · {buckets[peakIndex]?.label}
        </span>
        <span>{buckets[buckets.length - 1]?.label}</span>
      </figcaption>
    </figure>
  );
}
