import { useCallback, useRef } from "react";
import { useBeforeUnload, useBlocker } from "react-router-dom";
import Modal from "./Modal.jsx";
import Button from "./Button.jsx";

/** The data router protects links, browser Back and programmatic navigation. */
export default function UnsavedChangesGuard({ dirty, busy = false, bypassRef }) {
  const cancelRef = useRef(null);
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    !bypassRef?.current && (dirty || busy) && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search));
  useBeforeUnload(useCallback(event => {
    if (!bypassRef?.current && (dirty || busy)) { event.preventDefault(); event.returnValue = ""; }
  }, [dirty, busy, bypassRef]));
  return <Modal open={blocker.state === "blocked"} onClose={() => blocker.reset?.()} title={busy ? "Save in progress" : "Leave without saving?"}
    description={busy ? "Wait for the save to finish before leaving this page." : "Your changes have not been saved. Stay to finish them, or discard these changes and leave."}
    size="md" initialFocusRef={cancelRef} role="alertdialog">
    <div className="flex flex-wrap justify-end gap-2">
      <Button ref={cancelRef} type="button" variant="secondary" onClick={() => blocker.reset?.()}>Stay on this page</Button>
      {!busy && <Button type="button" variant="danger" onClick={() => blocker.proceed?.()}>Discard and leave</Button>}
    </div>
  </Modal>;
}
