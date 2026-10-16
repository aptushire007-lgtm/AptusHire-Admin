// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import SubscriptionPage from "../src/pages/dashboard/SubscriptionPage.jsx";

const subscriptionState = vi.hoisted(() => ({ subscription: null }));

vi.mock("../src/context/CompanyDataContext.jsx", () => ({
  useCompanyData: () => ({ subscription: subscriptionState.subscription, loading: false }),
}));

describe("subscription seat limits", () => {
  it("shows configured Admin and Recruiter seat limits", () => {
    subscriptionState.subscription = {
      plan: {
        name: "Silver",
        pricing: { monthly: 999 },
        limits: { maxJobs: 10, maxAdmins: 1, maxRecruiters: 2, maxAiInterviews: 50, maxResumeParsing: 200, storageLimitMb: 5000 },
      },
      status: "active",
      billingCycle: "monthly",
    };

    render(<MemoryRouter><SubscriptionPage /></MemoryRouter>);

    expect(screen.getByText("Admin Seats")).toBeInTheDocument();
    expect(screen.getByText("Recruiter Seats")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("does not invent an Admin limit for Free Trial", () => {
    subscriptionState.subscription = {
      plan: {
        name: "Free Trial",
        pricing: { monthly: 0 },
        limits: { maxJobs: 2, maxRecruiters: 1, maxAiInterviews: 5, maxResumeParsing: 20, storageLimitMb: 500 },
      },
      status: "active",
      billingCycle: "monthly",
    };

    render(<MemoryRouter><SubscriptionPage /></MemoryRouter>);

    expect(screen.queryByText("Admin Seats")).not.toBeInTheDocument();
    expect(screen.getByText("Recruiter Seats")).toBeInTheDocument();
  });
});
