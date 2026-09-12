import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import JobInspectionDrawer from "../src/components/jobs/JobInspectionDrawer.jsx";
import api from "../src/api/client.js";

vi.mock("../src/api/client.js", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../src/components/ui/Toast.jsx", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock CandidateDrawer so we can easily test that it gets rendered in-place
vi.mock("../src/components/candidate/CandidateDrawer.jsx", () => ({
  default: ({ candidateId, onClose }) => (
    <div data-testid="mock-candidate-drawer">
      <span>Candidate Drawer Active: {candidateId}</span>
      <button onClick={onClose}>Close Candidate Drawer</button>
    </div>
  ),
}));

const mockJob = {
  _id: "job-inspect-999",
  title: "Cloud Infrastructure Architect",
  department: "Platform",
  location: "Remote / Hybrid",
  numberOfOpenings: 3,
  minExperienceYears: 6,
  status: "draft",
  rubricStatus: "draft",
  description: "Scale Kubernetes clusters, automate Terraform infra, and oversee zero-trust policies.",
  requirements: "Proficient in AWS, GCP, Terraform, and Go.",
  requiredSkills: ["Kubernetes", "AWS", "Terraform", "Go"],
  createdAt: "2026-09-08T10:00:00.000Z",
};

// Shaped exactly like a row from GET /api/candidates — `basicDetails` and `ats`,
// not flat `name`/`score`. The old flat fixture matched what the component
// happened to read rather than what the API sends, so it went on passing while
// production rendered a placeholder applicant at a hardcoded 92%.
// `ats.scoredAt` is what makes a score real: without it the schema default of 0
// is not a measurement (see lib/pipelineMetrics.js).
const mockCandidates = [
  {
    _id: "cand-1",
    basicDetails: { name: "Alex Mercer", email: "alex.mercer@example.com" },
    status: "interview_scheduled",
    ats: { overallScore: 95, scoredAt: "2026-09-01T10:00:00.000Z", decision: "pass", engine: "evidence" },
  },
  {
    _id: "cand-2",
    basicDetails: { name: "Samantha Brooks", email: "s.brooks@example.com" },
    status: "under_review",
    ats: { overallScore: 88, scoredAt: "2026-09-01T10:05:00.000Z", decision: "review", engine: "evidence" },
  },
];

describe("JobInspectionDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.startsWith("/rubrics/job/")) {
        return Promise.resolve({
          data: {
            _id: "rubric-999",
            criteria: [
              { label: "Distributed Infrastructure & IaC", importance: "critical", weight: 0.4, rationale: "Evaluates Terraform depth." },
              { label: "Container Orchestration & Reliability", importance: "important", weight: 0.35, rationale: "Evaluates K8s resilience." },
              { label: "Zero-Trust Security Controls", importance: "helpful", weight: 0.25, rationale: "Evaluates IAM and security audit." },
            ],
          },
        });
      }
      if (url.includes("/question-set")) {
        return Promise.resolve({
          data: {
            active: {
              _id: "set-999",
              status: "draft",
              questions: [
                { id: "q1", text: "Walk me through how you design high-availability clusters on Kubernetes.", topic: "Architecture" },
                { id: "q2", text: "Describe a production outage caused by an IaC bug and how you mitigated it.", topic: "Resilience" },
              ],
            },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
    api.post.mockImplementation((url) => {
      if (url.includes("/compile")) {
        return Promise.resolve({
          data: {
            _id: "rubric-999",
            criteria: [
              { label: "Distributed Infrastructure & IaC", importance: "critical", weight: 0.4, rationale: "Evaluates Terraform depth." },
              { label: "Container Orchestration & Reliability", importance: "important", weight: 0.35, rationale: "Evaluates K8s resilience." },
              { label: "Zero-Trust Security Controls", importance: "helpful", weight: 0.25, rationale: "Evaluates IAM and security audit." },
            ],
          },
        });
      }
      if (url.includes("/auto-draft")) {
        return Promise.resolve({
          data: {
            _id: "set-999",
            status: "draft",
            questions: [
              { id: "q1", text: "Walk me through how you design high-availability clusters on Kubernetes.", topic: "Architecture" },
              { id: "q2", text: "Describe a production outage caused by an IaC bug and how you mitigated it.", topic: "Resilience" },
            ],
          },
        });
      }
      return Promise.resolve({ data: { success: true } });
    });
    api.patch.mockResolvedValue({ data: { success: true } });
    api.delete.mockResolvedValue({ data: { success: true } });
  });

  it("renders overview tab by default with role info, skills, and applicant snapshot", () => {
    render(
      <JobInspectionDrawer
        job={mockJob}
        onClose={vi.fn()}
        candidates={mockCandidates}
      />
    );

    expect(screen.getByRole("heading", { name: "Cloud Infrastructure Architect" })).toBeInTheDocument();
    expect(screen.getByText(/#REQ-CT-999/)).toBeInTheDocument();
    expect(screen.getByText("Kubernetes")).toBeInTheDocument();
    expect(screen.getByText("AWS")).toBeInTheDocument();
    expect(screen.getByText(/Scale Kubernetes clusters/)).toBeInTheDocument();
    expect(screen.getByText("Alex Mercer")).toBeInTheDocument();
  });

  it("switches to Candidates tab and renders applicant cards", () => {
    render(
      <JobInspectionDrawer
        job={mockJob}
        onClose={vi.fn()}
        candidates={mockCandidates}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: /Candidates \(2\)/ }));

    expect(screen.getByText("Samantha Brooks")).toBeInTheDocument();
    expect(screen.getByText("2 applicants enrolled")).toBeInTheDocument();
  });

  it("opens layered CandidateDrawer when an applicant is clicked in Candidates tab", () => {
    render(
      <JobInspectionDrawer
        job={mockJob}
        onClose={vi.fn()}
        candidates={mockCandidates}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: /Candidates \(2\)/ }));
    fireEvent.click(screen.getByText("Alex Mercer"));

    expect(screen.getByTestId("mock-candidate-drawer")).toBeInTheDocument();
    expect(screen.getByText("Candidate Drawer Active: cand-1")).toBeInTheDocument();

    // Close layered drawer
    fireEvent.click(screen.getByRole("button", { name: "Close Candidate Drawer" }));
    expect(screen.queryByTestId("mock-candidate-drawer")).not.toBeInTheDocument();
  });

  it("switches to Rubric tab, loads criteria, recompiles with AI, and approves rubric via API", async () => {
    const onJobUpdated = vi.fn();

    render(
      <JobInspectionDrawer
        job={mockJob}
        onClose={vi.fn()}
        candidates={mockCandidates}
        onJobUpdated={onJobUpdated}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: "AI Rubric & Scoring" }));

    expect(await screen.findByText("Distributed Infrastructure & IaC")).toBeInTheDocument();
    expect(screen.getByText("Container Orchestration & Reliability")).toBeInTheDocument();

    // Recompile with AI
    const recompileBtn = screen.getByRole("button", { name: /Recompile with AI/i });
    fireEvent.click(recompileBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/rubrics/job/job-inspect-999/compile");
    });

    // Approve rubric
    const approveButton = screen.getByRole("button", { name: "Approve Rubric" });
    expect(approveButton).toBeInTheDocument();

    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/rubrics/rubric-999/approve");
    });
    expect(onJobUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ rubricStatus: "approved" })
    );
  });

  it("allows adding, removing, and saving custom rubric criteria", async () => {
    render(
      <JobInspectionDrawer
        job={mockJob}
        onClose={vi.fn()}
        candidates={mockCandidates}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: "AI Rubric & Scoring" }));
    expect(await screen.findByText("Distributed Infrastructure & IaC")).toBeInTheDocument();

    // Open add criterion form
    fireEvent.click(screen.getByRole("button", { name: /Add custom evaluation criterion/i }));

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/Competency title/i), {
      target: { value: "Site Reliability & SRE" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Rationale: why this criterion/i), {
      target: { value: "Required for maintaining 99.99% uptime." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add to Rubric" }));

    expect(screen.getByText("Site Reliability & SRE")).toBeInTheDocument();

    // Remove first criterion
    const removeButtons = screen.getAllByTitle("Remove criterion");
    fireEvent.click(removeButtons[0]);

    // Save changes button should now be visible
    const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        "/rubrics/rubric-999",
        expect.objectContaining({
          criteria: expect.arrayContaining([
            expect.objectContaining({ label: "Site Reliability & SRE" }),
          ]),
        })
      );
    });
  });

  it("switches to Interview Questions tab, generates with AI, adds, reorders, and approves questions", async () => {
    render(
      <JobInspectionDrawer
        job={mockJob}
        onClose={vi.fn()}
        candidates={mockCandidates}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: /Interview Questions/i }));

    expect(await screen.findByText(/Walk me through how you design high-availability clusters/i)).toBeInTheDocument();

    // Generate questions with AI
    fireEvent.click(screen.getByRole("button", { name: /Generate with AI/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/jobs/job-inspect-999/question-set/auto-draft");
    });

    // Add question
    fireEvent.click(screen.getByRole("button", { name: /Add interview question/i }));
    fireEvent.change(screen.getByPlaceholderText(/Type interview question prompt/i), {
      target: { value: "How do you handle multi-region database failover?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Question" }));

    expect(screen.getByText("How do you handle multi-region database failover?")).toBeInTheDocument();

    // Reorder with Move Up
    const moveUpButtons = screen.getAllByTitle("Move up");
    fireEvent.click(moveUpButtons[1]); // move question 2 up

    // Save draft questions
    const saveBtn = screen.getByRole("button", { name: /Save Questions/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        "/jobs/job-inspect-999/question-set/set-999",
        expect.objectContaining({
          questions: expect.arrayContaining([
            expect.objectContaining({ text: "How do you handle multi-region database failover?" }),
          ]),
        })
      );
    });

    // Approve questions
    const approveBtn = screen.getByRole("button", { name: /Approve Questions/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/jobs/job-inspect-999/question-set/set-999/approve");
    });
  });

  it("handles deleting job directly from drawer with confirmation", async () => {
    const onJobDeleted = vi.fn();
    const onClose = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <JobInspectionDrawer
        job={mockJob}
        onClose={onClose}
        candidates={mockCandidates}
        onJobDeleted={onJobDeleted}
      />
    );

    const deleteButtons = screen.getAllByRole("button", { name: /Delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/jobs/job-inspect-999");
    });
    expect(onJobDeleted).toHaveBeenCalledWith("job-inspect-999");
    expect(onClose).toHaveBeenCalled();
  });

  it("opens EditJobModal when clicking Edit button", () => {
    render(
      <JobInspectionDrawer
        job={mockJob}
        onClose={vi.fn()}
        candidates={mockCandidates}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByRole("heading", { name: "Edit Requisition" })).toBeInTheDocument();
  });

  it("closes when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(
      <JobInspectionDrawer
        job={mockJob}
        onClose={onClose}
        candidates={mockCandidates}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
