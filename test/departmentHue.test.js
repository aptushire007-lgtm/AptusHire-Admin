import { expect, it } from "vitest";
import { departmentPalette, initials } from "../src/lib/departmentHue.js";

it("gives each department its own colour, case-insensitively, and General none", () => {
  const hue = departmentPalette(["Engineering", "Web Platform", "Mobile Engineering", "General", "engineering "]);
  const chips = ["Engineering", "Web Platform", "Mobile Engineering"].map((d) => hue(d).chip);
  expect(new Set(chips).size).toBe(3);
  expect(hue(" ENGINEERING")).toBe(hue("Engineering"));
  expect(hue("General").chip).toMatch(/slate/);
  expect(hue("").chip).toMatch(/slate/);
});

it("builds a job tile's letters from its title", () => {
  expect(initials("Senior Frontend Specialist (React & Next.js)")).toBe("SF");
  expect(initials("")).toBe("?");
});
