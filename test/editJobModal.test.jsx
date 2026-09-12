import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EditJobModal from "../src/components/jobs/EditJobModal.jsx";
import api from "../src/api/client.js";

vi.mock("../src/api/client.js", () => ({
  default: {
    put: vi.fn(),
  },
}));

vi.mock("../src/components/ui/Toast.jsx", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockJob = {
  _id: "job-edit-123",
  title: "Frontend Architect",
  department: "Engineering",
  location: "Remote / Hybrid",
  numberOfOpenings: 2,
  minExperienceYears: 5,
  atsThreshold: 75,
  assessmentPolicy: "manual",
  description: "Lead frontend architecture and design systems across multiple web apps.",
  requirements: "10+ years experience, expert in React and performance optimization.",
  requiredSkills: ["React", "TypeScript", "Vite", "TailwindCSS"],
  __v: 1,
};

describe("EditJobModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders when open and pre-populates form fields from job object", () => {
    render(<EditJobModal isOpen={true} job={mockJob} onClose={vi.fn()} onUpdated={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Edit Requisition" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Job Title/)).toHaveValue("Frontend Architect");
    expect(screen.getByLabelText(/Department/)).toHaveValue("Engineering");
    expect(screen.getByLabelText(/Location/)).toHaveValue("Remote / Hybrid");
    expect(screen.getByLabelText(/Number of Openings/)).toHaveValue(2);
    expect(screen.getByLabelText(/Min Experience/)).toHaveValue(5);
    expect(screen.getByLabelText(/Screening Threshold/)).toHaveValue(75);
    expect(screen.getByLabelText(/Job Description/)).toHaveValue(
      "Lead frontend architecture and design systems across multiple web apps."
    );
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <EditJobModal isOpen={false} job={mockJob} onClose={vi.fn()} onUpdated={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("validates empty title and description on submit without calling api.put", async () => {
    render(<EditJobModal isOpen={true} job={mockJob} onClose={vi.fn()} onUpdated={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Job Title/), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByText("Enter a public role title.")).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
  });

  it("submits updated payload to PUT /jobs/:id and calls onUpdated and onClose", async () => {
    const onUpdated = vi.fn();
    const onClose = vi.fn();
    const updatedJob = { ...mockJob, title: "Staff Frontend Engineer", department: "Platform Core" };

    api.put.mockResolvedValueOnce({ data: updatedJob });

    render(<EditJobModal isOpen={true} job={mockJob} onClose={onClose} onUpdated={onUpdated} />);

    fireEvent.change(screen.getByLabelText(/Job Title/), { target: { value: "Staff Frontend Engineer" } });
    fireEvent.change(screen.getByLabelText(/Department/), { target: { value: "Platform Core" } });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/jobs/job-edit-123",
        expect.objectContaining({
          title: "Staff Frontend Engineer",
          department: "Platform Core",
          revision: 1,
        })
      );
    });

    expect(onUpdated).toHaveBeenCalledWith(updatedJob);
    expect(onClose).toHaveBeenCalled();
  });

  it("handles server conflict error (409 JOB_CONFLICT)", async () => {
    api.put.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { code: "JOB_CONFLICT", error: "Modified in another tab" },
      },
    });

    render(<EditJobModal isOpen={true} job={mockJob} onClose={vi.fn()} onUpdated={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(
      await screen.findByText(/This requisition was modified in another tab/i)
    ).toBeInTheDocument();
  });
});

