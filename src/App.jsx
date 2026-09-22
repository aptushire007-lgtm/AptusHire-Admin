import { lazy, Suspense } from "react";
import { Routes, Route, Outlet, useLocation, useParams, Navigate } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import DashboardShell from "./components/dashboard/DashboardShell.jsx";
import RequireAdmin from "./auth/RequireAdmin.jsx";
import RequirePlatform from "./auth/RequirePlatform.jsx";
import { useAdminAuth } from "./auth/useAdminAuth.js";
import SmoothScroll from "./motion/SmoothScroll.jsx";

// Every page used to be a static import, so one 863 kB chunk had to arrive
// before anything rendered: a recruiter opening their queue downloaded the
// marketing site, the superadmin console, the rubric and paper editors and the
// interview report first. Only the two entry points stay eager — Landing (the
// signed-out "/") and Login — because a Suspense flash on the first paint of an
// entry point is a worse trade than the extra request. Everything else is
// fetched when its route is actually visited.
const Demo = lazy(() => import("./pages/Demo.jsx"));
const Pricing = lazy(() => import("./pages/Pricing.jsx"));
const RegisterCompany = lazy(() => import("./pages/RegisterCompany.jsx"));
const VerifyCompanyOtp = lazy(() => import("./pages/VerifyCompanyOtp.jsx"));
const Checkout = lazy(() => import("./pages/Checkout.jsx"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess.jsx"));
const PaymentFailed = lazy(() => import("./pages/PaymentFailed.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));

const JobList = lazy(() => import("./pages/JobList.jsx"));
const JobWorkspace = lazy(() => import("./pages/JobWorkspace.jsx"));
const CandidateInterviewModal = lazy(() => import("./components/candidate/CandidateInterviewModal.jsx"));
const AssessmentReport = lazy(() => import("./pages/AssessmentReport.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome.jsx"));
const CandidatesAll = lazy(() => import("./pages/dashboard/CandidatesAll.jsx"));
const HiringPipeline = lazy(() => import("./pages/dashboard/HiringPipeline.jsx"));
const AIInterviews = lazy(() => import("./pages/dashboard/AIInterviews.jsx"));
const Reports = lazy(() => import("./pages/dashboard/Reports.jsx"));
const SubscriptionPage = lazy(() => import("./pages/dashboard/SubscriptionPage.jsx"));
const Notifications = lazy(() => import("./pages/dashboard/Notifications.jsx"));
const SettingsPage = lazy(() => import("./pages/dashboard/SettingsPage.jsx"));
const AssessmentsHub = lazy(() => import("./pages/dashboard/AssessmentsHub.jsx"));
const ScoreExplanation = lazy(() => import("./pages/dashboard/ScoreExplanation.jsx"));
const ReviewQueue = lazy(() => import("./pages/dashboard/ReviewQueue.jsx"));
const Recordings = lazy(() => import("./pages/dashboard/Recordings.jsx"));

const PlatformConsole = lazy(() => import("./pages/platform/PlatformConsole.jsx"));

// A spinner announces "something is happening"; this announces the shape of
// what is arriving, which is the difference between a wait that feels like a
// stall and one that feels like a page.
function RouteFallback() {
  return (
    <div role="status" aria-label="Loading page" className="mx-auto w-full max-w-5xl px-4 py-10">
      <div aria-hidden="true">
        <div className="h-7 w-56 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-3 h-4 w-80 animate-pulse rounded bg-slate-200/70" />
        <div className="mt-8 h-64 w-full animate-pulse rounded-2xl bg-slate-200/60" />
      </div>
    </div>
  );
}

// Phase 13 fix: the dashboard shell is now ONE layout route. Previously "/"
// rendered its own <DashboardShell> while "/*" rendered a second one, so
// navigating "/" ⇄ "/jobs" unmounted the whole shell — re-running the company
// data fan-out and reconnecting the socket on every hop. With a single layout
// route the shell (and its providers) mounts once; only the <Outlet/> swaps.
function ShellLayout() {
  const { isAuthenticated } = useAdminAuth();
  const location = useLocation();
  // Unauthenticated visitors landing on the bare domain see the marketing page,
  // not a login redirect. Deeper paths still go through RequireAdmin → /login.
  if (!isAuthenticated && location.pathname === "/") return <Landing />;
  return (
    <RequireAdmin>
      <DashboardShell>
        {/* Inside the shell, so a route chunk arriving late swaps only the page
            body — the sidebar, header and notification socket stay put. */}
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </DashboardShell>
    </RequireAdmin>
  );
}

function JobRouteRedirect({ tab, edit }) {
  const { id } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  if (id) searchParams.set("jobId", id);
  if (tab) searchParams.set("tab", tab);
  if (edit) searchParams.set("edit", "1");
  return <Navigate to={`/jobs?${searchParams.toString()}`} replace />;
}

// Every older job URL — /jobs/:id/rubric, /questions, /post, /evaluation … —
// now lands on the matching section of the job's workspace, so links in old
// emails, notifications and bookmarks keep working.
function JobSectionRedirect({ section }) {
  const { id } = useParams();
  return <Navigate to={`/jobs/${id}/${section}`} replace />;
}

function CandidateRouteRedirect() {
  const { id } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const section = searchParams.get("section");

  let tab = "summary";
  if (section === "resume" || section === "profile-cv") tab = "profile-cv";
  else if (section === "skill-assessment" || section === "assessments") tab = "assessments";
  else if (section === "ai-interview") tab = "ai-interview";
  else if (section === "timeline" || section === "activity") tab = "activity";
  else if (section === "overview") tab = "summary";
  else if (searchParams.get("tab")) tab = searchParams.get("tab");

  const nextParams = new URLSearchParams();
  if (id) nextParams.set("candidateId", id);
  if (tab && tab !== "summary") nextParams.set("tab", tab);

  return <Navigate to={`/candidates?${nextParams.toString()}`} replace />;
}

export default function App() {
  // Smooth scroll is scoped to the marketing surface; "/" only counts as
  // marketing while signed out, since it renders the dashboard otherwise.
  const { isAuthenticated } = useAdminAuth();

  return (
    <>
      <SmoothScroll allowRoot={!isAuthenticated} />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/welcome" element={<Landing />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/register-company" element={<RegisterCompany />} />
          <Route path="/verify-otp" element={<VerifyCompanyOtp />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-failed" element={<PaymentFailed />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          {/* Phase 16 — platform console (superadmin only; a distinct top-level
              route so it never nests inside the tenant dashboard shell). */}
          <Route
            path="/platform"
            element={
              <RequirePlatform>
                <PlatformConsole />
              </RequirePlatform>
            }
          />
          <Route path="/" element={<ShellLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="jobs" element={<JobList />} />
            <Route path="jobs/new" element={<Navigate to="/jobs?create=1" replace />} />
            <Route path="jobs/setup/:draftId" element={<Navigate to="/jobs?create=1" replace />} />
            {/* ── A job's own workspace ────────────────────────────────────
                Opening a job swaps the sidebar for that job's navigation (see
                JobSidebar.jsx). A job opens on its board, because the first
                thing a recruiter wants from a role is where its candidates
                stand. Every section has a real URL: refreshable, bookmarkable,
                shareable with a colleague. */}
            <Route path="jobs/:id" element={<JobSectionRedirect section="pipeline" />} />
            <Route path="jobs/:id/pipeline" element={<HiringPipeline />} />
            <Route path="jobs/:id/candidates" element={<HiringPipeline />} />
            <Route path="jobs/:id/:section" element={<JobWorkspace />} />
            {/* Older URLs, from before the workspace. */}
            <Route path="jobs/:id/evaluation" element={<JobSectionRedirect section="cv-screening" />} />
            <Route path="jobs/:id/rubric" element={<JobSectionRedirect section="cv-screening" />} />
            <Route path="jobs/:id/questions" element={<JobSectionRedirect section="ai-interview" />} />
            <Route path="jobs/:id/assessments" element={<JobSectionRedirect section="assessment" />} />
            <Route path="jobs/:id/post" element={<JobSectionRedirect section="details" />} />
            <Route path="jobs/:id/journey" element={<JobSectionRedirect section="details" />} />
            <Route path="jobs/:id/edit" element={<JobRouteRedirect edit={true} />} />
            <Route path="candidates" element={<CandidatesAll />} />
            <Route path="pipeline" element={<HiringPipeline />} />
            <Route path="candidates/:id" element={<CandidateRouteRedirect />} />
            <Route path="candidates/:id/score" element={<ScoreExplanation />} />
            <Route path="candidates/:id/interview-report" element={<CandidateInterviewModal />} />
            <Route path="candidates/:id/assessment-report" element={<AssessmentReport />} />
            <Route path="review-queue" element={<ReviewQueue />} />
            <Route path="recordings" element={<Recordings />} />
            <Route path="ai-interviews" element={<AIInterviews />} />
            <Route path="assessments" element={<AssessmentsHub />} />
            <Route path="reports" element={<Reports />} />
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
