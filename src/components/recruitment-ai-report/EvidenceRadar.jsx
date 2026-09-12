/**
 * The radar behind Cognitive Insights and Communication Skills.
 *
 * Hand-rolled SVG rather than a chart library, like every other mark on this
 * report — a radar is three polygons and some text, and pulling in a charting
 * dependency to draw it would cost more than it saves and would fight the
 * design tokens the rest of the page is built from.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS SHAPE IS ALLOWED TO SAY, AND WHAT IT IS NOT
 * ---------------------------------------------------------------------------
 *
 * A radar's area is not a quantity. Because the polygon's area grows with the
 * SQUARE of the radii, and because reordering the axes changes the area without
 * changing a single value, the enclosed region is a shape to recognise and never
 * a score to compare. That is fine for what it is used for here — reading the
 * PROFILE at a glance, the spikes and the dents — and it is why the numbers live
 * in the list beside it, where they can be read exactly and expanded to their
 * evidence. The radar is the index; the list is the finding.
 *
 * Two consequences, both load-bearing:
 *
 *   1. AXIS ORDER IS FIXED, from the server's array. Sorting the axes by score
 *      would produce a tidy shape that means nothing, and would make the same
 *      candidate look different from one render to the next.
 *
 *   2. AN UNMEASURED AXIS IS NOT A ZERO. An axis nothing could be verified for
 *      arrives with `score: undefined`, and drawing it at the origin would put a
 *      deep dent in the profile that reads as a weakness — the single most
 *      misleading thing this component could do. Undefined axes are drawn at the
 *      grid edge as a hollow tick and EXCLUDED from the polygon, which is broken
 *      at that vertex so the gap is visible rather than interpolated.
 */

const SIZE = 260;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 88; // outer ring; the labels live in the margin beyond it
const MAX = 5; // every axis on this report is a 0-5 star rating
const RINGS = [0.25, 0.5, 0.75, 1];

// Start at twelve o'clock and run clockwise, which is the order the list beside
// it reads in. A radar whose first axis is at three o'clock forces the eye to
// hunt for the correspondence.
function pointAt(index, count, radius) {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  return [CX + Math.cos(angle) * radius, CY + Math.sin(angle) * radius];
}

function polygon(points) {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

/**
 * @param {Array<{axis, label, score}>} axes  in server order; `score` may be undefined
 */
export default function EvidenceRadar({ axes = [], titleId }) {
  const list = axes.filter(Boolean);
  const n = list.length;
  if (n < 3) return null; // three vertices is the fewest that makes a shape

  const measured = list.filter((a) => typeof a.score === "number");
  // Nothing to draw. The caller still renders the list, which will say why.
  if (!measured.length) return null;

  // The grid: concentric rings at each quarter of the scale, plus a spoke per axis.
  const rings = RINGS.map((f) => polygon(list.map((_, i) => pointAt(i, n, R * f))));

  // The profile. Broken at every unmeasured vertex rather than dropped to zero,
  // so a gap in our evidence never renders as a dent in the candidate.
  const runs = [];
  let run = [];
  for (let i = 0; i < n; i += 1) {
    const s = list[i].score;
    if (typeof s === "number") {
      run.push(pointAt(i, n, R * (Math.max(0, Math.min(MAX, s)) / MAX)));
    } else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) runs.push(run);
  // A profile with no gaps is one closed polygon; with gaps it is open paths.
  const complete = measured.length === n;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-auto w-full max-w-[280px]"
      role="img"
      aria-labelledby={titleId}
      aria-describedby={`${titleId}-desc`}
    >
      <desc id={`${titleId}-desc`}>
        {measured.map((a) => `${a.label} ${a.score} out of 5`).join("; ")}
        {measured.length < n
          ? `. Not measured: ${list.filter((a) => typeof a.score !== "number").map((a) => a.label).join(", ")}.`
          : ""}
      </desc>

      {rings.map((pts, i) => (
        <polygon key={i} points={pts} className="fill-none stroke-slate-200" strokeWidth="1" />
      ))}
      {list.map((_, i) => {
        const [x, y] = pointAt(i, n, R);
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} className="stroke-slate-200" strokeWidth="1" />;
      })}

      {/* The filled profile. Pastel body, saturated edge — the Pastel-Needs-An-Edge
          Rule: a tint this light disappears against the card at small sizes
          without a ring to hold it. */}
      {complete ? (
        <polygon
          points={polygon(runs[0])}
          className="fill-chart-brand/60 stroke-brand-600"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      ) : (
        runs.map((r, i) => (
          <polyline
            key={i}
            points={polygon(r)}
            className="fill-none stroke-brand-600"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))
      )}

      {/* A dot per measured vertex, so a reader can see where the value sits when
          two adjacent axes are close enough that the edge alone is ambiguous. */}
      {list.map((a, i) => {
        if (typeof a.score !== "number") {
          // The hollow tick at the grid edge: this axis exists and was not measured.
          const [x, y] = pointAt(i, n, R);
          return <circle key={i} cx={x} cy={y} r="3" className="fill-canvas stroke-slate-300" strokeWidth="1.5" />;
        }
        const [x, y] = pointAt(i, n, R * (Math.max(0, Math.min(MAX, a.score)) / MAX));
        return <circle key={i} cx={x} cy={y} r="3" className="fill-brand-600" />;
      })}

      {/* Labels, pushed out past the ring and anchored by which side they fall on
          so the longest ones ("Intellectual Self-Awareness") do not overrun the
          viewBox on the left or collide with the shape on the right. */}
      {list.map((a, i) => {
        const [x, y] = pointAt(i, n, R + 22);
        const dx = x - CX;
        const anchor = Math.abs(dx) < 12 ? "middle" : dx > 0 ? "start" : "end";
        const unmeasured = typeof a.score !== "number";
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
            className={`text-[9px] ${unmeasured ? "fill-slate-400" : "fill-slate-600"}`}
          >
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}
