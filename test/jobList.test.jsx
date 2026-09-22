import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

const mockCompanyData = vi.hoisted(() => ({
  candidatesByJob: {},
  jobs: [],
  refresh: vi.fn(),
}));
vi.mock("../src/lib/socket.js", () => ({ getSocket: () => null }));

const mockJobs = [
  {
    _id: "j1",
    title: "Senior Full Stack Engineer",
    department: "Engineering",
    location: "San Francisco, CA (Hybrid)",
    description: "Building resilient distributed cloud infrastructure and web interfaces.",
    status: "published",
    requiredSkills: ["React", "Node.js", "TypeScript"],
    minExperienceYears: 5,
    rubricStatus: "approved",
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    _id: "j2",
    title: "Product Designer",
    department: "Design",
    location: "Remote",
    description: "Designing end-to-end recruitment UX workflows and component libraries.",
    status: "published",
    requiredSkills: ["Figma", "Design Systems"],
    minExperienceYears: 3,
    rubricStatus: "draft",
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    _id: "j3",
    title: "Junior QA Tester",
    department: "Engineering",
    location: "New York, NY",
    description: "Automated regression testing and performance benchmarking.",
    status: "draft",
    requiredSkills: ["Playwright", "Jest"],
    minExperienceYears: 1,
    rubricStatus: "none",
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

vi.mock("../src/api/client.js", () => ({
  default: {
    get: vi.fn((url) => {
      if (url === "/jobs") return Promise.resolve({ data: mockJobs });
      return Promise.resolve({ data: [] });
    }),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../src/components/ui/Toast.jsx", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock("../src/context/CompanyDataContext.jsx", () => ({
  useCompanyData: () => mockCompanyData,
}));

const { default: JobList } = await import("../src/pages/JobList.jsx");

function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

function renderJobList(entry = "/jobs") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <JobList />
      <Location />
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockCompanyData.candidatesByJob = {
    j1: [{ _id: "c1", status: "under_review" }, { _id: "c2", status: "interview_scheduled" }],
    j2: [],
    j3: [{ _id: "c3", status: "applied" }],
  };
});

describe("JobList Recruiter UX & Navigation", () => {
  it("reads server application counts without a company-wide candidate list", async () => {
    mockCompanyData.candidatesByJob = {};
    mockJobs[0].applicationCounts = { total: 501, stages: { under_review: 501 } };
    try {
      renderJobList();
      expect((await screen.findAllByText("501")).length).toBeGreaterThan(0);
    } finally { delete mockJobs[0].applicationCounts; }
  });
  it("renders page header, dual search inputs, and filter sidebar", async () => {
    renderJobList();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Jobs" })).toBeInTheDocument();
    });

    // Dual Search bar
    expect(
      screen.getByPlaceholderText(/Search by: Job title, Position, Keyword, Skill.../i)
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/City, state, or 'Remote'.../i)).toBeInTheDocument();

    // Filters sidebar
    expect(screen.getByRole("heading", { name: /Filters/i })).toBeInTheDocument();
    expect(screen.getByText("Requisition Status")).toBeInTheDocument();
    expect(screen.getByText("Department filter")).toBeInTheDocument();
    expect(screen.getByText("Workplace Mode")).toBeInTheDocument();
  });

  it("displays applicant metrics and rubric status on requisition cards", async () => {
    renderJobList("/jobs?view=grid");

    await waitFor(() => {
      expect(screen.getByText("Senior Full Stack Engineer")).toBeInTheDocument();
    });

    // Applicants count from candidate pipeline
    expect(screen.getAllByText(/applicants/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("img", { name: "1 screening, 1 interviewing, 0 at offer" })[0]).toBeInTheDocument();

    // Rubric badge
    expect(screen.getByText("Rubric approved")).toBeInTheDocument();

    // The separate Applicants button is gone — the applicant bar and the card open the job.
    expect(screen.queryByRole("button", { name: /View Applicants/i })).toBeNull();
  });

  it("restores shared job filters and supports removing one condition", async () => {
    renderJobList("/jobs?q=Designer&workplace=remote&view=list");
    expect(await screen.findByRole("table", { name: "Jobs" })).toBeInTheDocument();
    expect(screen.getByText("Product Designer")).toBeInTheDocument();
    expect(screen.queryByText("Senior Full Stack Engineer")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove search filter" }));
    expect(screen.getByRole("searchbox", { name: "Search jobs" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Filter by workplace mode" })).toHaveValue("remote");
    expect(screen.getByText("Product Designer")).toBeInTheDocument();
    expect(screen.queryByText("Senior Full Stack Engineer")).not.toBeInTheDocument();
  });

  it("filters jobs by keyword search", async () => {
    renderJobList();

    await waitFor(() => {
      expect(screen.getByText("Senior Full Stack Engineer")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by: Job title, Position, Keyword, Skill.../i);
    fireEvent.change(searchInput, { target: { value: "Designer" } });

    expect(screen.getByText("Product Designer")).toBeInTheDocument();
    expect(screen.queryByText("Senior Full Stack Engineer")).toBeNull();
  });

  it("filters jobs by location/workplace", async () => {
    renderJobList();

    await waitFor(() => {
      expect(screen.getByText("Senior Full Stack Engineer")).toBeInTheDocument();
    });

    const locInput = screen.getByPlaceholderText(/City, state, or 'Remote'.../i);
    fireEvent.change(locInput, { target: { value: "Remote" } });

    expect(screen.getByText("Product Designer")).toBeInTheDocument();
    expect(screen.queryByText("Senior Full Stack Engineer")).toBeNull();
  });

  it("supports switching between Grid and List views", async () => {
    renderJobList();

    await waitFor(() => {
      expect(screen.getByText("Senior Full Stack Engineer")).toBeInTheDocument();
    });

    const listViewBtn = screen.getByRole("button", { name: "List View (Table)" });
    fireEvent.click(listViewBtn);

    // List table headers should be present
    expect(screen.getByText("Position")).toBeInTheDocument();
    expect(screen.getByText("Opened")).toBeInTheDocument();
  });

  it("clears all active filters when Reset all is clicked", async () => {
    renderJobList();

    await waitFor(() => {
      expect(screen.getByText("Senior Full Stack Engineer")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by: Job title, Position, Keyword, Skill.../i);
    fireEvent.change(searchInput, { target: { value: "Designer" } });

    const resetBtn = screen.getByRole("button", { name: "Reset all" });
    fireEvent.click(resetBtn);

    expect(screen.getByText("Senior Full Stack Engineer")).toBeInTheDocument();
    expect(screen.getByText("Product Designer")).toBeInTheDocument();
  });

  it("renders pagination controls when multiple pages of jobs exist", async () => {
    const { default: api } = await import("../src/api/client.js");
    const origGet = api.get;
    api.get = vi.fn((url, config) => {
      if (url === "/jobs") {
        return Promise.resolve({
          data: {
            items: mockJobs,
            total: 45,
            page: 1,
            limit: 20,
            totalPages: 3,
          },
        });
      }
      return origGet(url, config);
    });

    try {
      renderJobList();
      await waitFor(() => {
        expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Next page" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
      });
    } finally {
      api.get = origGet;
    }
  });

  it("renders 4 KPI metric cards, export button, and opens the job's workspace when clicking a job row", async () => {
    renderJobList("/jobs?view=list");

    await waitFor(() => {
      expect(screen.getByText("Senior Full Stack Engineer")).toBeInTheDocument();
    });

    // 4 KPI Cards
    expect(screen.getByText("Total Requisitions")).toBeInTheDocument();
    expect(screen.getByText("Active Applicants")).toBeInTheDocument();
    expect(screen.getByText("Interviews Scheduled")).toBeInTheDocument();
    // Replaced "Avg. Time to Screen 1.8d · -65% vs manual", which was literal
    // text end to end — the figure included — with a count the page can source.
    expect(screen.getByText("Rubrics to approve")).toBeInTheDocument();
    expect(screen.queryByText("1.8d")).not.toBeInTheDocument();
    expect(screen.queryByText(/Next today/)).not.toBeInTheDocument();

    // Export CSV
    expect(screen.getByRole("button", { name: /Export CSV/i })).toBeInTheDocument();

    // Clicking a row used to pop a dialog over this list. It now opens the
    // job's own workspace, landing on its board — the first thing a recruiter
    // wants from a role is where its candidates stand. (The editor's tabs and
    // rubric behaviour are covered directly in jobInspectionDrawer.test.jsx.)
    const row = screen.getByText("Senior Full Stack Engineer").closest("tr");
    fireEvent.click(row);

    expect(screen.getByTestId("location")).toHaveTextContent("/jobs/j1/pipeline");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

