// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Login from "../src/pages/Login.jsx";
import api from "../src/api/client.js";
import { saveAdminAuth } from "../src/auth/adminAuth.js";

vi.mock("../src/api/client.js", () => ({
  default: { post: vi.fn() },
}));
vi.mock("../src/auth/adminAuth.js", () => ({
  saveAdminAuth: vi.fn(),
}));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<h1>Company workspace</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("company workspace login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("authenticates Recruiters into the operational workspace", async () => {
    const user = { role: "recruiter", email: "recruiter@example.com" };
    api.post.mockResolvedValue({ data: { token: "token", refreshToken: "refresh", user } });

    const { container } = renderLogin();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: user.email } });
    fireEvent.change(container.querySelector('input[type="password"]'), { target: { value: "password" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByRole("heading", { name: "Company workspace" })).toBeInTheDocument();
    expect(saveAdminAuth).toHaveBeenCalledWith({ token: "token", refreshToken: "refresh", user });
  });

  it.each(["admin", "superadmin"])("preserves %s login", async (role) => {
    const user = { role, email: `${role}@example.com` };
    api.post.mockResolvedValue({ data: { token: "token", refreshToken: "refresh", user } });

    const { container } = renderLogin();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: user.email } });
    fireEvent.change(container.querySelector('input[type="password"]'), { target: { value: "password" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByRole("heading", { name: "Company workspace" })).toBeInTheDocument();
    expect(saveAdminAuth).toHaveBeenCalledOnce();
  });

  it("does not accept candidate accounts for the company workspace", async () => {
    api.post.mockResolvedValue({
      data: { token: "candidate-token", user: { role: "candidate" } },
    });

    const { container } = renderLogin();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "candidate@example.com" } });
    fireEvent.change(container.querySelector('input[type="password"]'), { target: { value: "password" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText("This account does not have workspace access.")).toBeInTheDocument();
    expect(saveAdminAuth).not.toHaveBeenCalled();
  });
});
