// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../src/App.jsx";
import { getVisibleMainNavigation } from "../src/components/dashboard/DashboardShell.jsx";
import api, { getViewAsCompany } from "../src/api/client.js";

const authState = vi.hoisted(() => ({
  current: { user: { role: "admin" }, isAuthenticated: true },
}));
const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../src/auth/useAdminAuth.js", () => ({
  useAdminAuth: () => authState.current,
}));

vi.mock("../src/api/client.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  baseURL: "http://localhost/api",
  getViewAsCompany: vi.fn(),
  setViewAsCompany: vi.fn(),
}));

vi.mock("../src/components/dashboard/DashboardShell.jsx", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, default: ({ children }) => <div>{children}</div> };
});
vi.mock("../src/motion/SmoothScroll.jsx", () => ({ default: () => null }));
vi.mock("../src/auth/RecruiterIdleTimeout.jsx", () => ({ default: () => null }));
vi.mock("../src/pages/Login.jsx", () => ({ default: () => <h1>Login screen</h1> }));
vi.mock("../src/pages/dashboard/DashboardHome.jsx", () => ({
  default: () => <h1>Recruiter workspace</h1>,
}));
vi.mock("../src/pages/platform/PlatformConsole.jsx", () => ({
  default: () => <h1>Platform console</h1>,
}));
vi.mock("../src/components/ui/Toast.jsx", () => ({
  useToast: () => toastMock,
}));

function renderApp(path, role) {
  authState.current = { user: { role }, isAuthenticated: true };
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe("Team Management portal access", () => {
  afterEach(() => {
    vi.clearAllMocks();
    getViewAsCompany.mockReturnValue(undefined);
  });

  it("shows Team Management navigation to Admins only", () => {
    expect(getVisibleMainNavigation({ role: "admin" })).toContainEqual(
      expect.objectContaining({ to: "/team", label: "Team Management" })
    );
    expect(getVisibleMainNavigation({ role: "recruiter" })).not.toContainEqual(
      expect.objectContaining({ to: "/team" })
    );
  });

  it("routes Admins to the existing Team Management page and member API", async () => {
    api.get.mockImplementation(async (path) => {
      if (path === "/subscriptions/usage") {
        return {
          data: {
            planKey: "gold",
            dimensions: [
              { dimension: "admins", used: 1, limit: 2 },
              { dimension: "recruiters", used: 1, limit: 8 },
            ],
          },
        };
      }
      return { data: [] };
    });

    renderApp("/team", "admin");

    expect(await screen.findByRole("heading", { name: "Team management" })).toBeInTheDocument();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/company-settings/members"));
    expect(await screen.findByText("Recruiter seats: 1 / 8")).toBeInTheDocument();
    expect(screen.getByText("Admin seats: 1 / 2")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Add recruiter" })).toBeEnabled());
  });

  it("disables recruiter creation and explains when all seats are used", async () => {
    api.get.mockImplementation(async (path) => path === "/subscriptions/usage"
      ? {
          data: {
            planKey: "silver",
            dimensions: [
              { dimension: "admins", used: 1, limit: 1 },
              { dimension: "recruiters", used: 2, limit: 2 },
            ],
          },
        }
      : { data: [] });

    renderApp("/team", "admin");

    expect(await screen.findByText(/Recruiter seat limit reached \(2 of 2\)/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add recruiter" })).toBeDisabled();
  });

  it("lets Recruiters enter their workspace but blocks the Team Management route", async () => {
    renderApp("/team", "recruiter");

    expect(await screen.findByRole("heading", { name: "Recruiter workspace" })).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalledWith("/company-settings/members");
  });

  it.each(["/recruiter-analytics", "/settings", "/subscription"])(
    "blocks Recruiters from the Admin-only %s route while keeping the workspace available",
    async (path) => {
      renderApp(path, "recruiter");

      expect(await screen.findByRole("heading", { name: "Recruiter workspace" })).toBeInTheDocument();
      expect(api.get).not.toHaveBeenCalledWith("/recruiter-analytics");
      expect(api.get).not.toHaveBeenCalledWith("/company-settings");
      expect(api.get).not.toHaveBeenCalledWith("/subscriptions/me");
    }
  );

  it("does not expose Team Management to a Superadmin viewing a tenant", async () => {
    getViewAsCompany.mockReturnValue({ companyId: "company-1" });

    renderApp("/team", "superadmin");

    expect(await screen.findByRole("heading", { name: "Platform console" })).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalledWith("/company-settings/members");
  });
});
