/**
 * AptusHire — HiringAnt Design System
 * Card primitives: white surfaces, green brand, sage accents
 */

const cardTones = {
  default:        { border: "border border-[#E4E4E7]",       surface: "bg-white" },
  brand:          { border: "border border-[#BBF7D0]",        surface: "bg-[#F0FDF4]" },
  ember:          { border: "border border-[#BBF7D0]",        surface: "bg-[#F0FDF4]" },
  "filled-brand": { border: "border border-transparent",      surface: "bg-[#176B45] text-white" },
  "filled-gold":  { border: "border border-transparent",      surface: "bg-[#176B45] text-white" },
  "filled-ember": { border: "border border-transparent",      surface: "bg-[#176B45] text-white" },
  "filled-orange":{ border: "border border-transparent",      surface: "bg-[#176B45] text-white" },
  white:          { border: "border border-[#E4E4E7]",        surface: "bg-white" },
};

const OWN_SURFACE  = /(^|\s)(bg-|surface-|fill-)/;
const BORDER_NON_COLOR = /^(?:\d+|[xytrbles]|[xytrbles]-\d+|solid|dashed|dotted|double|hidden|none)$/;

function ownsBorderColor(cn) {
  return cn.split(/\s+/).some((tok) => {
    const util = tok.slice(tok.lastIndexOf(":") + 1);
    if (!util.startsWith("border-")) return false;
    return !BORDER_NON_COLOR.test(util.slice("border-".length).split("/")[0]);
  });
}

export function toneText(tone) {
  if (tone === "filled-brand")   return { strong: "text-white", soft: "text-white/80", tile: "on-fill" };
  if (tone === "filled-gold")    return { strong: "text-white", soft: "text-white/80", tile: "on-fill" };
  if (tone === "filled-ember")   return { strong: "text-white", soft: "text-white/80", tile: "on-fill" };
  if (tone === "filled-orange")  return { strong: "text-white", soft: "text-white/80", tile: "on-fill" };
  if (tone === "ember")          return { strong: "text-[#09090B]", soft: "text-[#71717A]", tile: "ember" };
  if (tone === "brand")          return { strong: "text-[#09090B]", soft: "text-[#71717A]", tile: "brand" };
  return                                { strong: "text-[#09090B]", soft: "text-[#71717A]", tile: "brand" };
}

const cardPadding = { default: "p-6", compact: "p-4", none: "p-0" };

export function Card({
  children,
  className = "",
  as: Component = "div",
  interactive = false,
  tone = "default",
  padding = "default",
  ...props
}) {
  const t = cardTones[tone] ?? cardTones.default;
  return (
    <Component
      className={[
        "min-w-0 rounded-card shadow-sm",
        cardPadding[padding] ?? cardPadding.default,
        ownsBorderColor(className) ? "" : t.border,
        OWN_SURFACE.test(className) ? "" : t.surface,
        interactive
          ? "transition-[box-shadow,border-color] duration-150 hover:border-[#D4D4D8] hover:shadow-md"
          : "",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </Component>
  );
}

// ── Icon Tile ───────────────────────────────────────────────────────────────
const tileTones = {
  brand:         "bg-[#E8F2EC] text-[#176B45]",
  ember:         "bg-[#E8F2EC] text-[#176B45]",
  orange:        "bg-[#E8F2EC] text-[#176B45]",
  slate:         "bg-[#F1F7F3] text-[#64736A]",
  positive:      "bg-[#DDF1E5] text-[#238653]",
  pending:       "bg-[#F5EDD8] text-[#A88A45]",
  negative:      "bg-[#F8EAEA] text-[#C95C5C]",
  "on-fill":     "bg-white/20 text-white",
  "on-fill-ink": "bg-black/10 text-[#17221C]",
};

const tileSizes = {
  sm: "h-9 w-9 rounded-lg [&>svg]:h-4 [&>svg]:w-4",
  md: "h-11 w-11 rounded-xl [&>svg]:h-5 [&>svg]:w-5",
  lg: "h-14 w-14 rounded-xl [&>svg]:h-6 [&>svg]:w-6",
};

export function IconTile({ icon: Icon, tone = "brand", size = "md", className = "" }) {
  if (!Icon) return null;
  return (
    <span
      aria-hidden="true"
      className={[
        "inline-flex shrink-0 items-center justify-center",
        tileSizes[size] ?? tileSizes.md,
        tileTones[tone] ?? tileTones.brand,
        className,
      ].join(" ")}
    >
      <Icon />
    </span>
  );
}

// ── Avatar ──────────────────────────────────────────────────────────────────
export function Avatar({ name, size = "md", className = "" }) {
  const initials =
    String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";
  const sizes = {
    sm: "h-8 w-8 text-[11px]",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };
  return (
    <span
      aria-hidden="true"
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-full bg-[#E8F2EC] font-semibold text-[#176B45]",
        sizes[size] ?? sizes.md,
        className,
      ].join(" ")}
    >
      {initials}
    </span>
  );
}

// ── Badge ───────────────────────────────────────────────────────────────────
export function Badge({ children, tone = "slate", className = "" }) {
  const tones = {
    // Neutral
    slate:  "border border-[#E4E4E7] bg-[#FAFAFA] text-[#3F3F46]",
    // Positive / hired / shortlisted
    green:  "bg-[#DDF1E5] text-[#238653] font-semibold",
    // Pending / screening / warning
    amber:  "bg-[#F5EDD8] text-[#A88A45] font-semibold",
    // Rejected / error
    red:    "bg-[#F8EAEA] text-[#C95C5C]",
    // Brand = primary green
    brand:  "bg-[#E8F2EC] text-[#176B45] font-semibold",
    orange: "bg-[#E8F2EC] text-[#176B45] font-semibold",
    gold:   "bg-[#F5EDD8] text-[#A88A45] font-semibold",
  };
  return (
    <span
      className={[
        "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tones[tone] ?? tones.slate,
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
export { Badge as StatusBadge };

// ── StatCard / KpiCard ───────────────────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, tone = "default", note, action, className = "", ...props }) {
  const t = toneText(tone);
  return (
    <Card tone={tone} className={`flex items-start gap-4 ${className}`} {...props}>
      {Icon && <IconTile icon={Icon} tone={t.tile} />}
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-semibold uppercase tracking-wide ${t.soft}`}>{label}</p>
        <p className={`font-display mt-1 text-2xl font-bold tracking-tight ${t.strong}`}>{value}</p>
        {note   && <p className={`mt-1 text-xs ${t.soft}`}>{note}</p>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </Card>
  );
}
export { StatCard as KpiCard };

// ── SectionHeader ────────────────────────────────────────────────────────────
export function SectionHeader({ title, description, action, icon: Icon, className = "" }) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-x-6 gap-y-3 ${className}`}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && <IconTile icon={Icon} size="sm" />}
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[#17221C]">{title}</h2>
          {description && <p className="mt-1 max-w-prose text-sm text-[#64736A]">{description}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
export function Skeleton({ className = "" }) {
  return (
    <div className={`animate-pulse motion-reduce:animate-none rounded-md bg-[#E4E4E7] ${className}`} />
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-[#D4D4D8] bg-white px-6 py-14 text-center">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8F2EC] text-[#176B45]">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-base font-bold text-[#17221C]">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-[#64736A]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
