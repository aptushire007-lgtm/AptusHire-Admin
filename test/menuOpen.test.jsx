import { expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import Menu, { MenuItem } from "../src/components/ui/Menu.jsx";

it("opens on click and shows its items", () => {
  render(
    <Menu label="Row actions" trigger={<button type="button" aria-label="More actions">…</button>}>
      <MenuItem onSelect={() => {}}>Publish to job boards</MenuItem>
    </Menu>
  );
  const trigger = screen.getByRole("button", { name: "More actions" });
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(trigger);
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  expect(screen.getByRole("menuitem", { name: "Publish to job boards" })).toBeTruthy();
});

// Opening the menu focuses its first item, which scrolls the container the
// trigger sits in. That scroll used to close the menu in the same tick, so a
// row's ⋯ menu never appeared at all.
it("survives the scroll its own opening causes, and still closes on a later one", async () => {
  render(
    <Menu label="Row actions" trigger={<button type="button" aria-label="More actions">…</button>}>
      <MenuItem onSelect={() => {}}>Publish to job boards</MenuItem>
    </Menu>
  );
  const trigger = screen.getByRole("button", { name: "More actions" });
  fireEvent.click(trigger);
  fireEvent.scroll(document, {});
  expect(screen.getByRole("menuitem", { name: "Publish to job boards" })).toBeTruthy();

  await act(() => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))));
  fireEvent.scroll(document, {});
  expect(screen.queryByRole("menuitem", { name: "Publish to job boards" })).toBeNull();
});
