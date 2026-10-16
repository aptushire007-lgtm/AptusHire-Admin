// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../src/App.jsx";
import api from "../src/api/client.js";
import { getCompanyPermissions } from "../src/auth/permissions.js";

const authState = vi.hoisted(() => ({
  current: { user: null, isAuthenticated: false },
}));

vi.mock("../src/auth/useAdminAuth.js", () => ({
  useAdminAuth: () => authState.current,
}));

vi.mock("../src/api/client.js", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  getViewAsCompany: () => null,
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

vi.mock("../src/auth/RequireAdmin.jsx", () => ({
  default: ({ children }) => children,
}));

vi.mock("../src/motion/SmoothScroll.jsx", () => ({
  default: () => null,
}));

vi.mock("../src/pages/Landing.jsx", () => ({ default: () => null }));
vi.mock("../src/pages/Login.jsx", () => ({ default: () => null }));
vi.mock("../src/pages/dashboard/DashboardHome.jsx", () => ({
  default: () => <h1>Dashboard home</h1>,
}));

function renderApp(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe("Admin Portal pricing and billing access", () => {
  beforeEach(() => {
    authState.current = { user: null, isAuthenticated: false };
    api.get.mockImplementation(async (path) => {
      if (path === "/subscriptions/plans") return { data: [] };
      if (path === "/payments/history") {
        return {
          data: [
            {
              _id: "payment-record-1",
              billingCycle: "monthly",
              amount: 999,
              currency: "INR",
              razorpayOrderId: "order_example",
              razorpayPaymentId: "payment_example",
              status: "paid",
              createdAt: "2026-10-01T10:00:00.000Z",
              subscriptionPlan: { name: "Silver", key: "silver" },
            },
          ],
        };
      }
      throw new Error(`Unexpected API request: ${path}`);
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps the public plan catalogue available to signed-out visitors", async () => {
    renderApp("/pricing");
    expect(await screen.findByRole("heading", { name: "Choose Your Plan" })).toBeInTheDocument();
  });

  it("allows Admin pricing access and redirects a Recruiter away from pricing", async () => {
    authState.current = { user: { role: "admin" }, isAuthenticated: true };
    const adminView = renderApp("/pricing");
    expect(await screen.findByRole("heading", { name: "Choose Your Plan" })).toBeInTheDocument();
    adminView.unmount();

    authState.current = { user: { role: "recruiter" }, isAuthenticated: true };
    renderApp("/pricing");
    expect(await screen.findByRole("heading", { name: "Dashboard home" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Choose Your Plan" })).not.toBeInTheDocument();
  });

  it("blocks Recruiters from directly opening billing and loads payment history for Admins", async () => {
    authState.current = { user: { role: "recruiter" }, isAuthenticated: true };
    renderApp("/billing");
    expect(await screen.findByRole("heading", { name: "Dashboard home" })).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalledWith("/payments/history");

    cleanup();
    authState.current = { user: { role: "admin" }, isAuthenticated: true };
    renderApp("/billing");
    expect(await screen.findByText("Silver · monthly")).toBeInTheDocument();
    expect(screen.getByText("₹999.00")).toBeInTheDocument();
    expect(screen.getByText("paid")).toBeInTheDocument();
    expect(screen.getByText("order_example")).toBeInTheDocument();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/payments/history"));
  });

  it("keeps Billing navigation permission Admin-only", () => {
    expect(getCompanyPermissions("admin")).toContain("BILLING_MANAGE");
    expect(getCompanyPermissions("recruiter")).not.toContain("BILLING_MANAGE");
  });
});
