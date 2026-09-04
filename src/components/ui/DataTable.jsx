/**
 * AptusHire DataTable primitives — light theme.
 * White surface, charcoal text, subtle green hover rows.
 */

export function TableWrap({ children }) {
  return (
    <div className="max-w-full overflow-x-auto rounded-card border border-border bg-surface shadow-card">
      {children}
    </div>
  );
}

export function Table({ children, className = "" }) {
  return (
    <table className={`w-full min-w-[640px] text-left text-sm ${className}`}>
      {children}
    </table>
  );
}

export function THead({ children }) {
  return (
    <thead className="border-b border-border bg-canvas text-xs font-semibold text-text-muted">
      {children}
    </thead>
  );
}

const thPadding = {
  default: "px-5 py-3",
  compact: "px-3 py-2.5",
  tight:   "px-2 py-2.5",
  none:    "px-0 py-2.5",
};
const tdPadding = {
  default: "px-5 py-3.5",
  compact: "px-3 py-3",
  tight:   "px-2 py-3",
  none:    "px-0 py-3",
};
const cellAlign = { left: "", right: "text-right", center: "text-center" };

export function TH({ children, align = "left", padding = "default", className = "" }) {
  return (
    <th
      scope="col"
      className={`font-semibold tracking-normal ${thPadding[padding] ?? thPadding.default} ${cellAlign[align] ?? ""} ${className}`}
    >
      {children}
    </th>
  );
}

export function TBody({ children }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function TR({ children, className = "" }) {
  return (
    <tr className={`bg-surface transition-colors duration-150 hover:bg-brand-50 ${className}`}>
      {children}
    </tr>
  );
}

export function TD({ children, align = "left", padding = "default", className = "" }) {
  return (
    <td
      className={`text-text ${tdPadding[padding] ?? tdPadding.default} ${cellAlign[align] ?? ""} ${className}`}
    >
      {children}
    </td>
  );
}

export function RowAction({
  as: Component = "button",
  label,
  icon: Icon,
  tone = "brand",
  className = "",
  ...props
}) {
  const tones = {
    brand:    "hover:text-primary hover:bg-brand-50 focus-visible:outline-primary",
    danger:   "hover:text-verdict-negative hover:bg-verdict-negative-tint focus-visible:outline-verdict-negative",
    positive: "hover:text-verdict-positive hover:bg-verdict-positive-tint focus-visible:outline-verdict-positive",
  };
  return (
    <Component
      title={label}
      aria-label={label}
      className={`tap-target inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 ${tones[tone] ?? tones.brand} ${className}`}
      {...props}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </Component>
  );
}
