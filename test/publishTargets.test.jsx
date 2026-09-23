import { expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../src/api/client.js", () => ({ default: { get } }));

import PublishTargets from "../src/components/jobs/PublishTargets.jsx";

const boards = [
  { board: "careers", name: "Careers page", enabled: true, needsCredential: false, credentialConfigured: true, status: "published", externalUrl: "https://x/careers", validationErrors: [] },
  { board: "naukri", name: "Naukri (RMS)", enabled: true, needsCredential: true, credentialConfigured: true, status: null, validationErrors: [] },
  { board: "webhook", name: "Webhook", enabled: true, needsCredential: true, credentialConfigured: false, status: null, validationErrors: [] },
  { board: "linkedin", name: "LinkedIn", enabled: false, reason: "awaiting partner approval", needsCredential: true, credentialConfigured: false, status: null, validationErrors: [] },
];

it("offers only the platforms this workspace can post to, and never re-posts a live one", async () => {
  get.mockResolvedValue({ data: { boards } });
  const onChange = vi.fn();
  render(
    <MemoryRouter>
      <PublishTargets jobId="job-1" value={[]} onChange={onChange} />
    </MemoryRouter>
  );

  await waitFor(() => expect(screen.getByRole("button", { name: /Post to Naukri/ })).toBeTruthy());
  // Not connected, and awaiting approval: neither is shown as a dead control.
  expect(screen.queryByText("Webhook")).toBeNull();
  expect(screen.queryByText("LinkedIn")).toBeNull();

  // Already live on the careers page — stated, and not selectable again.
  expect(screen.getByRole("button", { name: /Careers page — already live/ })).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: /Post to Naukri/ }));
  expect(onChange).toHaveBeenCalledWith(["naukri"]);
});

it("says so plainly when nothing is connected", async () => {
  get.mockResolvedValue({ data: { boards: [boards[3]] } });
  render(
    <MemoryRouter>
      <PublishTargets jobId="job-1" value={[]} onChange={() => {}} />
    </MemoryRouter>
  );
  await waitFor(() => expect(screen.getByText(/No job boards connected yet/)).toBeTruthy());
});
