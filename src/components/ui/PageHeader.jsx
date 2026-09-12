/**
 * The title / description / action row every dashboard screen opens with.
 *
 * Each page previously hand-rolled this, which is why the spacing and the
 * heading size drifted between them. One component means one rhythm.
 */
export default function PageHeader({ title, description, action, children }) {
  return (
    <header className="workspace-page-header flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-[-0.025em] text-slate-900 [overflow-wrap:anywhere]">
          {title}
        </h1>
        {description && (
          <p className="prose-wrap mt-1 max-w-prose text-sm text-slate-500">{description}</p>
        )}
        {children}
      </div>
      {action && <div className="flex w-full min-w-0 max-w-full flex-wrap items-center gap-2 sm:w-auto">{action}</div>}
    </header>
  );
}
