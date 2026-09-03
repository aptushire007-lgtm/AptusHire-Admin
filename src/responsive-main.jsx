/**
 * THROWAWAY responsive harness — not part of the app, not imported by it.
 *
 * Mounts real dashboard screens inside the real DashboardShell against HOSTILE
 * fixtures (long addresses, long titles, long tenant names) with the axios
 * adapter stubbed, so narrow-viewport layout can be measured without a backend.
 *
 * Run:    cd admin && npm run dev  →  http://localhost:5173/responsive.html?p=settings
 * Delete: rm admin/responsive.html admin/src/responsive-main.jsx
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import api from "./api/client.js";
import { ToastProvider } from "./components/ui/Toast.jsx";
import DashboardShell from "./components/dashboard/DashboardShell.jsx";
import SettingsPage from "./pages/dashboard/SettingsPage.jsx";
import Reports from "./pages/dashboard/Reports.jsx";
import AssessmentTracker from "./pages/dashboard/AssessmentTracker.jsx";
import DashboardHome from "./pages/dashboard/DashboardHome.jsx";
import "./index.css";

// Hostile on purpose: these are the inputs that break label/value rows.
const LONG_EMAIL = "vijendra.pratap.singh.recruiting@autonoetic-edge-technologies.co.in";
const LONG_NAME = "Vijendra Pratap Singh Chauhan";
const LONG_COMPANY = "Autonoetic Edge Technologies Private Limited";

localStorage.setItem("adminAuth", JSON.stringify({
  token: "fake", user: { name: LONG_NAME, email: LONG_EMAIL, phone: "+91 98765 43210", role: "admin" },
}));

const ME = {
  name: LONG_NAME, email: LONG_EMAIL, phone: "+91 98765 43210", role: "admin",
  company: { _id: "co1", name: LONG_COMPANY, companyCode: "AUTONOETIC-EDGE-TECH-0001", status: "active" },
};

const CANDIDATES = Array.from({ length: 4 }, (_, i) => ({
  _id: `c${i}`,
  basicDetails: { name: LONG_NAME, email: `candidate.number.${i}.longaddress@autonoetic-edge-technologies.co.in` },
  ats: { overallScore: 70 + i },
  job: { _id: "j1" },
}));

const ROUTES = {
  "/auth/me": ME,
  "/jobs": [1,2,3].map((i) => ({ _id: `j${i}`, title: "Senior Artificial Intelligence & Machine Learning Innovation Consultant", department: "Engineering", status: "open", createdAt: new Date().toISOString() })),
  "/interview-queue": [],
  "/candidates": { items: CANDIDATES },
  "/subscriptions/me": { plan: { name: "Growth" }, status: "active" },
  "/admin-notifications/unread-count": { count: 3 },
  "/admin-notifications": { items: [], notifications: [] },
  "/company-settings": {},
  "/company-settings/careers-info": { careersUrl: "https://careers.example.com/autonoetic-edge-technologies", feedUrl: "https://careers.example.com/feed.xml" },
  "/company-settings/board-credentials": { boards: [] },
  "/reports/overview": null,
};

const REPORTS = {
  totals: { candidates: 120, jobs: 6, interviews: 44 },
  screening: { scoreSource: "evidence", decisions: { pass: 40, review: 30, fail: 50 } },
  funnel: [], trend: [], criteria: [],
};

const TRACKER = {
  job: { _id: "j1", title: "Senior AI/ML Consultant & Innovation Lead" },
  awaitingDecision: CANDIDATES,
  sessions: [], stats: { sent: 10, completed: 6, pending: 4 },
};

api.defaults.adapter = async (config) => {
  const url = config.url || "";
  let data = ROUTES[url];
  if (url.includes("/overview")) data = TRACKER;
  if (url.includes("/reports")) data = REPORTS;
  if (data === undefined) data = {};
  return { data: data ?? {}, status: 200, statusText: "OK", headers: {}, config };
};

const PAGES = { settings: <SettingsPage />, reports: <Reports />, tracker: <AssessmentTracker />, home: <DashboardHome /> };
const which = new URLSearchParams(location.search).get("p") || "settings";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <MemoryRouter initialEntries={["/assessments/j1"]}>
        <Routes>
          <Route path="*" element={<DashboardShell>{PAGES[which] || PAGES.settings}</DashboardShell>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  </React.StrictMode>
);
