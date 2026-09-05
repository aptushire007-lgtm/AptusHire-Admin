import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

/**
 * AptusHire Button — HiringAnt Design System
 * Primary: #176B45 deep green | Danger: #C95C5C | Warning: #A88A45
 */

const DISABLED = "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none";

const variants = {
  primary:
    `bg-[#176B45] text-white shadow-[0_1px_3px_rgba(23,107,69,0.20)] hover:bg-[#125638] active:bg-[#125638] focus-visible:ring-4 focus-visible:ring-[#176B45]/25 ${DISABLED}`,

  secondary:
    `border border-[#176B45] bg-white text-[#176B45] hover:bg-[#DDECE3] active:bg-[#E8F2EC] focus-visible:ring-4 focus-visible:ring-[#176B45]/20 ${DISABLED}`,

  outline:
    `border border-[#E5EBE7] bg-transparent text-[#64736A] hover:border-[#C7DDD1] hover:bg-[#F1F7F3] hover:text-[#176B45] focus-visible:ring-4 focus-visible:ring-[#176B45]/15 ${DISABLED}`,

  ghost:
    `bg-transparent text-[#64736A] hover:bg-[#F1F7F3] hover:text-[#176B45] focus-visible:ring-4 focus-visible:ring-[#176B45]/15 ${DISABLED}`,

  danger:
    `bg-[#C95C5C] text-white shadow-[0_1px_3px_rgba(201,92,92,0.20)] hover:bg-[#B34545] active:bg-[#B34545] focus-visible:ring-4 focus-visible:ring-[#C95C5C]/25 ${DISABLED}`,

  /* orange/gold/accent — map to primary green for design system consistency */
  orange:
    `bg-[#176B45] text-white shadow-[0_1px_3px_rgba(23,107,69,0.20)] hover:bg-[#125638] focus-visible:ring-4 focus-visible:ring-[#176B45]/25 ${DISABLED}`,

  gold:
    `bg-[#176B45] text-white shadow-[0_1px_3px_rgba(23,107,69,0.20)] hover:bg-[#125638] focus-visible:ring-4 focus-visible:ring-[#176B45]/25 ${DISABLED}`,

  accent:
    `bg-[#176B45] text-white shadow-[0_1px_3px_rgba(23,107,69,0.20)] hover:bg-[#125638] focus-visible:ring-4 focus-visible:ring-[#176B45]/25 ${DISABLED}`,

  link:
    `bg-transparent text-[#176B45] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-[#176B45]/25 ${DISABLED}`,
};

const sizes = {
  xs: "h-7 px-2.5 text-[11px]",
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-[13px]",
  lg: "h-11 px-5 text-sm",
};

const Button = forwardRef(function Button(
  {
    as: Component = "button",
    variant = "primary",
    size = "md",
    loading = false,
    className = "",
    children,
    disabled,
    ...props
  },
  ref
) {
  return (
    <Component
      ref={ref}
      disabled={disabled || loading}
      className={[
        "tap-target inline-flex items-center justify-center gap-2 rounded-control font-semibold",
        "transition-[background-color,border-color,color,box-shadow,transform] duration-150",
        "focus-visible:outline-none active:scale-[0.98]",
        variants[variant] ?? variants.primary,
        sizes[size] ?? sizes.md,
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </Component>
  );
});

export default Button;
