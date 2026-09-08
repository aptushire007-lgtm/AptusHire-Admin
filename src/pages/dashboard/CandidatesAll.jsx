import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Users, Search, AlertTriangle } from "lucide-react";
import { useCompanyData } from "../../context/CompanyDataContext.jsx";
import { Card, Badge, Avatar, Skeleton, EmptyState } from "../../components/ui/Card.jsx";
import { RecordRow, RecordList, Chip, ChipRow } from "../../components/ui/Panels.jsx";
import { Input, Select } from "../../components/ui/Field.jsx";
import { ALL_STAGES, stageLabel, stageTone, normalizeStage } from "../../lib/pipeline.js";

// Why an application left the active pipeline without a reject decision (Phase 17).
const PIPELINE_EXIT_LABELS = {
  hired_for_other_role: "Hired elsewhere",
  job_filled: "Role filled",
  job_closed: "Role closed",
  job_deleted: "Role deleted",
};

export default function CandidatesAll() {
  const { allCandidates, loading, loadError } = useCompanyData();
  const [search, setSearch] = useState("");
  const [searchParams] = useSearchParams();
  // Seeds the filter from `?stage=` so Reports' funnel rows can drill straight
  // into "who's actually in this stage" instead of landing on the unfiltered
  // list. Only read once on mount, same as `search` — this is an entry point,
  // not a two-way-bound URL, so editing the filter afterward doesn't rewrite
  // the address bar underneath the recruiter.
  const [stageFilter, setStageFilter] = useState(() => {
    const fromUrl = searchParams.get("stage");
    if (!fromUrl) return "all";
    const normalized = normalizeStage(fromUrl);
    return ALL_STAGES.includes(normalized) ? normalized : "all";
  });

  const filtered = allCandidates
    .filter((c) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q || c.basicDetails?.name?.toLowerCase().includes(q) || c.basicDetails?.email?.toLowerCase().includes(q);
      const matchesStage = stageFilter === "all" || normalizeStage(c.status) === stageFilter;
      return matchesSearch && matchesStage;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Multi-role (Phase 17): each row above is one APPLICATION. Collapse a
  // person's applications into ONE row so the same candidate who applied for
  // three roles is not listed as three unrelated people. Identity key is the
  // stable account id (`candidateUser`), falling back to the lowercased email
  // for applications that predate that field, then the doc id. `filtered` is
  // already newest-first, so the first application seen per person is their
  // latest — that drives the row's headline role/status.
  const groups = [];
  const groupIndex = new Map();
  for (const c of filtered) {
    const key = String(c.candidateUser || c.basicDetails?.email?.toLowerCase() || c._id);
    let g = groupIndex.get(key);
    if (!g) {
      g = { key, latest: c, applications: [] };
      groupIndex.set(key, g);
      groups.push(g);
    }
    g.applications.push(c);
  }
  const totalPeople = new Set(
    allCandidates.map((c) => String(c.candidateUser || c.basicDetails?.email?.toLowerCase() || c._id))
  ).size;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17221C] [overflow-wrap:anywhere]">Candidates</h1>
          <p className="mt-1 text-sm text-[#64736A]">
            Every applicant across every role — filter down to who&rsquo;s ready for a shortlist.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          {/* Explicit widths, not `w-full max-w-xs` beside a `w-auto` select. A
              percentage-width child inside a shrink-to-fit flex row resolves
              against a width that row has not settled yet, so the pair broke
              onto two lines and the native <select> — sized by its longest
              option, "AI Interview Completed" — stretched across the second
              one. Two fields of stated width sit on one line. */}
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64736A]" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" className="pl-9" />
          </div>
          <Select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="w-full sm:w-56">
            <option value="all">All stages</option>
            {ALL_STAGES.map((s) => (
              <option key={s} value={s}>
                {stageLabel(s)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Quick filter — the full stage list stays in the <Select> above for
          exhaustive control; these four are the states a recruiter actually
          narrows to on the way to a shortlist, one click instead of a
          fifteen-option dropdown. Purely a shortcut onto the same
          `stageFilter` state, so it can never drift from what the select
          already does. */}
      <ChipRow label="Quick filter">
        <Chip active={stageFilter === "all"} onClick={() => setStageFilter("all")}>
          All candidates
        </Chip>
        <Chip active={stageFilter === "ats_passed"} onClick={() => setStageFilter("ats_passed")}>
          Passed ATS
        </Chip>
        <Chip active={stageFilter === "ai_interview_completed"} onClick={() => setStageFilter("ai_interview_completed")}>
          Interview done
        </Chip>
        <Chip active={stageFilter === "shortlisted"} onClick={() => setStageFilter("shortlisted")}>
          Shortlisted
        </Chip>
      </ChipRow>

      {loading ? (
        <Card padding="none" className="divide-y divide-[#E5EBE7] overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-4 py-3">
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </Card>
      ) : loadError ? (
        <EmptyState icon={AlertTriangle} title="Could not load candidates" description={loadError} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No candidates found" description="Applicants will appear here once they apply to your jobs." />
      ) : (
        <>
          <p className="text-xs text-[#64736A]">
            {groups.length} of {totalPeople} candidate{totalPeople === 1 ? "" : "s"}
            {filtered.length !== groups.length ? ` · ${filtered.length} applications` : ""}
          </p>
          <RecordList label="All candidates">
            {groups.map(({ key, latest: c, applications }) => (
              <RecordRow
                key={key}
                avatar={<Avatar name={c.basicDetails?.name} size="sm" />}
                title={c.basicDetails?.name || "Unnamed applicant"}
                subtitle={
                  applications.length > 1
                    ? `${applications.length} applications · Latest: ${c.job?.title || "No job on record"}`
                    : c.job?.title || "No job on record"
                }
                link={{ as: Link, to: `/candidates/${c._id}` }}
                meta={[
                  { label: applications.length > 1 ? "Latest applied" : "Applied", value: new Date(c.createdAt).toLocaleDateString() },
                  // What produced the number, as its own column. `engine !==
                  // "evidence"` means this job has no approved rubric and the
                  // legacy keyword matcher carried the decision.
                  {
                    label: "Scored by",
                    value: c.ats?.overallScore == null ? null : c.ats.engine === "evidence" ? "Evidence engine" : "Keyword match",
                  },
                ]}
                trailing={
                  <>
                    {/* The score is the headline figure, so it sits where the
                        eye lands first — but it stays a <Badge>, never a fill.
                        The Reserved Verdict Rule holds: green here means the
                        engine's own pass decision, not "good candidate". */}
                    {/* The score gets its own right-aligned sub-column so the
                        digits line up down the list and the stage pill next to
                        it starts at a constant x. `min-w` rather than `w`: an
                        unscored row says so in words, and a fixed track would
                        clip the sentence to make a number fit. */}
                    <span className="flex justify-end xl:min-w-24">
                      {c.ats?.overallScore != null ? (
                        <Badge
                          tone={c.ats.decision === "pass" ? "green" : c.ats.decision === "fail" ? "red" : "slate"}
                          className="tabular-nums"
                        >
                          {c.ats.overallScore}%
                        </Badge>
                      ) : (
                        <Badge tone="slate">Not scored</Badge>
                      )}
                    </span>
                    {c.pipelineExit?.at ? (
                      <Badge tone="slate">
                        {PIPELINE_EXIT_LABELS[c.pipelineExit.reason] || "Left pipeline"}
                      </Badge>
                    ) : (
                      <Badge tone={stageTone(c.status)}>{stageLabel(c.status)}</Badge>
                    )}
                  </>
                }
                note={
                  // Below `xl` the "Scored by" column is dropped, and a legacy
                  // score must not silently lose its caveat with it — that is
                  // the one thing the Honest Reading Rule will not absorb. On a
                  // narrow viewport it comes back as a sentence. This `xl` must
                  // track <RecordRow>'s meta breakpoint exactly: raise one
                  // without the other and there is a window where the caveat is
                  // in neither place.
                  c.ats?.overallScore != null && c.ats.engine !== "evidence" ? (
                    <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 xl:hidden">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      Legacy keyword match — rubric not approved
                    </span>
                  ) : null
                }
              />
            ))}
          </RecordList>
        </>
      )}
    </div>
  );
}
