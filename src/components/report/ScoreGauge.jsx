import { useEffect, useMemo, useState } from "react";
import { VISUALIZATION_COLORS } from "../../lib/visualizationColors.js";

const CHIP_TONE = {
  positive: "bg-[#E8F2EC] text-[#176B45]",
  pending: "bg-[#E8F2EC] text-[#176B45]",
  negative: "bg-[#F8EAEA] text-[#C95C5C]",
  neutral: "border border-dashed border-[#E5EBE7] bg-[#F8FAF9] text-[#64736A]",
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
  const hasScore = value != null && Number.isFinite(numericValue) && Number(max) > 0;
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

  const accessibleScore = hasScore ? `${Math.round(score)} out of 100, ${finalZone.label} zone` : "no reading";

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
          stroke="#E4E4E7"
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
              stroke={zone.color}
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
              stroke={tick.major ? "#3F3F46" : "#A1A1AA"}
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
            fill="#71717A"
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
              fill={finalZone.color}
            />
          </g>
        )}

        <circle cx={CX} cy={CY} r="9" fill="#18181B" stroke="#FFFFFF" strokeWidth="2.5" />
        <circle cx={CX} cy={CY} r="3.2" fill={hasScore ? finalZone.color : "#A1A1AA"} />

        <text
          x={CX}
          y="143"
          textAnchor="middle"
          fill="#09090B"
          fontSize="28"
          fontWeight="800"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {shown}
        </text>
      </svg>

      {verdict && (
        <span className={`-mt-0.5 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${CHIP_TONE[verdict.tone] || CHIP_TONE.neutral}`}>
          {verdict.label}
        </span>
      )}

      {caption && <figcaption className="mt-2 text-center text-[11px] leading-snug text-[#64736A]">{caption}</figcaption>}
    </figure>
  );
}

export default ScoreSpeedometer;
