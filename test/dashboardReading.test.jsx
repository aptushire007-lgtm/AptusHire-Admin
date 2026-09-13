import { it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
vi.mock("../src/context/CompanyDataContext.jsx", () => ({ useCompanyData: () => ({
  me: {}, jobs: [{ _id: "j", status: "published", rubricStatus: "approved" }], queue: [], loading: false,
  allCandidates: ["a", "b"].map((_id) => ({ _id, candidateUser: "same-person", job: { _id: "j" }, status: "shortlisted", basicDetails: { name: _id }, createdAt: "2026-09-01" })),
}) }));
import DashboardHome from "../src/pages/dashboard/DashboardHome.jsx";
vi.mock("../src/lib/socket.js", () => ({ getSocket: () => null }));
vi.mock("../src/api/client.js", () => ({ default: { get: vi.fn().mockResolvedValue({ data: {
  total: 2, shortlisted: 2, joined: 0, buckets: [], stages: [], totalWithStage: 2,
  recent: [], upcomingInterviews: [], attention: [], attentionTotal: 0,
} }) } }));
it("labels server application counts honestly and does not imply an offer decision", async () => {
  render(<MemoryRouter><DashboardHome /></MemoryRouter>);
  await screen.findByRole("link", { name: /2 Applications/ });
  const kpis = within(screen.getByRole("region", { name: "Key Performance Indicators" }));
  expect(kpis.getByRole("link", { name: /2 Applications/ })).toBeTruthy();
  expect(kpis.getByRole("link", { name: /2 Shortlisted/ })).toBeTruthy();
  expect(kpis.getByRole("link", { name: /0 Interview queue/ })).toBeTruthy();
  expect(screen.queryByText("Ready for offer")).toBeNull();
  expect(screen.queryByText("New period")).toBeNull();
});
