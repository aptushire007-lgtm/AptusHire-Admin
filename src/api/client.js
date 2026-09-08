import axios from "axios";
import {
  getAdminAuth,
  getAdminRefreshToken,
  updateAdminTokens,
  clearAdminAuth,
} from "../auth/adminAuth.js";

// Set at BUILD time by Vite (inlined). Intended production value is the backend
// origin PLUS the "/api" path, no trailing slash — e.g.
// https://aptushire-backend-production.up.railway.app/api
function normalizeApiBase(value) {
  let v = String(value || "").trim();
  if (!v) return "http://localhost:9000/api";
  // A relative base ("/api") is a deliberate dev-proxy setup — leave it alone.
  if (v.startsWith("/")) return v.replace(/\/+$/, "");
  // A bare hostname pasted from a hosting dashboard ("host.up.railway.app") —
  // add the scheme so axios treats it as an absolute URL, not a relative path.
  if (!/^https?:\/\//i.test(v)) v = "https://" + v;
  v = v.replace(/\/+$/, "");
  // Origin with no path — the backend mounts every route under "/api".
  if (/^https?:\/\/[^/]+$/i.test(v)) v += "/api";
  return v;
}
export const baseURL = normalizeApiBase(import.meta.env.VITE_API_URL);

// A production bundle still pointed at localhost means VITE_API_URL was not set
// when Vercel built it. Every request will then fail and the app will look broken
// for no obvious reason — so say it loudly. This only reports the
// misconfiguration; it does not change or hide any behaviour.
if (import.meta.env.PROD && /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/.test(baseURL)) {
  console.error(
    `[api] VITE_API_URL is not configured for this build — using fallback "${baseURL}". ` +
      `Set VITE_API_URL to the backend origin + "/api" in the Vercel project settings and redeploy.`
  );
}

const api = axios.create({ baseURL });

// Guard against a misrouted API call. When VITE_API_URL is wrong (relative, or
// pointing at the frontend domain), a request for `/api/...` is answered by
// Vercel's SPA rewrite with `index.html` and HTTP 200. Axios then resolves it,
// and every page that does `res.data.map(...)` / `.filter(...)` throws a cryptic
// "x is not a function" with no clue why. Turn that into one clear, rejected
// error the pages' existing `.catch()` blocks already handle — and log the real
// cause once. This does not hide a failure; it names it.
api.interceptors.response.use((response) => {
  const body = response.data;
  const looksLikeHtml =
    typeof body === "string" && /^\s*<(?:!doctype|html)[\s>]/i.test(body);
  if (looksLikeHtml) {
    console.error(
      `[api] ${response.config?.url} returned an HTML page, not JSON. VITE_API_URL ` +
        `is misconfigured — it must be the absolute backend origin + "/api" ` +
        `(current base: "${baseURL}"). Redeploy the frontend after fixing it.`
    );
    return Promise.reject(
      Object.assign(new Error("The API returned an HTML page instead of data (VITE_API_URL is misconfigured)."), {
        response,
        isApiMisroute: true,
      })
    );
  }
  return response;
});

// Phase 16.5 — read-only "view as tenant". When platform staff activate it,
// every request carries the header; the SERVER rejects any non-GET carrying it,
// so the read-only guarantee never depends on this client.
export function getViewAsCompany() {
  try {
    return JSON.parse(sessionStorage.getItem("platformViewAs") || "null");
  } catch {
    return null;
  }
}
export function setViewAsCompany(company) {
  if (company) sessionStorage.setItem("platformViewAs", JSON.stringify(company));
  else sessionStorage.removeItem("platformViewAs");
}

api.interceptors.request.use((config) => {
  const auth = getAdminAuth();
  if (auth?.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  const viewAs = getViewAsCompany();
  if (viewAs?.id) {
    config.headers["X-View-As-Company"] = viewAs.id;
  }
  return config;
});

// Silent access-token refresh. Access tokens are short-lived; when one expires the API
// returns 401 and we transparently exchange the stored refresh token for a fresh pair,
// then replay the original request. Concurrent 401s share a single in-flight refresh so
// we don't hammer /auth/refresh (and don't trip its rotation reuse-detection).
let refreshPromise = null;

function refreshTokens() {
  if (!refreshPromise) {
    const refreshToken = getAdminRefreshToken();
    if (!refreshToken) return Promise.reject(new Error("no refresh token"));
    // Bare axios (not `api`) so this request skips the interceptors and can't recurse.
    refreshPromise = axios
      .post(`${baseURL}/auth/refresh`, { refreshToken })
      .then((res) => {
        updateAdminTokens({ token: res.data.token, refreshToken: res.data.refreshToken });
        return res.data.token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function forceLogout() {
  clearAdminAuth();
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isRefreshCall = original?.url?.includes("/auth/refresh");

    // Only try to refresh once per request, and never for the refresh call itself.
    if (status === 401 && original && !original._retry && !isRefreshCall && getAdminRefreshToken()) {
      original._retry = true;
      try {
        const newToken = await refreshTokens();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        forceLogout();
        return Promise.reject(error);
      }
    }

    if (status === 401) {
      forceLogout();
    }
    return Promise.reject(error);
  }
);

export default api;
