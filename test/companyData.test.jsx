import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { CompanyDataProvider, useCompanyData } from "../src/context/CompanyDataContext.jsx";
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../src/api/client.js", () => ({ default: { get } }));
vi.mock("../src/lib/socket.js", () => ({ getSocket: () => null }));
let workspace;
function Probe() {
  workspace = useCompanyData();
  return <output>{JSON.stringify({ jobs: workspace.jobs, candidates: workspace.allCandidates, error: workspace.loadError, loading: workspace.loading })}</output>;
}
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
let generation;
function defaults(url) {
  if (url === "/jobs") return Promise.resolve({ data: [{ _id: "j", title: generation }] });
  if (url === "/candidates") return Promise.resolve({ data: { items: [{ _id: generation, job: "j" }], pages: 1 } });
  return Promise.resolve({ data: url === "/interview-queue" ? [] : {} });
}
const tick = () => act(() => vi.advanceTimersByTimeAsync(300));
beforeEach(() => { vi.useFakeTimers(); generation = "initial"; get.mockReset().mockImplementation(defaults); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it("does not fetch company-wide applications for scoped routes", async () => {
  const view = render(<CompanyDataProvider includeCandidates={false}><Probe /></CompanyDataProvider>);
  await tick();
  expect(get.mock.calls.some(([url]) => url === "/candidates")).toBe(false);
  expect(workspace.me).toEqual({});
  view.rerender(<CompanyDataProvider includeCandidates><Probe /></CompanyDataProvider>);
  expect(workspace.loading).toBe(true);
  await tick();
  expect(workspace.allCandidates[0]._id).toBe("initial");
});

it("keeps the last complete snapshot when a later application page fails", async () => {
  render(<CompanyDataProvider><Probe /></CompanyDataProvider>);
  await tick();
  generation = "replacement";
  get.mockImplementation((url, options) => {
    if (url === "/candidates") return options.params.page === 2
      ? Promise.reject(new Error("offline"))
      : Promise.resolve({ data: { items: [{ _id: "new", job: "j" }], pages: 2 } });
    return defaults(url);
  });
  act(() => { void workspace.refresh(); });
  await tick();
  expect(workspace.jobs[0].title).toBe("initial");
  expect(workspace.allCandidates[0]._id).toBe("initial");
  expect(workspace.loadError).toMatch(/Try refreshing/);
  expect(workspace.loading).toBe(false);
  get.mockImplementation(defaults);
  act(() => { void workspace.refresh(); });
  await tick();
  expect(workspace.jobs[0].title).toBe("replacement");
  expect(workspace.loadError).toBe("");
});

it("does not let an older refresh replace a newer snapshot", async () => {
  const old = deferred();
  get.mockImplementation((url) => url === "/candidates" ? old.promise : defaults(url));
  render(<CompanyDataProvider><Probe /></CompanyDataProvider>);
  await tick();
  generation = "newest";
  get.mockImplementation(defaults);
  act(() => { void workspace.refresh(); });
  await tick();
  await act(async () => { old.resolve({ data: { items: [{ _id: "stale", job: "j" }], pages: 1 } }); });
  expect(workspace.jobs[0].title).toBe("newest");
  expect(workspace.allCandidates[0]._id).toBe("newest");
  expect(screen.getByRole("status")).not.toHaveTextContent("stale");
});

it("settles a pending debounced refresh when the provider unmounts", async () => {
  const view = render(<CompanyDataProvider><Probe /></CompanyDataProvider>);
  const done = vi.fn();
  workspace.refresh().then(done);
  view.unmount();
  await act(async () => {});
  expect(done).toHaveBeenCalledOnce();
  expect(get).not.toHaveBeenCalled();
});
