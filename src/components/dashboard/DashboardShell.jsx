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
  Building2,
  Sparkles,
  CreditCard,
  Zap,
  Search,
  Mic2,
  Plus,
  FileQuestion,
} from "lucide-react";
import { useAdminAuth } from "../../auth/useAdminAuth.js";
import { clearAdminAuth, getAdminRefreshToken } from "../../auth/adminAuth.js";
import api, { getViewAsCompany, setViewAsCompany } from "../../api/client.js";
import { CompanyDataProvider, useCompanyData } from "../../context/CompanyDataContext.jsx";
import { NotificationProvider } from "../../context/NotificationContext.jsx";
import Modal from "../ui/Modal.jsx";
import NotificationBell from "./NotificationBell.jsx";
import BrandLogo, { AptusMark } from "../ui/BrandLogo.jsx";
import CommandPalette from "./CommandPalette.jsx";

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
      { to: "/jobs", label: "Jobs", icon: Briefcase },
      { to: "/candidates", label: "Candidates", icon: Users },
      { to: "/pipeline", label: "Hiring Pipeline", icon: KanbanSquare },
      { to: "/review-queue", label: "Screening reviews", icon: Scale },
      { to: "/ai-interviews", label: "AI Interviews", icon: Bot },
      { to: "/assessments", label: "Skills Assessments", icon: FileQuestion },
      { to: "/recordings", label: "Recordings", icon: Mic2 },
    ],
  },
  {
    label: "Intelligence",
    items: [
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

function getNavGroups(user) {
  if (user?.role !== "super_admin") return NAV_GROUPS;
  return [
    ...NAV_GROUPS,
    {
      label: "Administration",
      items: [
        { to: "/platform", label: "Platform administration", icon: Building2 },
      ],
    },
  ];
}

function getBreadcrumbs(pathname) {
  if (pathname.startsWith("/jobs/") && pathname.includes("/rubric")) {
    return [
      { to: "/jobs", label: "Jobs" },
      { label: "Screening rubric", current: true },
    ];
  }
  if (pathname.startsWith("/jobs/") && pathname.includes("/questions")) {
    return [
      { to: "/jobs", label: "Jobs" },
      { label: "Interview questions", current: true },
    ];
  }
  if (pathname.startsWith("/jobs/") && pathname.includes("/assessment")) {
    return [
      { to: "/jobs", label: "Jobs" },
      { label: "Skills assessment", current: true },
    ];
  }
  if (pathname.startsWith("/jobs/") && pathname.includes("/post")) {
    return [
      { to: "/jobs", label: "Jobs" },
      { label: "Job post", current: true },
    ];
  }
  if (pathname.startsWith("/jobs/") && pathname.includes("/candidates")) {
    return [
      { to: "/jobs", label: "Jobs" },
      { label: "Candidates", current: true },
    ];
  }
  return null;
}

function SidebarContent({ collapsed, onToggleCollapse, onNavigate }) {
  const { me } = useCompanyData();
  const { user } = useAdminAuth();
  const navGroups = getNavGroups(user);

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto overflow-x-hidden bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div>
        {/* ── Brand Header ─────────────────────────────────────── */}
        <div
          className={`flex h-16 shrink-0 items-center border-b border-[#E4E4E7] px-4 ${
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
          <div className="mx-3 mb-1 mt-4 flex items-center gap-2.5 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] p-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#176B45] text-white">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-[#17221C]">
                {me?.company?.name || "Aptus Workspace"}
              </p>
            </div>
          </div>
        )}

        {/* ── Navigation ────────────────────────────────────────── */}
        <nav
          aria-label="Dashboard Navigation"
          className="mt-3 flex flex-1 flex-col gap-5 px-3"
        >
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-[#9BAAA1]">
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
                      `group relative flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E3B2E] ${
                        collapsed ? "justify-center px-2.5" : "px-3"
                      } ${
                        isActive
                          ? "bg-[#EAF5EF] font-semibold text-[#0E3B2E] border border-[#CDE5D6] shadow-2xs"
                          : "text-slate-600 hover:bg-white/80 hover:text-slate-900 border border-transparent"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={`h-4 w-4 shrink-0 transition-colors ${
                            isActive ? "text-[#0E3B2E]" : "text-slate-400 group-hover:text-[#0E3B2E]"
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
      <div className="space-y-2 border-t border-[#E4E4E7] p-3">
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
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium text-[#9BAAA1] transition-colors hover:bg-[#F1F7F3] hover:text-[#64736A]"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse sidebar</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function TopNav({ onMenuClick, onOpenSearch }) {
  const { user } = useAdminAuth();
  const { me } = useCompanyData();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const companyName = me?.company?.name || "Your Workspace";
  const roleName =
    user?.role === "super_admin"
      ? "Platform Admin"
      : me?.role === "owner"
      ? "Head of Recruitment"
      : "Recruiter";

  const breadcrumbs = getBreadcrumbs(location.pathname);

  useEffect(() => {
    if (!profileOpen) return undefined;
    function handle(e) {
      if (!profileRef.current?.contains(e.target)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [profileOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[#E4E4E7] bg-white px-4 sm:px-6">
      {/* Left */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          className="tap-target inline-flex items-center justify-center rounded-lg text-[#64736A] hover:bg-[#DDECE3] hover:text-[#176B45] lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {breadcrumbs ? (
          <nav aria-label="Workspace breadcrumb" className="flex items-center gap-2 text-xs font-medium">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-slate-400">/</span>}
                {b.current ? (
                  <span aria-current="page" className="font-semibold text-slate-900">
                    {b.label}
                  </span>
                ) : (
                  <NavLink to={b.to} className="text-slate-500 hover:text-slate-900 transition-colors">
                    {b.label}
                  </NavLink>
                )}
              </span>
            ))}
          </nav>
        ) : (
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[#09090B]">{companyName}</h2>
            <p className="truncate text-[11px] tabular-nums text-[#9BAAA1]">
              {me?.company?.companyCode || "APT-01"}
            </p>
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => navigate("/jobs?create=1")}
          className="hidden sm:flex items-center gap-1.5 rounded-lg bg-[#0E3B2E] hover:bg-[#154d3d] text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Create Job</span>
        </button>

        <button
          type="button"
          aria-label="Search workspace"
          onClick={onOpenSearch}
          className="flex items-center gap-2 rounded-lg border border-[#E4E4E7] bg-slate-50/80 px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors shadow-2xs"
        >
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <span className="hidden sm:inline">Search workspace…</span>
          <kbd className="hidden sm:inline rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">Ctrl K</kbd>
        </button>

        <NotificationBell />

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md border border-[#E4E4E7] bg-white px-2.5 py-1.5 text-xs font-medium text-[#18181B] shadow-sm transition-colors hover:bg-[#F4F4F5]"
            aria-expanded={profileOpen}
            aria-haspopup="true"
            aria-label="Account options"
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
            <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-md border border-[#E4E4E7] bg-white p-1.5 shadow-lift">
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
                  role="menuitem"
                  onClick={() => { setProfileOpen(false); navigate("/subscription"); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#64736A] transition-colors hover:bg-[#DDECE3] hover:text-[#176B45]"
                >
                  <CreditCard className="h-4 w-4 text-[#9BAAA1]" />
                  Plan and billing
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setProfileOpen(false); navigate("/settings"); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#64736A] transition-colors hover:bg-[#DDECE3] hover:text-[#176B45]"
                >
                  <Settings className="h-4 w-4 text-[#9BAAA1]" />
                  Workspace Settings
                </button>
                <button
                  role="menuitem"
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
  const { user } = useAdminAuth();
  const [collapsed, setCollapsed] = useState(readSidebarCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
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
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
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

  const navGroups = getNavGroups(user);

  return (
    <div className="admin-portal flex min-h-screen flex-col bg-[#F6F8F7] text-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-60 focus:rounded-xl focus:bg-[#0E3B2E] focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lift"
      >
        Skip to main content
      </a>

      {viewAs && (
        <div className="flex items-center justify-between gap-3 bg-[#0E3B2E] px-4 py-2 text-sm font-medium text-white shadow-[0_1px_4px_rgba(27,67,50,0.07)]">
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
        {/* Desktop sidebar — softly tinted surface */}
        <aside
          className={`sticky top-0 hidden h-screen shrink-0 self-start flex-col border-r border-[#E2E8E4] bg-[#F0F4F1]/90 backdrop-blur-xs transition-[width] duration-200 lg:flex ${
            collapsed ? "w-[4.5rem]" : "w-[236px]"
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
          panelClassName="w-72 border-r border-[#E5EBE7] bg-[#F0F4F1]"
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
          <TopNav onMenuClick={() => setMobileOpen(true)} onOpenSearch={() => setCommandOpen(true)} />
          <main
            key={pathname}
            ref={mainRef}
            id="main-content"
            tabIndex={-1}
            className="min-w-0 flex-1 bg-[#F6F8F7] px-4 py-6 focus:outline-none sm:px-6 lg:px-8"
          >
            {children}
          </main>
        </div>
      </div>

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} groups={navGroups} />
    </div>
  );
}

export default function DashboardShell({ children }) {
  return (
    <CompanyDataProvider includeCandidates={false}>
      <NotificationProvider>
        <ShellInner>{children}</ShellInner>
      </NotificationProvider>
    </CompanyDataProvider>
  );
}
