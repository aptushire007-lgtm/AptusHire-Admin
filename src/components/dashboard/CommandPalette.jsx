import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import Modal from "../ui/Modal.jsx";

export default function CommandPalette({ open, onClose, groups = [] }) {
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return groups;

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(normalizedQuery)),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, query]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      label="Search workspace"
      panelClassName="max-w-2xl overflow-hidden p-0"
      className="items-start pt-[12vh]"
    >
      <label className="flex items-center gap-3 border-b border-[#D8E5F1] px-5 py-4">
        <Search className="h-5 w-5 shrink-0 text-[#7FA8C8]" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search workspace…"
          aria-label="Search workspace"
          className="w-full bg-transparent text-sm text-[#123B6D] outline-none placeholder:text-[#7FA8C8]"
        />
        <kbd className="shrink-0 rounded border border-[#D8E5F1] px-2 py-1 text-[10px] font-semibold text-[#7FA8C8]">
          ESC
        </kbd>
      </label>
      <div className="max-h-[60vh] overflow-y-auto p-3">
        {filteredGroups.length ? (
          filteredGroups.map((group) => (
            <section key={group.label} className="mb-3 last:mb-0">
              <h2 className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#7FA8C8]">
                {group.label}
              </h2>
              <div className="space-y-1">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <button
                    key={to}
                    type="button"
                    onClick={() => {
                      onClose?.();
                      navigate(to);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#2E5070] transition-colors hover:bg-[#EAF3FB] hover:text-[#123B6D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F9CF4]"
                  >
                    {Icon && <Icon className="h-4 w-4 text-[#7FA8C8]" aria-hidden="true" />}
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </section>
          ))
        ) : (
          <p className="px-3 py-8 text-center text-sm text-[#7FA8C8]">No matching pages</p>
        )}
      </div>
    </Modal>
  );
}
