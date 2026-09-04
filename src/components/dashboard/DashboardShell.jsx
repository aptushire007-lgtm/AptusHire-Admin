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
  Building2,
  Sparkles,
  CreditCard,
  Zap,
} from "lucide-react";
import { useAdminAuth } from "../../auth/useAdminAuth.js";
import { clearAdminAuth, getAdminRefreshToken } from "../../auth/adminAuth.js";
import api, { getViewAsCompany, setViewAsCompany } from "../../api/client.js";
import { CompanyDataProvider, useCompanyData } from "../../context/CompanyDataContext.jsx";
import { NotificationProvider } from "../../context/NotificationContext.jsx";
import Modal from "../ui/Modal.jsx";
import NotificationBell from "./NotificationBell.jsx";
import BrandLogo, { AptusMark } from "../ui/BrandLogo.jsx";

const SIDEBAR_COLLAPSED_KEY = "admin_sidebar_collapsed:v1";

function readSidebarCollapsed() {
  try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true"; }
  catch { return false; }
}

function writeSidebarCollapsed(v) {
  try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(v)); }
  catch { /* ignore */ }
}

const NAV_GROUPS = [
  {
    label: "Recruitment",
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
    label: "Intelligence",
    items: [
      { to: "/recordings", label: "Recordings", icon: Video },
      { to: "/reports", label: "Analytics & Reports", icon: BarChart3 },
      { to: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Workspace",
    items: [
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

function SidebarContent({ collapsed, onToggleCollapse, onNavigate }) {
  const { user } = useAdminAuth();
  const { me } = useCompanyData();
  const roleName =
    user?.role === "super_admin"
      ? "Platform Admin"
      : me?.role === "owner"
      ? "Head of Recruitment"
      : "Recruiter";

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto overflow-x-hidden">
      <div>
        {/* ── Brand Header ─────────────────────────────────────── */}
        <div
          className={`flex h-16 shrink-0 items-center border-b border-border bg-surface px-4 ${
            collapsed ? "justify-center" : "justify-between"
          }`}
        >
          {collapsed ? (
            <AptusMark size="md" onClick={onNavigate} />
          ) : (
            <BrandLogo to="/" size="md" onClick={onNavigate} />
          )}
        </div>

        {/* ── Workspace Capsule ─────────────────────────────────── */}
        {!collapsed && (
          <div className="mx-3 mt-4 mb-1 flex items-center gap-2.5 rounded-card border border-border bg-brand-50 p-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-card">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-text-strong">
                {me?.company?.name || "Aptus Workspace"}
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                <Sparkles className="h-3 w-3" />
                {roleName}
              </span>
            </div>
          </div>
        )}

        {/* ── Navigation ────────────────────────────────────────── */}
        <nav
          aria-label="Dashboard Navigation"
          className="mt-3 flex flex-1 flex-col gap-5 px-3"
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-faint">
                  {group.label}
                </p>
              )}
              <div className="flex flex-col gap-px">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 rounded-control py-2.5 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        collapsed ? "justify-center px-2.5" : "px-3"
                      } ${
                        isActive
                          ? "before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-primary bg-brand-50 font-semibold text-primary"
                          : "text-text-muted hover:bg-brand-50 hover:text-text"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={`h-4 w-4 shrink-0 transition-colors ${
                            isActive
                              ? "text-primary"
                              : "text-text-faint group-hover:text-text-muted"
                          }`}
                          aria-hidden="true"
                        />
                        {!collapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* ── Sidebar Footer ────────────────────────────────────────── */}
      <div className="space-y-2 border-t border-border p-3">
        {!collapsed && (
          <div className="rounded-card border border-brand-200 bg-gradient-to-br from-brand-50 to-primary-light p-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Zap className="h-3.5 w-3.5" /> Aptus Intelligence
              </span>
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                Live
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-4 text-text-muted">
              Rubric scoring and live interview engine active.
            </p>
            <NavLink
              to="/settings"
              onClick={onNavigate}
              className="mt-2.5 flex items-center justify-center gap-1.5 rounded-control border border-primary/25 bg-white py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-brand-50"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Workspace Plan</span>
            </NavLink>
          </div>
        )}

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex w-full items-center justify-center gap-2 rounded-control py-2 text-xs font-medium text-text-faint transition-colors hover:bg-brand-50 hover:text-text-muted"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function TopNav({ onMenuClick }) {
  const { user } = useAdminAuth();
  const { me } = useCompanyData();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const companyName = me?.company?.name || "Your Workspace";
  const roleName =
    user?.role === "super_admin"
      ? "Platform Admin"
      : me?.role === "owner"
      ? "Head of Recruitment"
      : "Recruiter";

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!profileOpen) return undefined;
    function handle(e) {
      if (!profileRef.current?.contains(e.target)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [profileOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 shadow-card sm:px-6">
      {/* Left — mobile burger + workspace identity */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          className="tap-target inline-flex items-center justify-center rounded-control text-text-muted hover:bg-brand-50 hover:text-primary lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-bold text-text-strong">
              {companyName}
            </h2>
            <span className="hidden rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary sm:inline-block">
              {roleName}
            </span>
          </div>
          <p className="truncate text-[11px] tabular-nums text-text-faint">
            {me?.company?.companyCode || "APT-01"}
          </p>
        </div>
      </div>

      {/* Centre — global search trigger */}
      <div className="hidden max-w-xs flex-1 md:block lg:max-w-sm">
        <button
          type="button"
          onClick={() => navigate("/candidates")}
          className="flex w-full cursor-pointer items-center justify-between rounded-control border border-border bg-canvas px-3 py-2 text-xs text-text-muted transition-colors hover:border-primary/40 hover:bg-brand-50"
        >
          <span className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-text-faint" />
            <span>Search candidates, jobs, rubrics…</span>
          </span>
          <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-text-faint">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right — notifications + user menu */}
      <div className="flex shrink-0 items-center gap-2">
        <NotificationBell />

        {/* Profile capsule */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 rounded-card border border-border bg-canvas px-2.5 py-1.5 text-xs font-semibold text-text-strong transition-colors hover:border-primary/40 hover:bg-brand-50"
            aria-expanded={profileOpen}
            aria-haspopup="true"
            aria-label="User menu"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-control bg-primary text-[11px] font-bold text-white">
              {(user?.name || "A")[0].toUpperCase()}
            </span>
            <span className="hidden max-w-[7rem] truncate sm:block">
              {user?.name || "Recruiter"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-text-faint" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-card border border-border bg-surface p-1.5 shadow-lift">
              {/* User info header */}
              <div className="border-b border-border px-3 py-2.5">
                <p className="truncate text-[13px] font-bold text-text-strong">
                  {user?.name}
                </p>
                <p className="truncate text-[11px] text-text-muted">
                  {user?.email}
                </p>
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Sparkles className="h-2.5 w-2.5" />
                  {roleName}
                </span>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => { setProfileOpen(false); navigate("/settings"); }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left text-xs font-medium text-text-muted transition-colors hover:bg-brand-50 hover:text-primary"
                >
                  <Settings className="h-4 w-4 text-text-faint" />
                  Workspace Settings
                </button>
                <button
                  onClick={() => { setProfileOpen(false); navigate("/ai-interviews"); }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left text-xs font-medium text-text-muted transition-colors hover:bg-brand-50 hover:text-primary"
                >
                  <Bot className="h-4 w-4 text-text-faint" />
                  AI Interviews
                </button>
              </div>

              {/* Logout */}
              <div className="border-t border-border pt-1">
                <button
                  onClick={() => {
                    const refreshToken = getAdminRefreshToken();
                    if (refreshToken) api.post("/auth/logout", { refreshToken }).catch(() => {});
                    clearAdminAuth();
                    navigate("/login");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left text-xs font-semibold text-verdict-negative transition-colors hover:bg-verdict-negative-tint"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
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
    if (firstRender.current) { firstRender.current = false; return; }
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-text">
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-60 focus:rounded-card focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lift"
      >
        Skip to main content
      </a>

      {/* View-as banner */}
      {viewAs && (
        <div className="flex items-center justify-between gap-3 bg-accent-gold px-4 py-2 text-sm font-medium text-white shadow-card">
          <span>
            Viewing as tenant <span className="font-bold">{viewAs.name}</span> — read-only mode.
          </span>
          <button
            onClick={() => { setViewAsCompany(null); window.location.assign("/platform"); }}
            className="shrink-0 rounded-control bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30"
          >
            Exit view-as
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* ── Desktop Collapsible Sidebar ──────────────────────── */}
        <aside
          className={`hidden shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 lg:flex ${
            collapsed ? "w-[4.5rem]" : "w-64"
          }`}
        >
          <SidebarContent
            collapsed={collapsed}
            onToggleCollapse={toggleCollapsed}
          />
        </aside>

        {/* ── Mobile Navigation Drawer ─────────────────────────── */}
        <Modal
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          placement="left"
          label="Navigation menu"
          panelClassName="w-72 border-r border-border bg-surface"
        >
          <button
            className="tap-target absolute right-3 top-4 inline-flex items-center justify-center rounded-control text-text-muted hover:bg-brand-50 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </Modal>

        {/* ── Main Content Column ───────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNav onMenuClick={() => setMobileOpen(true)} />
          <main
            key={pathname}
            ref={mainRef}
            id="main-content"
            tabIndex={-1}
            className="min-w-0 flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-8"
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
