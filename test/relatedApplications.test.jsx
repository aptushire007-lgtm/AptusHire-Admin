import { it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../src/api/client.js", () => ({ default: { get } }));
vi.mock("../src/lib/socket.js", () => ({ getSocket: () => null }));
import RelatedApplications from "../src/components/candidate/RelatedApplications.jsx";
it("distinguishes a failed lookup from no applications and supports retry", async () => {
  get.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ data: { count: 1, identityBasis: "shared_email", applications: [{ _id: "a", job: { title: "Engineer" } }] } });
  render(<MemoryRouter><RelatedApplications candidateId="c" /></MemoryRouter>);
  expect(await screen.findByRole("alert")).toHaveTextContent("does not mean");
  fireEvent.click(screen.getByRole("button", { name: "Retry related applications" }));
  expect(await screen.findByRole("link", { name: "Engineer" })).toHaveAttribute("href", "/candidates/a");
  expect(screen.getByText(/Confirm identity/)).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(get).toHaveBeenCalledTimes(2);
});
