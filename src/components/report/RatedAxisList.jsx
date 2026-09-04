import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";

/**
 * The rated list beside each radar — one row per axis, expanding to its evidence.
 *
 * ---------------------------------------------------------------------------
 * THE ONE THING THAT MAKES THIS DIFFERENT FROM THE THING IT LOOKS LIKE
 * ---------------------------------------------------------------------------
 *
 * The reference product expands a row like this into a paragraph: "The candidate
 * exhibits frequent grammatical errors, including incorrect verb tenses…". It
 * reads authoritatively, and there is no way to check it. The paragraph and the
 * rating came out of the same model call, so the explanation cannot disagree with
 * the score — which means it is not evidence for the score, it is a restatement
 * of it in prose.
 *
 * These rows expand into the QUOTES. Every star was computed in code from
 * observations the model had to cite and that were then verified against the
 * transcript (backend/utils/interviewInsights.js); anything it could not
 * quote was dropped before the arithmetic ran. So what opens here is the actual
 * basis, in the candidate's own words, and a reviewer who thinks the rating is
 * wrong can see precisely which spans produced it and overrule them.
 *
 * ---------------------------------------------------------------------------
 * STARS ARE NOT THE ONLY ENCODING
 * ---------------------------------------------------------------------------
 *
 * The numeral is always printed next to them. Five glyphs at 12px differing by a
 * half-fill is a hard read for anyone, and an impossible one at low vision — and
 * the tone colour cannot carry it either, since it is the same red/amber/green
 * channel the verdicts use. Glyph, colour and number, every row.
 */

// Tone follows the value, and the thresholds are shared with nothing — these are
// stars on a 0-5 scale, not a percentage, and reusing the verdict bands would
// silently assert that 3/5 on Insightfulness means the same as a 60% score.
function toneFor(score) {
  if (score == null) return "text-[#9B9B9B]";
  if (score >= 4) return "text-[#FF6B2C]";
  if (score >= 3) return "text-[#FF6B2C]";
  return "text-[#C0392B]";
}

function Stars({ score }) {
  if (score == null) {
    return <span className="text-xs font-medium text-[#9B9B9B]">Not measured</span>;
  }
  const tone = toneFor(score);
  return (
    <span className="flex items-center gap-1.5">
      <span className={`flex ${tone}`} aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.max(0, Math.min(1, score - i));
          return (
            <span key={i} className="relative inline-block h-3 w-3 leading-none">
              <span className="absolute inset-0 text-slate-200">★</span>
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                ★
              </span>
            </span>
          );
        })}
      </span>
      <span className={`text-xs font-semibold tabular-nums ${tone}`}>{score}</span>
    </span>
  );
}

// The observation field names are camelCase identifiers from the engine
// (`reasonsFromPremiseToConclusion`). Rendered as-is they read as code; this is
// presentation only and changes no value.
function humanise(name) {
  return String(name || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

// Why an axis produced nothing, in the words a recruiter would use. Every one of
// these is a statement about OUR instrument, never about the candidate — the
// same rule the untested-cause copy lives under.
const NOT_MEASURED_COPY = {
  transcription_unreliable:
    "The transcript wasn't clear enough here to tell the candidate's wording from the transcriber's guess, so we didn't score it.",
  answer_too_short: "Their answers were too short to read anything from.",
};

function Row({ axis }) {
  const [open, setOpen] = useState(false);
  const observations = axis.observations || [];
  const canOpen = observations.length > 0 || axis.score == null;

  return (
    <div className="border-b border-[#E8E8E4] last:border-b-0">
      <button
        type="button"
        onClick={() => canOpen && setOpen((v) => !v)}
        aria-expanded={canOpen ? open : undefined}
        disabled={!canOpen}
        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${
          canOpen ? "hover:bg-[#F5F5F0]" : "cursor-default"
        }`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-[#1A1A1A]">{axis.label}</span>
          {axis.hint && (
            <span className="group/hint relative inline-flex shrink-0" title={axis.hint}>
              <Info className="h-3 w-3 text-[#9B9B9B]" aria-hidden="true" />
              <span className="sr-only">{axis.hint}</span>
            </span>
          )}
        </span>
        <Stars score={axis.score} />
        {canOpen && (
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[#9B9B9B] transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div className="space-y-2 border-t border-[#E8E8E4] bg-[#F5F5F0] px-3 py-3">
          {axis.score == null ? (
            <p className="text-xs text-[#6B6B6B]">
              {NOT_MEASURED_COPY[axis.reason] ||
                "Not enough could be verified in the transcript to give a reading. This is a gap in our evidence, not a finding about the candidate."}
            </p>
          ) : (
            <>
              <p className="text-[11px] font-semibold tracking-[0.06em] text-[#6B6B6B] uppercase">
                What this is based on
              </p>
              <ul className="space-y-1.5">
                {observations.map((o, i) => (
                  <li key={i} className="flex gap-2 text-xs">
                    <span
                      className={`mt-0.5 shrink-0 font-bold ${
                        o.adverse ? "text-[#C0392B]" : "text-[#FF6B2C]"
                      }`}
                      aria-hidden="true"
                    >
                      {o.adverse ? "−" : "+"}
                    </span>
                    <span className="min-w-0">
                      <span className="text-[#6B6B6B]">{humanise(o.indicator)}</span>
                      {o.quote && (
                        <span className="mt-0.5 block border-l-2 border-[#E8E8E4] pl-2 text-[#1A1A1A] italic [overflow-wrap:anywhere]">
                          “{o.quote}”
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {/* Said out loud rather than left as a footnote. A grammar rating over
                  four spans when nine were thrown away for bad audio is a different
                  finding from one over thirteen, and the star cannot say so. */}
              {axis.excluded > 0 && (
                <p className="pt-1 text-[11px] text-[#6B6B6B]">
                  {axis.excluded} further span{axis.excluded === 1 ? "" : "s"} {axis.excluded === 1 ? "was" : "were"}{" "}
                  excluded — the transcription there wasn&rsquo;t reliable enough to attribute to the candidate.
                </p>
              )}
              {axis.answersScored != null && axis.answersTotal != null && (
                <p className="text-[11px] text-[#6B6B6B]">
                  Read over {axis.answersScored} of {axis.answersTotal} answer
                  {axis.answersTotal === 1 ? "" : "s"}.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function RatedAxisList({ axes = [] }) {
  const list = axes.filter(Boolean);
  if (!list.length) return null;
  return (
    <div className="overflow-hidden rounded-lg border border-[#E8E8E4]">
      {list.map((a) => (
        <Row key={a.axis} axis={a} />
      ))}
    </div>
  );
}
