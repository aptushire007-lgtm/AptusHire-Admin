import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/**
 * The report's sticky trail.
 *
 * It replaces a single "← Back to candidate" link that scrolled away with the
 * rest of the page. On a report this long that link was the only thing telling
 * you whose report you were reading, and it was off-screen for most of the
 * reading — a recruiter comparing two candidates in two tabs had nothing on
 * screen to tell them apart below the fold.
 *
 * THE FILL IS BRAND, NOT BLACK. The reference deck runs this bar on near-black.
 * This system has no black surface (DESIGN.md § Neutral), and `brand-800` —
 * Aptus Forest, a literal anchor of the mark — is the darkest chrome the palette
 * owns. White on `brand-800` measures 12.47:1, so the trail can carry small text
 * at full weight; the trailing timestamp drops to white/70 (still 8.7:1) because
 * it is metadata, not a link.
 *
 * `top-16` clears the shell's own sticky header (`DashboardShell.jsx:94`, h-16).
 * The two stack rather than overlap, which is why this carries a lower z-index
 * than the header does.
 */
export default function ReportBreadcrumb({ candidateId, candidateName, title, at, trailing }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="sticky top-16 z-20 -mx-4 flex h-11 items-center gap-2 bg-brand-800 px-4 text-sm text-white sm:-mx-6 sm:px-6"
    >
      <ol className="flex min-w-0 flex-1 items-center gap-2">
        <li className="shrink-0">
          <Link
            to="/candidates"
            className="font-medium text-white/80 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Candidates
          </Link>
        </li>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/50" aria-hidden="true" />
        <li className="shrink-0">
          <Link
            to={`/candidates/${candidateId}`}
            className="font-medium text-white/80 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {candidateName || "Candidate"}
          </Link>
        </li>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/50" aria-hidden="true" />
        <li aria-current="page" className="min-w-0 truncate font-semibold text-white">
          {title}
        </li>
        {at && (
          <li className="hidden shrink-0 text-xs text-white/70 sm:block">
            <span aria-hidden="true" className="mr-2 text-white/40">
              ·
            </span>
            {at}
          </li>
        )}
      </ol>
      {trailing}
    </nav>
  );
}
