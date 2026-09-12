import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Briefcase, Search, Users, X } from "lucide-react";
import { useCompanyData } from "../../context/CompanyDataContext.jsx";
import Modal from "../ui/Modal.jsx";

/** Navigation and loaded jobs only; candidate queries use the existing paginated search. */
export default function CommandPalette({ open, onClose, groups }) {
  const { jobs, loading, loadError } = useCompanyData();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const optionsRef = useRef(null);
  useEffect(() => { if (open) { setQuery(""); setActive(0); } }, [open]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pages = groups.flatMap(group => group.items.map(item => ({ ...item, context: group.label })))
      .filter(item => `${item.label} ${item.context}`.toLowerCase().includes(q));
    const matchingJobs = q && !loading && !loadError ? jobs.filter(job => `${job.title} ${job.department || ""}`.toLowerCase().includes(q)).slice(0, 6)
      .map(job => ({ to: `/jobs/${job._id}/candidates`, label: job.title, context: `Job · ${job.department || "Applicants"}`, icon: Briefcase })) : [];
    const candidateSearch = q ? [{ to: `/candidates?q=${encodeURIComponent(query.trim())}`, label: `Search candidates for “${query.trim()}”`, context: "Name or email", icon: Users }] : [];
    return [...pages, ...matchingJobs, ...candidateSearch];
  }, [query, groups, jobs, loading, loadError]);
  const selected = Math.min(active, Math.max(0, results.length - 1));
  useEffect(() => { optionsRef.current?.children[selected]?.scrollIntoView?.({ block: "nearest" }); }, [selected]);
  const choose = (item) => { if (!item) return; onClose(); navigate(item.to); };
  return <Modal open={open} onClose={onClose} label="Search workspace" size="xl" panelClassName="admin-workspace command-palette">
    <div className="flex items-center gap-3 border-b border-hairline px-4 py-3">
      <Search className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
      <input role="combobox" aria-label="Search pages, jobs or candidates" aria-expanded="true" aria-autocomplete="list" aria-controls={listId}
        aria-activedescendant={results.length ? `${listId}-${selected}` : undefined}
        value={query} onChange={event => { setQuery(event.target.value); setActive(0); }}
        onKeyDown={event => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setActive((selected + (event.key === "ArrowDown" ? 1 : -1) + results.length) % (results.length || 1));
          }
          if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); choose(results[selected]); }
        }}
        placeholder="Find a page, job or candidate…" className="min-w-0 flex-1 bg-transparent py-2 text-sm text-slate-900 outline-none" />
      <button type="button" onClick={onClose} aria-label="Close search" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
    </div>
    <p className="px-4 pb-1 pt-3 text-xs text-slate-500">{query.trim() ? "Matching pages and workspace jobs" : "Go to a page"}</p>
    <ul id={listId} ref={optionsRef} role="listbox" aria-label="Search results" className="max-h-[50vh] overflow-y-auto p-2">
      {results.map((item, index) => <li key={item.to} id={`${listId}-${index}`} role="option" aria-selected={index === selected}
        onMouseMove={() => setActive(index)} onMouseDown={event => event.preventDefault()} onClick={() => choose(item)}
        className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 ${index === selected ? "bg-canvas-deep text-brand-800" : "text-slate-700"}`}>
        <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.label}</span><span className="text-xs text-slate-500">{item.context}</span></span><ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
      </li>)}
    </ul>
    {query.trim() && (loading || loadError) && <p role="status" className="px-4 py-2 text-xs text-slate-500">{loading ? "Workspace jobs are loading." : "Jobs could not be loaded. Page navigation and candidate search are available."}</p>}
    <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-hairline px-4 py-3 text-xs text-slate-500"><span>↑ ↓ to navigate</span><span>Enter to open</span><span>Esc to close</span></div>
  </Modal>;
}
