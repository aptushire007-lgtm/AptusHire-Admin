import { expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../src/api/client.js", () => ({ default: { get } }));

import OfferDialog from "../src/components/candidate/OfferDialog.jsx";

it("prefills the offer from a saved offer template and sends the edited message", async () => {
  get.mockResolvedValue({
    data: {
      templates: [
        { _id: "r", name: "Rejection", category: "rejection", body: "Sorry {first_name}" },
        { _id: "o", name: "Standard offer", category: "offer", body: "Hi {first_name}, the {job_title} role starts {date}." },
      ],
    },
  });
  const onSend = vi.fn().mockResolvedValue();
  render(
    <MemoryRouter>
      <OfferDialog candidate={{ basicDetails: { name: "Asha Rao" }, job: { title: "SDE" } }} onClose={() => {}} onSend={onSend} />
    </MemoryRouter>
  );
  const box = await screen.findByLabelText("Message");
  await waitFor(() => expect(box.value).toBe("Hi Asha, the SDE role starts {date}."));
  expect(screen.getByText(/Still to fill in/)).toHaveTextContent("{date}");

  fireEvent.change(box, { target: { value: "Hi Asha, the SDE role starts Monday." } });
  expect(screen.queryByText(/Still to fill in/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Send offer" }));
  await waitFor(() => expect(onSend).toHaveBeenCalledWith("Hi Asha, the SDE role starts Monday."));
});
