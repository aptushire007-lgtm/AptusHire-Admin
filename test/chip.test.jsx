// The filter-chip rail — pinned after a real, user-reported rendering bug.
//
// WHAT BROKE. On a 412px-wide phone the quick-filter chips on the Candidates
// screen rendered as "All candidat", "Interview don", "Shortliste" — every pill
// squeezed and its own label clipped mid-word. Rotating to landscape made it
// look correct, which is the tell: nothing was wrong with the labels, there was
// simply not enough width.
//
// WHY. <Chip> is a flex ITEM inside <ChipRow>'s `flex` container, and flex items
// default to `flex-shrink: 1`. So the row absorbed the shortfall by compressing
// the children instead of overflowing, and `whitespace-nowrap` — which stops the
// text wrapping to a second line — meant the compressed pill clipped its label
// instead. ChipRow's `overflow-x-auto` never engaged, because from the browser's
// point of view there was no overflow: the children had already given up the
// space. The edge-fade affordance stayed hidden for the same reason; it keys off
// `scrollWidth - clientWidth`, which stays 0 while the children are shrinking.
//
// WHY THIS IS ASSERTED AS A CLASS AND NOT A MEASUREMENT. jsdom implements no
// layout engine — every element reports 0×0 and no CSS is ever applied, so a
// test that measured widths here would pass whatever the classes said. The
// contract that actually prevents the regression is "a chip refuses to shrink",
// and in a Tailwind codebase that contract IS the class. A real-width check
// belongs in a browser-based test, which this app does not have yet.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Chip, ChipRow } from "../src/components/ui/Panels.jsx";

describe("Chip", () => {
  it("refuses to shrink, so an overflowing row scrolls instead of clipping labels", () => {
    render(<Chip>All candidates</Chip>);
    const chip = screen.getByRole("button", { name: "All candidates" });

    expect(chip.className).toContain("shrink-0");
  });

  it("keeps the label on one line — the other half of the contract", () => {
    // `whitespace-nowrap` without `shrink-0` is precisely what produced the
    // clipped text. Neither is safe to remove on its own: drop nowrap and the
    // chips reflow to three lines, pushing the list they filter below the fold.
    render(<Chip>Interview done</Chip>);

    expect(screen.getByRole("button").className).toContain("whitespace-nowrap");
  });

  it("announces which filter is active to a screen reader, not just with colour", () => {
    const { rerender } = render(<Chip active>Passed ATS</Chip>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");

    // Inactive must be ABSENT rather than "false": aria-pressed="false" on every
    // other chip announces four toggles in an off state, when what is true is
    // that one filter is selected.
    rerender(<Chip>Passed ATS</Chip>);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-pressed");
  });

  it("renders as a real element for the job — a link when it navigates", () => {
    // `as={Link}` is the navigation case; a div with an onClick is neither, and
    // the distinction matters far more to a screen reader than it does visually.
    render(
      <Chip as="a" href="/candidates" active>
        Shortlisted
      </Chip>
    );
    const link = screen.getByRole("link", { name: "Shortlisted" });

    expect(link).toHaveAttribute("aria-current", "page");
    expect(link).not.toHaveAttribute("aria-pressed");
  });
});

describe("ChipRow", () => {
  it("is a labelled group, so the rail is not four loose buttons in a row", () => {
    render(
      <ChipRow label="Quick filter">
        <Chip>All candidates</Chip>
        <Chip>Passed ATS</Chip>
      </ChipRow>
    );

    expect(screen.getByRole("group", { name: "Quick filter" })).toBeInTheDocument();
  });

  it("scrolls horizontally rather than wrapping to a second line", () => {
    render(
      <ChipRow label="Quick filter">
        <Chip>All candidates</Chip>
      </ChipRow>
    );
    const row = screen.getByRole("group");

    expect(row.className).toContain("overflow-x-auto");
    // No `flex-wrap`: a filter bar that reflows to three lines on a phone pushes
    // the content it filters below the fold.
    expect(row.className).not.toContain("flex-wrap");
  });
});
