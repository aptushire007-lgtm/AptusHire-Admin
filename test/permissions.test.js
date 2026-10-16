import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { getCompanyPermissions } from "../src/auth/permissions.js";

const require = createRequire(import.meta.url);
const backendPermissions = require("../../aptus backend/utils/companyPermissions.js");

describe("Admin Portal permissions mirror backend company roles", () => {
  it("keeps role permission sets aligned", () => {
    for (const role of ["admin", "recruiter", "candidate", "superadmin", "unknown"]) {
      expect(getCompanyPermissions(role)).toEqual(backendPermissions.getCompanyPermissions(role));
    }
  });

  it("allows Admin company analytics and denies it to Recruiters", () => {
    expect(getCompanyPermissions("admin")).toContain("COMPANY_ANALYTICS");
    const permissions = getCompanyPermissions("recruiter");
    expect(permissions).not.toContain("COMPANY_ANALYTICS");
    expect(permissions).toContain("JOBS");
    expect(permissions).toContain("CANDIDATES");
    expect(permissions).toContain("INTERVIEWS");
    expect(permissions).toContain("ASSESSMENTS");
    expect(permissions).toContain("SCORECARDS");
    expect(permissions).toContain("RUBRICS");
    expect(permissions).toContain("QUESTION_SETS");
    expect(permissions).toContain("PERSONAS");
    expect(permissions).toContain("REVIEW_QUEUE");
    expect(permissions).toContain("MESSAGE_TEMPLATES");
    expect(permissions).toContain("INTENT_PHRASES");
    expect(permissions).not.toContain("TEAM_MANAGE");
    expect(permissions).not.toContain("WORKSPACE_SETTINGS");
    expect(permissions).not.toContain("SUBSCRIPTION_MANAGE");
    expect(permissions).not.toContain("BILLING_MANAGE");
    expect(permissions).not.toContain("SENSITIVE_DATA_RIGHTS");
  });
});
