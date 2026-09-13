import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AIInterviews from "../src/pages/dashboard/AIInterviews.jsx";
import api from "../src/api/client.js";

const data = vi.hoisted(() => ({ queue: [], loading: false, loadError: "", refresh: vi.fn() }));
vi.mock("../src/context/CompanyDataContext.jsx", () => ({ useCompanyData: () => data }));
vi.mock("../src/api/client.js", () => ({ default: { patch: vi.fn() } }));
vi.mock("../src/components/ui/Toast.jsx", () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
const entry = { _id: "q1", candidate: { _id: "c1", basicDetails: { name: "Demo candidate" } }, job: { _id: "j1", title: "Engineer" }, createdAt: "2026-09-10" };
beforeEach(() => { vi.clearAllMocks(); data.queue = []; data.loading = false; data.loadError = ""; api.patch.mockResolvedValue({}); });
it("distinguishes queue failure from zero entries and offers retry", () => {
  data.loadError = "Could not connect";
  render(<MemoryRouter><AIInterviews /></MemoryRouter>);
  expect(screen.getByRole("alert")).toHaveTextContent("Could not connect");
  expect(screen.queryByText("No one in the queue yet")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry queue" }));
  expect(data.refresh).toHaveBeenCalledOnce();
});
it("routes to candidate evidence without claiming that a queued report exists", () => {
  data.queue = [entry];
  render(<MemoryRouter><AIInterviews /></MemoryRouter>);
  expect(screen.getByRole("link", { name: "Interview evidence" })).toHaveAttribute("href", "/candidates/c1?section=ai-interview&returnTo=%2Fai-interviews");
  expect(screen.queryByRole("link", { name: "Report" })).not.toBeInTheDocument();
});
it("names the candidate and role and changes the queue only after explicit confirmation", async () => {
  data.queue = [entry];
  render(<MemoryRouter><AIInterviews /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Remove" }));
  expect(api.patch).not.toHaveBeenCalled();
  expect(screen.getByRole("alertdialog")).toHaveAccessibleDescription("Demo candidate · Engineer");
  fireEvent.click(screen.getByRole("button", { name: "Remove queue entry" }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/interview-queue/q1", { status: "removed" }));
});
it("handles a deleted candidate without generating an undefined profile link", () => {
  data.queue = [{ ...entry, candidate: null }];
  render(<MemoryRouter><AIInterviews /></MemoryRouter>);
  expect(screen.getByText("Candidate record unavailable")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "View" })).not.toBeInTheDocument();
});
