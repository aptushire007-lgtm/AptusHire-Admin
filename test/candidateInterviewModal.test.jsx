import { expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const { get, patch } = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("../src/api/client.js", () => ({
  default: {
    get,
    patch,
    post: vi.fn(),
  },
  baseURL: "http://localhost:3000/api",
}));

vi.mock("../src/lib/socket.js", () => ({ getSocket: () => null }));
vi.mock("../src/components/ui/Toast.jsx", () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

import CandidateInterviewModal from "../src/components/candidate/CandidateInterviewModal.jsx";

const mockCandidate = {
  _id: "6a9d6035f5e976c5831275fb",
  basicDetails: {
    name: "vijendra",
    email: "algorithmicedge@gmail.com",
    phone: "+917473360076",
  },
  job: {
    _id: "job-1",
    title: "Platform Engineer",
  },
  status: "rejected",
  ats: {
    overallScore: 69,
    categories: {
      skills: 75,
      experience: 65,
    },
  },
};

const mockReport = {
  hasInterview: true,
  candidate: { name: "vijendra" },
  job: { title: "Platform Engineer" },
  stage: "rejected",
  interview: {
    sessionId: "sess-1",
    attempt: 1,
    status: "ended_early",
    startedAt: "2026-09-06T12:57:00.000Z",
    completedAt: "2026-09-06T13:10:00.000Z",
    evaluation: {
      overallScore: null,
      recommendation: "no_hire",
      reviewReason: "The candidate chose to end the interview before it finished.",
    },
    recruiterReview: {
      eligible: true,
      required: true,
      attempt: 1,
      version: "v1",
    },
  },
  coverage: {
    rows: [
      { criterionName: "Distributed Systems & Scalability", passed: true, score: 85, notes: "Discussed async workers." },
      { criterionName: "Production Incident Management", passed: false, score: 40, notes: "Ended early before question." },
    ],
  },
  claimVerification: {
    items: [
      { claim: "Built Multi-Agent AI systems", verification: "Verified in past roles", verdict: "supported" },
    ],
  },
  proctoring: {
    identityMatch: { matched: true },
    signals: [{ type: "Audio", message: "Audio level consistent" }],
  },
};

describe("CandidateInterviewModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockImplementation((url) => {
      if (url.includes("/timeline")) return Promise.resolve({ data: { stageHistory: [] } });
      if (url.includes("/interview-sessions")) return Promise.resolve({ data: null });
      if (url.includes("/assessments")) return Promise.resolve({ data: null });
      if (url.includes("/interview-report")) return Promise.resolve({ data: mockReport });
      if (url.includes("/candidates/")) return Promise.resolve({ data: mockCandidate });
      return Promise.resolve({ data: {} });
    });
  });

  it("renders modal with 80% coverage structure, candidate identity and status badge", async () => {
    render(
      <MemoryRouter initialEntries={["/candidates/6a9d6035f5e976c5831275fb/interview-report"]}>
        <Routes>
          <Route
            path="/candidates/:id/interview-report"
            element={<CandidateInterviewModal />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("interview-report-modal")).toBeInTheDocument();
    });

    const modal = screen.getByTestId("interview-report-modal");
    expect(modal).toHaveClass("interview-report-modal");

    expect(await screen.findByText(/Interview Report - vijendra/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Rejected/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Review Evidence")).toBeInTheDocument();
    expect(screen.getByText(/Hiring Actions/i)).toBeInTheDocument();
    expect(screen.getByText("Record Evidence Review")).toBeInTheDocument();
  });

  it("allows switching between candidate profile tabs and interview sub-tabs", async () => {
    render(
      <MemoryRouter initialEntries={["/candidates/6a9d6035f5e976c5831275fb/interview-report"]}>
        <Routes>
          <Route
            path="/candidates/:id/interview-report"
            element={<CandidateInterviewModal />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("interview-report-modal")).toBeInTheDocument();
    });

    // Sub-tabs under Interview
    expect(screen.getByText("Evidence & Review")).toBeInTheDocument();
    expect(screen.getByText("Criteria")).toBeInTheDocument();
    expect(screen.getByText("Claims & Probes")).toBeInTheDocument();
    expect(screen.getByText("Monitoring")).toBeInTheDocument();

    // Click Criteria subtab
    fireEvent.click(screen.getByText("Criteria"));
    expect(await screen.findByTestId("interview-criteria-view")).toBeInTheDocument();
    expect(screen.getByText("Distributed Systems & Scalability")).toBeInTheDocument();

    // Click Claims & Probes subtab
    fireEvent.click(screen.getByText("Claims & Probes"));
    expect(await screen.findByTestId("interview-claims-view")).toBeInTheDocument();
    expect(screen.getByText("Built Multi-Agent AI systems")).toBeInTheDocument();

    // Click Monitoring subtab
    fireEvent.click(screen.getByText("Monitoring"));
    expect(await screen.findByTestId("interview-monitoring-view")).toBeInTheDocument();
    expect(screen.getByText("Identity Match")).toBeInTheDocument();

    // Switch to Overview main tab
    fireEvent.click(screen.getByRole("button", { name: "Overview" }));
    expect(await screen.findByTestId("candidate-portal-view")).toBeInTheDocument();
  });

  it("calls onClose or closes when ESC, close button or backdrop is clicked", async () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <CandidateInterviewModal
          candidateId="6a9d6035f5e976c5831275fb"
          onClose={onClose}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("interview-report-modal")).toBeInTheDocument();
    });

    // Close button (X)
    const closeBtn = screen.getByLabelText("Close interview report modal");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    // ESC key
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);

    // Backdrop click
    const backdrop = screen.getByTestId("interview-modal-backdrop");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
