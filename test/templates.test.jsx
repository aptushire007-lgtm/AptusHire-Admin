// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../src/App.jsx";
import Templates from "../src/pages/dashboard/Templates.jsx";
import api from "../src/api/client.js";

vi.mock("../src/auth/useAdminAuth.js", () => ({
  useAdminAuth: () => ({ user: { role: "admin" }, isAuthenticated: true }),
}));

vi.mock("../src/api/client.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("../src/components/dashboard/DashboardShell.jsx", () => ({
  default: ({ children }) => <div>{children}</div>,
}));
vi.mock("../src/motion/SmoothScroll.jsx", () => ({ default: () => null }));
vi.mock("../src/auth/RecruiterIdleTimeout.jsx", () => ({ default: () => null }));

vi.mock("../src/components/ui/Toast.jsx", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

describe("Message templates page", () => {
  beforeEach(() => {
    api.get.mockResolvedValue({
      data: {
        templates: [{
          _id: "template-1",
          name: "Interview invitation",
          category: "interview",
          subject: "Interview details",
          body: "Hello {candidate_name}",
        }],
      },
    });
  });

  afterEach(() => vi.clearAllMocks());

  it("loads templates and creates one through the existing API", async () => {
    render(<Templates />);

    expect(await screen.findByRole("heading", { name: "Interview invitation" })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/templates");

    fireEvent.click(screen.getByRole("button", { name: "New template" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Follow-up" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Thanks for meeting us." } });
    fireEvent.click(screen.getByRole("button", { name: "Save template" }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/templates", {
      name: "Follow-up",
      category: "other",
      subject: "",
      body: "Thanks for meeting us.",
    }));
    expect(await screen.findByRole("heading", { name: "Interview invitation" })).toBeInTheDocument();
  });

  it("renders through the /templates portal route", async () => {
    render(
      <MemoryRouter initialEntries={["/templates"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Message templates" })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/templates");
  });
});
