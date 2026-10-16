// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import App from "../src/App.jsx";
import api, { getViewAsCompany } from "../src/api/client.js";

const authState = vi.hoisted(() => ({
  current: { user: null, isAuthenticated: false },
}));

vi.mock("../src/auth/useAdminAuth.js", () => ({
  useAdminAuth: () => authState.current,
}));

vi.mock("../src/api/client.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  getViewAsCompany: vi.fn(() => null),
  setViewAsCompany: vi.fn(),
}));

vi.mock("../src/auth/adminAuth.js", () => ({
  getAdminAuth: () => null,
  getAdminRefreshToken: () => null,
  saveAdminAuth: vi.fn(),
  clearAdminAuth: vi.fn(),
}));

vi.mock("../src/components/dashboard/DashboardShell.jsx", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock("../src/motion/SmoothScroll.jsx", () => ({ default: () => null }));
vi.mock("../src/pages/Landing.jsx", () => ({ default: () => null }));
vi.mock("../src/pages/Login.jsx", () => ({ default: () => null }));
vi.mock("../src/pages/dashboard/DashboardHome.jsx", () => ({
  default: () => <h1>Dashboard home</h1>,
}));
vi.mock("../src/pages/platform/PlatformConsole.jsx", () => ({
  default: () => <h1>Platform console</h1>,
}));

const analytics = {
  recruiters: [
    { id: "recruiter-1", name: "Avery Recruiter", email: "avery@example.com" },
    { id: "recruiter-2", name: "Blake Recruiter", email: "blake@example.com" },
  ],
  sessions: [{
    recruiterId: "recruiter-1",
    name: "Avery Recruiter",
    email: "avery@example.com",
    status: "active",
    lastLoginAt: "2026-10-14T10:00:00.000Z",
    lastLogoutAt: null,
    lastActiveAt: "2026-10-14T10:10:00.000Z",
    totalSessions: 3,
    totalDurationMs: 7_200_000,
    averageDurationMs: 2_400_000,
    timeoutCount: 1,
  }],
  activitySummary: {
    total: 12,
    jobs: 2,
    candidates: 3,
    interviews: 1,
    assessments: 2,
    evaluation: 3,
    other: 1,
  },
  dailyRecruiterActivity: [{
    recruiterId: "recruiter-1",
    recruiterName: "Avery Recruiter",
    recruiterEmail: "avery@example.com",
    date: "2026-10-14",
    totalActivities: 12,
    activityBreakdown: { JOBS: 2, CANDIDATES: 3, INTERVIEWS: 1, ASSESSMENTS: 2, EVALUATION: 3, AUTH: 1 },
  }],
  recentActivities: [{
    timestamp: "2026-10-14T10:11:00.000Z",
    recruiter: { id: "recruiter-1", name: "Avery Recruiter", email: "avery@example.com" },
    module: "JOBS",
    action: "CREATED",
    targetType: "Job",
    targetId: "job-1",
  }],
};

function renderApp(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <CurrentPath />
    </MemoryRouter>
  );
}

function CurrentPath() {
  const location = useLocation();
  return <output data-testid="current-path">{location.pathname}</output>;
}

describe("Recruiter Analytics page and route", () => {
  beforeEach(() => {
    authState.current = { user: { role: "admin" }, isAuthenticated: true };
    api.get.mockResolvedValue({ data: analytics });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders analytics data, filters, and activity/session summaries for an Admin", async () => {
    renderApp("/recruiter-analytics");

    expect(await screen.findByRole("heading", { name: "Recruiter Analytics" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Date range" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Recruiter" })).toBeInTheDocument();
    expect(await screen.findByRole("option", { name: "Blake Recruiter" })).toBeInTheDocument();
    expect((await screen.findAllByText("avery@example.com")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Total activities").length).toBeGreaterThan(0);
    expect(screen.getAllByText("12").length).toBeGreaterThan(0);
    expect(screen.getByRole("table", { name: "Daily activity by recruiter" })).toHaveTextContent("Avery Recruiter");
    expect(screen.getByRole("table", { name: "Daily activity by recruiter" })).toHaveTextContent("JOBS: 2");
    expect(screen.getByText("2h")).toBeInTheDocument();
    expect(screen.getByText("Job · job-1")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/recruiter-analytics", { params: { range: "7d" } });
  });

  it("refetches for the selected date range and recruiter", async () => {
    renderApp("/recruiter-analytics");
    const rangeSelect = await screen.findByRole("combobox", { name: "Date range" });
    fireEvent.change(rangeSelect, { target: { value: "30d" } });
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/recruiter-analytics", { params: { range: "30d" } });
    });

    const recruiterSelect = screen.getByRole("combobox", { name: "Recruiter" });
    fireEvent.change(recruiterSelect, { target: { value: "recruiter-1" } });
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/recruiter-analytics", {
        params: { range: "30d", recruiterId: "recruiter-1" },
      });
    });
  });

  it("blocks a Recruiter from directly opening the Admin-only route", async () => {
    authState.current = { user: { role: "recruiter" }, isAuthenticated: true };
    renderApp("/recruiter-analytics");

    await waitFor(() => expect(screen.getByTestId("current-path")).toHaveTextContent("/"));
    expect(screen.queryByRole("heading", { name: "Recruiter Analytics" })).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalledWith("/recruiter-analytics", expect.anything());
  });

  it("blocks a Superadmin from the company Admin analytics page, including tenant view-as", async () => {
    getViewAsCompany.mockReturnValue({ companyId: "company-1" });
    authState.current = { user: { role: "superadmin" }, isAuthenticated: true };
    renderApp("/recruiter-analytics");

    expect(await screen.findByRole("heading", { name: "Platform console" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Recruiter Analytics" })).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalledWith("/recruiter-analytics", expect.anything());
  });

  it("redirects a Candidate away from the company Admin Portal", async () => {
    authState.current = { user: { role: "candidate" }, isAuthenticated: true };
    renderApp("/recruiter-analytics");

    await waitFor(() => expect(screen.getByTestId("current-path")).toHaveTextContent("/login"));
    expect(screen.queryByRole("heading", { name: "Recruiter Analytics" })).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it("renders safe loading, API error, and empty states", async () => {
    api.get.mockReturnValue(new Promise(() => {}));
    const loading = renderApp("/recruiter-analytics");
    expect(screen.getByText("Loading recruiter analytics…")).toBeInTheDocument();
    loading.unmount();

    api.get.mockRejectedValueOnce({
      response: { data: { error: "Analytics are unavailable." } },
    });
    const failure = renderApp("/recruiter-analytics");
    expect(await screen.findByRole("alert")).toHaveTextContent("Analytics are unavailable.");
    failure.unmount();

    api.get.mockResolvedValueOnce({
      data: {
        recruiters: [],
        sessions: [],
        activitySummary: { total: 0, jobs: 0, candidates: 0, interviews: 0, assessments: 0, evaluation: 0, other: 0 },
        dailyRecruiterActivity: [],
        recentActivities: [],
      },
    });
    renderApp("/recruiter-analytics");
    expect(await screen.findByText("No recruiter sessions in this period.")).toBeInTheDocument();
    expect(screen.getByText("No activity recorded in this period.")).toBeInTheDocument();
    expect(screen.getByText("No recent activity in this period.")).toBeInTheDocument();
  });
});
