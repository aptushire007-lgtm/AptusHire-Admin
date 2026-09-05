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
    <div className="flex h-full flex-col justify-between overflow-y-auto overflow-x-hidden bg-white">
      <div>
        {/* ── Brand Header ─────────────────────────────────────── */}
        <div
          className={`flex h-16 shrink-0 items-center border-b border-[#E5EBE7] px-4 ${
            collapsed ? "justify-center" : "justify-between"
          }`}
        >
          {collapsed ? (
            <AptusMark size={28} onClick={onNavigate} />
          ) : (
            <BrandLogo to="/" size="md" theme="light" onClick={onNavigate} />
          )}
        </div>

        {/* ── Workspace Capsule ─────────────────────────────────── */}
        {!collapsed && (
          <div className="mx-3 mt-4 mb-1 flex items-center gap-2.5 rounded-xl border border-[#E5EBE7] bg-[#F1F7F3] p-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#176B45] text-white">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-[#17221C]">
                {me?.company?.name || "Aptus Workspace"}
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#176B45]">
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
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-[#9BAAA1]">
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
                      `group relative flex items-center gap-3 rounded-lg py-2.5 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B45] ${
                        collapsed ? "justify-center px-2.5" : "px-3"
                      } ${
                        isActive
                          ? "before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-[#176B45] bg-[#F8FAF9] font-semibold text-[#176B45]"
                          : "text-[#64736A] hover:bg-[#F1F7F3] hover:text-[#176B45]"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={`h-4 w-4 shrink-0 transition-colors ${
                            isActive ? "text-[#176B45]" : "text-[#9BAAA1] group-hover:text-[#176B45]"
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
      <div className="space-y-2 border-t border-[#E5EBE7] p-3">
        {!collapsed && (
          <div className="rounded-xl border border-[#E5EBE7] bg-[#F1F7F3] p-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-[#176B45]">
                <Zap className="h-3.5 w-3.5 text-[#176B45]" /> Aptus Intelligence
              </span>
              <span className="rounded-full bg-[#176B45] px-2 py-0.5 text-[10px] font-bold text-white">
                Live
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-4 text-[#64736A]">
              Rubric scoring and live interview engine active.
            </p>
            <NavLink
              to="/settings"
              onClick={onNavigate}
              className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg border border-[#E5EBE7] bg-white py-1.5 text-xs font-semibold text-[#176B45] transition-colors hover:bg-[#F8FAF9]"
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
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium text-[#9BAAA1] transition-colors hover:bg-[#F1F7F3] hover:text-[#64736A]"
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

  useEffect(() => {
    if (!profileOpen) return undefined;
    function handle(e) {
      if (!profileRef.current?.contains(e.target)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [profileOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[#E5EBE7] bg-white px-4 shadow-[0_1px_3px_rgba(27,67,50,0.06)] sm:px-6">
      {/* Left */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          className="tap-target inline-flex items-center justify-center rounded-lg text-[#64736A] hover:bg-[#DDECE3] hover:text-[#176B45] lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-bold text-[#17221C]">
              {companyName}
            </h2>
            <span className="hidden rounded-full bg-[#E8F2EC] px-2.5 py-0.5 text-[11px] font-semibold text-[#176B45] sm:inline-block">
              {roleName}
            </span>
          </div>
          <p className="truncate text-[11px] tabular-nums text-[#9BAAA1]">
            {me?.company?.companyCode || "APT-01"}
          </p>
        </div>
      </div>

      {/* Centre — search */}
      <div className="hidden max-w-xs flex-1 md:block lg:max-w-sm">
        <button
          type="button"
          onClick={() => navigate("/candidates")}
          className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-[#E5EBE7] bg-[#F1F7F3] px-3 py-2 text-xs text-[#64736A] transition-colors hover:border-[#C7DDD1] hover:bg-[#DDECE3]"
        >
          <span className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-[#9BAAA1]" />
            <span>Search candidates, jobs, rubrics…</span>
          </span>
          <kbd className="rounded border border-[#E5EBE7] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#9BAAA1]">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right */}
      <div className="flex shrink-0 items-center gap-2">
        <NotificationBell />

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-2.5 py-1.5 text-xs font-semibold text-[#17221C] transition-colors hover:border-[#C7DDD1] hover:bg-[#DDECE3]"
            aria-expanded={profileOpen}
            aria-haspopup="true"
            aria-label="User menu"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#176B45] text-[11px] font-bold text-white">
              {(user?.name || "A")[0].toUpperCase()}
            </span>
            <span className="hidden max-w-[7rem] truncate sm:block">
              {user?.name || "Recruiter"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-[#9BAAA1]" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-[#E5EBE7] bg-white p-1.5 shadow-lift">
              <div className="border-b border-[#E5EBE7] px-3 py-2.5">
                <p className="truncate text-[13px] font-bold text-[#17221C]">{user?.name}</p>
                <p className="truncate text-[11px] text-[#64736A]">{user?.email}</p>
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#E8F2EC] px-2 py-0.5 text-[10px] font-semibold text-[#176B45]">
                  <Sparkles className="h-2.5 w-2.5" />
                  {roleName}
                </span>
              </div>

              <div className="py-1">
                <button
                  onClick={() => { setProfileOpen(false); navigate("/settings"); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#64736A] transition-colors hover:bg-[#DDECE3] hover:text-[#176B45]"
                >
                  <Settings className="h-4 w-4 text-[#9BAAA1]" />
                  Workspace Settings
                </button>
                <button
                  onClick={() => { setProfileOpen(false); navigate("/ai-interviews"); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#64736A] transition-colors hover:bg-[#DDECE3] hover:text-[#176B45]"
                >
                  <Bot className="h-4 w-4 text-[#9BAAA1]" />
                  AI Interviews
                </button>
              </div>

              <div className="border-t border-[#E5EBE7] pt-1">
                <button
                  onClick={() => {
                    const refreshToken = getAdminRefreshToken();
                    if (refreshToken) api.post("/auth/logout", { refreshToken }).catch(() => {});
                    clearAdminAuth();
                    navigate("/login");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#C95C5C] transition-colors hover:bg-[#F8EAEA]"
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
    <div className="flex min-h-screen flex-col bg-[#F8FAF9] text-[#17221C]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-60 focus:rounded-xl focus:bg-[#176B45] focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lift"
      >
        Skip to main content
      </a>

      {viewAs && (
        <div className="flex items-center justify-between gap-3 bg-[#176B45] px-4 py-2 text-sm font-medium text-white shadow-[0_1px_4px_rgba(27,67,50,0.07)]">
          <span>
            Viewing as tenant <span className="font-bold">{viewAs.name}</span> — read-only mode.
          </span>
          <button
            onClick={() => { setViewAsCompany(null); window.location.assign("/platform"); }}
            className="shrink-0 rounded-lg bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30"
          >
            Exit view-as
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar — white, matches user UI */}
        <aside
          className={`hidden shrink-0 flex-col border-r border-[#E5EBE7] bg-white transition-[width] duration-200 lg:flex ${
            collapsed ? "w-[4.5rem]" : "w-64"
          }`}
        >
          <SidebarContent
            collapsed={collapsed}
            onToggleCollapse={toggleCollapsed}
          />
        </aside>

        {/* Mobile drawer */}
        <Modal
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          placement="left"
          label="Navigation menu"
          panelClassName="w-72 border-r border-[#E5EBE7] bg-white"
        >
          <button
            className="tap-target absolute right-3 top-4 inline-flex items-center justify-center rounded-lg text-[#64736A] hover:bg-[#F1F7F3] hover:text-[#176B45] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B45]"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </Modal>

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNav onMenuClick={() => setMobileOpen(true)} />
          <main
            key={pathname}
            ref={mainRef}
            id="main-content"
            tabIndex={-1}
            className="min-w-0 flex-1 bg-[#F8FAF9] px-4 py-6 focus:outline-none sm:px-6 lg:px-8"
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
