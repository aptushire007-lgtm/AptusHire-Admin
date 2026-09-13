import { it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import api from "../src/api/client.js";
import { usePipelineData } from "../src/lib/usePipelineData.js";
vi.mock("../src/api/client.js", () => ({ default: { get: vi.fn() } }));
vi.mock("../src/lib/socket.js", () => ({ getSocket: () => null }));

it("keeps filters server-side and ignores a superseded response", async () => {
  let oldResolve;
  api.get.mockImplementationOnce(() => new Promise(resolve => { oldResolve = resolve; }))
    .mockResolvedValueOnce({ data: { items: [{ _id: "new" }], total: 501 } });
  const { result, rerender } = renderHook(props => usePipelineData(props), { initialProps: { job: "all", q: "old", phase: "all", sort: "newest", page: 1 } });
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
  rerender({ job: "j1", q: "new", phase: "offers", sort: "name", page: 2 });
  await waitFor(() => expect(result.current.data?.total).toBe(501));
  expect(api.get).toHaveBeenLastCalledWith("/candidates/pipeline", { params: { job: "j1", q: "new", phase: "offers", sort: "name", page: 2 } });
  await act(async () => { oldResolve({ data: { items: [{ _id: "old" }] } }); });
  expect(result.current.data.items[0]._id).toBe("new");
});

it("reports failed reads and supports retry", async () => {
  api.get.mockReset().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ data: { items: [] } });
  const { result } = renderHook(() => usePipelineData({ job: "all", q: "", phase: "all", sort: "newest", page: 1 }));
  await waitFor(() => expect(result.current.error).toMatch(/Could not load/));
  act(() => result.current.refresh());
  await waitFor(() => expect(result.current.data).toEqual({ items: [] }));
  expect(result.current.error).toBe("");
});
