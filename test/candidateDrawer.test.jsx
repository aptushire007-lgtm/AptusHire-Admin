import { useState } from "react";
import { expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { get, patch } = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("../src/api/client.js", () => ({
  default: {
    get,
    patch,
  },
}));

import CandidateDrawer from "../src/components/candidate/CandidateDrawer.jsx";

const mockCandidateA = {
  _id: "cand-1",
  basicDetails: {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "+1 555-0100",
  },
  job: {
    _id: "job-1",
    title: "Senior AI Engineer",
    department: "Engineering",
  },
  status: "under_review",
  ats: {
    overallScore: 88,
    decision: "review",
    recommendation: "Strong candidate with deep ML systems experience.",
    fit: "Strong fit",
    scores: {
      technical: 90,
      experience: 85,
    },
    flags: [],
  },
  skills: ["Python", "PyTorch", "Kubernetes", "Distributed Systems"],
  stageHistory: [
    { stage: "applied", at: "2026-03-01T10:00:00Z" },
    { stage: "under_review", at: "2026-03-02T14:30:00Z" },
  ],
  createdAt: "2026-03-01T10:00:00Z",
};

const mockCandidateB = {
  _id: "cand-2",
  basicDetails: {
    name: "Alex Smith",
    email: "alex@example.com",
    phone: "+1 555-0200",
  },
  job: {
    _id: "job-1",
    title: "Senior AI Engineer",
  },
  status: "shortlisted",
  ats: {
    overallScore: 74,
  },
  stageHistory: [
    { stage: "applied", at: "2026-03-03T10:00:00Z" },
    { stage: "shortlisted", at: "2026-03-04T12:00:00Z" },
  ],
  createdAt: "2026-03-03T10:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  get.mockImplementation((url) => {
    if (url === "/candidates/cand-1") {
      return Promise.resolve({ data: mockCandidateA });
    }
    if (url === "/candidates/cand-2") {
      return Promise.resolve({ data: mockCandidateB });
    }
    if (url.startsWith("/interview-sessions/candidate/") || url.startsWith("/interviews/sessions/candidate/")) {
      return Promise.resolve({ data: null });
    }
    if (url.startsWith("/assessments/candidate/") || url.startsWith("/assessments/candidates/")) {
      return Promise.resolve({ data: null });
    }
    return Promise.resolve({ data: {} });
  });
});

it("loads the review workspace in one request when the composite endpoint is available", async () => {
  get.mockResolvedValueOnce({
    data: {
      candidate: mockCandidateA,
      interviewSession: null,
      assessmentSession: null,
      interviewReport: null,
      profileAssessment: null,
    },
  });

  render(
    <MemoryRouter>
      <CandidateDrawer candidateId="cand-1" reviewIds={["cand-1"]} onClose={vi.fn()} onSelectCandidate={vi.fn()} />
    </MemoryRouter>
  );

  expect(await screen.findByText("Jane Doe")).toBeTruthy();
  expect(get).toHaveBeenCalledTimes(1);
  expect(get).toHaveBeenCalledWith("/candidates/cand-1/workspace", expect.objectContaining({ signal: expect.anything() }));
});

it("renders candidate profile, score, and identity in drawer overlay", async () => {
  render(
    <MemoryRouter>
      <CandidateDrawer
        candidateId="cand-1"
        reviewIds={["cand-1", "cand-2"]}
        onClose={vi.fn()}
        onSelectCandidate={vi.fn()}
      />
    </MemoryRouter>
  );

  expect(await screen.findByText("Jane Doe")).toBeTruthy();
  expect(screen.getAllByText(/Senior AI Engineer/).length).toBeGreaterThan(0);
  expect(screen.getByText("88")).toBeTruthy();
  expect(screen.queryByRole("link", { name: /Open full profile/i })).toBeNull();
  expect(screen.getByText("Strong candidate with deep ML systems experience.")).toBeTruthy();
  expect(screen.getByText("PyTorch")).toBeTruthy();
});

it("supports cycling through candidate list with Prev and Next buttons", async () => {
  const onSelectCandidate = vi.fn();
  function TestWrapper({ initialId }) {
    const [currId, setCurrId] = useState(initialId);
    return (
      <MemoryRouter>
        <CandidateDrawer
          candidateId={currId}
          reviewIds={["cand-1", "cand-2"]}
          onClose={vi.fn()}
          onSelectCandidate={(nextId) => {
            onSelectCandidate(nextId);
            setCurrId(nextId);
          }}
        />
      </MemoryRouter>
    );
  }

  render(<TestWrapper initialId="cand-1" />);

  await screen.findByText("Jane Doe");

  const prevBtn = screen.getByRole("button", { name: "Previous candidate" });
  const nextBtn = screen.getByRole("button", { name: "Next candidate" });

  expect(prevBtn).toBeDisabled();
  expect(nextBtn).not.toBeDisabled();

  fireEvent.click(nextBtn);
  expect(onSelectCandidate).toHaveBeenCalledWith("cand-2");
  expect(await screen.findByText("Alex Smith")).toBeTruthy();

  const prevBtn2 = screen.getByRole("button", { name: "Previous candidate" });
  expect(prevBtn2).not.toBeDisabled();
  fireEvent.click(prevBtn2);
  expect(onSelectCandidate).toHaveBeenCalledWith("cand-1");
  expect(await screen.findByText("Jane Doe")).toBeTruthy();
});

it("switches tabs across Summary, Evidence, Assessments, Interview, Activity", async () => {
  render(
    <MemoryRouter>
      <CandidateDrawer
        candidateId="cand-1"
        reviewIds={["cand-1"]}
        onClose={vi.fn()}
        onSelectCandidate={vi.fn()}
      />
    </MemoryRouter>
  );

  await screen.findByText("Jane Doe");

  // Click Profile & CV tab (the tab formerly labelled "Evidence & CV"; its
  // second copy of the screening breakdown now lives on ATS Score Breakdown).
  fireEvent.click(screen.getByRole("tab", { name: /Profile & CV/i }));
  expect(await screen.findByText("Candidate Profile Information")).toBeTruthy();

  // Click Activity tab
  fireEvent.click(screen.getByRole("tab", { name: /Activity/i }));
  expect(await screen.findByText("Recorded Stage History")).toBeTruthy();
});

it("supports all 6 segregated tabs seamlessly: Summary, ATS Score Breakdown, Assessments, AI Interview Report, Profile & CV, Activity", async () => {
  render(
    <MemoryRouter>
      <CandidateDrawer
        candidateId="cand-1"
        reviewIds={["cand-1"]}
        onClose={vi.fn()}
        onSelectCandidate={vi.fn()}
      />
    </MemoryRouter>
  );

  await screen.findByText("Jane Doe");

  // 1. Summary tab (default) — it absorbed what the Overview tab used to hold,
  //    so the application context and last stage event are here now.
  expect(screen.getByRole("tab", { name: /Summary/i, selected: true })).toBeTruthy();
  // Summary is a picture and a short list now, not prose cards.
  expect(screen.getByText("Fit to the rubric")).toBeTruthy();
  expect(screen.getByText("At a glance")).toBeTruthy();
  expect(screen.getByText("Last move")).toBeTruthy();

  // 2. ATS Score Breakdown tab — the CV-screening evidence, in one place
  fireEvent.click(screen.getByRole("tab", { name: /ATS Score Breakdown/i }));
  expect(await screen.findByRole("heading", { name: "CV screening" })).toBeTruthy();

  // 3. Assessments tab — the skills-test paper, and nothing that another tab
  //    already owns: the CV screening card belongs to ATS Score Breakdown and
  //    the interview score card to AI Interview Report.
  fireEvent.click(screen.getByRole("tab", { name: /^Assessments$/i }));
  expect(await screen.findByText("Technical Skill Assessment Paper")).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "CV screening" })).toBeNull();
  expect(screen.queryByText("AI Voice/Video Interview")).toBeNull();

  // 4. AI Interview Report tab
  fireEvent.click(screen.getByRole("tab", { name: /AI Interview Report/i }));
  expect(await screen.findByText("AI Interview Workspace & Analysis")).toBeTruthy();

  // 5. Profile & CV tab
  fireEvent.click(screen.getByRole("tab", { name: /Profile & CV/i }));
  expect(await screen.findByText("Candidate Profile Information")).toBeTruthy();
  expect(screen.getByText("Download Original CV")).toBeTruthy();

  // 6. Activity tab
  fireEvent.click(screen.getByRole("tab", { name: /Activity/i }));
  expect(await screen.findByText("Recorded Stage History")).toBeTruthy();
  expect(screen.getByText("Recruiter Notes")).toBeTruthy();
});

it("supports deep linking to specific tab via initialTab prop", async () => {
  render(
    <MemoryRouter>
      <CandidateDrawer
        candidateId="cand-1"
        initialTab="ai-interview"
        reviewIds={["cand-1"]}
        onClose={vi.fn()}
        onSelectCandidate={vi.fn()}
      />
    </MemoryRouter>
  );

  await screen.findByText("Jane Doe");

  // Opens directly on AI Interview Report tab
  expect(screen.getByRole("tab", { name: /AI Interview Report/i, selected: true })).toBeTruthy();
  expect(screen.getByText("AI Interview Workspace & Analysis")).toBeTruthy();
});

it("Review Evidence button switches tab to AI Interview Report", async () => {
  render(
    <MemoryRouter>
      <CandidateDrawer
        candidateId="cand-1"
        initialTab="summary"
        reviewIds={["cand-1"]}
        onClose={vi.fn()}
        onSelectCandidate={vi.fn()}
      />
    </MemoryRouter>
  );

  await screen.findByText("Jane Doe");

  const reviewEvidenceBtn = screen.getByRole("button", { name: /Review Evidence/i });
  fireEvent.click(reviewEvidenceBtn);

  expect(screen.getByRole("tab", { name: /AI Interview Report/i, selected: true })).toBeTruthy();
  expect(screen.getByText("AI Interview Workspace & Analysis")).toBeTruthy();
});

it("calls onClose when close button or back button is clicked", async () => {
  const onClose = vi.fn();
  render(
    <MemoryRouter>
      <CandidateDrawer
        candidateId="cand-1"
        reviewIds={["cand-1"]}
        onClose={onClose}
        onSelectCandidate={vi.fn()}
      />
    </MemoryRouter>
  );

  await screen.findByText("Jane Doe");

  const backBtn = screen.getByRole("button", { name: /Back to candidates/i });
  fireEvent.click(backBtn);
  expect(onClose).toHaveBeenCalledTimes(1);

  const closeBtn = screen.getByRole("button", { name: "Close candidate drawer" });
  fireEvent.click(closeBtn);
  expect(onClose).toHaveBeenCalledTimes(2);
});

it("renders accurate assessment session details without dummy data in Assessments tab", async () => {
  const candidateWithAssessment = {
    ...mockCandidateA,
    _id: "cand-assess-1",
  };

  const mockAssessmentSession = {
    session: {
      _id: "sess-paper-1",
      status: "completed",
      difficultyTier: { value: "medium", source: "claim_derived" },
      completedAt: "2026-03-05T12:00:00Z",
      result: {
        scoredAt: "2026-03-05T12:05:00Z",
        totalItems: 10,
        totalCorrect: 8,
        perCriterion: [
          { criterionId: "crit-algo", label: "Algorithm Optimization", itemCount: 5, correctCount: 4 },
          { criterionId: "crit-sys", label: "System Design", itemCount: 5, correctCount: 4 },
        ],
        claimVerdicts: [
          { claimId: "claim-1", criterionId: "Algorithm Optimization", verdict: "verified", correctCount: 2, itemCount: 2 },
        ],
      },
    },
    decision: { action: "send", byName: "Alex Recruiter" },
    paperReady: true,
    paper: {
      sections: [{ title: "Production Systems Assessment" }],
    },
  };

  const mockInterviewSession = {
    _id: "sess-int-1",
    status: "completed",
    startedAt: "2026-03-04T10:00:00Z",
    completedAt: "2026-03-04T10:30:00Z",
    aiInterview: {
      status: "completed",
      questionCount: 6,
      evaluation: {
        overallScore: 88,
        recommendation: "strong_hire",
        questionsAsked: 6,
        questionsAnswered: 6,
      },
    },
  };

  const mockCvAssessment = {
    overallScore: 92,
    criterionFindings: [
      { criterionId: "c1", label: "Distributed ML Infrastructure", status: "satisfied" },
    ],
  };

  get.mockImplementation((url) => {
    if (url === "/candidates/cand-assess-1") {
      return Promise.resolve({ data: candidateWithAssessment });
    }
    if (url.startsWith("/assessments/candidate/cand-assess-1")) {
      return Promise.resolve({ data: mockAssessmentSession });
    }
    if (url.startsWith("/interview-sessions/candidate/cand-assess-1")) {
      return Promise.resolve({ data: mockInterviewSession });
    }
    if (url.startsWith("/candidates/cand-assess-1/interview-report")) {
      return Promise.resolve({
        data: {
          hasInterview: true,
          interview: {
            ...mockInterviewSession.aiInterview,
            sessionId: "sess-int-1",
          },
        },
      });
    }
    if (url.startsWith("/candidates/cand-assess-1/assessment")) {
      return Promise.resolve({ data: mockCvAssessment });
    }
    return Promise.resolve({ data: {} });
  });

  render(
    <MemoryRouter>
      <CandidateDrawer
        candidateId="cand-assess-1"
        initialTab="assessments"
        reviewIds={["cand-assess-1"]}
        onClose={vi.fn()}
        onSelectCandidate={vi.fn()}
      />
    </MemoryRouter>
  );

  // Technical Skill Assessment Paper Card shows real title, percentage, items correct, and criteria
  expect(await screen.findByText("Production Systems Assessment")).toBeTruthy();
  expect(screen.getByText("80")).toBeTruthy(); // 8/10 -> 80%
  // Stated in words; the headline no longer abbreviates it as "8/10".
  expect(screen.getByText(/of 10 correct/i)).toBeTruthy();
  expect(screen.getAllByText("Algorithm Optimization").length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText("System Design")).toBeTruthy();
  expect(screen.getByText(/Verified/i)).toBeTruthy();
});


// ── Absence is not a verdict ────────────────────────────────────────────────
// Each of these cards used to answer a question the record never answered.
// Reading a missing field as a good result is the one failure mode a hiring
// screen cannot have: it puts a claim in front of a recruiter that no run
// stands behind, in the same typeface as the claims that do.

it("reports an unproctored session as unmeasured, not as clean", async () => {
  const candidate = { ...mockCandidateA, _id: "cand-noproc" };
  get.mockImplementation((url) => {
    if (url === "/candidates/cand-noproc") return Promise.resolve({ data: candidate });
    if (url.startsWith("/candidates/cand-noproc/interview-report")) {
      // An interview exists; no proctoring record was ever written for it.
      return Promise.resolve({
        data: { hasInterview: true, interview: { sessionId: "s1", status: "completed" } },
      });
    }
    return Promise.resolve({ data: null });
  });

  render(
    <MemoryRouter>
      <CandidateDrawer candidateId="cand-noproc" initialTab="ai-interview" onClose={vi.fn()} />
    </MemoryRouter>
  );

  expect(await screen.findByText(/No proctoring record was stored/i)).toBeTruthy();
  expect(screen.getByText(/That is not a clean result/i)).toBeTruthy();
  // The two sentences that were invented out of the absence.
  expect(screen.queryByText(/anti-cheat and environment verification was enabled/i)).toBeNull();
  expect(screen.queryByText(/No integrity signals or suspicious events were recorded/i)).toBeNull();
  expect(screen.queryByText(/Standard Verification/i)).toBeNull();
});

it("does not claim high confidence for a run that reported none", async () => {
  const candidate = { ...mockCandidateA, _id: "cand-noconf" };
  get.mockImplementation((url) => {
    if (url === "/candidates/cand-noconf") return Promise.resolve({ data: candidate });
    if (url.startsWith("/candidates/cand-noconf/assessment")) {
      // `confidence` has no schema default, so it is simply absent here.
      return Promise.resolve({
        data: { overallScore: 81, engine: "evidence", criterionFindings: [] },
      });
    }
    return Promise.resolve({ data: null });
  });

  render(
    <MemoryRouter>
      <CandidateDrawer candidateId="cand-noconf" onClose={vi.fn()} />
    </MemoryRouter>
  );

  await screen.findByText("Jane Doe");
  expect(screen.queryByText(/High Confidence/i)).toBeNull();
});

it("withholds the keyword-screening prose for a candidate nobody screened", async () => {
  // `ats.overallScore` DEFAULTS TO 0 in the schema, so an unscreened candidate
  // used to be described as a 0% match — a measurement about a run that never
  // happened. `isScored()` gates the prose the same way it gates the cards.
  const candidate = {
    ...mockCandidateA,
    _id: "cand-unscored",
    ats: { overallScore: 0, decision: "pending" }, // no scoredAt
  };
  get.mockImplementation((url) => {
    if (url === "/candidates/cand-unscored") return Promise.resolve({ data: candidate });
    return Promise.resolve({ data: null });
  });

  render(
    <MemoryRouter>
      <CandidateDrawer candidateId="cand-unscored" onClose={vi.fn()} />
    </MemoryRouter>
  );

  expect(await screen.findByText(/rubric breakdown appears once this CV has been screened/i)).toBeTruthy();
  expect(screen.queryByText(/Overall match: 0%/i)).toBeNull();
});
