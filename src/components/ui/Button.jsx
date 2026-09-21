import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

// Focus rings are one step darker than a "tint" would suggest, across every
// variant. A ring is only an affordance if it is visible against the surface
// BEHIND the control, and the surface is bone (#f6f2ea): tint-weight rings
// measured 1.4–1.9:1 against it, i.e. the loudest treatment in the system had
// quietly become the faintest. Each value below clears the 3:1 floor WCAG 2.2
// sets for a focus indicator — brand-300 3.37:1, slate-400 3.04:1, red-500
// 3.37:1, accent-500 3.33:1.
//
// Every FILLED variant disables to the same greige, and that uniformity is the
// point. Each used to disable into its own ramp's 300, which worked while those
// were tints and broke the moment brand-300 became the (necessarily dark) petrol
// focus step: a disabled primary rendered as a solid mid-teal block that read as
// a live button — louder than the real secondary beside it. A disabled control
// must not be able to out-shout an enabled one, so the disabled surface is
// neutral and shared, and the label goes muted with it rather than staying
// white. slate-500 on slate-200 is 4.14:1: unmistakably inert, still readable.
const DISABLED_FILL ="disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none";

// Primary hovers UP the ramp, to brand-700 (#147A40), not down to brand-900.
// Hovering a #0E3B2E button towards #0C1F1B is a 2% luminance move that most
// people cannot see, so the control read as unresponsive; the reference
// brightens instead, which is legible and also the direction that says
// "live". The shadow is gone with it — a filled forest button on a #FAFCF8
// ground needs no help separating, and it was the last elevated control on
// a surface that no longer has any.
const variants = {
  primary:
    `bg-brand-800 text-white hover:bg-brand-700 shadow-2xs hover:shadow-xs hover:shadow-emerald-950/20 active:translate-y-0 hover:-translate-y-0.5 focus-visible:ring-brand-500 ${DISABLED_FILL}`,
  secondary:
    "bg-white text-slate-800 border border-hairline hover:border-slate-300 hover:text-slate-900 shadow-2xs hover:shadow-xs active:translate-y-0 hover:-translate-y-0.5 focus-visible:ring-brand-500 disabled:opacity-50",
  outline:
    "bg-transparent text-slate-700 border border-hairline hover:bg-canvas-deep active:translate-y-0 hover:-translate-y-0.5 focus-visible:ring-slate-400 disabled:opacity-50",
  ghost:
    "bg-transparent text-slate-600 hover:bg-canvas-deep focus-visible:ring-slate-400 disabled:opacity-50",
  danger:
    `bg-verdict-negative text-white hover:bg-red-700 shadow-2xs hover:shadow-xs active:translate-y-0 hover:-translate-y-0.5 focus-visible:ring-red-500 ${DISABLED_FILL}`,
  ai:
    `bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs hover:shadow-xs hover:shadow-indigo-500/25 active:translate-y-0 hover:-translate-y-0.5 focus-visible:ring-indigo-500 ${DISABLED_FILL}`,
  accent:
    `bg-brand-400 text-brand-950 font-bold hover:bg-brand-300 shadow-2xs hover:shadow-xs active:translate-y-0 hover:-translate-y-0.5 focus-visible:ring-brand-400 ${DISABLED_FILL}`,
  pending:
    `bg-amber-400 text-slate-900 font-bold hover:bg-amber-300 shadow-2xs hover:shadow-xs active:translate-y-0 hover:-translate-y-0.5 focus-visible:ring-amber-500 ${DISABLED_FILL}`,
};

variants.orange = variants.accent;
variants.gold = variants.accent;
variants.link = "bg-transparent text-brand-700 underline-offset-4 hover:underline focus-visible:ring-brand-500 disabled:opacity-50";

const sizes = {
  xs: "h-7 px-2.5 text-xs",
  sm: "h-7 px-2.5 text-xs",
  md: "h-8 px-3.5 text-sm",
  lg: "h-9 px-4 text-sm",
};

const Button = forwardRef(function Button(
  { as: Component = "button", variant = "primary", size = "md", loading = false, className = "", children, disabled, ...props },
  ref
) {
  return (
    <Component
      ref={ref}
      disabled={disabled || loading}
      // Properties are named rather than `transition-all` so the focus ring
      // (a box-shadow) appears instantly — a ring that fades in leaves keyboard
      // users with no indicator at the start of the transition.
      // `tap-target` (index.css) raises this to the 44px comfort floor only on
      // coarse pointers. On a mouse the sm/md heights stay 32/40px, which is
      // what makes a dense toolbar readable.
      className={`tap-target inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-[background-color,border-color,color,transform,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-4 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${variants[variant] ?? variants.primary} ${sizes[size] ?? sizes.md} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </Component>
  );
});

export default Button;
