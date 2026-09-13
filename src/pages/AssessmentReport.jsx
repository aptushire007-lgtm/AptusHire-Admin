import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import api from "../api/client.js";
import { Card, Skeleton, EmptyState } from "../components/ui/Card.jsx";
import ReportBreadcrumb from "../components/report/ReportBreadcrumb.jsx";
import AssessmentCard from "../components/report/AssessmentCard.jsx";

/**
 * The skills assessment, as its own report — segregated from ATS Evaluation
 * and the AI Report the same way those two are segregated from each other,
 * rather than living as a subsection buried inside the AI interview record.
 */
export default function AssessmentReport() {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [criterionLabels, setCriterionLabels] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get(`/candidates/${id}`),
      api.get(`/assessments/candidate/${id}`),
      // Best-effort — criterion labels come from the same rubric coverage the
      // AI Report reads. A candidate with no interview yet simply shows raw
      // criterion ids instead of failing the whole page over it.
      api.get(`/candidates/${id}/interview-report`).catch(() => ({ data: null })),
    ])
      .then(([cRes, aRes, rRes]) => {
        if (!alive) return;
        setCandidate(cRes.data);
        setAssessment(aRes.data);
        setCriterionLabels(
          Object.fromEntries((rRes.data?.coverage?.rows || []).map((r) => [r.criterionId, r.label]))
        );
      })
      .catch((err) => alive && setError(err.response?.data?.error || "Could not load the assessment"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="space-y-4">
        <Card>
          <EmptyState icon={ClipboardCheck} title="Could not load this assessment" description={error} />
        </Card>
      </div>
    );
  }

  const hasAssessment = Boolean(assessment?.session || assessment?.decision);

  return (
    <div className="space-y-6">
      <ReportBreadcrumb candidateId={id} candidateName={candidate.basicDetails?.name} title="Assessment" />

      {hasAssessment ? (
        <AssessmentCard assessment={assessment} criterionLabels={criterionLabels} />
      ) : (
        <Card>
          <EmptyState
            icon={ClipboardCheck}
            title="No assessment yet"
            description="This candidate has not been sent — or skipped past — a skills assessment."
          />
        </Card>
      )}
    </div>
  );
}
