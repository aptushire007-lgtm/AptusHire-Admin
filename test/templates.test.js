import { describe, expect, it } from "vitest";
import { fillTemplate, candidateValues } from "../src/lib/templates.js";

describe("message templates", () => {
  it("fills known placeholders and leaves unknown or empty ones visible", () => {
    const out = fillTemplate("Hi {candidate_name}, re {job_title} on {date} {mystery}", {
      candidate_name: "Asha",
      job_title: "SDE",
      date: "",
    });
    expect(out).toBe("Hi Asha, re SDE on {date} {mystery}");
  });

  it("reads the values a candidate record supplies", () => {
    const v = candidateValues({ basicDetails: { name: "Asha Rao" }, job: { title: "SDE" } }, "Acme");
    expect(v).toMatchObject({ candidate_name: "Asha Rao", first_name: "Asha", job_title: "SDE", company_name: "Acme" });
  });
});
