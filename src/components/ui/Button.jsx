import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

/**
 * AptusHire Button — warm orange primary, bright green success, warm grey neutral
 */

const DISABLED = "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

const variants = {
  primary:
    `bg-[#FF6B2C] text-white shadow-[0_1px_3px_rgba(255,107,44,0.25)] hover:bg-[#E55A1F] active:bg-[#E55A1F] focus-visible:ring-4 focus-visible:ring-[#FF6B2C]/30 ${DISABLED}`,

  secondary:
    `border border-[#FF6B2C] bg-white text-[#FF6B2C] hover:bg-[#FFF4EF] active:bg-[#FFE8DC] focus-visible:ring-4 focus-visible:ring-[#FF6B2C]/20 ${DISABLED}`,

  outline:
    `border border-[#E8E8E4] bg-transparent text-[#6B6B6B] hover:border-[#FF6B2C]/50 hover:bg-[#FFF4EF] hover:text-[#FF6B2C] focus-visible:ring-4 focus-visible:ring-[#FF6B2C]/20 ${DISABLED}`,

  ghost:
    `bg-transparent text-[#6B6B6B] hover:bg-[#FFF4EF] hover:text-[#FF6B2C] focus-visible:ring-4 focus-visible:ring-[#FF6B2C]/20 ${DISABLED}`,

  danger:
    `bg-[#EF4444] text-white shadow-[0_1px_3px_rgba(239,68,68,0.25)] hover:bg-[#DC2626] active:bg-[#DC2626] focus-visible:ring-4 focus-visible:ring-[#EF4444]/30 ${DISABLED}`,

  orange:
    `bg-[#FF6B2C] text-white shadow-[0_1px_3px_rgba(255,107,44,0.25)] hover:bg-[#E55A1F] focus-visible:ring-4 focus-visible:ring-[#FF6B2C]/30 ${DISABLED}`,

  gold:
    `bg-[#FF6B2C] text-white shadow-[0_1px_3px_rgba(255,107,44,0.25)] hover:bg-[#E55A1F] focus-visible:ring-4 focus-visible:ring-[#FF6B2C]/30 ${DISABLED}`,

  accent:
    `bg-[#FF6B2C] text-white shadow-[0_1px_3px_rgba(255,107,44,0.25)] hover:bg-[#E55A1F] focus-visible:ring-4 focus-visible:ring-[#FF6B2C]/25 ${DISABLED}`,

  link:
    `bg-transparent text-[#FF6B2C] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-[#FF6B2C]/30 ${DISABLED}`,
};

const sizes = {
  xs: "h-7 px-2.5 text-[11px]",
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-[13px]",
  lg: "h-11 px-5 text-sm",
};

const Button = forwardRef(function Button(
  { as: Component = "button", variant = "primary", size = "md", loading = false, className = "", children, disabled, ...props },
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
