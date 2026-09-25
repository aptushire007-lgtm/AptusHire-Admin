/**
 * Applications-over-time area chart.
 * Hand-built SVG with the shared AptusHire chart palette.
 */

import { VISUALIZATION_COLORS } from "../../lib/visualizationColors.js";

const W = 720;
const H = 180;
const PAD_Y = 16;

function buildPoints(values, axisMax) {
  const step = values.length > 1 ? W / (values.length - 1) : W;
  return values.map((v, i) => {
    const x = i * step;
    const y = H - PAD_Y - (axisMax === 0 ? 0 : (v / axisMax) * (H - PAD_Y * 2));
    return { x, y };
  });
}

// Rounds the axis ceiling to a step a reader can count by (1, 2, 5, 10, 25,
// 50, ...) instead of whatever the data's actual max happens to be — the
// same rule most charting libraries use for a y-axis nobody hand-tuned.
function niceStep(rawStep) {
  if (rawStep <= 1) return 1;
  if (rawStep <= 2) return 2;
  if (rawStep <= 5) return 5;
  if (rawStep <= 10) return 10;
  if (rawStep <= 25) return 25;
  if (rawStep <= 50) return 50;
  return Math.ceil(rawStep / 50) * 50;
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
  const step = niceStep(Math.max(1, max) / 4);
  const axisMax = step * 4;
  const ticks = [axisMax, step * 3, step * 2, step, 0];

  const points = buildPoints(values, axisMax);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
  const area = [...line, `L${W} ${H - PAD_Y}`, `L0 ${H - PAD_Y}`, "Z"].join(" ");
  const peakIndex = values.indexOf(max);
  const peak = points[peakIndex];

  return (
    <figure className="mt-2">
      <div className="flex gap-2">
        {/* Y-axis */}
        <div className="flex h-48 w-6 shrink-0 flex-col justify-between pb-4 text-right text-[10px] font-medium text-[#8AA0B5]">
          {ticks.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-48 w-full overflow-visible"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Applications per period. Peak of ${max} in ${buckets[peakIndex]?.label}. ${total} in total.`}
          >
            {/* Subtle horizontal grid lines, one per axis tick */}
            <g stroke="#E4EDF5" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke">
              {ticks.map((t) => {
                const y = (H - PAD_Y - (axisMax === 0 ? 0 : (t / axisMax) * (H - PAD_Y * 2))).toFixed(1);
                return <line key={t} x1="0" y1={y} x2={W} y2={y} />;
              })}
            </g>

            {/* Area fill under the line */}
            <path d={area} fill="#EAF5FF" />

            {/* Main line */}
            <path
              d={line.join(" ")}
              fill="none"
              stroke={VISUALIZATION_COLORS.blue}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />

            {/* Soft halo under the peak point only */}
            {max > 0 && <circle cx={peak.x} cy={peak.y} r="7" fill={VISUALIZATION_COLORS.blue} opacity="0.22" />}

            {/* A small dot on every point, so the line reads as real,
                individually-measured data rather than a drawn curve. */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={i === peakIndex ? 4 : 2.5}
                fill={VISUALIZATION_COLORS.blue}
                stroke="#ffffff"
                strokeWidth={i === peakIndex ? 1.5 : 1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          <figcaption className="mt-3 flex justify-between text-xs num tabular-nums text-[#7C91A8]">
            <span>{buckets[0]?.label}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF5FF] px-2.5 py-0.5 font-bold text-[#2F9CF4]">
              Peak: {max} applicants · {buckets[peakIndex]?.label}
            </span>
            <span>{buckets[buckets.length - 1]?.label}</span>
          </figcaption>
        </div>
      </div>
    </figure>
  );
}
