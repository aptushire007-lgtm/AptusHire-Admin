import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SetupDraftList from "../src/components/jobs/SetupDraftList.jsx";
import api from "../src/api/client.js";

vi.mock("../src/api/client.js", () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../src/components/ui/Toast.jsx", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

describe("SetupDraftList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders in-progress setup with clear explanation when job is not yet created", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        items: [
          {
            _id: "draft-1",
            values: { title: "AI engineer" },
            job: null,
            currentStep: "evaluation",
            state: "editing",
            updatedAt: new Date().toISOString(),
          },
        ],
        totalPages: 1,
      },
    });

    render(
      <MemoryRouter>
        <SetupDraftList />
      </MemoryRouter>
    );

    expect(screen.getByText("Loading your saved setups…")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("AI engineer")).toBeInTheDocument();
    });

    expect(screen.getByText(/Setup In-Progress \(No ATS Job Yet\)/)).toBeInTheDocument();
    expect(screen.getByText(/Wizard session saved on server · Not yet added to your active jobs list/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Discard/i })).toBeInTheDocument();
  });

  it("calls api.delete and removes draft when Discard is clicked", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        items: [
          {
            _id: "draft-1",
            values: { title: "AI engineer" },
            job: null,
            currentStep: "evaluation",
            state: "editing",
            updatedAt: new Date().toISOString(),
          },
        ],
        totalPages: 1,
      },
    });
    api.delete.mockResolvedValueOnce({ status: 204 });

    render(
      <MemoryRouter>
        <SetupDraftList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("AI engineer")).toBeInTheDocument();
    });

    const discardBtn = screen.getByRole("button", { name: /Discard setup draft for AI engineer/i });
    fireEvent.click(discardBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/jobs/setup-drafts/draft-1");
    });

    await waitFor(() => {
      expect(screen.queryByText("AI engineer")).not.toBeInTheDocument();
      expect(screen.queryByText("YOUR SAVED SETUPS")).not.toBeInTheDocument();
    });
  });

  it("triggers onResumeDraft when Resume setup is clicked", async () => {
    const mockDraft = {
      _id: "draft-1",
      values: { title: "AI engineer" },
      job: null,
      currentStep: "evaluation",
      state: "editing",
      updatedAt: new Date().toISOString(),
    };

    api.get.mockResolvedValueOnce({
      data: {
        items: [mockDraft],
        totalPages: 1,
      },
    });

    const handleResume = vi.fn();
    render(
      <MemoryRouter>
        <SetupDraftList onResumeDraft={handleResume} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("AI engineer")).toBeInTheDocument();
    });

    const resumeBtn = screen.getByRole("button", { name: /Resume setup/i });
    fireEvent.click(resumeBtn);

    expect(handleResume).toHaveBeenCalledWith(mockDraft);
  });
});
