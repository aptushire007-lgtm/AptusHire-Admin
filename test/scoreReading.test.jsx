import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import ScoreGauge from "../src/components/report/ScoreGauge.jsx";
afterEach(cleanup);
it("uses the supplied instrument verdict, never a generic zone", () => {
  render(<ScoreGauge value={27} verdict={{ label: "Clear reject", tone: "negative" }} label="CV screening" />);
  expect(screen.getByRole("figure").getAttribute("aria-label")).toBe("CV screening: 27 out of 100, Clear reject");
});
it("preserves zero and the instrument scale", () => {
  render(<ScoreGauge value={0} max={5} label="Score" />);
  expect(screen.getByRole("figure").getAttribute("aria-label")).toBe("Score: 0 out of 5");
});
it("does not coerce an empty score into zero", () => {
  render(<ScoreGauge value="" label="Score" />);
  expect(screen.getByRole("figure").getAttribute("aria-label")).toBe("Score: no reading");
});
