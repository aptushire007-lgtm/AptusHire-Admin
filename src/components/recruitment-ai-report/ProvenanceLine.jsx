import { useState } from "react";
import { Info, Cpu, Code2 } from "lucide-react";

/**
 * What this card was computed from, and by what.
 *
 * The reference deck prints one word of this — `Based on CV` — under every card
 * title, and it is a genuinely good idea we are taking: a report that mixes
 * résumé-derived and interview-derived findings on one screen has to say which
 * is which, on every card, or a reader silently attributes all of it to the
 * interview.
 *
 * OUR VERSION GOES ONE STEP FURTHER, AND THE STEP IS THE POINT. Behind the same
 * line sits the record that makes the number reproducible: which frozen rubric
 * version scored it, which prompt version ran, when, the scorer version, and the
 * reproducibility hash. Every one of those is already stored on `AtsAssessment`
 * and `InterviewSession.evaluation` — this is the first surface that shows them
 * next to the figure they produced rather than a settings page away.
 *
 * The `computedBy` badge is the part that matters most and costs least. A number
 * a deterministic scorer produced from a frozen key and a number a language
 * model wrote are different kinds of claim, and a report that presents them in
 * identical type is making the weaker one look like the stronger one. This is
 * also the reason the badge is a WORD and not a colour: it must survive a
 * greyscale print of the PDF.
 *
 * Disclosure is a button, not a hover title. A hover tooltip is unreachable on
 * touch and invisible to a keyboard, and this is audit metadata — the one class
 * of content that has to be reachable by whoever comes asking later.
 */
const COMPUTED = {
  code: { icon: Code2, label: "Computed in code", hint: "Deterministic — no model in the scoring path." },
  model: { icon: Cpu, label: "Model-written", hint: "A language model produced this text; the figures beside it did not come from it." },
};

export default function ProvenanceLine({ basis, computedBy, details = [] }) {
  const [open, setOpen] = useState(false);
  const rows = details.filter((d) => d && d.value != null && d.value !== "");
  const meta = COMPUTED[computedBy];
  const Icon = meta?.icon;

  return (
    <div className="mt-0.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
        {basis && <span className="font-medium">Based on {basis}</span>}
        {meta && (
          <span
            title={meta.hint}
            className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600"
          >
            <Icon className="h-3 w-3" aria-hidden="true" />
            {meta.label}
          </span>
        )}
        {rows.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex items-center gap-1 rounded-md font-semibold text-slate-500 underline decoration-dotted underline-offset-2 transition-colors hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <Info className="h-3 w-3" aria-hidden="true" />
            {open ? "Hide provenance" : "Provenance"}
          </button>
        )}
      </div>

      {open && rows.length > 0 && (
        <dl className="mt-2 grid gap-x-4 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] sm:grid-cols-2">
          {rows.map((d) => (
            <div key={d.label} className="flex min-w-0 items-baseline justify-between gap-2">
              <dt className="shrink-0 text-slate-500">{d.label}</dt>
              <dd className="min-w-0 truncate text-right font-medium tabular-nums text-slate-700" title={String(d.value)}>
                {d.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
