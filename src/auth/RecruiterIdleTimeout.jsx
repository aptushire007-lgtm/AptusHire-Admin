import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client.js";
import { clearAdminAuth, getAdminRefreshToken } from "./adminAuth.js";
import { useAdminAuth } from "./useAdminAuth.js";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 30 * 1000;
const STORAGE_SYNC_INTERVAL_MS = 5 * 1000;

function getSessionClaims(token) {
  try {
    const encoded = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(window.atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=")));
    return {
      sessionId: payload.sid || null,
      issuedAt: Number.isFinite(payload.iat) ? payload.iat * 1000 : null,
    };
  } catch {
    return { sessionId: null, issuedAt: null };
  }
}

export default function RecruiterIdleTimeout() {
  const { isAuthenticated, user, token } = useAdminAuth();
  const navigate = useNavigate();
  const activityState = useRef({ sessionId: null, lastActivityAt: 0, lastHeartbeatAt: 0 });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "recruiter") return undefined;

    const { sessionId, issuedAt } = getSessionClaims(token || "");
    if (!sessionId) {
      const refreshToken = getAdminRefreshToken();
      if (refreshToken) api.post("/auth/logout", { refreshToken }).catch((error) => {
        console.error("[recruiter-session] Could not revoke the previous login session", error);
      });
      clearAdminAuth();
      navigate("/login", { replace: true });
      return undefined;
    }

    const activityKey = `aptushire:recruiter-session-activity:${sessionId}`;
    const sameSession = activityState.current.sessionId === sessionId;
    let storedActivity = 0;
    try {
      storedActivity = Number(localStorage.getItem(activityKey));
    } catch (error) {
      console.error("[recruiter-session] Could not read cross-tab activity state", error);
    }
    const lastActivityAt = sameSession && activityState.current.lastActivityAt
      ? activityState.current.lastActivityAt
      :
      Number.isFinite(storedActivity) && storedActivity > 0
        ? Math.min(storedActivity, Date.now())
        : Math.min(issuedAt || Date.now(), Date.now());
    let lastHeartbeatAt = sameSession && activityState.current.lastHeartbeatAt
      ? activityState.current.lastHeartbeatAt
      : lastActivityAt - HEARTBEAT_INTERVAL_MS;
    activityState.current = { sessionId, lastActivityAt, lastHeartbeatAt };
    if (!Number.isFinite(storedActivity) || storedActivity <= 0) {
      try {
        localStorage.setItem(activityKey, String(lastActivityAt));
      } catch (error) {
        console.error("[recruiter-session] Could not persist the initial activity state", error);
      }
    }
    let lastStorageSyncAt = 0;
    let timeout;
    let loggingOut = false;

    async function logoutForInactivity() {
      if (loggingOut) return;
      loggingOut = true;
      try {
        const refreshToken = getAdminRefreshToken();
        if (refreshToken) await api.post("/auth/logout", { refreshToken, reason: "idle_timeout" });
      } catch (error) {
        console.error("[recruiter-session] Logout request failed", error);
      } finally {
        clearAdminAuth();
        navigate("/login", { replace: true });
      }
    }

    function scheduleTimeout() {
      window.clearTimeout(timeout);
      const remaining = IDLE_TIMEOUT_MS - (Date.now() - activityState.current.lastActivityAt);
      timeout = window.setTimeout(logoutForInactivity, Math.max(0, remaining));
    }

    function recordActivity() {
      const now = Date.now();
      activityState.current.lastActivityAt = now;

      if (now - lastStorageSyncAt >= STORAGE_SYNC_INTERVAL_MS) {
        lastStorageSyncAt = now;
        try {
          localStorage.setItem(activityKey, String(now));
        } catch (error) {
          console.error("[recruiter-session] Could not sync activity across tabs", error);
        }
      }
      if (now - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
        lastHeartbeatAt = now;
        activityState.current.lastHeartbeatAt = now;
        api.post("/auth/session/activity").catch((error) => {
          console.error("[recruiter-session] Activity heartbeat failed", error);
        });
      }
      scheduleTimeout();
    }

    function syncActivityAcrossTabs(event) {
      if (event.key !== activityKey || !event.newValue) return;
      const timestamp = Number(event.newValue);
      if (Number.isFinite(timestamp) && timestamp > activityState.current.lastActivityAt) {
        activityState.current.lastActivityAt = Math.min(timestamp, Date.now());
        scheduleTimeout();
      }
    }

    const activityEvents = ["pointerdown", "keydown", "scroll", "touchstart"];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true });
    });
    window.addEventListener("storage", syncActivityAcrossTabs);
    scheduleTimeout();

    return () => {
      window.clearTimeout(timeout);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
      window.removeEventListener("storage", syncActivityAcrossTabs);
    };
  }, [isAuthenticated, navigate, token, user?.role]);

  return null;
}
