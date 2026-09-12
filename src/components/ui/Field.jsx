import { createContext, forwardRef, useContext, useId, useMemo, useRef } from "react";

/**
 * Form primitives with complete light/dark contrast compliance.
 */
import { Search as SearchIcon } from "lucide-react";
import { Children, isValidElement } from "react";

const FieldContext = createContext(null);

function useControlId(explicitId) {
  const ctx = useContext(FieldContext);
  const own = useId();
  if (explicitId) return explicitId;
  if (!ctx) return undefined;
  if (ctx.claimed.current === null) ctx.claimed.current = own;
  return ctx.claimed.current === own ? ctx.id : own;
}

function useFieldA11y(explicitId, error) {
  const ctx = useContext(FieldContext);
  const id = useControlId(explicitId);
  return {
    id,
    "aria-invalid": error ? "true" : undefined,
    "aria-describedby": [ctx?.hasHint && ctx.hintId, error && ctx?.errorId].filter(Boolean).join(" ") || undefined,
  };
}

const fieldChrome =
"rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 shadow-xs transition-colors duration-150 focus:border-brand-700 focus:outline-none focus:ring-3 focus:ring-brand-700/20 disabled:bg-slate-100 disabled:text-slate-400";
const fieldClass = `${fieldChrome} px-3.5 py-2.5`;
const fieldCompactClass = `${fieldChrome} px-2.5 py-1.5`;

const HAS_WIDTH = /(?:^|\s)(?:[\w.[\]/-]+:)*(?:w-|size-)\S/;
function withWidth(className) {
  return HAS_WIDTH.test(className) ? "" : "w-full";
}

export const Input = forwardRef(function Input({ className = "", error, id, ...props }, ref) {
  const a11y = useFieldA11y(id, error);
  return (
    <input
      ref={ref}
      {...a11y}
      className={`${withWidth(className)} ${fieldClass} ${error ?"border-red-400 focus:border-red-500 focus:ring-red-100" :""} ${className}`}
      {...props}
    />
  );
});

export const Textarea = forwardRef(function Textarea({ className = "", error, id, ...props }, ref) {
  const a11y = useFieldA11y(id, error);
  return (
    <textarea
      ref={ref}
      {...a11y}
      className={`${withWidth(className)} ${fieldClass} resize-y ${error ?"border-red-400 focus:border-red-500 focus:ring-red-100" :""} ${className}`}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select({ className = "", error, id, compact = false, children, ...props }, ref) {
  const a11y = useFieldA11y(id, error);
  return (
    <select
      ref={ref}
      {...a11y}
      className={`${withWidth(className)} ${compact ? fieldCompactClass : fieldClass} ${error ?"border-red-400" :""} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});

export function Label({ children, required, htmlFor, className = "" }) {
  const ctx = useContext(FieldContext);
  return (
    <label htmlFor={htmlFor || ctx?.id} className={`mb-1.5 block text-xs font-bold text-slate-700 ${className}`}>
      {children}
      {required && (
        <>
          <span aria-hidden="true" className="text-red-500"> *</span>
          <span className="sr-only"> (required)</span>
        </>
      )}
    </label>
  );
}

export function FieldError({ children, id }) {
  const ctx = useContext(FieldContext);
  if (!children) return null;
  return (
    <p id={id || ctx?.errorId} className="mt-1 text-xs font-medium text-red-600">
      {children}
    </p>
  );
}

export function FieldHint({ children, id, className = "" }) {
  const ctx = useContext(FieldContext);
  return <p id={id || ctx?.hintId} className={`mt-1 text-xs text-slate-600 ${className}`}>{children}</p>;
}

export function FormGroup({ children, className = "", id: explicitId }) {
  const generatedId = useId();
  const id = explicitId || generatedId;
  const claimed = useRef(null);
  const hasHint = Children.toArray(children).some(child => isValidElement(child) && child.type === FieldHint);
  const value = useMemo(() => ({ id, errorId: `${id}-error`, hintId: `${id}-hint`, hasHint, claimed }), [id, hasHint]);
  return (
    <FieldContext.Provider value={value}>
      <div className={`mb-4 ${className}`}>{children}</div>
    </FieldContext.Provider>
  );
}

export const Search = forwardRef(function Search({ className = "", id, ...props }, ref) {
  return (
    <div className="relative">
      <SearchIcon
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5B6B63]"
        aria-hidden="true"
      />
      <Input ref={ref} id={id} type="search" className={`pl-10 ${className}`} {...props} />
    </div>
  );
});

export const DatePicker = forwardRef(function DatePicker({ className = "", id, ...props }, ref) {
  return <Input ref={ref} id={id} type="date" className={className} {...props} />;
});

export const Checkbox = forwardRef(function Checkbox({ className = "", error, id, ...props }, ref) {
  return (
    <input
      ref={ref}
      {...useFieldA11y(id, error)}
      type="checkbox"
      className={`h-4 w-4 rounded border-[#E3EBE4] text-[#0E3B2E] accent-primary focus:ring-2 focus:ring-primary/20 ${className}`}
      {...props}
    />
  );
});

export const Radio = forwardRef(function Radio({ className = "", error, id, ...props }, ref) {
  return (
    <input
      ref={ref}
      {...useFieldA11y(id, error)}
      type="radio"
      className={`h-4 w-4 border-[#E3EBE4] text-[#0E3B2E] accent-primary focus:ring-2 focus:ring-primary/20 ${className}`}
      {...props}
    />
  );
});

export const Switch = forwardRef(function Switch(
  { checked = false, onChange, className = "", disabled = false, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "border-[#0E3B2E] bg-[#0E3B2E]"
          : "border-[#E3EBE4] bg-[#F3F7F1]",
        className,
      ].join(" ")}
      {...props}
    >
      <span
        className={`h-4 w-4 rounded-full bg-white shadow-[0_1px_4px_rgba(27,67,50,0.07)] transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
});
