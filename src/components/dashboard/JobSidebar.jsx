import {
  Briefcase,
  FileQuestion,
  ListChecks,
  Scale,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";

export const JOB_SECTIONS = [
  { key: "edit", label: "Job setup", icon: Briefcase, path: "edit" },
  { key: "candidates", label: "Candidates", icon: Users, path: "candidates" },
  { key: "rubric", label: "Screening rubric", icon: Scale, path: "rubric" },
  { key: "questions", label: "Interview questions", icon: FileQuestion, path: "questions" },
  { key: "assessment", label: "Skills assessment", icon: ListChecks, path: "assessment" },
  { key: "assessments", label: "Assessment tracker", icon: ListChecks, path: "assessments" },
];

export function parseJobPath(pathname) {
  const match = pathname.match(/^\/jobs\/([^/]+)(?:\/([^/]+))?\/?$/);
  if (!match || match[1] === "new") return null;

  const section = match[2] || "edit";
  if (!JOB_SECTIONS.some((item) => item.key === section)) return null;
  return { id: match[1], section };
}

export default function JobSidebar({ jobId, section, collapsed = false, onNavigate }) {
  return (
    <nav
      aria-label="Job workspace navigation"
      className={`flex flex-col gap-0.5 overflow-y-auto py-3 ${collapsed ? "px-2" : "px-3"}`}
    >
      <NavLink
        to="/jobs"
        onClick={onNavigate}
        className="mb-3 rounded-xl px-4 py-2 text-sm font-semibold text-[#526B87] hover:bg-[#EAF3FB] hover:text-[#123B6D]"
      >
        {collapsed ? "‹" : "← All jobs"}
      </NavLink>
      {JOB_SECTIONS.map(({ key, label, icon: Icon, path }) => (
        <NavLink
          key={key}
          to={`/jobs/${jobId}/${path}`}
          end
          onClick={onNavigate}
          title={collapsed ? label : undefined}
          aria-label={collapsed ? label : undefined}
          className={({ isActive }) =>
            `flex h-12 items-center gap-4 rounded-xl px-4 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F9CF4] ${
              collapsed ? "justify-center px-3" : ""
            } ${
              isActive || section === key
                ? "bg-[#EAF3FB] text-[#123B6D]"
                : "text-[#526B87] hover:bg-[#EAF3FB] hover:text-[#173B65]"
            }`
          }
        >
          <Icon className="h-[22px] w-[22px] shrink-0" aria-hidden="true" />
          {!collapsed && <span className="min-w-0 truncate">{label}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
