import { beforeEach, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import InterviewReport from "../src/pages/InterviewReport.jsx";
import api from "../src/api/client.js";
vi.mock("../src/api/client.js", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("../src/lib/socket.js", () => ({ getSocket: () => null }));
vi.mock("../src/components/ui/Toast.jsx", () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
const fixture = (status = "completed") => ({
  candidate: { name: "Test Applicant" }, job: { title: "Engineer" }, stage: "under_review", hasInterview: true,
  interview: { status, transcript: [{ role: "ai", text: "Introduce yourself" }, { role: "candidate", text: "Original answer evidence" }],
    evaluation: { overallScore: 72, summary: "Original measured summary", recommendation: "hire", strengths: ["A verified example"], weaknesses: [] },
  },
});
function open() {
  render(<MemoryRouter initialEntries={["/candidates/test/interview-report"]}><Routes><Route path="/candidates/:id/interview-report" element={<InterviewReport />} /></Routes></MemoryRouter>);
}
beforeEach(() => api.get.mockReset());
it("restores the legacy findings tabs, score, evidence panels and transcript", async () => {
  api.get.mockResolvedValue({ data: fixture() });
  open();
  expect(await screen.findByRole("heading", { name: "AI Interview Report" })).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "AI interview: 72 out of 100" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Strengths 1" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Cognitive Insights" })).toBeNull();
  expect(screen.queryByRole("heading", { name: "Communication Skills" })).toBeNull();
  expect(await screen.findByText("Original answer evidence")).toBeInTheDocument();
  expect(screen.getAllByRole("heading", { name: "Processed Q&A" })).toHaveLength(1);
  expect(screen.getByText("Candidate")).toBeInTheDocument();
  expect(screen.getByText("AI interviewer")).toBeInTheDocument();
  expect(screen.getAllByText("Original answer evidence")).toHaveLength(1);
});
it("keeps human-review suppression when rendering the legacy layout", async () => {
  api.get.mockResolvedValue({ data: fixture("ended_early") });
  open();
  await screen.findByRole("heading", { name: "AI Interview Report" });
  expect(screen.getByRole("heading", { name: "No reliable interview score" })).toBeInTheDocument();
  expect(screen.queryByRole("img", { name: /AI interview: no reading/ })).toBeNull();
  expect(screen.queryByText("Original measured summary")).toBeNull();
  expect(screen.queryByText("Recommendation: Hire")).toBeNull();
  expect(await screen.findByText("Original answer evidence")).toBeInTheDocument();
});
it("can retry a failed report request without keeping the old error", async () => {
  api.get.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ data: { candidate: { name: "Test" }, hasInterview: false } });
  open();
  fireEvent.click(await screen.findByRole("button", { name: "Retry report" }));
  expect(await screen.findByText("No interview yet")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).toBeNull();
});
