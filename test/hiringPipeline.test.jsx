// The Hiring Pipeline board, rendered.
//
// The arithmetic behind this screen is pinned in pipelineMetrics.test.js. What
// these cover is the thing a unit test cannot: that the board actually PUTS the
// honest reading on screen. The failure this guards against is not a wrong
// number, it is a right number computed and then never shown — or worse, a
// schema-default zero rendered as a score, which is the exact bug the metrics
// module exists to prevent and which would be invisible to a test of the module
// alone.
//
// jsdom has no layout, so nothing here asserts pixels. Every assertion is on
// text a recruiter would read.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockData = vi.hoisted(() => ({ current: null }));

vi.mock("../src/lib/usePipelineData.js", async () => {
  const { pipelineKpis, scoreOf } = await import("../src/lib/pipelineMetrics.js");
  const { normalizeStage } = await import("../src/lib/pipeline.js");
  return { usePipelineData: ({ job, q }) => {
    const all = mockData.current.allCandidates;
    const active = all.filter(c => c.job && !c.pipelineExit?.at && !["closed", "filled", "archived"].includes(c.job.status));
    const items = active.filter(c => (job === "all" || c.job._id === job) && [c.basicDetails?.name, c.job.title, ...(c.skills || []), scoreOf(c)].join(" ").toLowerCase().includes(q.toLowerCase()));
    const stages = {};
    items.forEach(c => { const stage = normalizeStage(c.status); stages[stage] = (stages[stage] || 0) + 1; });
    return { loading: false, refresh: vi.fn(), data: { items, stages, kpis: pipelineKpis(items), historicalCount: all.length - active.length, countsByJob: {}, activeTotal: active.length, applicationTotal: all.length, total: items.length, page: 1, pages: 1 } };
  } };
});

vi.mock("../src/api/client.js", () => ({ default: { patch: vi.fn(), get: vi.fn() } }));
vi.mock("../src/components/ui/Toast.jsx", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));
vi.mock("../src/context/CompanyDataContext.jsx", () => ({
  useCompanyData: () => mockData.current,
}));

const { default: HiringPipeline } = await import("../src/pages/dashboard/HiringPipeline.jsx");

const DAY = 86_400_000;
const ago = (days) => new Date(Date.now() - days * DAY).toISOString();

const JOB = { _id: "job1", title: "AI Engineer", department: "Engineering", status: "published" };

function setData(candidates, overrides = {}) {
  mockData.current = {
    allCandidates: candidates,
    jobs: [JOB],
    loading: false,
    refresh: vi.fn(),
    ...overrides,
  };
}

function renderBoard(entry = "/pipeline") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <HiringPipeline />
    </MemoryRouter>
  );
}

it("lets wrapped controls grow the page instead of collapsing the candidate viewport", () => {
  setData([scored]);
  const { container } = renderBoard("/pipeline?q=Sankalp");
  expect(container.firstElementChild.className).toContain("min-h-[calc(100vh-57px)]");
  expect(container.firstElementChild.className.split(" ")).not.toContain("overflow-hidden");
  expect(screen.getByRole("link", { name: "Sankalp Juneja" })).toHaveAttribute("href", "/candidates/c-scored?returnTo=%2Fpipeline%3Fq%3DSankalp");
});

const scored = {
  _id: "c-scored",
  basicDetails: { name: "Sankalp Juneja" },
  job: JOB,
  status: "under_review",
  skills: ["Python", "PyTorch", "LLMs", "Rust"],
  stageHistory: [{ stage: "under_review", at: ago(4) }],
  ats: { overallScore: 78, decision: "review", scoredAt: ago(6), engine: "evidence" },
  offer: {},
  createdAt: ago(12),
};

// The shape Candidate.atsResultSchema writes on creation — overallScore 0,
// decision "pending", never scored.
const unscored = {
  _id: "c-unscored",
  basicDetails: { name: "Govind Kumar Jha" },
  job: JOB,
  status: "applied",
  skills: ["React"],
  stageHistory: [],
  ats: { overallScore: 0, decision: "pending" },
  offer: {},
  createdAt: ago(2),
};

beforeEach(() => {
  setData([scored, unscored]);
});

describe("Hiring Pipeline — what the board states", () => {
  it("does not offer stage actions on a failed workspace refresh", () => {
    setData([scored], { loadError: "Network unavailable" });
    renderBoard();
    expect(screen.getByRole("alert")).toHaveTextContent("Stage actions are unavailable");
    expect(screen.getByRole("button", { name: "Retry pipeline" })).toBeTruthy();
    expect(screen.queryByText("Sankalp Juneja")).toBeNull();
  });
  it("excludes missing-role and exited applications from active stage actions", () => {
    setData([scored, { ...unscored, job: null }, { ...unscored, _id: "exited", pipelineExit: { at: ago(1) } }]);
    renderBoard("/pipeline?view=list");
    expect(screen.queryByText("Govind Kumar Jha")).toBeNull();
    expect(screen.getAllByText("Sankalp Juneja").length).toBeGreaterThan(0);
    expect(screen.getByText(/2 historical applications/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "View candidate history" })).toHaveAttribute("href", "/candidates");
  });
  it("falls back to all phases for an obsolete deep link", () => {
    renderBoard("/pipeline?view=list&phase=obsolete");
    expect(screen.getAllByText("Sankalp Juneja").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Govind Kumar Jha").length).toBeGreaterThan(0);
  });
  it("restores the job and search filters from a shared URL", () => {
    renderBoard("/pipeline?job=job1&q=Govind");
    expect(screen.getByRole("textbox", { name: "Search pipeline" }).value).toBe("Govind");
    expect(screen.queryByText("Sankalp Juneja")).toBeNull();
    expect(screen.getByText("Govind Kumar Jha")).toBeTruthy();
  });
  it("applies the phase filter in list view as well as board view", () => {
    renderBoard("/pipeline?view=list&phase=screening");
    expect(screen.queryByText("Sankalp Juneja")).toBeNull();
    expect(screen.getAllByText("Govind Kumar Jha").length).toBeGreaterThan(0);
  });
  it("never renders an unscreened applicant as a score", () => {
    renderBoard();
    // The candidate the engine never looked at says so, in words — inside their
    // own column, so this cannot be satisfied by some other card on the board.
    const applied = screen.getByRole("region", { name: /Applied — 1 candidate/ });
    expect(within(applied).getByText("Not scored")).toBeInTheDocument();
    // And no "0%" on that card. Scoped to the column deliberately: a 0% is a
    // legitimate reading elsewhere on this screen (the pass-through RATE is a
    // real 0 over a real denominator). What must never appear is a 0 standing in
    // for a measurement nobody took.
    expect(within(applied).queryByText("0%")).toBeNull();
    // The genuinely scored one keeps its figure.
    expect(screen.getByText("78%")).toBeInTheDocument();
  });

  it("shows only the occupied stages by default, and says how many it is hiding", () => {
    renderBoard();
    expect(screen.getByText(/Showing 2 of 16 stages/)).toBeInTheDocument();
    // The toggle names the exact number withheld, so the board can never be
    // quietly shorter than the pipeline.
    expect(screen.getByRole("button", { name: /Show 14 empty stages/ })).toBeInTheDocument();
  });

  it("labels each column with its pipeline ordinal and its own count", () => {
    renderBoard();
    const column = screen.getByRole("region", { name: /Under Review — 1 candidate/ });
    expect(within(column).getByText("07")).toBeInTheDocument();
    expect(within(column).getByRole("heading", { name: "Under Review" })).toBeInTheDocument();
  });

  it("reports how long the longest-waiting candidate in a stage has waited", () => {
    renderBoard();
    const column = screen.getByRole("region", { name: /Under Review/ });
    expect(within(column).getByText("Longest on this page")).toBeInTheDocument();
    expect(within(column).getByText("4d")).toBeInTheDocument();
  });

  it("averages the KPI score over the scored subset and states that subset", () => {
    renderBoard();
    // 78 over one scored candidate — the unscored applicant's default 0 is not
    // folded in, and the tile says what it was measured over.
    expect(screen.getByText(/Avg ATS score 78% across 1 scored/)).toBeInTheDocument();
  });

  it("gives every KPI figure a denominator rather than a bare number", () => {
    renderBoard();
    expect(screen.getByText("Active in pipeline")).toBeInTheDocument();
    expect(screen.getByText(/Of 2 applications on record/)).toBeInTheDocument();
    expect(screen.getByText(/0 of 2 reached Shortlisted/)).toBeInTheDocument();
  });

  it("shows a truncated skill set without dropping the remainder from the a11y tree", () => {
    renderBoard();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
    // The overflow count is a layout decision, not an editorial one.
    expect(screen.getByText(/more skills: Rust/)).toBeInTheDocument();
  });

  it("flags a résumé-defense signal as something to review, never as a score", () => {
    setData([
      {
        ...scored,
        hostility: { clean: false, signals: [{ severity: "critical", code: "x", message: "y" }] },
      },
    ]);
    renderBoard();
    expect(screen.getByText(/1 résumé signal to review/)).toBeInTheDocument();
  });

  it("says a score came from the legacy fallback rather than passing it off as evidence", () => {
    setData([{ ...scored, ats: { ...scored.ats, engine: "fallback-legacy" } }]);
    renderBoard();
    expect(screen.getByText("legacy fallback")).toBeInTheDocument();
  });

  it("offers the whole pipeline as a board or a list, and starts on the board", () => {
    renderBoard();
    expect(screen.getByRole("button", { name: "Board" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "false");
  });

  it("falls back to the empty state rather than an empty rail when nobody has applied", () => {
    setData([]);
    renderBoard();
    expect(screen.getByText("No candidates yet")).toBeInTheDocument();
    // No filter/sort sub-bar over an empty board — there is nothing to filter.
    expect(screen.queryByText(/Showing/)).toBeNull();
  });

  it("shows skeletons, not zeros, while the workspace is still loading", () => {
    setData([], { loading: true });
    renderBoard();
    expect(screen.queryByText("Not scored")).toBeNull();
    expect(screen.queryByText(/Avg ATS score/)).toBeNull();
  });

  it("renders the interactive StageNavigator with phase tabs and quick stage buttons", () => {
    renderBoard();
    // Phase tabs
    expect(screen.getByRole("button", { name: /All Stages/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Screening/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Interviews/ })).toBeInTheDocument();

    // Stage buttons with titles
    expect(screen.getByTitle(/Jump to Applied/)).toBeInTheDocument();
    expect(screen.getByTitle(/Jump to Under Review/)).toBeInTheDocument();
  });

  it("filters visible columns when a phase tab is clicked and allows resetting", () => {
    renderBoard();
    // Initially 2 occupied stages visible out of 16 (Applied & Under Review)
    expect(screen.getByText(/Showing 2 of 16 stages/)).toBeInTheDocument();

    // Filter to Screening phase
    const screeningTab = screen.getByRole("button", { name: /Screening/ });
    fireEvent.click(screeningTab);

    // Now only 1 occupied stage in screening (Applied)
    expect(screen.getByText(/Showing 1 of 16 stages/)).toBeInTheDocument();
    expect(screen.getAllByText("Phase:").length).toBeGreaterThan(0);

    // Reset phase filter
    const clearPhase = screen.getByRole("button", { name: /Clear Phase filter/ });
    fireEvent.click(clearPhase);
    expect(screen.getByText(/Showing 2 of 16 stages/)).toBeInTheDocument();
  });

  it("supports toggling between comfortable and compact column widths", () => {
    renderBoard();
    const comfortable = screen.getByRole("button", { name: "Comfortable" });
    const compact = screen.getByRole("button", { name: "Compact" });

    expect(comfortable).toHaveAttribute("aria-pressed", "true");
    expect(compact).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(compact);
    expect(comfortable).toHaveAttribute("aria-pressed", "false");
    expect(compact).toHaveAttribute("aria-pressed", "true");
  });
});
