/**
 * Shared surfaces. Every dashboard screen composes from these, so a change here
 * lands on all of them at once.
 *
 * Kept in step with user/src/components/ui/Card.jsx — see DESIGN.md § Do's
 * ("keep the two frontends' UI kits identical").
 */

/**
 * Card tones.
 *
 * `default` is the workhorse and stays white — a dashboard full of tinted
 * panels has no hierarchy left to spend. The tinted and filled tones are for
 * *grouping and emphasis*, which is the one thing they are allowed to mean.
 *
 * There is deliberately no `positive` / `pending` / `negative` tone here. A
 * whole card washed in a verdict colour reads as "this candidate is a
 * rejection" long before anyone gets to the sentence explaining why, and the
 * moment a card can be green the Reserved Verdict Rule stops holding. Outcome
 * is stated by <Badge>, on the specific claim it applies to.
 */
const cardTones = {
  // `hairline` rather than `slate-200`: they are the same family, but the
  // card border and the divider inside a card are now two named tokens that
  // must not be confused, and naming the one used here is what keeps them
  // apart. See index.css § Surfaces.
  default: { border:"border-hairline", surface:"bg-white" },
  brand: { border:"border-emerald-200", surface:"surface-brand" },
  ember: { border:"border-amber-200", surface:"surface-ember" },
  ai: { border: "border-violet-200/80", surface: "bg-violet-50/40 text-slate-900" },
  indigo: { border: "border-indigo-200/80", surface: "bg-indigo-50/40 text-slate-900" },
  "filled-brand": { border: "border-transparent", surface: "fill-brand text-white" },
  "filled-ember": { border: "border-transparent", surface: "fill-ember text-slate-950" },
};

/**
 * Does the caller's `className` bring its own background?
 *
 * Border and surface are separate fields above for exactly this test. A call
 * site that passes `className="bg-amber-50"` is asking for an amber card, but
 * Tailwind resolves two competing `bg-*` utilities by ITS OWN stylesheet order,
 * not the order they appear in the class string — and `bg-white` sorts after
 * every `bg-<hue>-<shade>`. So every such call site silently rendered white:
 * six of them, including a red alert panel and a "Recommended action" card that
 * was white text on white and had been invisible in production.
 *
 * This is the same trap DESIGN.md documents for `p-*`, which is why padding is a
 * prop. Backgrounds could have become a prop too, but a card legitimately wants
 * arbitrary one-off tints, so the primitive stands down instead: if you brought
 * a surface, ours is not emitted and there is nothing left to lose the race to.
 */
const OWN_SURFACE = /(^|\s)(bg-|surface-|fill-)/;

/**
 * The same trap, one property over.
 *
 * `border-brand-200` in a `className` silently lost to the tone's own
 * `border-slate-200` for exactly the reason above — Tailwind's stylesheet order,
 * not the class string's. Caught by measuring a card that had asked for a greige
 * border and rendered a hairline one.
 *
 * Written as a token scan rather than one regex, because the first attempt was a
 * regex and it quietly failed on `border-verdict-pending/50`: a two-segment
 * colour name matches none of the shapes you reach for when you assume colours
 * look like `border-red-200`. Enumerating what is NOT a colour is the smaller,
 * checkable set.
 *
 * Width, side and style (`border-2`, `border-t`, `border-x-2`, `border-dashed`)
 * compose fine with the tone's colour and must not suppress it.
 */
const BORDER_NON_COLOR = /^(?:\d+|[xytrbles]|[xytrbles]-\d+|solid|dashed|dotted|double|hidden|none)$/;

function ownsBorderColor(className) {
  return className.split(/\s+/).some((token) => {
    // Strip any variant prefix (`sm:`, `hover:`) before testing the utility.
    const util = token.slice(token.lastIndexOf(":") + 1);
    if (!util.startsWith("border-")) return false;
    return !BORDER_NON_COLOR.test(util.slice("border-".length).split("/")[0]);
  });
}

/**
 * Text and icon-tile classes for a given card tone.
 *
 * This exists so no call site has to remember that ember inverts. Every place
 * that writes on a card asks here instead, which is what stops one screen from
 * shipping white-on-coral at 3:1 because it copied the violet card next to it.
 *
 * `soft` on the ember fill is the same ink as `strong`, not a faded one:
 * accent-900 over accent-500 is 3.16:1, so the usual trick of dropping opacity
 * for secondary text fails here. Hierarchy comes from weight and size instead.
 */
export function toneText(tone) {
  if (tone === "filled-ember") return { strong: "text-slate-950", soft: "text-slate-900", tile: "on-fill-ink" };
  if (tone === "filled-brand") return { strong: "text-white", soft: "text-white/90", tile: "on-fill" };
  return { strong:"text-slate-900", soft:"text-slate-500", tile: tone ==="ember" ?"ember" :"brand" };
}

/**
 * Padding steps, as a prop rather than a `className` override.
 *
 * This is a prop and not `className="p-4"` because Tailwind decides which of two
 * competing `p-*` utilities wins by its own stylesheet order, not by the order
 * they appear in a JSX string — so an override is a coin flip that happens to
 * be landing right today. Selecting the class here means exactly one padding
 * utility is ever emitted.
 *
 * The steps are asymmetric — 18px of horizontal padding against 16px of
 * vertical — which is the reference's rhythm and not an oversight. Horizontal
 * padding buys separation from the border; vertical padding buys separation
 * from the row above, and a bordered card already supplies some of the latter.
 * Equal padding on a dense card reads bottom-heavy.
 *
 * `compact` shaves the vertical step for <RecordCard>: a record card is a
 * *row*, not a panel, and every pixel of it is paid for forty times on a queue
 * screen. `none` is for cards that host their own edge-to-edge content — which
 * is now the common case, since <CardHeader> + <CardRows> below want to run
 * their dividers the full width of the card.
 */
const cardPadding = {
  default: "px-[18px] py-4",
  compact: "px-[18px] py-3.5",
  none: "p-0",
};

export function Card({
  children,
  className = "",
  as: Component = "div",
  interactive = false,
  tone = "default",
  padding = "default",
  ...props
}) {
  // `interactive` is opt-in: a card that reacts on hover but does nothing when
  // clicked is a false affordance. Only pass it when the whole card is a target.
  //
  // The reaction is a border darkening, not a lift. Lifting was the old
  // treatment and it does not survive the density this system now works at — a
  // list of candidate cards that each jump 2px under the cursor is measurably
  // harder to track with the eye than one that holds still, and the hover
  // shadow it faded in was the only shadow left on an otherwise flat surface.
  const t = cardTones[tone] ?? cardTones.default;
  return (
    <Component
      // `min-w-0` is in the primitive because the bug it fixes is systemic and
      // was found in three unrelated screens at once.
      //
      // A grid/flex item's AUTOMATIC MINIMUM SIZE is its min-content, and
      // `truncate` implies `white-space: nowrap`, whose min-content is the FULL
      // untruncated string. So one long applicant name, job title, or tenant
      // name anywhere inside a card would size the whole track to it: measured
      // at 517–619px inside a 320px viewport before this landed, which dragged
      // every sibling card off-screen with it. The inner `truncate` cannot help
      // — it never gets a bounded box to truncate against.
      //
      // On a card that is NOT a flex/grid item this is a no-op (`min-width`
      // already resolves to 0 for ordinary blocks), so it costs nothing.
      // Cards inside a horizontal rail are unaffected too: those set an explicit
      // `w-*` plus `shrink-0`, which is a definite size this does not touch.
      //
      // NOTE: this only covers cards that are THEMSELVES the item. Where a card
      // is wrapped (a grid of <li> holding cards, e.g. JobListings), the wrapper
      // is the item and needs its own `min-w-0`.
      // `rounded-2xl` is the 12px container radius (see index.css § Shape) and
      // there is deliberately no shadow: the reference builds depth out of the
      // #E3EBE4 border against the #FAFCF8 ground, and a screen holding forty
      // of these stays readable only because none of them cast light.
      className={`min-w-0 workspace-panel rounded-2xl border ${cardPadding[padding] ?? cardPadding.default} ${
        ownsBorderColor(className) ? "" : t.border
      } ${OWN_SURFACE.test(className) ? "" : t.surface} ${
        interactive
          ? "transition-all duration-200 hover:border-slate-300 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * The rounded icon chip from the reference deck — a feature marker, not a status
 * light. `brand` is the default because ember is rationed (see below).
 */
const tileTones = {
  brand:"bg-emerald-100 text-emerald-800",
  ember:"bg-amber-100 text-amber-800",
  slate:"bg-slate-100 text-slate-700",
  "on-fill": "bg-white/20 text-white",
  "on-fill-ink": "bg-slate-950/15 text-slate-950",
  pending:"bg-amber-100 text-amber-800",
  negative:"bg-red-100 text-red-800",
  positive:"bg-emerald-100 text-emerald-800",
  indigo: "bg-indigo-100 text-indigo-800",
  violet: "bg-violet-100 text-violet-800",
  ai: "bg-violet-100 text-violet-800",
};

const tileSizes = {
  sm: "h-9 w-9 rounded-xl [&>svg]:h-4 [&>svg]:w-4",
  md: "h-11 w-11 rounded-2xl [&>svg]:h-5 [&>svg]:w-5",
  lg: "h-14 w-14 rounded-2xl [&>svg]:h-6 [&>svg]:w-6",
};

export function IconTile({ icon: Icon, tone = "brand", size = "md", className = "" }) {
  if (!Icon) return null;
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center ${tileSizes[size] ?? tileSizes.md} ${
        tileTones[tone] ?? tileTones.brand
      } ${className}`}
    >
      <Icon />
    </span>
  );
}

/**
 * Initials avatar — the person marker on record cards and headers.
 *
 * Deliberately monochrome brand tint rather than a hash-to-hue: colour derived
 * from a name is colour derived from an ethnicity-correlated string, and this
 * product does not get to put that on screen next to a score. Everyone gets the
 * same violet.
 *
 * `aria-hidden` because the name it abbreviates is always rendered next to it —
 * announcing "A" before "Alex Morgan" is noise.
 */
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
  const sizes = { sm: "h-8 w-8 text-[11px]", md: "h-10 w-10 text-sm" };
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 ${
        sizes[size] ?? sizes.md
      } ${className}`}
    >
      {initials}
    </span>
  );
}

export function Badge({ children, tone = "slate", dot = false, className = "" }) {
  // Outcome tones read from the verdict tokens rather than raw Tailwind hues,
  // so "green means advanced" is a system fact instead of a convention each
  // component re-picks. The pending tone in particular moved off `amber-700`,
  // which sat at 4.35:1 on its own tint — under AA at the 12px it ships at.
  const tones = {
    slate: "bg-slate-100 text-slate-700 border border-slate-200/70",
    green: "bg-emerald-100 text-emerald-800 border border-emerald-200/70",
    amber: "bg-amber-100 text-amber-700 border border-amber-200/70",
    red: "bg-red-100 text-red-700 border border-red-200/70",
    brand: "bg-brand-50 text-brand-800 border border-brand-100",
    teal: "bg-teal-50 text-teal-700 border border-teal-100",
    indigo: "bg-indigo-50 text-indigo-700 border border-indigo-100",
    violet: "bg-violet-50 text-violet-700 border border-violet-100",
    ai: "bg-violet-50 text-violet-700 border border-violet-100",
  };
  return (
    <span
      className={`inline-flex items-center rounded-[5px] px-1.5 py-0.5 text-[10.5px] font-bold whitespace-nowrap ${tones[tone] ?? tones.slate} ${className}`}
    >
      {dot && <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current opacity-80 shrink-0" aria-hidden="true" />}
      {children}
    </span>
  );
}

/**
 * The metric tile the reference deck leads with. Deliberately plain: a label, a
 * number, and an optional icon.
 *
 * `note` exists so a figure can carry its own caveat inline — an estimate, a
 * partial period, a fallback reading. CLAUDE.md's rule is that a degraded
 * result must never be dressed as a measurement, and a stat tile is exactly
 * where that would otherwise happen silently, because a big confident number
 * with no qualifier *is* a claim.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  note,
  chip,
  chipTone = "slate",
  action,
  className = "",
  ...props
}) {
  const t = toneText(tone);
  const stacked = tone !== "default";
  return (
    <Card tone={tone} className={className} {...props}>
      <div className="flex items-center gap-2">
        {/* On a violet fill this is white/90, not the /70–/75 that reads as
            "secondary" in a mock — those land at 3.8:1 and 4.4:1. On a coral
            fill it is solid ink for the same reason. Either way the hierarchy
            comes from weight and size, because opacity is spending contrast the
            small text does not have to give. */}
        <p className={`min-w-0 flex-1 text-xs font-semibold ${t.soft}`}>{label}</p>
        {/* The chip is the trend/delta slot, and it sits on the LABEL row
            rather than under the figure. That is the reference's arrangement
            and it is the load-bearing part of this tile: a "+12%" placed below
            a number reads as part of the number, and at a glance a reader takes
            the pair as one quantity. Above it, on the label's line, it reads as
            a qualifier of the label — which is what it is. */}
        {chip && <Badge tone={chipTone} className="shrink-0">{chip}</Badge>}
        {Icon && !chip && <IconTile icon={Icon} tone={t.tile} size="sm" className="shrink-0" />}
      </div>
      {/* `.num` — mono, tabular, tight. These tiles are read as a ROW of
          figures, and the row only lines up if the digits do. See index.css
          § The numeral treatment. */}
      {/* A <div>, not a <p>. Callers pass a <Skeleton> here while the figure
          is loading, and a skeleton is a block — nesting one inside a <p>
          is invalid HTML that React warns about and browsers silently
          reparent, which moved the placeholder OUT of the tile. */}
      <div className={`num pt-2.5 pb-1 text-[27px] leading-none font-semibold [overflow-wrap:anywhere] ${t.strong}`}>
        {value}
      </div>
      {note && <p className={`prose-wrap text-xs ${stacked ? t.soft : "text-slate-500"}`}>{note}</p>}
      {action && <div className="pt-3">{action}</div>}
    </Card>
  );
}

/**
 * The metric row — a grid of <StatCard>, sized by the content rather than by a
 * breakpoint.
 *
 * `repeat(auto-fit, minmax(210px, 1fr))` is the whole responsive strategy the
 * reference uses for tiles, and it is better than the `sm:grid-cols-2
 * lg:grid-cols-4` it replaces for a reason that only shows up in this app: the
 * number of tiles is not fixed. A dashboard renders four, a job screen three, a
 * tenant console six. Column counts hard-coded per breakpoint have to be
 * re-picked at every call site for every count, and the one nobody re-picks
 * ships a lone tile stretched across a 1440px screen. `auto-fit` derives the
 * count from the width it actually has.
 *
 * 210px is the measured floor: below it the 27px figure and its label start
 * colliding on the longest labels in the product ("Median time to first
 * response").
 */
export function StatGrid({ children, min = 210, className = "" }) {
  return (
    <div
      className={`grid gap-3 ${className}`}
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))` }}
    >
      {children}
    </div>
  );
}

/**
 * The title row *inside* a card or a section band. Distinct from <PageHeader>,
 * which owns the top of a whole screen — mixing the two is how heading sizes
 * drifted across pages before either existed.
 *
 * Use this when the header sits on a padded card. When the card is
 * `padding="none"` and holds a list, use <CardHeader> below instead: it draws
 * the divider and the padding a bordered list needs, and getting those two from
 * a bare <SectionHeader> means rewriting them at every call site.
 */
export function SectionHeader({ title, description, action, icon: Icon, className = "" }) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-x-6 gap-y-2 ${className}`}>
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon && <IconTile icon={Icon} size="sm" />}
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold tracking-[-0.02em] text-slate-900">{title}</h2>
          {description && (
            <p className="prose-wrap mt-0.5 max-w-prose text-xs text-slate-500">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

/**
 * The header strip of a `padding="none"` card — title, optional count and
 * subtitle on the left, actions on the right, closed by an #F0F4EF rule.
 *
 * This exists because the reference's dominant container is not a padded panel
 * but a *bordered list*: a header, then rows running edge to edge separated by
 * dividers rather than gaps. That shape is what makes its dense screens read as
 * a ledger, and it cannot be built from <Card> + <SectionHeader> without the
 * caller hand-writing the padding and the divider — exactly the repetition that
 * drifts.
 *
 * `count` is separate from `title` and set unbolded beside it, because "(4)" is
 * not part of the heading; folding it into the title string makes it inherit
 * the heading weight and read as a label. `aside` is the right-aligned caveat
 * line the reference uses for the quiet disclaimers this product owes its
 * reader ("Nothing here is automated on your behalf") — it wraps below the
 * title on narrow screens rather than squeezing the actions.
 */
export function CardHeader({ title, count, description, aside, action, className = "" }) {
  return (
    <div className={`rule-b flex flex-wrap items-center gap-x-2.5 gap-y-1.5 px-[18px] py-[15px] ${className}`}>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <h2 className="text-base font-bold tracking-[-0.02em] text-slate-900">{title}</h2>
          {count != null && <span className="text-xs font-normal text-slate-500">({count})</span>}
        </div>
        {description && <p className="prose-wrap pt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      <div className="flex-1" />
      {aside && <span className="prose-wrap text-xs text-slate-500">{aside}</span>}
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

/**
 * One row of a bordered list. Sits directly inside a `padding="none"` <Card>,
 * under a <CardHeader>.
 *
 * `bar` paints the 3px left edge the reference uses to rank a queue by urgency.
 * It takes a class, not a colour, so a stage tone still comes from
 * `pipeline.js` and never gets picked locally — see DESIGN.md § Do's.
 *
 * `last` drops the trailing divider. It is opt-in rather than derived with a
 * `:last-child` rule because these lists are usually built from two sources at
 * once (a live page plus a "load more" tail), and the pseudo-class then draws
 * the rule in the wrong place — under the last item of the FIRST list.
 */
export function CardRow({ children, bar, last = false, interactive = false, className = "", ...props }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3.5 gap-y-2.5 px-[18px] py-3.5 ${last ? "" : "rule-b"} ${
        bar ? `border-l-[3px] ${bar}` : ""
      } ${interactive ? "cursor-pointer transition-colors duration-150 hover:bg-canvas" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * The ranked action row — the reference's "Waiting on you" pattern.
 *
 * Three parts in a fixed order: a rank in the numeral face, the claim and its
 * one-line consequence, and the single action that clears it. The 3px left bar
 * carries urgency as colour.
 *
 * The rank is not decoration. This list is explicitly ordered — the reference
 * captions it "ordered by what breaks first if you ignore it" — and an ordered
 * list that hides its ordinals invites the reader to assume the order is
 * arbitrary and scan for the interesting row instead of starting at the top. It
 * renders as an <ol> item for the same reason.
 *
 * One action per row, and it is a real one. A queue whose rows offer three
 * buttons is a queue nobody clears.
 */
export function PriorityRow({ n, bar = "border-l-slate-300", title, detail, action, last = false, className = "" }) {
  return (
    <li
      className={`flex flex-wrap items-start gap-x-3.5 gap-y-2.5 border-l-[3px] px-[18px] py-3.5 ${bar} ${
        last ? "" : "rule-b"
      } ${className}`}
    >
      {n != null && (
        <span aria-hidden="true" className="num w-8 shrink-0 pt-px text-right text-xl font-semibold text-slate-900">
          {n}
        </span>
      )}
      <div className="min-w-[11rem] flex-1">
        <p className="prose-wrap text-[13.5px] leading-snug font-semibold text-slate-900">{title}</p>
        {detail && <p className="prose-wrap pt-1 text-xs leading-relaxed text-slate-500">{detail}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </li>
  );
}

/**
 * Label / figure / share / bar — the reference's "Pipeline by stage" row.
 *
 * The percentage sits in a fixed-width right-aligned column rather than flowing
 * after the count, so a column of them forms an edge the eye can run down.
 * Without that the shares land at a different x-position on every row and the
 * block stops being comparable, which is the only reason to draw it.
 *
 * `pct` is clamped here, not at the call site: these figures are computed
 * against a denominator that can lag (a stage count read from cache while the
 * total is live), and a 103% bar overflowing its track is a rendering bug that
 * looks like a data bug.
 */
export function MeterRow({ label, value, pct, bar = "bg-brand-500", className = "" }) {
  const width = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <div className={className}>
      <div className="flex items-baseline gap-2 pb-1.5">
        <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{label}</span>
        <span className="num text-xs font-semibold text-slate-900">{value}</span>
        <span className="num w-8 text-right text-[10.5px] text-slate-400">{Math.round(width)}%</span>
      </div>
      <div className="h-[5px] overflow-hidden rounded-[3px] bg-rule">
        <div className={`h-full rounded-[3px] ${bar}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

/**
 * The small column chart the reference leads its dashboard with — a value per
 * bar, a caption under the axis, nothing else.
 *
 * Deliberately not a charting library. It plots one series of counts over a
 * fixed window, has no axes to configure, and the places it appears all want
 * the same thing; a chart runtime would cost more to keep consistent than it
 * saves.
 *
 * Bars are labelled with their own value above the column instead of against a
 * y-axis. At twelve bars across a half-width card there is no room for
 * gridlines that would be readable, and a reader of this chart wants "how many
 * last week" — which a scale makes them estimate and a printed number does not.
 * `role="img"` plus the caller's label carries the same summary to a screen
 * reader, because the shape is the summary and the numbers are the data.
 */
export function MiniBars({ data = [], marks = [], label, className = "" }) {
  const peak = Math.max(1, ...data.map((d) => Number(d.value) || 0));
  return (
    <figure className={className}>
      <div className="flex h-32 items-end gap-1.5 pt-4" role="img" aria-label={label}>
        {data.map((d, i) => (
          <div key={d.key ?? i} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={d.label}>
            <span aria-hidden="true" className="num pb-1 text-center text-[9.5px] text-slate-400">
              {d.value}
            </span>
            <div
              className={`rounded-t-[3px] ${d.bar ?? "bg-brand-300"}`}
              // A zero-count week must still draw something, or a gap in the
              // data is indistinguishable from a gap in the chart.
              style={{ height: `${Math.max(2, ((Number(d.value) || 0) / peak) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      {marks.length > 0 && (
        <figcaption className="rule-t flex justify-between pt-1.5">
          {marks.map((m, i) => (
            <span key={i} className="shrink-0 text-[9.5px] whitespace-nowrap text-slate-400">
              {m}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}

export function Skeleton({ className = "" }) {
  // The pulse is an ambient loop with nothing waiting on it, so it is the first
  // thing to go under reduced motion. The shape alone still reads as "not
  // loaded yet", which is the whole job.
  return <div className={`animate-pulse motion-reduce:animate-none rounded-lg bg-slate-200/80 ${className}`} />;
}

export function EmptyState({ icon: Icon, title, description, descriptionClassName = "", action }) {
  return (
    <div className="flex flex-col items-center justify-center workspace-panel rounded-2xl border border-dashed border-hairline bg-white px-6 py-12 text-center">
      {Icon && (
        <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-[15px] font-bold tracking-[-0.02em] text-slate-900">{title}</h3>
      {description && (
        <p className={`prose-wrap mt-1.5 max-w-sm text-sm text-slate-500 ${descriptionClassName}`}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Compatibility names used by newer recruiter screens.
export { Badge as StatusBadge, StatCard as KpiCard };
