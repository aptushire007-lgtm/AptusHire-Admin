/**
 * AptusHire PageHeader — light theme, charcoal headings.
 * The top-of-screen title/description/action row every dashboard page opens with.
 */
export default function PageHeader({ title, description, action, children }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-[#09090B] [overflow-wrap:anywhere]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-[#71717A]">
            {description}
          </p>
        )}
        {children}
      </div>
      {action && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>
      )}
    </header>
  );
}
