import { Link, useLocation } from "react-router-dom";
import { candidateHref } from "../../lib/candidateJourney.js";

export default function CandidateLink({ candidateId, reviewIds, asDrawer = false, tab, onClick, ...props }) {
  const location = useLocation();
  if (asDrawer) {
    const searchParams = new URLSearchParams(location.search);
    if (candidateId) {
      searchParams.set("candidateId", candidateId);
      if (tab && tab !== "summary") searchParams.set("tab", tab);
    }
    return (
      <Link
        {...props}
        onClick={onClick}
        state={reviewIds ? { reviewIds } : location.state}
        to={{ pathname: location.pathname, search: searchParams.toString() }}
      />
    );
  }
  return <Link {...props} onClick={onClick} state={reviewIds ? { reviewIds } : location.state} to={candidateHref(candidateId, location)} />;
}
