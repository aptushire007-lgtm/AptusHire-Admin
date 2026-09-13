import { useCallback, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useState } from "react";
import Button from "./Button.jsx";

const overlayStack = [];
const originalInert = new Map();
let originalOverflow;
function syncOverlays() {
  const top = overlayStack.at(-1);
  for (const child of document.body.children) {
    if (child.hasAttribute("data-overlay-announcer")) continue;
    if (!originalInert.has(child)) originalInert.set(child, child.inert);
    child.inert = top ? child !== top : originalInert.get(child);
  }
  if (!top) {
    for (const [child, inert] of originalInert) child.inert = inert;
    originalInert.clear();
    document.body.style.overflow = originalOverflow || "";
  } else document.body.style.overflow = "hidden";
}

function controls(panel) {
  return [...(panel?.querySelectorAll(FOCUSABLE) || [])].filter(node => {
    if (node.tabIndex < 0 || node.matches(":disabled") || node.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
    for (let element = node; element && element !== panel; element = element.parentElement) {
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") return false;
    }
    return true;
  });
}

/**
 * The one overlay primitive.
 *
 * Before this existed, all three overlays in the app (publish-to-boards,
 * platform suspend-reason, mobile nav drawer) were a bare <div> over a scrim:
 * no dialog role, no Escape, no focus trap, no focus restore. Keyboard focus
 * stayed behind the scrim on content the user could no longer see, and the
 * mobile drawer — the entire navigation on a tablet — could be opened and not
 * closed without a mouse.
 *
 * Rendered through a portal on purpose: `position: fixed` resolves against the
 * nearest transformed ancestor, and the dashboard's <main> carries a transform
 * during its route-change animation. In the DOM tree an overlay opened mid
 * animation would be positioned against the page, not the viewport.
 */

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  label,
  size = "lg",
  // "center" is a dialog; "left" is an edge drawer. Same semantics either way —
  // a drawer that owns the screen is a dialog whatever it looks like.
  placement = "center",
  panelClassName = "",
  className = "",
  showClose = true,
  role = "dialog",
  initialFocusRef,
  dirty = false,
  busy = false,
  dismissOnBackdrop = true,
  footer,
  children,
}) {
  const panelRef = useRef(null);
  const overlayRef = useRef(null);
  const restoreRef = useRef(null);
  const headingId = useId();
  const descriptionId = useId();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const cancelRef = useRef(null);
  const beforeConfirmRef = useRef(null);
  const requestClose = useCallback(() => {
    if (busy) return;
    if (dirty) {
      beforeConfirmRef.current = document.activeElement;
      setConfirmDiscard(true);
    } else onClose?.();
  }, [busy, dirty, onClose]);
  const keepEditing = useCallback(() => {
    setConfirmDiscard(false);
    requestAnimationFrame(() => beforeConfirmRef.current?.focus());
  }, []);
  useEffect(() => { if (confirmDiscard) cancelRef.current?.focus(); }, [confirmDiscard]);

  // Escape, and Tab cycling inside the panel. Bound to the panel rather than the
  // document so a nested overlay closes only itself.
  const onKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (confirmDiscard) keepEditing();
        else requestClose();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = controls(panelRef.current);
      if (!nodes || nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current || !panelRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || active === panelRef.current || !panelRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    },
    [requestClose, confirmDiscard, keepEditing]
  );

  useEffect(() => {
    if (!open) return undefined;
    setConfirmDiscard(false);
    restoreRef.current = document.activeElement;
    const panel = panelRef.current;
    // Prefer the first real control; fall back to the panel itself so focus is
    // never left behind the scrim on a dialog that happens to be read-only.
    if (!overlayStack.length) originalOverflow = document.body.style.overflow;
    overlayStack.push(overlayRef.current);
    syncOverlays();
    const target = initialFocusRef?.current || controls(panel)[0] || panel;
    target?.focus?.({ preventScroll: true });

    // The page behind a dialog must not scroll under it.
    const overlay = overlayRef.current;

    return () => {
      const index = overlayStack.indexOf(overlay);
      if (index !== -1) overlayStack.splice(index, 1);
      syncOverlays();
      // Return focus to whatever opened this, so the keyboard user resumes where
      // they were rather than at the top of the document.
      const restore = restoreRef.current;
      if (restore && document.contains(restore) && !restore.closest("[inert]")) restore.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  const centred = placement === "center";

  return createPortal(
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-50 ${centred ? "flex items-center justify-center p-4" : ""} ${className}`}
      onKeyDown={onKeyDown}
    >
      {/* mousedown, not click: a click that STARTS inside the panel and ends on
          the scrim (text selection dragged past the edge) must not close it. */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-200" onMouseDown={dismissOnBackdrop ? requestClose : undefined} aria-hidden="true" />
      <div
        ref={panelRef}
        role={confirmDiscard ? "alertdialog" : role}
        aria-modal="true"
        aria-label={confirmDiscard ? "Discard unsaved changes?" : label}
        aria-labelledby={confirmDiscard || label ? undefined : title ? headingId : undefined}
        aria-describedby={!confirmDiscard && description ? descriptionId : undefined}
        aria-busy={busy || undefined}
        tabIndex={-1}
        className={
          centred
            ? `relative max-h-[85vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-slate-200/80 focus:outline-none transition-all duration-200 ${SIZES[size] || SIZES.lg} ${panelClassName}`
            : `absolute inset-y-0 ${placement === "right" ? "right-0 w-full max-w-3xl overflow-y-auto bg-white p-5 border-l border-slate-200/80 shadow-2xl" : "left-0"} flex flex-col focus:outline-none ${panelClassName}`
        }
      >
        {confirmDiscard && <div>
          <h2 className="text-base font-semibold text-slate-900">Discard unsaved changes?</h2>
          <p className="mt-2 text-sm text-slate-600">Your changes have not been saved. Keep editing to finish them.</p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button ref={cancelRef} type="button" variant="secondary" onClick={keepEditing}>Keep editing</Button>
            <Button type="button" variant="danger" onClick={() => { setConfirmDiscard(false); onClose?.(); }}>Discard changes</Button>
          </div>
        </div>}
        <div hidden={confirmDiscard} className={confirmDiscard ? "hidden" : "contents"}>
        {title && (
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 id={headingId} className="text-base font-semibold text-slate-900">
                {title}
              </h2>
              {description && <p id={descriptionId} className="mt-1 text-sm text-slate-500">{description}</p>}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={requestClose}
                disabled={busy}
                aria-label="Close"
                className="-m-1.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <X className="h-4.5 w-4.5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        {children}
        {footer && <div className="sticky bottom-0 mt-5 border-t border-hairline bg-white py-3">{footer}</div>}
        </div>
      </div>
    </div>,
    document.body
  );
}
