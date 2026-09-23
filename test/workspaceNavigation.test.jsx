import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

const { user, workspace } = vi.hoisted(() => ({
  user: { name: "Alex Recruiter", role: "recruiter" },
  workspace: { me: { company: { name: "Test workspace" } }, jobs: [{ _id: "j1", title: "Backend engineer", department: "Engineering" }], loading: false, loadError: "" },
}));
vi.mock("../src/auth/useAdminAuth.js", () => ({ useAdminAuth: () => ({ user }) }));
vi.mock("../src/api/client.js", () => ({ default: { post: vi.fn() }, getViewAsCompany: () => null, setViewAsCompany: vi.fn() }));
vi.mock("../src/context/CompanyDataContext.jsx", () => ({ CompanyDataProvider: ({ children }) => children, useCompanyData: () => workspace }));
vi.mock("../src/context/NotificationContext.jsx", () => ({ NotificationProvider: ({ children }) => children }));
vi.mock("../src/components/dashboard/NotificationBell.jsx", () => ({ default: () => <button>Notifications</button> }));
import DashboardShell from "../src/components/dashboard/DashboardShell.jsx";

function Location() { const location = useLocation(); return <output data-testid="location">{location.pathname}{location.search}</output>; }
function setup(entry = "/jobs") { return render(<MemoryRouter initialEntries={[entry]}><DashboardShell><Location /></DashboardShell></MemoryRouter>); }
beforeEach(() => { localStorage.clear(); user.role = "recruiter"; });

it("opens workspace search with the keyboard and routes to a matching job", () => {
  setup();
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  const input = screen.getByRole("combobox", { name: "Search pages, jobs or candidates" });
  expect(input).toHaveFocus();
  fireEvent.change(input, { target: { value: "Backend" } });
  expect(screen.getByRole("option", { name: /Backend engineer/ })).toHaveAttribute("aria-selected", "true");
  fireEvent.keyDown(input, { key: "Enter" });
  // A job's candidate board is now a page of its own (/jobs/:id/pipeline)
  // rather than a drawer tab, so the palette lands on it directly.
  expect(screen.getByTestId("location")).toHaveTextContent("/jobs/j1/pipeline");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("uses explicit candidate search without loading candidate records into the shell", () => {
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Search workspace" }));
  const input = screen.getByRole("combobox");
  fireEvent.change(input, { target: { value: "Alex & Jo" } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(screen.getByTestId("location")).toHaveTextContent("/candidates?q=Alex%20%26%20Jo");
});

it("restores focus on Escape and keeps collapsed navigation accessible", () => {
  setup();
  const trigger = screen.getByRole("button", { name: "Search workspace" });
  trigger.focus();
  fireEvent.click(trigger);
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
  expect(trigger).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  const nav = screen.getByRole("navigation", { name: "Dashboard Navigation" });
  expect(within(nav).getByRole("link", { name: "Jobs" })).toHaveAttribute("aria-current", "page");
  // Recordings moved out of the company-wide sidebar and into each job's own
  // workspace. It must still be FINDABLE, though: the palette is fed its own
  // complete list precisely so trimming the sidebar strands nothing.
  expect(within(nav).queryByRole("link", { name: "Recordings" })).not.toBeInTheDocument();
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "Record" } });
  expect(screen.getByRole("option", { name: /Recordings/ })).toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
  fireEvent.click(screen.getByRole("button", { name: "Account options" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Plan and billing" }));
  expect(screen.getByTestId("location")).toHaveTextContent("/subscription");
});

it("shows platform administration only for the existing super-admin role", () => {
  const { unmount } = setup();
  expect(screen.queryByRole("link", { name: "Platform administration" })).not.toBeInTheDocument();
  unmount();
  user.role = "super_admin";
  setup();
  expect(screen.getByRole("link", { name: "Platform administration" })).toHaveAttribute("href", "/platform");
});

it("identifies the current editor in breadcrumbs", () => {
  setup("/jobs/j1/rubric");
  const breadcrumb = screen.getByRole("navigation", { name: "Workspace breadcrumb" });
  expect(within(breadcrumb).getByRole("link", { name: "Jobs" })).toHaveAttribute("href", "/jobs");
  expect(within(breadcrumb).getByText("Screening rubric")).toHaveAttribute("aria-current", "page");
});
