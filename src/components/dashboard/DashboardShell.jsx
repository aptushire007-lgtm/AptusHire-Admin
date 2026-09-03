import { useEffect, useRef, useState, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  KanbanSquare,
  Bot,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Scale,
  Video,
  Search,
  ShieldCheck,
  Building2,
  Sparkles,
  CreditCard,
} from "lucide-react";
import { useAdminAuth } from "../../auth/useAdminAuth.js";
import { clearAdminAuth, getAdminRefreshToken } from "../../auth/adminAuth.js";
import api, { getViewAsCompany, setViewAsCompany } from "../../api/client.js";
import { CompanyDataProvider, useCompanyData } from "../../context/CompanyDataContext.jsx";
import { NotificationProvider } from "../../context/NotificationContext.jsx";
import Modal from "../ui/Modal.jsx";
import NotificationBell from "./NotificationBell.jsx";
import BrandLogo, { AptusMark } from "../ui/BrandLogo.jsx";
import ThemeToggle from "../ui/ThemeToggle.jsx";

const SIDEBAR_COLLAPSED_KEY = "admin_sidebar_collapsed:v1";

function readSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

function writeSidebarCollapsed(v) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(v));
  } catch {
    // ignore
  }
}

const NAV_GROUPS = [
  {
    label: "Recruitment Operations",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/jobs", label: "Active Jobs", icon: Briefcase },
      { to: "/candidates", label: "Candidates", icon: Users },
      { to: "/pipeline", label: "Hiring Pipeline", icon: KanbanSquare },
      { to: "/review-queue", label: "Review Queue", icon: Scale },
      { to: "/ai-interviews", label: "AI Interviews", icon: Bot },
    ],
  },
  {
    label: "Intelligence & Team",
    items: [
      { to: "/recordings", label: "Recordings", icon: Video },
      { to: "/reports", label: "Analytics & Reports", icon: BarChart3 },
      { to: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Organization & Settings",
    items: [
      { to: "/settings", label: "Workspace Settings", icon: Settings },
    ],
  },
];

function SidebarContent({ collapsed, onToggleCollapse, onNavigate }) {
  const { user } = useAdminAuth();
  const { me } = useCompanyData();
  const roleName = user?.role === "super_admin" ? "Platform Admin" : me?.role === "owner" ? "Head of Recruitment" : "Recruiter";

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto overflow-x-hidden">
      <div>
        {/* Brand Lockup */}
        <div className={`flex h-16 items-center border-b border-slate-200/80 px-4 dark:border-slate-800/80 ${collapsed ? "justify-center px-2" : "justify-between"}`}>
          {collapsed ? (
            <AptusMark size="md" onClick={onNavigate} />
          ) : (
            <BrandLogo to="/" size="md" onClick={onNavigate} />
          )}
        </div>

        {/* Role / Workspace Capsule */}
        {!collapsed && (
          <div className="mx-3 mt-4 mb-2 flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-2.5 dark:border-slate-800/80 dark:bg-slate-900/60">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 font-bold text-white shadow-xs dark:bg-brand-500">
              <Building2 className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                {me?.company?.name || "Aptus Workspace"}
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 dark:text-accent-400">
                <Sparkles className="h-3 w-3" />
                {roleName}
              </span>
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <nav aria-label="Dashboard Navigation" className="mt-3 flex flex-1 flex-col gap-5 px-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {group.label}
                </p>
              )}
              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 rounded-[10px] py-2.5 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
                        collapsed ? "justify-center px-2.5" : "px-3.5"
                      } ${
                        isActive
                          ? "bg-brand-100 text-brand-800 font-semibold dark:bg-brand-100 dark:text-brand-800"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                      }`
                    }
                  >
                    <item.icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Sidebar Footer with Workspace Plan Card (Air Pay style) & Collapse Toggle */}
      <div className="border-t border-slate-200/80 p-3 space-y-3 dark:border-slate-800/80">
        {!collapsed && (
          <div className="relative overflow-hidden rounded-[14px] border border-slate-200 bg-white p-3.5 text-slate-900 shadow-card">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-800">
                <Sparkles className="h-3.5 w-3.5" /> Aptus Intelligence
              </span>
              <span className="rounded-md bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-800">
                Live
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Deterministic rubric scoring and live audio interview engine active.
            </p>
            <NavLink
              to="/settings"
              onClick={onNavigate}
              className="mt-2.5 flex items-center justify-center gap-1.5 rounded-[9px] border border-slate-200 bg-slate-50 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100"
            >
              <CreditCard className="h-3.5 w-3.5 text-brand-700" />
              <span>Workspace Plan</span>
            </NavLink>
          </div>
        )}

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function TopNav({ onMenuClick, collapsed }) {
  const { user } = useAdminAuth();
  const { me } = useCompanyData();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const companyName = me?.company?.name || "Your Workspace";
  const roleName = user?.role === "super_admin" ? "Platform Admin" : me?.role === "owner" ? "Head of Recruitment" : "Recruiter";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-md transition-colors dark:border-slate-800/80 dark:bg-slate-950/80 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">{companyName}</h2>
            <span className="hidden rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-950 dark:text-accent-400 sm:inline-block">
              {roleName}
            </span>
          </div>
          <p className="truncate text-xs tabular-nums text-slate-500 dark:text-slate-400">
            Workspace ID: {me?.company?.companyCode || "APT-01"}
          </p>
        </div>
      </div>

      {/* Global Quick Search Mock Trigger */}
      <div className="hidden max-w-xs flex-1 md:block lg:max-w-sm">
        <div
          onClick={() => navigate("/candidates")}
          className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5" />
            <span>Search candidates, jobs, rubrics...</span>
          </div>
          <kbd className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 shadow-2xs dark:bg-slate-800 dark:text-slate-400">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Dark / Light Mode Switch */}
        <ThemeToggle />

        {/* Realtime Notification Bell */}
        <NotificationBell />

        {/* User Profile Capsule Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-1.5 pr-2.5 transition-all hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-slate-700 dark:hover:bg-slate-800"
            aria-expanded={profileOpen}
            aria-label="User menu"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand-600 font-bold text-xs text-white shadow-xs dark:bg-brand-500">
              {(user?.name || "A")[0].toUpperCase()}
            </span>
            <span className="hidden text-xs font-semibold text-slate-800 dark:text-slate-200 sm:block">
              {user?.name || "Recruiter"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {profileOpen && (
            <div
              className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-lift backdrop-blur-md dark:border-slate-800/90 dark:bg-slate-900/95"
              onMouseLeave={() => setProfileOpen(false)}
            >
              <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{user?.name}</p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{user?.email}</p>
                <span className="mt-1 inline-block rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-950 dark:text-accent-400">
                  {roleName}
                </span>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/settings");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Settings className="h-4 w-4 text-slate-400" /> Workspace Settings
                </button>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/ai-interviews");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Bot className="h-4 w-4 text-slate-400" /> AI Interviews
                </button>
              </div>

              <div className="border-t border-slate-100 pt-1 dark:border-slate-800">
                <button
                  onClick={() => {
                    const refreshToken = getAdminRefreshToken();
                    if (refreshToken) {
                      api.post("/auth/logout", { refreshToken }).catch(() => {});
                    }
                    clearAdminAuth();
                    navigate("/login");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <LogOut className="h-4 w-4" /> Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function ShellInner({ children }) {
  const [collapsed, setCollapsed] = useState(readSidebarCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const viewAs = getViewAsCompany();
  const mainRef = useRef(null);
  const firstRender = useRef(true);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((v) => {
      const next = !v;
      writeSidebarCollapsed(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const mq = window.matchMedia("(min-width: 1024px)");
    const close = () => mq.matches && setMobileOpen(false);
    close();
    mq.addEventListener("change", close);
    return () => mq.removeEventListener("change", close);
  }, [mobileOpen]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-slate-900 transition-colors dark:text-slate-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-brand-600 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-deep"
      >
        Skip to main content
      </a>

      {viewAs && (
        <div className="flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-xs">
          <span>
            Viewing as tenant <span className="font-bold">{viewAs.name}</span> — read-only. Every mutation is rejected by
            the server.
          </span>
          <button
            onClick={() => {
              setViewAsCompany(null);
              window.location.assign("/platform");
            }}
            className="shrink-0 rounded-lg bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30"
          >
            Exit view-as
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Desktop Collapsible Sidebar */}
        <aside
          className={`hidden shrink-0 flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-md transition-all duration-200 dark:border-slate-800/80 dark:bg-slate-950/90 lg:flex ${
            collapsed ? "w-20" : "w-64"
          }`}
        >
          <SidebarContent
            collapsed={collapsed}
            onToggleCollapse={toggleCollapsed}
          />
        </aside>

        {/* Mobile Navigation Drawer Modal */}
        <Modal
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          placement="left"
          label="Navigation menu"
          panelClassName="w-68 bg-white dark:bg-slate-950"
        >
          <button
            className="absolute right-3 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <SidebarContent
            collapsed={false}
            onNavigate={() => setMobileOpen(false)}
          />
        </Modal>

        {/* Main Content Viewport */}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNav onMenuClick={() => setMobileOpen(true)} collapsed={collapsed} />
          <main
            key={pathname}
            ref={mainRef}
            id="main-content"
            tabIndex={-1}
            data-page-enter=""
            className="flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-8"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function DashboardShell({ children }) {
  return (
    <CompanyDataProvider>
      <NotificationProvider>
        <ShellInner>{children}</ShellInner>
      </NotificationProvider>
    </CompanyDataProvider>
  );
}
