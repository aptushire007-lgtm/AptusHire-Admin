import { cloneElement, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const ITEM = '[role="menuitem"]:not([disabled]):not([aria-disabled="true"])';

export default function Menu({
  trigger,
  children,
  footer,
  label,
  align  = "end",
  width  = 268,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState(null);
  const triggerRef      = useRef(null);
  const panelRef        = useRef(null);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus?.({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const t = triggerRef.current?.getBoundingClientRect();
    const p = panelRef.current?.getBoundingClientRect();
    if (!t || !p) return;
    const margin = 8;
    const gap    = 6;
    const below  = window.innerHeight - t.bottom;
    const flip   = below < p.height + gap + margin && t.top > below;
    const top    = flip
      ? Math.max(margin, t.top - p.height - gap)
      : Math.max(margin, Math.min(t.bottom + gap, window.innerHeight - p.height - margin));
    const raw  = align === "end" ? t.right - width : t.left;
    const left = Math.max(margin, Math.min(raw, window.innerWidth - width - margin));
    setPos({ top, left });
  }, [open, align, width]);

  useEffect(() => {
    if (!open) return undefined;
    panelRef.current?.querySelector(ITEM)?.focus({ preventScroll: true });
    const onDown  = (e) => {
      if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      close(false);
    };
    const dismiss = () => close(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open, close]);

  function onPanelKeyDown(e) {
    if (e.key === "Escape") { e.stopPropagation(); close(); return; }
    if (e.key === "Tab") { e.preventDefault(); close(); return; }
    const items = Array.from(panelRef.current?.querySelectorAll(ITEM) || []);
    if (!items.length) return;
    const i  = items.indexOf(document.activeElement);
    const go = {
      ArrowDown: (i + 1) % items.length,
      ArrowUp:   (i - 1 + items.length) % items.length,
      Home: 0,
      End:  items.length - 1,
    };
    if (e.key in go) { e.preventDefault(); items[go[e.key]]?.focus(); }
  }

  const triggerNode = cloneElement(trigger, {
    ref: triggerRef,
    "aria-haspopup": "menu",
    "aria-expanded": open,
    onClick: (e) => { trigger.props.onClick?.(e); setOpen((v) => !v); },
    onKeyDown: (e) => {
      trigger.props.onKeyDown?.(e);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setOpen(true); }
    },
  });

  return (
    <>
      {triggerNode}
      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            aria-label={label}
            onKeyDown={onPanelKeyDown}
            onClick={(e) => { if (e.target.closest?.(ITEM)) close(); }}
            style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, width }}
            className={`fixed z-50 flex max-h-[min(26rem,70vh)] flex-col rounded-md border border-[#E4E4E7] bg-white shadow-lift ${
              pos ? "" : "pointer-events-none opacity-0"
            } ${className}`}
          >
            <div className="min-h-0 flex-1 overflow-y-auto p-1.5">{children}</div>
            {footer && (
              <div className="shrink-0 border-t border-[#E5EBE7] p-1.5">{footer}</div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

export function MenuGroup({ label, children, className = "" }) {
  return (
    <div role="group" aria-label={label} className={className}>
      {label && (
        <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#9BAAA1]">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

export function MenuSeparator({ className = "" }) {
  return <div role="separator" className={`my-1.5 border-t border-[#E5EBE7] ${className}`} />;
}

export function MenuItem({
  children,
  onSelect,
  leading,
  trailing,
  description,
  tone     = "default",
  disabled = false,
  className = "",
}) {
  const tones = {
    default: "text-[#18181B] hover:bg-[#F4F4F5] hover:text-[#09090B]",
    danger:  "text-[#C95C5C] hover:bg-[#F8EAEA]",
    gold:    "text-[#176B45] hover:bg-[#176B45]-light",
  };
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      disabled={disabled}
      onClick={onSelect}
      className={[
        "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm font-normal",
        "transition-colors duration-100",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
        "disabled:cursor-not-allowed disabled:opacity-40",
        tones[tone] ?? tones.default,
        className,
      ].join(" ")}
    >
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate">{children}</span>
        {description && (
          <span className="mt-0.5 block truncate text-xs font-normal text-[#64736A]">
            {description}
          </span>
        )}
      </span>
      {trailing}
    </button>
  );
}
