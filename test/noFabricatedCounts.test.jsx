import { expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../src/api/client.js", () => ({ default: { get } }));

import CandidatesAll from "../src/pages/dashboard/CandidatesAll.jsx";

// Every figure on the Candidates page used to fall back to a stand-in when the
// real count was zero: `result.total || groups.length || 24`, and chips at
// `|| 4`, `|| 8`, `|| 14`, `|| 2`, above a hardcoded "+12%" trend and the string
// "across 6 reqs". A brand-new tenant with no candidates therefore read as a
// busy workspace. These tests pin the empty case, because it is the one that
// used to lie.
beforeEach(() => {
  get.mockReset();
});

function mockWorkspace({ summary }) {
  get.mockImplementation((url) => {
    if (url === "/candidates") return Promise.resolve({ data: { total: 0, pages: 0, items: [] } });
    if (url === "/candidates/dashboard-summary") return Promise.resolve({ data: summary });
    return Promise.reject(new Error("unexpected " + url));
  });
}

it("shows real zeroes for an empty workspace, never stand-in figures", async () => {
  mockWorkspace({
    summary: { total: 0, shortlisted: 0, joined: 0, applicantDelta: null, stageCounts: {} },
  });

  render(
    <MemoryRouter initialEntries={["/candidates"]}>
      <CandidatesAll />
    </MemoryRouter>
  );

  await waitFor(() => expect(get).toHaveBeenCalledWith("/candidates/dashboard-summary"));

  // None of the old stand-in numbers may appear anywhere on the page.
  await waitFor(() => {
    for (const invented of ["24", "14", "8", "4", "2", "+12%", "58% pass rate"]) {
      expect(screen.queryByText(invented)).toBeNull();
    }
  });
  expect(screen.queryByText(/across 6 reqs/)).toBeNull();

  // A period with nothing to compare against says so instead of showing a trend.
  expect(screen.getByText("New period")).toBeTruthy();
});

it("renders the counts the server reported, for tiles and chips alike", async () => {
  mockWorkspace({
    summary: {
      total: 137,
      shortlisted: 9,
      joined: 2,
      applicantDelta: -8,
      stageCounts: {
        ats_passed: 31,
        interview_scheduled: 7,
        under_review: 3,
        ai_interview_completed: 12,
        shortlisted: 9,
        rejected: 40,
      },
    },
  });

  render(
    <MemoryRouter initialEntries={["/candidates"]}>
      <CandidatesAll />
    </MemoryRouter>
  );

  // Scoped to the KPI strip: the same figures also appear on the filter chips,
  // which is itself the point — both read from the one server-side count.
  const tiles = document.querySelector('[data-purpose="pipeline-metrics"]');
  await waitFor(() => expect(tiles.textContent).toContain("137"));

  const text = tiles.textContent;
  expect(text).toContain("137"); // Total, straight from summary.total
  expect(text).toContain("41"); // ats_passed 31 + interview_scheduled 7 + under_review 3
  expect(text).toContain("24"); // ai_interview_completed 12 + under_review 3 + shortlisted 9
  expect(text).toContain("9"); // summary.shortlisted
  // A negative delta keeps its sign rather than being forced upward.
  expect(text).toContain("-8%");

  // Chip counts are workspace-wide, not a count of the rows on this page — the
  // list request returned zero items, yet Rejected still reports 40.
  const rejected = screen.getByRole("button", { name: /Rejected/ });
  expect(rejected.textContent).toContain("40");
});

it("omits a chip count entirely while the summary is still loading", async () => {
  get.mockImplementation((url) => {
    if (url === "/candidates") return Promise.resolve({ data: { total: 0, pages: 0, items: [] } });
    return new Promise(() => {}); // summary never resolves
  });

  render(
    <MemoryRouter initialEntries={["/candidates"]}>
      <CandidatesAll />
    </MemoryRouter>
  );

  // The filter is still usable; it simply does not claim a number it lacks.
  const chip = await screen.findByRole("button", { name: /Shortlisted/ });
  expect(chip.textContent.replace(/\s/g, "")).toBe("Shortlisted");
});
