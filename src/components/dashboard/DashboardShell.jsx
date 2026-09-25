import { useEffect, useRef, useState, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  KanbanSquare,
  Bot,
  BarChart3,
  Mail,
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
  Search,
  Mic2,
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
import JobSidebar, { parseJobPath, JOB_SECTIONS } from "./JobSidebar.jsx";
import { NavItem } from "./NavItem.jsx";

const SIDEBAR_COLLAPSED_KEY = "admin_sidebar_collapsed:v1";

function readSidebarCollapsed() {
  try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true"; }
  catch { return false; }
}
function writeSidebarCollapsed(v) {
  try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(v)); }
  catch { /* ignore */ }
}

/**
 * The company-wide sidebar holds ONLY what spans every job.
 *
 * It used to carry eleven destinations in four groups. Most of them — the
 * pipeline, AI interviews, recordings, skills assessments — are about ONE job,
 * and now live inside that job's own workspace (see JobSidebar.jsx), where a
 * recruiter actually works them. What is left is what a recruiter needs from
 * anywhere: where things stand, the roles, the people, what is waiting on
 * them, and how it is going.
 *
 * Notifications is not here because the top bar's bell already is it.
 */
const NAV_MAIN = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/candidates", label: "Talent Pool", icon: Users },
  { to: "/review-queue", label: "Review queue", icon: Scale, countKey: "reviews" },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/templates", label: "Templates", icon: Mail },
];
const NAV_SETTINGS = { to: "/settings", label: "Settings", icon: Settings };
const NAV_PLATFORM = { to: "/platform", label: "Platform administration", icon: Building2 };

/**
 * Everything reachable, for Ctrl+K search.
 *
 * Kept separate from the sidebar ON PURPOSE. The palette used to be fed the
 * sidebar's own list, so trimming the sidebar would have silently removed the
 * company-wide AI Interviews, Recordings and Assessments pages from search as
 * well — stranding them. Moving a page out of the sidebar is a layout choice;
 * making it unfindable would be a regression.
 */
function getPaletteGroups(user) {
  const workspace = [...NAV_MAIN, NAV_SETTINGS];
  if (user?.role === "super_admin") workspace.push(NAV_PLATFORM);
  return [
    { label: "Workspace", items: workspace },
    {
      label: "Across all jobs",
      items: [
        { to: "/pipeline", label: "Hiring Pipeline", icon: KanbanSquare },
        { to: "/ai-interviews", label: "AI Interviews", icon: Bot },
        { to: "/recordings", label: "Recordings", icon: Mic2 },
        { to: "/assessments", label: "Skills Assessments", icon: FileQuestion },
        { to: "/notifications", label: "Notifications", icon: Bell },
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
  // Inside a job workspace the sidebar already names the job, so the crumb
  // only has to say which part of it you are on.
  const jobPath = parseJobPath(pathname);
  if (jobPath) {
    const section = JOB_SECTIONS.find((s) => s.key === jobPath.section);
    return [
      { to: "/jobs", label: "Jobs" },
      { label: section?.label || "Job", current: true },
    ];
  }
  return null;
}

function SidebarContent({ collapsed, onToggleCollapse, onNavigate, counts = {} }) {
  const { user } = useAdminAuth();
  const { pathname } = useLocation();
  // Inside a job, the job's own navigation replaces this one. Same shell, same
  // mount — only the list changes — so opening a job never refetches the
  // workspace or reconnects the socket.
  const jobPath = parseJobPath(pathname);

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto overflow-x-hidden bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div>
        {/* ── Brand ─────────────────────────────────────────────── */}
        <div
          className={`flex h-[60px] shrink-0 items-center border-b border-[#DCEAF5] px-5 ${
            collapsed ? "justify-center" : "justify-between"
          }`}
        >
          {collapsed ? (
            <AptusMark size={28} onClick={onNavigate} />
          ) : (
            <BrandLogo to="/" size="md" theme="light" onClick={onNavigate} />
          )}
        </div>

        {jobPath ? (
          <JobSidebar
            jobId={jobPath.id}
            section={jobPath.section}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ) : (
          <nav aria-label="Dashboard Navigation" className={`mt-4 flex flex-col gap-0.5 ${collapsed ? "px-2" : "px-3"}`}>
            {NAV_MAIN.map((item) => (
              <NavItem
                key={item.to}
                to={item.to}
                end={item.end}
                icon={item.icon}
                label={item.label}
                collapsed={collapsed}
                onClick={onNavigate}
                count={item.countKey ? counts[item.countKey] : null}
              />
            ))}
          </nav>
        )}
      </div>

      {/* ── Footer: settings, admin, collapse ───────────────────────── */}
      <div className={`flex flex-col gap-0.5 border-t border-hairline py-3 ${collapsed ? "px-2" : "px-3"}`}>
        <NavItem
          to={NAV_SETTINGS.to}
          icon={NAV_SETTINGS.icon}
          label={NAV_SETTINGS.label}
          collapsed={collapsed}
          onClick={onNavigate}
        />
        {user?.role === "super_admin" && (
          <NavItem
            to={NAV_PLATFORM.to}
            icon={NAV_PLATFORM.icon}
            label={NAV_PLATFORM.label}
            collapsed={collapsed}
            onClick={onNavigate}
          />
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`mt-1 flex h-9 items-center gap-2.5 rounded-lg text-[13px] font-medium text-[#55708F] transition-colors hover:bg-[#F4FAFF] hover:text-[#123B6D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-800 ${
              collapsed ? "justify-center" : "px-3"
            }`}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
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
    <header className="sticky top-0 z-30 flex h-[60px] shrink-0 items-center justify-between gap-3 border-b border-[#DCEAF5] bg-white px-4 shadow-[0_1px_4px_rgba(18,59,109,0.04)] sm:px-6">
      {/* Left */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          className="tap-target inline-flex items-center justify-center rounded-lg text-[#55708F] hover:bg-[#EAF5FF] hover:text-[#123B6D] lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {breadcrumbs ? (
          <nav aria-label="Workspace breadcrumb" className="flex items-center gap-2 text-xs font-medium">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-[#9AAABD]">/</span>}
                {b.current ? (
                  <span aria-current="page" className="font-semibold text-[#123B6D]">
                    {b.label}
                  </span>
                ) : (
                  <NavLink to={b.to} className="text-[#55708F] hover:text-[#123B6D] transition-colors">
                    {b.label}
                  </NavLink>
                )}
              </span>
            ))}
          </nav>
        ) : (
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold leading-[20px] text-[#0B2F57]">{companyName}</h2>
            <p className="truncate text-[11px] leading-[16px] tabular-nums text-[#7C91A8]">
              {me?.company?.companyCode || "APT-01"}
            </p>
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          aria-label="Search workspace"
          onClick={onOpenSearch}
          className="flex h-9 items-center gap-2 rounded-full border border-[#D7E8F6] bg-white px-3.5 text-[13px] text-[#55708F] transition-colors hover:border-[#BFDDF5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(47,156,244,0.30)] sm:w-[260px]"
        >
          <Search className="h-[17px] w-[17px] shrink-0 text-[#55708F]" strokeWidth={1.8} />
          <span className="hidden sm:inline">Search workspace…</span>
          <span className="ml-auto hidden shrink-0 rounded-[5px] border border-[#E0EDF7] bg-[#F1F7FC] px-[7px] py-1 text-[10px] font-medium text-[#55708F] sm:inline">
            Ctrl K
          </span>
        </button>

        <NotificationBell />

        <div className="relative ml-1" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-3 rounded-full border border-[#DCEAF5] bg-white py-1 pl-1 pr-3 text-[13px] font-semibold text-[#123B6D] shadow-sm transition-colors hover:bg-[#F4FAFF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(47,156,244,0.30)]"
            aria-expanded={profileOpen}
            aria-haspopup="true"
            aria-label="Account options"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FFF3D6] text-[12px] font-semibold text-[#8A6415]">
              {user?.photoPath ? (
                <img src={user.photoPath} alt="" className="h-full w-full object-cover" />
              ) : (
                String(user?.name || "Admin")
                  .trim()
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase()
              )}
            </span>
            <span className="hidden max-w-[10rem] truncate sm:block">
              {user?.name || "Recruiter"}
            </span>
            <ChevronDown className="h-4 w-4 text-[#55708F]" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-md border border-[#DCEAF5] bg-white p-1.5 shadow-lift">
              <div className="border-b border-[#E8EEF3] px-3 py-2.5">
                <p className="truncate text-[13px] font-bold text-[#123B6D]">{user?.name}</p>
                <p className="truncate text-[11px] text-[#7C91A8]">{user?.email}</p>
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#F1EEFF] px-2 py-0.5 text-[10px] font-semibold text-[#6B52D4]">
                  <Sparkles className="h-2.5 w-2.5" />
                  {roleName}
                </span>
              </div>

              <div className="py-1">
                <button
                  role="menuitem"
                  onClick={() => { setProfileOpen(false); navigate("/subscription"); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[#55708F] transition-colors hover:bg-[#EAF5FF] hover:text-[#123B6D]"
                >
                  <CreditCard className="h-4 w-4 text-[#9AAABD]" />
                  Plan and billing
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setProfileOpen(false); navigate("/settings"); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[#55708F] transition-colors hover:bg-[#EAF5FF] hover:text-[#123B6D]"
                >
                  <Settings className="h-4 w-4 text-[#9AAABD]" />
                  Workspace Settings
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setProfileOpen(false); navigate("/ai-interviews"); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[#55708F] transition-colors hover:bg-[#EAF5FF] hover:text-[#123B6D]"
                >
                  <Bot className="h-4 w-4 text-[#9AAABD]" />
                  AI Interviews
                </button>
              </div>

              <div className="border-t border-[#E8EEF3] pt-1">
                <button
                  onClick={() => {
                    const refreshToken = getAdminRefreshToken();
                    if (refreshToken) api.post("/auth/logout", { refreshToken }).catch(() => {});
                    clearAdminAuth();
                    navigate("/login");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-semibold text-[#E45C5C] transition-colors hover:bg-[#FFF0F0]"
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

  const paletteGroups = getPaletteGroups(user);

  // The review badge comes from the workspace context, like every other figure
  // in the shell: the shell itself fetches nothing, so it never has its own
  // loading or failure state to get wrong.
  const { reviewCount } = useCompanyData();
  // A zero is a real count, but an empty queue does not need a badge shouting
  // "0" beside it — only a non-zero count is drawn.
  const counts = { reviews: reviewCount > 0 ? reviewCount : null };

  return (
    <div className="admin-portal flex min-h-screen flex-col bg-[#F4FAFF] text-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-60 focus:rounded-xl focus:bg-[#123B6D] focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lift"
      >
        Skip to main content
      </a>

      {viewAs && (
        <div className="flex items-center justify-between gap-3 bg-[#123B6D] px-4 py-2 text-sm font-medium text-white shadow-[0_1px_4px_rgba(18,59,109,0.15)]">
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
        {/* Solid white, no backdrop-blur. It was bg-[#F0F4F1]/90 with a
            backdrop blur — translucency over nothing, which forces a
            compositing layer that can soften the text inside it. */}
        <aside
          className={`sticky top-0 hidden h-screen shrink-0 self-start flex-col border-r border-[#DCEAF5] bg-white transition-[width] duration-200 lg:flex ${
            collapsed ? "w-[4.5rem]" : "w-[255px]"
          }`}
        >
          <SidebarContent
            collapsed={collapsed}
            onToggleCollapse={toggleCollapsed}
            counts={counts}
          />
        </aside>

        {/* Mobile drawer */}
        <Modal
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          placement="left"
          label="Navigation menu"
          panelClassName="w-72 border-r border-hairline bg-white"
        >
          <button
            className="tap-target absolute right-3 top-4 inline-flex items-center justify-center rounded-lg text-[#55708F] hover:bg-[#EAF5FF] hover:text-[#123B6D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#123B6D]"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} counts={counts} />
        </Modal>

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNav onMenuClick={() => setMobileOpen(true)} onOpenSearch={() => setCommandOpen(true)} />
          <main
            key={pathname}
            ref={mainRef}
            id="main-content"
            tabIndex={-1}
            className="min-w-0 flex-1 bg-[#F4FAFF] px-4 py-6 focus:outline-none sm:px-6 lg:px-8"
          >
            {children}
          </main>
        </div>
      </div>

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} groups={paletteGroups} />
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
