import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Users, Pencil, Trash2, UploadCloud, Briefcase, Link2, Globe2, Search } from "lucide-react";
import api from "../api/client.js";
import { useToast } from "../components/ui/Toast.jsx";
import { Card, Badge, Skeleton, EmptyState } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import { RecordGrid, RecordList, RecordRow } from "../components/ui/Panels.jsx";
import { RowAction } from "../components/ui/DataTable.jsx";
import { Input, Select } from "../components/ui/Field.jsx";

const CANDIDATE_PORTAL_URL = import.meta.env.VITE_CANDIDATE_PORTAL_URL || "http://localhost:5174";

// Phase 15.1 — every shared apply link carries its source, so the funnel can
// report per-source quality (pass rate, claim-verification rate) later.
const LINK_SOURCES = [
  { key: "careers", label: "Careers page" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "naukri", label: "Naukri" },
  { key: "referral", label: "Referral" },
  { key: "other", label: "Other" },
];

function buildApplyUrl(job, src) {
  const base = `${CANDIDATE_PORTAL_URL}/jobs/${job.slug || job._id}`;
  return src ? `${base}?src=${encodeURIComponent(src)}` : base;
}

const PUB_STATUS_TONE = { published: "green", pending: "amber", failed: "red", expired: "slate", withdrawn: "slate" };

// Every candidate for a job with no approved rubric is silently scored by the
// legacy keyword engine (services/evidenceAtsService.js requires a human-
// approved rubric before the evidence engine can drive a decision). Surfacing
// that state here — before candidates ever pile up — is the fix: the gate
// stays human-only, but a recruiter can no longer fail to notice it's open.
const RUBRIC_STATUS_META = {
  approved: { tone: "green", label: "Rubric approved" },
  draft: { tone: "amber", label: "Rubric needs approval" },
  archived: { tone: "amber", label: "Rubric needs approval" },
  none: { tone: "slate", label: "No rubric yet" },
};

// Phase 15.7 — per-board publish panel. One action publishes to N boards;
// per-board status/failure is visible per board, never silent.
function PublishBoardsModal({ job, onClose }) {
  const toast = useToast();
  const [boards, setBoards] = useState(null);
  const [selected, setSelected] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/jobs/${job._id}/publications`);
      setBoards(res.data.boards);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not load board status");
    }
  }, [job._id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function publishSelected() {
    const chosen = Object.keys(selected).filter((k) => selected[k]);
    if (!chosen.length) return;
    setBusy(true);
    try {
      await api.post(`/jobs/${job._id}/publish-boards`, { boards: chosen });
      toast.success("Publishing dispatched — statuses update per board");
      setSelected({});
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not publish");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw(board) {
    setBusy(true);
    try {
      await api.post(`/jobs/${job._id}/withdraw-board`, { board });
      toast.success(`Withdrawn from ${board}`);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not withdraw");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Publish "${job.title}" to boards`} size="lg">
      <>
        {!boards ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="space-y-2.5">
            {boards.map((b) => {
              const blocked =
                !b.enabled || (b.needsCredential && !b.credentialConfigured) || b.validationErrors.length > 0;
              return (
                <div key={b.board} className="rounded-xl border border-[#E5EBE7] bg-[#F1F7F3] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2.5 text-sm font-medium text-[#17221C]">
                      <input
                        type="checkbox"
                        disabled={blocked}
                        checked={!!selected[b.board]}
                        onChange={(e) => setSelected((s) => ({ ...s, [b.board]: e.target.checked }))}
                        className="h-4 w-4 rounded border-[#E5EBE7]-mid text-brand-600"
                      />
                      {b.name}
                      <Badge tone="slate">Tier {b.tier}</Badge>
                    </label>
                    {b.status && <Badge tone={PUB_STATUS_TONE[b.status] || "slate"}>{b.status}</Badge>}
                  </div>
                  {!b.enabled && <p className="mt-1.5 pl-6 text-xs text-amber-600">{b.reason}</p>}
                  {b.enabled && b.needsCredential && !b.credentialConfigured && (
                    <p className="mt-1.5 pl-6 text-xs text-[#64736A]">
                      Connect this board's credentials in Settings → Integrations first.
                    </p>
                  )}
                  {b.validationErrors.map((e) => (
                    <p key={e} className="mt-1.5 pl-6 text-xs text-red-600">{e}</p>
                  ))}
                  {b.error && <p className="mt-1.5 pl-6 text-xs text-red-600">Last attempt: {b.error}</p>}
                  {b.externalUrl && b.status === "published" && (
                    <a href={b.externalUrl} target="_blank" rel="noreferrer" className="mt-1.5 block pl-6 text-xs font-medium text-brand-700 hover:underline">
                      View live listing ↗
                    </a>
                  )}
                  {b.status === "published" && (
                    <button onClick={() => withdraw(b.board)} disabled={busy} className="mt-1.5 pl-6 text-xs font-medium text-[#64736A] hover:text-red-600">
                      Withdraw from this board
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button size="sm" loading={busy} onClick={publishSelected} disabled={!boards || Object.values(selected).every((v) => !v)}>
            Publish Selected
          </Button>
        </div>
      </>
    </Modal>
  );
}

// §1.2 — the full status list stays in the <Select>, not a quick-filter chip row: unlike a
// candidate pipeline, "which jobs are drafts vs published vs closed" is not a screen a recruiter
// narrows on constantly, so a three-option dropdown already covers it without a second control.
const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "closed", label: "Closed" },
];

export default function JobList() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const toast = useToast();

  const loadJobs = useCallback(() => {
    setLoading(true);
    api
      .get("/jobs", { params: { page, limit: 20, search: search || undefined, status: status || undefined } })
      .then((res) => {
        setError("");
        // Legacy shape (bare array) vs the paginated envelope — always the latter here since page
        // is always sent, but this keeps the component correct even if that ever changes.
        if (Array.isArray(res.data)) {
          setJobs(res.data);
          setTotal(res.data.length);
          setTotalPages(1);
        } else {
          setJobs(res.data.items);
          setTotal(res.data.total);
          setTotalPages(res.data.totalPages);
        }
      })
      .catch(() => setError("Failed to load jobs"))
      .finally(() => setLoading(false));
  }, [page, search, status]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  function updateSearch(value) {
    setPage(1);
    setSearch(value);
  }

  function updateStatus(value) {
    setPage(1);
    setStatus(value);
  }

  async function handlePublish(id) {
    try {
      await api.patch(`/jobs/${id}/publish`);
      toast.success("Job published");
      loadJobs();
    } catch (err) {
      toast.error(err.response?.data?.error || "Couldn't publish this job — try again");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this job?")) return;
    try {
      await api.delete(`/jobs/${id}`);
      toast.success("Job deleted");
      loadJobs();
    } catch (err) {
      toast.error(err.response?.data?.error || "Couldn't delete this job — try again");
    }
  }

  const [linkPickerFor, setLinkPickerFor] = useState(null); // job._id with the source picker open
  const [publishModalJob, setPublishModalJob] = useState(null); // job with the boards modal open

  async function handleCopyApplyLink(job, src) {
    setLinkPickerFor(null);
    try {
      await navigator.clipboard.writeText(buildApplyUrl(job, src));
      toast.success(src ? `${src} apply link copied` : "Apply link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="Manage your open roles and track applicants."
        action={
          <Button as={Link} to="/jobs/new" className="whitespace-nowrap">
            <Plus className="h-4 w-4" aria-hidden="true" /> New job
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64736A]" />
          <Input
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="Search by title, department, or location"
            className="pl-9"
          />
        </div>
        <Select value={status} onChange={(e) => updateStatus(e.target.value)} className="w-full sm:w-48">
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {loading ? (
        <RecordGrid>
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} padding="compact">
              <Skeleton className="h-28 w-full" />
            </Card>
          ))}
        </RecordGrid>
      ) : jobs.length === 0 && !search && !status ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs yet"
          description="Create your first job posting to start receiving applications."
          action={
            <Button as={Link} to="/jobs/new">
              <Plus className="h-4 w-4" /> New Job
            </Button>
          }
        />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs match your filters"
          description="Try a different search term, or clear the status filter."
        />
      ) : (
        <RecordList label="Active jobs" className="overflow-visible">
          {jobs.map((job) => {
            const rubric = RUBRIC_STATUS_META[job.rubricStatus] || RUBRIC_STATUS_META.none;
            return (
              <RecordRow
                key={job._id}
                icon={Briefcase}
                title={job.title}
                subtitle={job.department || "No department set"}
                // The card leads to the applicants, not to the edit form: the
                // job exists to collect candidates, and editing is a deliberate
                // act that belongs on its own icon action.
                link={{ as: Link, to: `/jobs/${job._id}/candidates` }}
                meta={[
                  { label: "Posted", value: job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "Not available" },
                  { label: "Location", value: job.location || "Remote" },
                ]}
                trailing={
                  <>
                    <Badge tone={job.status === "published" ? "green" : "amber"}>{job.status}</Badge>
                    <Link
                      to={`/jobs/${job._id}/rubric`}
                      className="relative z-10 inline-flex rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                    >
                      <Badge tone={rubric.tone}>{rubric.label}</Badge>
                    </Link>
                  </>
                }
                note={
                  <span className="inline-flex flex-wrap items-center justify-end gap-x-2 gap-y-1 font-medium text-brand-700">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      {job.filledOpenings || 0}/{job.numberOfOpenings || 1} filled
                    </span>
                    {(job.pendingOffers || 0) > 0 && (
                      <span className="text-[#64736A]">· {job.pendingOffers} offer{job.pendingOffers === 1 ? "" : "s"} pending</span>
                    )}
                  </span>
                }
                actions={
                  // Fixed-width, right-aligned so the meta columns line up row to
                  // row regardless of how many icons a given status shows
                  // (published = 4, draft/closed = 3).
                  <div className="flex items-center justify-end gap-0.5 xl:w-[134px]">
                    <RowAction as={Link} to={`/jobs/${job._id}/edit`} label="Edit job" icon={Pencil} />
                    {job.status === "published" && (
                      <RowAction
                        onClick={() => setPublishModalJob(job)}
                        label="Publish to job boards"
                        icon={Globe2}
                      />
                    )}
                    {job.status === "published" && (
                      <span className="relative">
                        <RowAction
                          onClick={() => setLinkPickerFor(linkPickerFor === job._id ? null : job._id)}
                          label="Copy apply link"
                          icon={Link2}
                          aria-expanded={linkPickerFor === job._id}
                        />
                        {linkPickerFor === job._id && (
                          <span
                            className="absolute right-0 top-9 z-20 w-44 max-w-[calc(100vw-2rem)] rounded-xl border border-[#E5EBE7] bg-[#F1F7F3] py-1.5 shadow-soft"
                            onMouseLeave={() => setLinkPickerFor(null)}
                          >
                            {LINK_SOURCES.map((s) => (
                              <button
                                key={s.key}
                                onClick={() => handleCopyApplyLink(job, s.key)}
                                className="block w-full px-3.5 py-1.5 text-left text-xs font-medium text-[#64736A] hover:bg-[#F8FAF9]"
                              >
                                {s.label} link
                              </button>
                            ))}
                            <button
                              onClick={() => handleCopyApplyLink(job)}
                              className="block w-full border-t border-[#E5EBE7] px-3.5 py-1.5 text-left text-xs text-[#64736A] hover:bg-[#F8FAF9]"
                            >
                              Untagged link
                            </button>
                          </span>
                        )}
                      </span>
                    )}
                    {job.status !== "published" && (
                      // §1.4 — disabled, not just error-on-click, when the rubric isn't approved
                      // yet: the badge below already tells the recruiter why, so the button
                      // shouldn't invite a click that can only fail.
                      <RowAction
                        onClick={() => handlePublish(job._id)}
                        label={job.rubricStatus === "approved" ? "Publish job" : "Approve the rubric before publishing"}
                        icon={UploadCloud}
                        tone="positive"
                        disabled={job.rubricStatus !== "approved"}
                        className={job.rubricStatus !== "approved" ? "cursor-not-allowed opacity-40 hover:bg-transparent" : ""}
                      />
                    )}
                    <RowAction onClick={() => handleDelete(job._id)} label="Delete job" icon={Trash2} tone="danger" />
                  </div>
                }
              />
            );
          })}
        </RecordList>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-[#64736A]">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {publishModalJob && <PublishBoardsModal job={publishModalJob} onClose={() => setPublishModalJob(null)} />}
    </div>
  );
}
