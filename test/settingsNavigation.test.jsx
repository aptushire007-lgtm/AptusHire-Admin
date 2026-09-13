import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
const { get, put } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("../src/api/client.js", () => ({ default: { get, put } }));
vi.mock("../src/auth/useAdminAuth.js", () => ({ useAdminAuth: () => ({ user: { name: "Alex", role: "owner" } }) }));
vi.mock("../src/context/CompanyDataContext.jsx", () => ({ useCompanyData: () => ({ me: { company: { name: "Example" } }, loading: false }) }));
vi.mock("../src/components/ui/Toast.jsx", () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
import SettingsPage from "../src/pages/dashboard/SettingsPage.jsx";
const settings = { ai: { model: "current-model", temperature: 0.5 }, compliance: { retentionDays: 365 } };
beforeEach(() => { vi.clearAllMocks(); get.mockImplementation(url => Promise.resolve({ data: url === "/company-settings" ? settings : { boards: [] } })); put.mockImplementation((url, data) => Promise.resolve({ data })); });
function setup(entry = "/settings?section=screening") { render(<MemoryRouter initialEntries={[entry]}><SettingsPage /></MemoryRouter>); }

it("retains drafts across settings sections and saves the original nested contract", async () => {
  setup();
  const input = await screen.findByLabelText("Model override");
  fireEvent.change(input, { target: { value: "edited-model" } });
  fireEvent.click(screen.getByRole("link", { name: "Data & privacy" }));
  expect(screen.getByRole("switch", { name: "Require AI consent" })).toHaveAttribute("aria-checked", "true");
  expect(screen.getByRole("status")).toHaveTextContent("Unsaved changes");
  expect(screen.queryByRole("textbox", { name: "Model override" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("link", { name: "Screening & interviews" }));
  expect(screen.getByLabelText("Model override")).toHaveValue("edited-model");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(put).toHaveBeenCalledWith("/company-settings", expect.objectContaining({ ai: expect.objectContaining({ model: "edited-model", temperature: 0.5 }), compliance: expect.objectContaining({ retentionDays: 365 }) })));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled());
});

it("does not offer saving defaults after a failed read and supports retry", async () => {
  get.mockRejectedValueOnce(new Error("offline"));
  setup();
  expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
  expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry settings" }));
  expect(await screen.findByLabelText("Model override")).toHaveValue("current-model");
  expect(put).not.toHaveBeenCalled();
});

it("discards edits without writing to the server", async () => {
  setup();
  fireEvent.change(await screen.findByLabelText("Model override"), { target: { value: "temporary-model" } });
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(screen.getByLabelText("Model override")).toHaveValue("current-model");
  expect(put).not.toHaveBeenCalled();
});
