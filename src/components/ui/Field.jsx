import { createContext, forwardRef, useContext, useId, useMemo, useRef } from "react";

/**
 * Form primitives with complete light/dark contrast compliance.
 */
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
    "aria-describedby": error && ctx ? ctx.errorId : undefined,
  };
}

const fieldChrome =
  "rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 shadow-xs transition-colors duration-150 focus:border-brand-700 focus:outline-none focus:ring-3 focus:ring-brand-700/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400 dark:focus:ring-brand-400/20 disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-850 dark:disabled:text-slate-600";
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
      className={`${withWidth(className)} ${fieldClass} ${error ? "border-red-400 focus:border-red-500 focus:ring-red-100 dark:border-red-600" : ""} ${className}`}
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
      className={`${withWidth(className)} ${fieldClass} resize-y ${error ? "border-red-400 focus:border-red-500 focus:ring-red-100 dark:border-red-600" : ""} ${className}`}
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
      className={`${withWidth(className)} ${compact ? fieldCompactClass : fieldClass} ${error ? "border-red-400 dark:border-red-600" : ""} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});

export function Label({ children, required, htmlFor, className = "" }) {
  const ctx = useContext(FieldContext);
  return (
    <label htmlFor={htmlFor || ctx?.id} className={`mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200 ${className}`}>
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
    <p id={id || ctx?.errorId} className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
      {children}
    </p>
  );
}

export function FormGroup({ children, className = "" }) {
  const id = useId();
  const claimed = useRef(null);
  const value = useMemo(() => ({ id, errorId: `${id}-error`, claimed }), [id]);
  return (
    <FieldContext.Provider value={value}>
      <div className={`mb-4 ${className}`}>{children}</div>
    </FieldContext.Provider>
  );
}
