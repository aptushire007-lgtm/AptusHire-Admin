// @vitest-environment jsdom

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import DashboardShell from "../src/components/dashboard/DashboardShell.jsx";
import { getVisibleMainNavigation } from "../src/components/dashboard/DashboardShell.jsx";

const authState = vi.hoisted(() => ({
  current: { user: null, isAuthenticated: true, token: "test-token" },
}));

vi.mock("../src/auth/useAdminAuth.js", () => ({
  useAdminAuth: () => authState.current,
}));

vi.mock("../src/context/CompanyDataContext.jsx", () => ({
  CompanyDataProvider: ({ children }) => children,
  useCompanyData: () => ({
    reviewCount: 0,
    me: { company: { name: "Example Company", companyCode: "EXAMPLE" } },
  }),
}));

vi.mock("../src/context/NotificationContext.jsx", () => ({
  NotificationProvider: ({ children }) => children,
}));

vi.mock("../src/components/dashboard/NotificationBell.jsx", () => ({ default: () => null }));

function renderShell(role) {
  authState.current = { user: { role, name: "Test User" }, isAuthenticated: true, token: "test-token" };
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <DashboardShell><h1>Shell content</h1></DashboardShell>
    </MemoryRouter>
  );
}

describe("Recruiter Analytics navigation visibility", () => {
  it("shows the navigation item only to company Admins", () => {
    const adminLinks = getVisibleMainNavigation({ role: "admin" });
    const recruiterLinks = getVisibleMainNavigation({ role: "recruiter" });
    const superadminLinks = getVisibleMainNavigation({ role: "superadmin" });

    expect(adminLinks.some((item) => item.to === "/recruiter-analytics")).toBe(true);
    expect(recruiterLinks.some((item) => item.to === "/recruiter-analytics")).toBe(false);
    expect(superadminLinks.some((item) => item.to === "/recruiter-analytics")).toBe(false);
  });

  it("renders the Admin shell, settings navigation, and palette without role errors", () => {
    renderShell("admin");

    expect(screen.getByRole("heading", { name: "Shell content" })).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "Dashboard Navigation" });
    expect(navigation).toHaveTextContent("Recruiter Analytics");
    expect(navigation).toHaveTextContent("Team Management");
    expect(navigation).toHaveTextContent("Team");

    fireEvent.click(screen.getByRole("button", { name: "Search workspace" }));
    expect(screen.getByRole("dialog", { name: "Search workspace" })).toHaveTextContent("Recruiter Analytics");
  });

  it("renders the Recruiter shell and palette with company controls restricted", () => {
    renderShell("recruiter");

    expect(screen.getByRole("heading", { name: "Shell content" })).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "Dashboard Navigation" });
    expect(navigation).not.toHaveTextContent("Recruiter Analytics");
    expect(navigation).not.toHaveTextContent("Team Management");
    expect(navigation).not.toHaveTextContent("Team");

    fireEvent.click(screen.getByRole("button", { name: "Search workspace" }));
    const palette = screen.getByRole("dialog", { name: "Search workspace" });
    expect(palette).not.toHaveTextContent("Recruiter Analytics");
  });
});
