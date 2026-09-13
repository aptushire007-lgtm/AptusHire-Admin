import { useRef, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Modal from "../src/components/ui/Modal.jsx";
import { FieldError, FieldHint, FormGroup, Input, Label } from "../src/components/ui/Field.jsx";
import { ToastProvider, useToast } from "../src/components/ui/Toast.jsx";

describe("Overlay and field contracts", () => {
  it("retains unsaved input through Escape and only discards after confirmation", async () => {
    function Fixture() {
      const [open, setOpen] = useState(false);
      const [value, setValue] = useState("");
      return <><button onClick={() => setOpen(true)}>Edit</button><Modal open={open} onClose={() => setOpen(false)} dirty={Boolean(value)} title="Edit record"><label>Notes<input value={value} onChange={e => setValue(e.target.value)} /></label></Modal></>;
    }
    render(<Fixture />);
    const trigger = screen.getByRole("button", { name: "Edit" });
    trigger.focus(); fireEvent.click(trigger);
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Keep this text" } });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.getByRole("alertdialog")).toHaveAccessibleName("Discard unsaved changes?");
    expect(screen.getByRole("button", { name: "Keep editing" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.getByLabelText("Notes")).toHaveValue("Keep this text");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(document.body.style.overflow).not.toBe("hidden");
  });
  it("keeps the background inert until the last nested overlay closes", () => {
    function Fixture() {
      const [child, setChild] = useState(false);
      return <><button>Background</button><Modal open title="Parent"><button onClick={() => setChild(true)}>Child</button><Modal open={child} onClose={() => setChild(false)} title="Child dialog"><button>Child action</button></Modal></Modal></>;
    }
    const { container } = render(<Fixture />);
    expect(container.inert).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Child" }));
    const child = screen.getByRole("dialog", { name: "Child dialog" });
    fireEvent.keyDown(child, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Child dialog" })).not.toBeInTheDocument();
    expect(container.inert).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
  });
  it("honors initial focus and blocks dismissal during a mutation", () => {
    const close = vi.fn();
    function Fixture() { const ref = useRef(null); return <Modal open title="Publish" onClose={close} busy initialFocusRef={ref}><button ref={ref}>Cancel</button></Modal>; }
    render(<Fixture />);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Close" })).toBeDisabled();
  });
  it("associates both hint and validation error with an explicitly named field", () => {
    render(<FormGroup id="capacity"><Label required>Openings</Label><Input error value="0" readOnly /><FieldHint>Controls hiring capacity.</FieldHint><FieldError>Enter at least one.</FieldError></FormGroup>);
    const input = screen.getByLabelText(/Openings/);
    expect(input).toHaveAttribute("aria-describedby", "capacity-hint capacity-error");
    expect(input).toHaveAccessibleDescription("Controls hiring capacity. Enter at least one.");
  });
  it("keeps toast announcements outside the inert application root", () => {
    function Fixture() { const toast = useToast(); return <Modal open title="Mutation"><button onClick={() => toast.error("Save failed")}>Save</button></Modal>; }
    render(<ToastProvider><Fixture /></ToastProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const announcer = screen.getByRole("alert").parentElement;
    expect(announcer.parentElement).toBe(document.body);
    expect(announcer.inert).not.toBe(true);
    expect(screen.getByRole("alert")).toHaveTextContent("Save failed");
  });
  it("skips hidden and fieldset-disabled controls when wrapping focus", () => {
    render(<Modal open title="Editor" showClose={false}><button>First</button><fieldset disabled><input aria-label="Unavailable" /></fieldset><div style={{ display: "none" }}><button>Hidden</button></div><button>Last</button></Modal>);
    screen.getByRole("button", { name: "Last" }).focus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab" });
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab", shiftKey: true });
    expect(screen.getByRole("button", { name: "Last" })).toHaveFocus();
  });
});
