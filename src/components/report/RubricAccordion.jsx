import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, Badge } from "../ui/Card.jsx";
import { BUCKET_MARK, KIND_ORDER, KIND_MARK, UNTESTED_CAUSE_COPY, pctOf } from "./marks.js";

/**
 * "Assessment Rubrics" — the list beside the score.
 *
 * One row per requirement, must-haves first: the left bar and the badge carry
 * importance, the chip carries the finding, and expanding a row shows the
 * evidence behind it. The reference's version of this list is the best thing on
 * its page, and this is deliberately the same shape.
 *
 * ---------------------------------------------------------------------------
 * WHAT CAME OUT OF THIS COMPONENT, AND WHY
 * ---------------------------------------------------------------------------
 *
 * Removed as clutter, on instruction:
 *
 *   - The per-row EVIDENCE LEGS (résumé / assessment / interview cells). Their
 *     only purpose was cell-by-cell comparison between instruments, and that
 *     comparison is no longer what this page is for.
 *   - The MOVEMENT ARROW and the "N moved between the CV and the interview"
 *     line, for the same reason.
 *   - The separate pinned "Not tested" block, its explanatory paragraph, and its
 *     copy-as-questions export.
 *
 * ---------------------------------------------------------------------------
 * WHAT DID NOT COME OUT, AND WHY NOT
 * ---------------------------------------------------------------------------
 *
 * The untested REQUIREMENTS are still here — merged into the one list, in
 * importance order, wearing their own chip. Only the box around them went away.
 *
 * Dropping the rows themselves was the other way to read the instruction, and it
 * fails on a case worth stating plainly: a must-have we never got to would then
 * be missing from a list whose other rows all say "Proven". A reader scanning
 * six green rows would conclude the role was covered, when we actually tested
 * six of nine — and nothing on this screen would tell them otherwise. Keeping
 * the row costs one line; the chip says "Not tested" in words as well as colour,
 * and expanding it still gives the reason in plain language.
 */

// The quotes are the evidence, and their provenance is the whole reason they
// beat a generated paragraph. `resumeQuote` is a span from the parsed CV;
// `answerQuote` is a code-verified span of what the candidate actually said.
// Neither is a model's rendering of either — see `InterviewSession.turns
// .agentRendering` for why that distinction is enforced upstream too.
function QuotePair({ probe }) {
  if (!probe) return null;
  const claim = probe.claimQuote || probe.resumeQuote;
  const answer = probe.answerQuote;
  if (!claim && !answer) return null;

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {claim && (
        <figure className="min-w-0 rounded-lg border border-[#E5EBE7] bg-[#F8FAF9] p-2.5">
          <figcaption className="text-[10px] font-semibold tracking-[0.06em] text-[#9BAAA1] uppercase">
            What the CV claimed
          </figcaption>
          <blockquote className="mt-1 text-[11px] leading-relaxed text-[#64736A] italic [overflow-wrap:anywhere]">
            &ldquo;{claim}&rdquo;
          </blockquote>
        </figure>
      )}
      {answer && (
        <figure className="min-w-0 rounded-lg border border-[#C7DDD1] bg-[#E8F2EC]/40 p-2.5">
          <figcaption className="text-[10px] font-semibold tracking-[0.06em] text-brand-700 uppercase">
            What they said when asked
          </figcaption>
          <blockquote className="mt-1 text-[11px] leading-relaxed text-[#64736A] italic [overflow-wrap:anywhere]">
            &ldquo;{answer}&rdquo;
          </blockquote>
        </figure>
      )}
    </div>
  );
}

function Row({ row, open, onToggle }) {
  const bucket = BUCKET_MARK[row.bucket] || BUCKET_MARK.insufficient;
  const kind = KIND_MARK[row.kind] || KIND_MARK.nice_to_have;

  return (
    <li className="border-b border-[#E5EBE7] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="tap-target flex w-full items-center gap-3 px-1 py-3 text-left transition-colors duration-150 hover:bg-[#DDECE3]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        {/* The left bar encodes IMPORTANCE, which is the one thing about a
            requirement that is true before any evidence arrives. The reference
            colours this bar inconsistently and it carries no meaning there. */}
        <span aria-hidden="true" className={`h-8 w-[3px] shrink-0 rounded-full ${kind.bar}`} />

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {kind.badge && <Badge tone={kind.badge}>{kind.label}</Badge>}
            <span className="text-sm font-semibold text-[#17221C] [overflow-wrap:anywhere]">{row.label}</span>
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-[#64736A]">{row.evidence}</span>
        </span>

        {/* Glyph AND word, never colour alone — the green/red pair only clears
            the contrast floor on the condition that it is not the sole encoding. */}
        <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${bucket.text}`}>
          <span
            aria-hidden="true"
            className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm text-[9px] font-bold text-white ${bucket.chip}`}
          >
            {bucket.glyph}
          </span>
          <span className="hidden md:inline">{bucket.label}</span>
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#9BAAA1] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="px-1 pb-4 pl-[1.1rem]">
          <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-[11px]">
            <div className="flex items-baseline gap-1.5">
              <dt className="text-[#64736A]">Share of role</dt><dd className="font-bold tabular-nums text-[#17221C]">{pctOf(row.weight)}%</dd>
            </div>
            {row.assessmentDetail?.itemCount > 0 && (
              <div className="flex items-baseline gap-1.5">
                <dt className="text-[#64736A]">Test items</dt><dd className="font-semibold tabular-nums text-[#17221C]">
                  {row.assessmentDetail.correctCount}/{row.assessmentDetail.itemCount}
                </dd>
              </div>
            )}
          </dl>

          {row.anchorCovered && row.anchorTerms?.length > 0 && (
            <p className="mt-2 text-[11px] text-[#64736A]">
              Came up via their CV: {row.anchorTerms.join(", ")}. That proves the subject was raised, not what the
              answer showed.
            </p>
          )}

          <QuotePair probe={row.decidingProbe} />

          {row.untestedCause && UNTESTED_CAUSE_COPY[row.untestedCause] && (
            <p className="mt-3 rounded-lg bg-[#E8F2EC] px-3 py-2 text-[11px] leading-relaxed text-[#64736A]">
              {UNTESTED_CAUSE_COPY[row.untestedCause]}
            </p>
          )}

          {row.underpowered && (
            <p className="mt-2 text-[11px] leading-relaxed text-[#64736A]">
              We didn&apos;t ask enough here to say either way. Not their fault — ours.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export default function RubricAccordion({ coverage, id, provenance }) {
  const [open, setOpen] = useState(() => new Set());
  const all = coverage?.rows || [];
  if (all.length === 0) return null;

  // Weight already encodes importance and the rows arrive sorted by it, but a
  // nice-to-have at 20% must never sort above a must-have at 15%: a pass on a
  // must-have and a pass on a nice-to-have are not the same result, and the
  // reader has to meet the must-haves first.
  const rows = [...all].sort(
    (a, b) => (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9) || (b.weight || 0) - (a.weight || 0)
  );

  const toggle = (criterionId) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(criterionId)) next.delete(criterionId);
      else next.add(criterionId);
      return next;
    });

  return (
    <Card id={id} className="scroll-mt-32">
      <h3 className="font-display text-base font-bold tracking-tight text-[#17221C]">
        Assessment Rubrics <span className="font-normal text-[#64736A]">({all.length})</span>
      </h3>
      {provenance}

      <ul className="mt-3 border-t border-[#E5EBE7]">
        {rows.map((r) => (
          <Row key={r.criterionId} row={r} open={open.has(r.criterionId)} onToggle={() => toggle(r.criterionId)} />
        ))}
      </ul>
    </Card>
  );
}
