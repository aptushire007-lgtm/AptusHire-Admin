/**
 * The title / description / action row every dashboard screen opens with.
 *
 * Each page previously hand-rolled this, which is why the spacing and the
 * heading size drifted between them. One component means one rhythm.
 */
export default function PageHeader({ title, description, action, steps, children }) {
  return (
    <header className="workspace-page-header flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-[-0.025em] text-slate-900 [overflow-wrap:anywhere]">
          {title}
        </h1>
        {description && (
          <p className="prose-wrap mt-1 max-w-prose text-sm text-slate-500">{description}</p>
        )}
        {steps?.length > 0 && <StepStrip steps={steps} />}
        {children}
      </div>
      {action && <div className="flex w-full min-w-0 max-w-full flex-wrap items-center gap-2 sm:w-auto">{action}</div>}
    </header>
  );
}

/**
 * "Step 1 → Step 2 → Step 3" — what this screen is for, and where it sits.
 *
 * Several screens in this product are one stage of a longer process (a test is
 * authored here, taken elsewhere, and its result lands on a third screen), and
 * a recruiter opening one of them cold has no way to tell which part they are
 * looking at. A title cannot carry that; three short clauses can.
 *
 * An <ol> because the order is the meaning. The arrows are decorative and
 * hidden from assistive tech — the list semantics already carry the sequence,
 * and "one right arrow two right arrow three" is noise on top of it.
 */
export function StepStrip({ steps }) {
  return (
    <ol className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
      {steps.map((step, index) => (
        <li key={step} className="flex items-center gap-2">
          {index > 0 && (
            <span aria-hidden="true" className="text-slate-300">
              →
            </span>
          )}
          <span className="flex items-baseline gap-1.5">
            <span className="num text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
              Step {index + 1}
            </span>
            <span className="text-xs text-slate-600">{step}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
