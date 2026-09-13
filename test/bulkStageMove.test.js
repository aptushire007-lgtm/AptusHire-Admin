import { expect, it, vi } from "vitest";
import { bulkStageMove } from "../src/lib/bulkStageMove.js";
it("reports partial failures and skips invalid transitions without resending duplicates", async () => {
  const move = vi.fn(async (id) => { if (id === "bad") throw new Error("denied"); });
  const input = [{ _id: "ok", status: "applied" }, { _id: "bad", status: "applied" }, { _id: "terminal", status: "joined" }, { _id: "ok", status: "applied" }];
  const result = await bulkStageMove(input, () => "review", move, (status) => status === "joined" ? [] : ["review"]);
  expect(result).toEqual({ succeeded: ["ok"], failed: ["bad"], skipped: ["terminal"] });
  expect(move).toHaveBeenCalledTimes(2);
});
