import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreateJobModal from "../src/components/jobs/CreateJobModal.jsx";
import api from "../src/api/client.js";

vi.mock("../src/api/client.js", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock("../src/components/ui/Toast.jsx", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

const mockPastJobs = [
  {
    _id: "job-1",
    title: "Demo - Marketing & Operation",
    department: "Marketing",
    description: "Existing marketing operations role",
    requirements: "Marketing experience",
    requiredSkills: ["Marketing", "Operations"],
    minExperienceYears: 3,
    createdAt: "2026-09-09T10:00:00.000Z",
    candidatesCount: 1,
  },
];

describe("CreateJobModal - Flowmingo 6-Stage Modal Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === "/jobs") return Promise.resolve({ data: mockPastJobs });
      return Promise.resolve({ data: [] });
    });
    api.post.mockImplementation((url) => {
      if (url === "/jobs/generate-jd") {
        return Promise.resolve({
          data: {
            title: "Data Scientist",
            department: "Engineering",
            description: "AI synthesized description for Data Scientist.",
            requirements: "AI generated requirements.",
            requiredSkills: ["Python", "Machine Learning"],
            minExperienceYears: 4,
          },
        });
      }
      if (url.startsWith("/rubrics/job/")) {
        return Promise.resolve({ data: { _id: "rubric-123", version: 1 } });
      }
      return Promise.resolve({
        data: {
          _id: "created-job-123",
          title: "Frontend Engineer",
          department: "General",
          status: "draft",
        },
      });
    });
    api.patch.mockResolvedValue({ data: { success: true } });
  });

  it("Step 1: renders New Hiring Project, auto-populates project name from title", () => {
    render(
      <MemoryRouter>
        <CreateJobModal isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "New Hiring Project" })).toBeInTheDocument();
    const titleInput = screen.getByLabelText(/Job Title/);
    const projectNameInput = screen.getByLabelText(/Project Name/);

    expect(titleInput).toBeInTheDocument();
    expect(projectNameInput).toHaveValue("");

    // Type in Job Title
    fireEvent.change(titleInput, { target: { value: "AI Researcher" } });
    expect(projectNameInput.value).toContain("AI Researcher - Project");

    // Manually edit Project Name
    fireEvent.change(projectNameInput, { target: { value: "Custom AI Project" } });
    expect(projectNameInput).toHaveValue("Custom AI Project");
  });

  it("Step 2: navigates to 'What will this project include?' with 2-column layout and preview updates", async () => {
    render(
      <MemoryRouter>
        <CreateJobModal isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Job Title/), { target: { value: "AI Researcher" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 2 heading
    expect(await screen.findByRole("heading", { name: "What will this project include?" })).toBeInTheDocument();
    expect(screen.getByText("PICK WHAT TO INCLUDE")).toBeInTheDocument();
    expect(screen.getByText("ALWAYS INCLUDED")).toBeInTheDocument();

    // Verify presence of authentic options
    expect(screen.getAllByText("AI Interview").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("CV Evaluation")).toBeInTheDocument();
    expect(screen.getByText("Skills Assessment (Test)")).toBeInTheDocument();
    expect(screen.getByText("Human Review Queue")).toBeInTheDocument();
    expect(screen.getAllByText("My Candidates (ATS)").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Job Post").length).toBeGreaterThanOrEqual(1);

    // Verify non-existent features from reference mockup are strictly NOT in the UI
    expect(screen.queryByText("Showcase")).not.toBeInTheDocument();
    expect(screen.queryByText("Role-play")).not.toBeInTheDocument();
    expect(screen.queryByText("Chat Screening")).not.toBeInTheDocument();
    expect(screen.queryByText("Matched Talents")).not.toBeInTheDocument();

    // Check that AI Interview preview is active by default
    expect(screen.getByText("An interview that happens without you in the room — and without a single scheduling email.")).toBeInTheDocument();

    // Click on My Candidates (ATS) to switch preview pane
    fireEvent.click(screen.getAllByText("My Candidates (ATS)")[0]);
    expect(screen.getByText("One pipeline for this role, and email that sends itself as people move through it.")).toBeInTheDocument();
  });

  it("Step 3 & 4: configures setup mode and reviews AI Interview settings", async () => {
    render(
      <MemoryRouter>
        <CreateJobModal isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>
    );

    // Step 1
    fireEvent.change(screen.getByLabelText(/Job Title/), { target: { value: "Full Stack Engineer" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 2
    expect(await screen.findByRole("heading", { name: "What will this project include?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 3
    expect(await screen.findByRole("heading", { name: "How would you like to set things up?" })).toBeInTheDocument();
    expect(screen.getByText("From Job Description")).toBeInTheDocument();
    expect(screen.getByText("From Job Title only")).toBeInTheDocument();
    expect(screen.getByText("Duplicate previous project to customize")).toBeInTheDocument();

    // Enter JD text
    fireEvent.click(screen.getByRole("button", { name: "Enter Your JD" }));
    const textarea = screen.getByPlaceholderText(/Paste your job description here/);
    fireEvent.change(textarea, { target: { value: "Full Stack Node and React engineering." } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 4: Review your AI Interview
    expect(await screen.findByRole("heading", { name: "Review your AI Interview" })).toBeInTheDocument();
    expect(screen.getByText("General Settings")).toBeInTheDocument();
    expect(screen.getByText("Questions")).toBeInTheDocument();

    // Duration slider
    expect(screen.getByText("Interview Duration")).toBeInTheDocument();
    expect(screen.getByText("15 min")).toBeInTheDocument();

    // Switch to Questions tab
    fireEvent.click(screen.getByText("Questions"));
    expect(screen.getByText("Generate questions based on candidate's CV")).toBeInTheDocument();
    expect(screen.getByText("Real-time Dynamic")).toBeInTheDocument();
    expect(screen.getByText("Preset Questions")).toBeInTheDocument();
    // Was a toggle that was never sent anywhere, for a rule that cannot be
    // switched off (applying without a résumé is rejected by the API). It is now
    // a statement of what actually happens.
    expect(screen.getByText("Every applicant submits a CV")).toBeInTheDocument();

    // Pre-screening questions list
    expect(screen.getByText(/Pre-screening questions/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add question/i })).toBeInTheDocument();
  });

  it("Step 5: manages rubric criteria with 4-tier color badges and floating priority picker", async () => {
    render(
      <MemoryRouter>
        <CreateJobModal isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>
    );

    // Step 1 -> 2 -> 3 -> 4 -> 5
    fireEvent.change(screen.getByLabelText(/Job Title/), { target: { value: "DevOps Engineer" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { name: "What will this project include?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("heading", { name: "How would you like to set things up?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enter Your JD" }));
    fireEvent.change(screen.getByPlaceholderText(/Paste your job description here/), {
      target: { value: "Kubernetes, CI/CD, Terraform, AWS infrastructure." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("heading", { name: "Review your AI Interview" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 5: Define what makes a successful candidate
    expect(await screen.findByRole("heading", { name: "Define what makes a successful candidate" })).toBeInTheDocument();
    expect(screen.getByText("Must Have")).toBeInTheDocument();
    expect(screen.getByText("Very Important")).toBeInTheDocument();

    // Click priority badge to open Floating Priority Selector Popup
    const mustHaveBtn = screen.getByRole("button", { name: /Must Have/i });
    fireEvent.click(mustHaveBtn);

    expect(screen.getByText("Select Priority Level")).toBeInTheDocument();
    expect(screen.getByText("Crucial requirement")).toBeInTheDocument();
    expect(screen.getByText("High impact")).toBeInTheDocument();
    expect(screen.getByText("Standard weight")).toBeInTheDocument();
    expect(screen.getByText("Bonus qualification")).toBeInTheDocument();

    // Select "Good to Have" from popup
    fireEvent.click(screen.getByText("Bonus qualification"));
    expect(screen.queryByText("Select Priority Level")).not.toBeInTheDocument();

    // Add criterion
    fireEvent.click(screen.getByRole("button", { name: /Add criterion/i }));
    expect(screen.getByDisplayValue("New Role Competency")).toBeInTheDocument();
  });

  it("Step 6: executes full project creation, displays particle loader, and opens workspace guidance", async () => {
    const onCreated = vi.fn();
    // The progress screen now advances on real completions rather than a timer,
    // so with instantly-resolving mocks it would come and go inside one
    // microtask and never be observable. Holding the rubric compile open keeps
    // the modal in its in-progress state long enough to assert on it — which is
    // the honest way to test a loader whose lifetime is the work's lifetime.
    let releaseRubric;
    const rubricGate = new Promise((resolve) => {
      releaseRubric = () => resolve({ data: { _id: "rubric-456", version: 1 } });
    });
    api.post.mockImplementation((url) => {
      if (url.startsWith("/rubrics/job/")) return rubricGate;
      if (url.startsWith("/rubrics/")) return Promise.resolve({ data: {} });
      return Promise.resolve({
        data: {
          _id: "created-job-full",
          title: "Senior AI Engineer",
          department: "Engineering",
          status: "draft",
        },
      });
    });

    render(
      <MemoryRouter>
        <CreateJobModal isOpen={true} onClose={vi.fn()} onCreated={onCreated} />
      </MemoryRouter>
    );

    // Step 1
    fireEvent.change(screen.getByLabelText(/Job Title/), { target: { value: "Senior AI Engineer" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 2
    expect(await screen.findByRole("heading", { name: "What will this project include?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 3
    expect(await screen.findByRole("heading", { name: "How would you like to set things up?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enter Your JD" }));
    fireEvent.change(screen.getByPlaceholderText(/Paste your job description here/), {
      target: { value: "Senior AI Engineer to build LLM pipelines and autonomous agents." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 4
    expect(await screen.findByRole("heading", { name: "Review your AI Interview" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 5
    expect(await screen.findByRole("heading", { name: "Define what makes a successful candidate" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 6: Creating your hiring project... (held open by the rubric gate)
    expect(await screen.findByRole("heading", { name: "Creating your hiring project..." })).toBeInTheDocument();
    expect(screen.getByText(/Synthesizing role brief & requirements/)).toBeInTheDocument();
    expect(screen.getByText(/Calibrating scoring rubric criteria/)).toBeInTheDocument();

    // Verify API call was executed
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/jobs",
        expect.objectContaining({
          title: "Senior AI Engineer",
          description: "Senior AI Engineer to build LLM pipelines and autonomous agents.",
        })
      );
    });

    // Let the remaining setup finish.
    releaseRubric();

    // Milestone completion card
    expect(await screen.findByRole("heading", { name: "Hiring Project Created!" }, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Review Evaluation Plan & Scoring Rubric/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Inspect Requisition/i })).toBeInTheDocument();
    expect(onCreated).toHaveBeenCalled();
  });

  it("Step 6: handles 429 quota limit and informs the user to upgrade", async () => {
    api.post.mockImplementation((url) => {
      if (url === "/jobs") {
        return Promise.reject({
          response: {
            status: 429,
            data: { error: "Monthly job posting quota reached. Upgrade your plan to post more requisitions." },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <CreateJobModal isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>
    );

    // Step 1
    fireEvent.change(screen.getByLabelText(/Job Title/), { target: { value: "Quota Test Role" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 2
    fireEvent.click(await screen.findByRole("button", { name: "Continue" }));

    // Step 3
    fireEvent.click(await screen.findByRole("button", { name: "Enter Your JD" }));
    fireEvent.change(screen.getByPlaceholderText(/Paste your job description here/), {
      target: { value: "Valid job description for testing quota enforcement." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 4
    fireEvent.click(await screen.findByRole("button", { name: "Continue" }));

    // Step 5
    fireEvent.click(await screen.findByRole("button", { name: "Continue" }));

    // Step 6: Verify quota error message is displayed
    expect(await screen.findByText(/Monthly job posting quota reached/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry project creation/i })).toBeInTheDocument();
  });

  it("Step 6: handles JOB_CONFLICT and provides duplicate warning", async () => {
    api.post.mockImplementation((url) => {
      if (url === "/jobs") {
        return Promise.reject({
          response: {
            status: 409,
            data: { code: "JOB_CONFLICT", error: "A job with this title already exists in the active workspace." },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <CreateJobModal isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>
    );

    // Step 1
    fireEvent.change(screen.getByLabelText(/Job Title/), { target: { value: "Duplicate Engineer" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 2
    fireEvent.click(await screen.findByRole("button", { name: "Continue" }));

    // Step 3
    fireEvent.click(await screen.findByRole("button", { name: "Enter Your JD" }));
    fireEvent.change(screen.getByPlaceholderText(/Paste your job description here/), {
      target: { value: "Valid job description for testing conflict detection." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 4
    fireEvent.click(await screen.findByRole("button", { name: "Continue" }));

    // Step 5
    fireEvent.click(await screen.findByRole("button", { name: "Continue" }));

    // Step 6: Verify conflict error message is displayed
    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry project creation/i })).toBeInTheDocument();
  });

  it("Step 2 & Assessment: enables Skills Assessment, configures difficulty, duration & anti-cheat, compiles paper and shows studio button", async () => {
    const onCreated = vi.fn();
    api.post.mockImplementation((url) => {
      if (url === "/jobs") {
        return Promise.resolve({
          data: {
            _id: "job-assessment-test",
            title: "Staff Backend Engineer",
            department: "Engineering",
            status: "draft",
            assessmentPolicy: "manual",
          },
        });
      }
      if (url.startsWith("/rubrics/job/")) {
        return Promise.resolve({ data: { _id: "rubric-backend-1", version: 1 } });
      }
      if (url.startsWith("/assessments/papers/job/")) {
        return Promise.resolve({ data: { _id: "paper-backend-1", version: 1, status: "draft" } });
      }
      if (url.includes("/items/generate")) {
        return Promise.resolve({ data: { success: true, count: 12 } });
      }
      return Promise.resolve({ data: { success: true } });
    });

    render(
      <MemoryRouter>
        <CreateJobModal isOpen={true} onClose={vi.fn()} onCreated={onCreated} />
      </MemoryRouter>
    );

    // Step 1: Title
    fireEvent.change(screen.getByLabelText(/Job Title/), { target: { value: "Staff Backend Engineer" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 2: Capabilities - Enable Skills Assessment (Test)
    expect(await screen.findByRole("heading", { name: "What will this project include?" })).toBeInTheDocument();
    const testCheckbox = screen.getByLabelText(/Skills Assessment \(Test\)/i);
    expect(testCheckbox).not.toBeChecked();
    fireEvent.click(testCheckbox);
    expect(testCheckbox).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 3: Setup Mode
    expect(await screen.findByRole("heading", { name: "How would you like to set things up?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enter Your JD" }));
    fireEvent.change(screen.getByPlaceholderText(/Paste your job description here/), {
      target: { value: "Staff Backend Engineer: Distributed databases, Go, microservices, Kafka." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 4: AI Interview
    expect(await screen.findByRole("heading", { name: "Review your AI Interview" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 5: Rubric Builder
    expect(await screen.findByRole("heading", { name: "Define what makes a successful candidate" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step "assessment": Skills Assessment Configuration
    expect(await screen.findByRole("heading", { name: "Skills Assessment Configuration" })).toBeInTheDocument();
    expect(screen.getByText(/Grounded in your calibrated rubric/i)).toBeInTheDocument();
    expect(screen.getByText(/Assessment Rigor & Difficulty Mode/i)).toBeInTheDocument();

    // Select "Advanced (Senior/Staff)" difficulty
    fireEvent.click(screen.getByText("Advanced (Senior/Staff)"));

    // Select "60 mins" test duration
    fireEvent.click(screen.getByRole("button", { name: /60 mins/i }));

    // Add custom focus topics
    const topicsInput = screen.getByPlaceholderText(/React 19, TypeScript/i);
    fireEvent.change(topicsInput, { target: { value: "Go, Concurrency, Kafka, Raft Consensus" } });

    // Anti-cheat controls
    expect(screen.getByText("Periodic Camera Snapshots")).toBeInTheDocument();
    expect(screen.getByText("Tab-Switch & Blur Soft Lock")).toBeInTheDocument();
    expect(screen.getByText(/Triple-Solver Verification Active/i)).toBeInTheDocument();

    // Click "Create Hiring Project" from assessment step
    fireEvent.click(screen.getByRole("button", { name: /Create Hiring Project/i }));

    // Step 6: Animated loader
    expect(await screen.findByRole("heading", { name: "Creating your hiring project..." })).toBeInTheDocument();

    // Verify assessment compilation and patching were invoked
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/assessments/papers/job/job-assessment-test/compile"
      );
      expect(api.patch).toHaveBeenCalledWith(
        "/assessments/papers/paper-backend-1",
        expect.objectContaining({
          difficultyPolicy: { mode: "fixed", fixedTier: "hard" },
          integrityDefaults: expect.objectContaining({
            proctoring: true,
            softLock: expect.objectContaining({ enabled: true, action: "pause" }),
          }),
          instructions: "Assessment Focus: Go, Concurrency, Kafka, Raft Consensus",
        })
      );
      expect(api.post).toHaveBeenCalledWith(
        "/assessments/papers/paper-backend-1/items/generate"
      );
    });

    // Verify success modal shows Skills Assessment badge and studio navigation button
    expect(await screen.findByRole("heading", { name: "Hiring Project Created!" }, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText("Skills Assessment")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Configure Skills Assessment Studio/i })).toBeInTheDocument();
    expect(onCreated).toHaveBeenCalled();
  });
});
