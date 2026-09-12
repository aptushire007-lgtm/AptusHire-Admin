import { expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// These four actions — send the skills test, skip it, export the record, erase
// the record — lived only on /candidates/:id, a page no route rendered any
// more. Deleting the page would have deleted the only way to take a decision an
// ATS-passed candidate is BLOCKED on, and the only way to honour a DPDP export
// or erasure request. They moved into the drawer; these tests hold them there.
const { get, post, patch, del } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
}));

vi.mock("../src/api/client.js", () => ({
  default: { get, post, patch, delete: del },
}));

const { downloadFile } = vi.hoisted(() => ({ downloadFile: vi.fn() }));
vi.mock("../src/lib/download.js", () => ({ downloadFile }));

import CandidateDrawer from "../src/components/candidate/CandidateDrawer.jsx";

const candidate = {
  _id: "cand-1",
  basicDetails: { name: "Jane Doe", email: "jane@example.com" },
  job: { _id: "job-1", title: "Senior AI Engineer", assessmentPolicy: "manual" },
  status: "ats_passed",
  ats: { overallScore: 74, decision: "pass", scoredAt: "2026-03-02T10:00:00Z", engine: "evidence" },
  stageHistory: [],
  createdAt: "2026-03-01T10:00:00Z",
};

// The drawer fans out five reads on open; only the two that matter here carry
// meaningful fixtures.
function mockReads(assessment) {
  get.mockImplementation((url) => {
    if (url === "/candidates/cand-1") return Promise.resolve({ data: candidate });
    if (url === "/assessments/candidate/cand-1") return Promise.resolve({ data: assessment });
    return Promise.resolve({ data: null });
  });
}

function open(tab) {
  return render(
    <MemoryRouter>
      <CandidateDrawer candidateId="cand-1" initialTab={tab} onClose={() => {}} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  patch.mockReset();
  del.mockReset();
  downloadFile.mockReset();
});

it("offers the skills-test decision an ATS-passed candidate is waiting on", async () => {
  mockReads({ session: null, decision: null, paperReady: true });
  post.mockResolvedValue({ data: { created: true } });
  open("assessments");

  const send = await screen.findByRole("button", { name: /Send skills test/ });
  expect(send.disabled).toBe(false);
  fireEvent.click(send);

  await waitFor(() =>
    expect(post).toHaveBeenCalledWith("/assessments/candidate/cand-1/send")
  );
});

it("says why the test cannot be sent instead of failing on click", async () => {
  // The server ships `paperReady` for exactly this: the precondition is stated
  // up front rather than discovered through a 409.
  mockReads({ session: null, decision: null, paperReady: false });
  open("assessments");

  expect(await screen.findByText(/No approved paper for this job yet/)).toBeTruthy();
  expect(screen.getByRole("button", { name: /Send skills test/ }).disabled).toBe(true);
  // Skipping stays available — it does not need a paper.
  expect(screen.getByRole("button", { name: /Skip to AI interview/ }).disabled).toBe(false);
});

it("records a skip as a named decision rather than a missing test", async () => {
  mockReads({
    session: null,
    decision: { action: "skipped", byName: "Priya R", at: "2026-03-03T09:00:00Z" },
    paperReady: true,
  });
  open("assessments");

  expect(await screen.findByText("Skills test skipped")).toBeTruthy();
  expect(screen.getByText(/Recorded by Priya R/)).toBeTruthy();
  // No decision is pending, so the gate is gone.
  expect(screen.queryByRole("button", { name: /Send skills test/ })).toBeNull();
});

it("exports the stored record through the authenticated client", async () => {
  mockReads({ session: null, decision: null, paperReady: true });
  open("activity");

  fireEvent.click(await screen.findByText("Record tools"));
  fireEvent.click(screen.getByRole("button", { name: /Export record/ }));

  await waitFor(() =>
    expect(downloadFile).toHaveBeenCalledWith("/candidates/cand-1/export", "Jane_Doe_record.json")
  );
});

it("will not erase until the word is typed", async () => {
  mockReads({ session: null, decision: null, paperReady: true });
  del.mockResolvedValue({ data: { ok: true } });
  open("activity");

  fireEvent.click(await screen.findByText("Record tools"));
  fireEvent.click(screen.getByRole("button", { name: /Erase all data for this candidate/ }));

  const confirm = screen.getByRole("button", { name: /Erase permanently/ });
  expect(confirm.disabled).toBe(true);
  fireEvent.click(confirm);
  expect(del).not.toHaveBeenCalled();

  fireEvent.change(screen.getByLabelText("Type ERASE to confirm"), { target: { value: "erase" } });
  expect(screen.getByRole("button", { name: /Erase permanently/ }).disabled).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: /Erase permanently/ }));

  await waitFor(() =>
    expect(del).toHaveBeenCalledWith("/data-rights/candidates/cand-1", {
      data: { reason: "data-principal erasure request" },
    })
  );
});
