// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import App from "../src/App.jsx";
import RecruiterIdleTimeout from "../src/auth/RecruiterIdleTimeout.jsx";
import api from "../src/api/client.js";
import { clearAdminAuth } from "../src/auth/adminAuth.js";

const authState = vi.hoisted(() => ({
  current: { user: null, token: null, isAuthenticated: false },
}));

vi.mock("../src/auth/useAdminAuth.js", () => ({
  useAdminAuth: () => authState.current,
}));

vi.mock("../src/api/client.js", () => ({
  default: { post: vi.fn().mockResolvedValue({}) },
  getViewAsCompany: vi.fn(() => null),
  setViewAsCompany: vi.fn(),
}));

vi.mock("../src/auth/adminAuth.js", () => ({
  clearAdminAuth: vi.fn(),
  getAdminRefreshToken: () => "refresh-token",
}));

vi.mock("../src/components/dashboard/DashboardShell.jsx", () => ({
  default: ({ children }) => <div>{children}</div>,
}));
vi.mock("../src/motion/SmoothScroll.jsx", () => ({ default: () => null }));
vi.mock("../src/pages/Login.jsx", () => ({ default: () => <h1>Login page</h1> }));

function tokenWithSession(sessionId, issuedAt = Date.now()) {
  const payload = window.btoa(JSON.stringify({ sid: sessionId, iat: Math.floor(issuedAt / 1000) }))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `header.${payload}.signature`;
}

function CurrentPath() {
  return <span data-testid="current-path">{useLocation().pathname}</span>;
}

function renderTimeout() {
  return render(
    <MemoryRouter initialEntries={["/jobs"]}>
      <RecruiterIdleTimeout />
      <CurrentPath />
    </MemoryRouter>
  );
}

function renderApp() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <App />
      <CurrentPath />
    </MemoryRouter>
  );
}

describe("Recruiter idle timeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-14T12:00:00.000Z"));
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("logs out a Recruiter after 30 minutes without activity", async () => {
    authState.current = {
      user: { role: "recruiter" },
      token: tokenWithSession("session-1"),
      isAuthenticated: true,
    };
    renderTimeout();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000 - 1);
    });
    expect(clearAdminAuth).not.toHaveBeenCalled();
    expect(screen.getByTestId("current-path")).toHaveTextContent("/jobs");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(api.post).toHaveBeenCalledWith("/auth/logout", {
      refreshToken: "refresh-token",
      reason: "idle_timeout",
    });
    expect(clearAdminAuth).toHaveBeenCalledOnce();
    expect(screen.getByTestId("current-path")).toHaveTextContent("/login");
  });

  it("mounts at app level so an authenticated Recruiter is timed out outside the Admin shell", async () => {
    authState.current = {
      user: { role: "recruiter" },
      token: tokenWithSession("session-app"),
      isAuthenticated: true,
    };
    renderApp();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    });

    expect(api.post).toHaveBeenCalledWith("/auth/logout", {
      refreshToken: "refresh-token",
      reason: "idle_timeout",
    });
    expect(clearAdminAuth).toHaveBeenCalledOnce();
    expect(screen.getByTestId("current-path")).toHaveTextContent("/login");
  });

  it("resets the idle deadline on activity and sends only throttled heartbeats", async () => {
    authState.current = {
      user: { role: "recruiter" },
      token: tokenWithSession("session-2"),
      isAuthenticated: true,
    };
    renderTimeout();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(29 * 60 * 1000);
    });
    window.dispatchEvent(new Event("pointerdown"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30 * 1000);
    });
    window.dispatchEvent(new Event("keydown"));
    expect(api.post).toHaveBeenCalledWith("/auth/session/activity");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000 - 1);
    });
    expect(clearAdminAuth).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(clearAdminAuth).toHaveBeenCalledOnce();
  });

  it("persists the first genuine user activity immediately", () => {
    authState.current = {
      user: { role: "recruiter" },
      token: tokenWithSession("session-first-activity"),
      isAuthenticated: true,
    };
    renderTimeout();

    window.dispatchEvent(new Event("pointerdown"));

    expect(api.post).toHaveBeenCalledWith("/auth/session/activity");
  });

  it("does not reset the idle deadline when the access token rotates", async () => {
    authState.current = {
      user: { role: "recruiter" },
      token: tokenWithSession("session-token-rotation"),
      isAuthenticated: true,
    };
    const view = renderTimeout();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(29 * 60 * 1000);
    });
    authState.current = {
      ...authState.current,
      token: tokenWithSession("session-token-rotation"),
    };
    view.rerender(
      <MemoryRouter initialEntries={["/jobs"]}>
        <RecruiterIdleTimeout />
        <CurrentPath />
      </MemoryRouter>
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60 * 1000 - 1);
    });
    expect(clearAdminAuth).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(clearAdminAuth).toHaveBeenCalledOnce();
    expect(screen.getByTestId("current-path")).toHaveTextContent("/login");
  });

  it("does not apply the recruiter timeout to Admin users", async () => {
    authState.current = {
      user: { role: "admin" },
      token: tokenWithSession("admin-session"),
      isAuthenticated: true,
    };
    renderTimeout();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    });

    expect(clearAdminAuth).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.getByTestId("current-path")).toHaveTextContent("/jobs");
  });

  it("does not apply the recruiter timeout to Superadmin users", async () => {
    authState.current = {
      user: { role: "superadmin" },
      token: tokenWithSession("superadmin-session"),
      isAuthenticated: true,
    };
    renderTimeout();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    });

    expect(clearAdminAuth).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("does not reset inactivity due to unrelated background API requests", async () => {
    authState.current = {
      user: { role: "recruiter" },
      token: tokenWithSession("session-background"),
      isAuthenticated: true,
    };
    renderTimeout();
    api.post("/background/poll");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    });

    expect(clearAdminAuth).toHaveBeenCalledOnce();
    expect(api.post).toHaveBeenCalledWith("/auth/logout", {
      refreshToken: "refresh-token",
      reason: "idle_timeout",
    });
  });

  it("extends the client deadline when activity is synchronized from another tab", async () => {
    authState.current = {
      user: { role: "recruiter" },
      token: tokenWithSession("session-cross-tab"),
      isAuthenticated: true,
    };
    renderTimeout();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(29 * 60 * 1000);
    });
    const activityKey = "aptushire:recruiter-session-activity:session-cross-tab";
    window.dispatchEvent(new StorageEvent("storage", {
      key: activityKey,
      newValue: String(Date.now()),
    }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(29 * 60 * 1000 + 1);
    });
    expect(clearAdminAuth).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60 * 1000 - 1);
    });
    expect(clearAdminAuth).toHaveBeenCalledOnce();
  });
});
