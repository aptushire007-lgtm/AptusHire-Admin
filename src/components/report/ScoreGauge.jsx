import { useEffect, useMemo, useState } from "react";
import { VISUALIZATION_COLORS } from "../../lib/visualizationColors.js";

const CHIP_TONE = {
  positive: "bg-[#EAF8E4] text-[#0E3B2E]",
  pending: "bg-[#EAF8E4] text-[#0E3B2E]",
  negative: "bg-[#FDECEC] text-[#B23B33]",
  neutral: "border border-dashed border-[#E3EBE4] bg-[#FAFCF8] text-[#5B6B63]",
};

const CX = 120;
const CY = 113;
const ARC_RADIUS = 96;
const START_ANGLE = 180;
const END_ANGLE = 360;
const ANIMATION_MS = 1800;

const ZONES = [
  { from: 0, to: 20, color: VISUALIZATION_COLORS.red, label: "Low" },
  { from: 20, to: 40, color: VISUALIZATION_COLORS.amber, label: "Review" },
  { from: 40, to: 60, color: VISUALIZATION_COLORS.blue, label: "Moderate" },
  { from: 60, to: 100, color: VISUALIZATION_COLORS.green, label: "Strong" },
];

const clamp = (number, min, max) => Math.min(max, Math.max(min, number));
const scoreAngle = (score) => START_ANGLE + (clamp(score, 0, 100) / 100) * (END_ANGLE - START_ANGLE);

function point(radius, angle) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: CX + radius * Math.cos(radians),
    y: CY + radius * Math.sin(radians),
  };
}

function arcPath(radius, start, end) {
  const first = point(radius, start);
  const last = point(radius, end);
  const largeArc = end - start > 180 ? 1 : 0;
  return `M ${first.x} ${first.y} A ${radius} ${radius} 0 ${largeArc} 1 ${last.x} ${last.y}`;
}

function zoneFor(score) {
  if (score <= 20) return ZONES[0];
  if (score <= 40) return ZONES[1];
  if (score <= 60) return ZONES[2];
  return ZONES[3];
}

function useAnimatedScore(target, enabled) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setAnimated(0);
      return undefined;
    }

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduceMotion) {
      setAnimated(target);
      return undefined;
    }

    setAnimated(0);
    let frameId;
    let startedAt;

    function animate(now) {
      if (startedAt == null) startedAt = now;
      const progress = clamp((now - startedAt) / ANIMATION_MS, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setAnimated(progress === 1 ? target : target * eased);
      if (progress < 1) frameId = window.requestAnimationFrame(animate);
    }

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [enabled, target]);

  return animated;
}

export function ScoreSpeedometer({ value, max = 100, display, verdict, caption, label }) {
  const numericValue = Number(value);
  const hasScore = value != null && value !== "" && Number.isFinite(numericValue) && Number.isFinite(Number(max)) && Number(max) > 0;
  const score = hasScore ? clamp((numericValue / Number(max)) * 100, 0, 100) : 0;
  const animatedScore = useAnimatedScore(score, hasScore);
  const needleAngle = scoreAngle(animatedScore);
  const finalZone = zoneFor(score);
  const shown = hasScore ? Math.round(animatedScore) : display ?? "—";

  const ticks = useMemo(
    () =>
      Array.from({ length: 51 }, (_, index) => {
        const tickScore = index * 2;
        const angle = scoreAngle(tickScore);
        const major = tickScore % 10 === 0;
        return {
          tickScore,
          major,
          inner: point(major ? 76 : 81, angle),
          outer: point(88, angle),
        };
      }),
    []
  );

  const labels = useMemo(
    () =>
      [0, 20, 40, 60, 80, 100].map((tickScore) => ({
        tickScore,
        position: point(66, scoreAngle(tickScore)),
      })),
    []
  );

  // Only the supplied instrument verdict may interpret the score. Generic
  // display zones otherwise invent a second, conflicting hiring policy.
  const accessibleScore = hasScore ? `${numericValue} out of ${Number(max)}` : "no reading";

  return (
    <figure
      className="flex min-w-0 flex-col items-center"
      aria-label={`${label || "Score"}: ${accessibleScore}${verdict ? `, ${verdict.label}` : ""}`}
    >
      <span className="sr-only" aria-live="polite">{`${label || "Score"}: ${accessibleScore}`}</span>

      <svg viewBox="0 0 240 151" className="h-auto w-full max-w-[15rem] overflow-visible" aria-hidden="true">
        <path
          d={arcPath(ARC_RADIUS, START_ANGLE, END_ANGLE)}
          fill="none"
          stroke="#E3EBE4"
          strokeWidth="18"
          strokeLinecap="round"
        />

        {ZONES.map((zone) => {
          const gap = 1.2;
          return (
            <path
              key={zone.label}
              d={arcPath(ARC_RADIUS, scoreAngle(zone.from) + gap, scoreAngle(zone.to) - gap)}
              fill="none"
              stroke="#5B6B63"
              strokeWidth="13"
              strokeLinecap="butt"
            />
          );
        })}

        <g>
          {ticks.map((tick) => (
            <line
              key={tick.tickScore}
              x1={tick.inner.x}
              y1={tick.inner.y}
              x2={tick.outer.x}
              y2={tick.outer.y}
              stroke={tick.major ? "#24332E" : "#5B6B63"}
              strokeWidth={tick.major ? 1.7 : 0.8}
              strokeLinecap="round"
            />
          ))}
        </g>

        {labels.map(({ tickScore, position }) => (
          <text
            key={tickScore}
            x={position.x}
            y={position.y + 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#5B6B63"
            fontSize="7"
            fontWeight="600"
          >
            {tickScore}
          </text>
        ))}

        {hasScore && (
          <g transform={`rotate(${needleAngle} ${CX} ${CY})`}>
            <path
              d={`M ${CX - 9} ${CY + 2.8} L ${CX + 72} ${CY} L ${CX - 9} ${CY - 2.8} Z`}
              fill="#0C1F1B"
            />
          </g>
        )}

        <circle cx={CX} cy={CY} r="9" fill="#162420" stroke="#FFFFFF" strokeWidth="2.5" />
        <circle cx={CX} cy={CY} r="3.2" fill={hasScore ? "#0C1F1B" : "#5B6B63"} />

        <text
          x={CX}
          y="143"
          textAnchor="middle"
          fill="#0C1F1B"
          fontSize="28"
          fontWeight="800"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {shown}
        </text>
      </svg>

      {verdict && (
        <span className={`-mt-1 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${
            CHIP_TONE[verdict.tone] || CHIP_TONE.neutral
          }`}>
          {verdict.label}
        </span>
      )}

      {caption && <figcaption className="mt-2 text-center text-[11px] leading-snug text-slate-500">{caption}</figcaption>}
    </figure>
  );
}

export default ScoreSpeedometer;
