import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Briefcase } from "lucide-react";
import api from "../api/client.js";
import { useCompanyData } from "../context/CompanyDataContext.jsx";
import JobInspectionDrawer from "../components/jobs/JobInspectionDrawer.jsx";
import { SECTION_TO_TAB, TAB_TO_SECTION, JOB_SECTIONS } from "../components/dashboard/JobSidebar.jsx";
import { EmptyState, Skeleton } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";

/**
 * One section of a job's workspace — details, CV screening, skills assessment,
 * AI interview or activity. (Pipeline and All candidates are the board, see
 * HiringPipeline.jsx.)
 *
 * It renders the existing job editor as a page rather than a dialog, so there
 * is exactly one implementation of every job setting, reached two ways.
 *
 * CANDIDATES ARE LOADED HERE, for this job only. The shell mounts its workspace
 * data with `includeCandidates={false}` on purpose (loading every candidate on
 * every screen is the cost it avoids), so its `candidatesByJob` holds an EMPTY
 * list for every job. Feeding that to the editor — which is what the jobs list
 * did — made every job read "Candidates (0)" and "0 applicants enrolled" no
 * matter how many had applied. One scoped request gives the real list; until it
 * lands, the page shows a skeleton instead of rendering the editor with an empty
 * list it would count as 0. If the request FAILS the editor still renders —
 * the job's settings are worth reaching regardless — but under a stated
 * warning that its candidate figures are incomplete, never silently.
 */
export default function JobWorkspace() {
  const { id, section } = useParams();
  const navigate = useNavigate();
  const { jobs, loading: workspaceLoading, refresh } = useCompanyData();
  const job = jobs.find((j) => j._id === id) || null;
  const sectionMeta = JOB_SECTIONS.find((s) => s.key === section);

  const [candidates, setCandidates] = useState(null);
  const [candidatesFailed, setCandidatesFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setCandidates(null);
    setCandidatesFailed(false);
    api
      .get("/candidates", { params: { jobId: id, limit: 200 } })
      .then(({ data }) => alive && setCandidates(data.items || []))
      .catch(() => {
        if (!alive) return;
        setCandidatesFailed(true);
        setCandidates([]);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (!job || candidates === null) {
    if (workspaceLoading || (job && candidates === null)) {
      return (
        <div role="status" aria-label="Loading job" className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      );
    }
    return (
      <EmptyState
        icon={Briefcase}
        title="This job could not be found"
        description="It may have been deleted, or it belongs to another workspace."
        action={
          <Button as={Link} to="/jobs" size="sm">
            Back to all jobs
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {candidatesFailed && (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This job&rsquo;s candidates could not be loaded, so applicant counts below are incomplete. Its settings
          are unaffected.
        </p>
      )}
      <JobInspectionDrawer
        variant="page"
        job={job}
        initialTab={SECTION_TO_TAB[section] || "overview"}
        // Titled by section, as the sidebar names it — the job's own title is
        // already in the sidebar beside it.
        pageTitle={sectionMeta?.title || sectionMeta?.label}
        candidates={candidates || []}
        // Internal "go to X" jumps become navigation, so the URL and the sidebar
        // stay the single source of truth for where the recruiter is.
        onNavigateTab={(tab) => navigate(`/jobs/${id}/${TAB_TO_SECTION[tab] || "details"}`)}
        onClose={() => navigate("/jobs")}
        onJobUpdated={() => refresh()}
        onJobDeleted={() => {
          refresh();
          navigate("/jobs", { replace: true });
        }}
      />
    </div>
  );
}
