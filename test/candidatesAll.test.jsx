import { expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../src/api/client.js", () => ({ default: { get } }));
import CandidatesAll from "../src/pages/dashboard/CandidatesAll.jsx";
it("pages grouped records on the server and does not display default zero as scored", async () => {
  get.mockResolvedValue({ data: { total: 501, pages: 11, items: [{ name: "Applicant", latestAts: { overallScore: 0, decision: "pending" }, latestApplication: { _id: "a", status: "applied", appliedAt: "2026-01-01" }, applications: [{ _id: "a" }] }] } });
  render(<MemoryRouter initialEntries={["/candidates?q=Applicant"]}><CandidatesAll /></MemoryRouter>);
  expect(await screen.findByText(/501 matching candidate records/)).toBeTruthy();
  expect(screen.getByText("Not scored")).toBeTruthy();
  expect(screen.queryByText("CV 0/100")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  await waitFor(() => expect(get).toHaveBeenLastCalledWith("/candidates", { params: { page: 2, limit: 50, q: "Applicant", stage: "all", groupBy: "candidate" } }));
});
it("keeps report cohorts application-based and forwards the date range", async () => {
  get.mockResolvedValue({ data: { total: 1, pages: 1, items: [{ _id: "a", basicDetails: { name: "Historic applicant" }, createdAt: "2026-01-02", status: "rejected" }] } });
  render(<MemoryRouter initialEntries={["/candidates?reached=shortlisted&from=2026-01-01&to=2026-01-31"]}><CandidatesAll /></MemoryRouter>);
  expect(await screen.findByText(/1 matching applications/)).toBeTruthy();
  expect(get).toHaveBeenLastCalledWith("/candidates", { params: { page: 1, limit: 50, q: "", stage: "all", reached: "shortlisted", from: "2026-01-01", to: "2026-01-31" } });
  expect(screen.getByText("Rejected", { selector: "span" })).toBeTruthy();
});

it("displays isolated, accurate candidate DB information in inspection modal with zero dummy data", async () => {
  get.mockImplementation((url) => {
    if (url === "/candidates") {
      return Promise.resolve({
        data: {
          total: 1,
          pages: 1,
          items: [
            {
              _id: "c123",
              name: "Vijendra",
              email: "algorithemicedge@gmail.com",
              latestApplication: {
                _id: "c123",
                status: "applied",
                appliedAt: "2026-09-01",
                job: { _id: "job1", title: "AI Research Lead" },
              },
              latestAts: { overallScore: 69 },
            },
          ],
        },
      });
    }
    if (url === "/candidates/c123") {
      return Promise.resolve({
        data: {
          _id: "c123",
          basicDetails: {
            name: "Vijendra",
            email: "algorithemicedge@gmail.com",
            phone: "+917473360076",
            linkedinUrl: "https://linkedin.com/in/vijendrapratapsingh",
          },
          status: "applied",
          job: { _id: "job1", title: "AI Research Lead" },
          skills: ["Generative AI", "Multi-Agent Systems"],
        },
      });
    }
    if (url === "/candidates/c123/assessment") {
      return Promise.resolve({
        data: {
          overallScore: 69,
          confidence: 0.9,
          engine: "evidence",
          criterionFindings: [
            {
              criterionId: "crit-1",
              label: "Generative AI expertise",
              status: "satisfied",
              criterionScore: 0.9,
              reasoning: "Validated 8 years delivering GenAI solutions.",
            },
          ],
          topEvidence: [
            {
              criterionId: "crit-1",
              quote: "8 years of experience delivering GenAI solutions",
            },
          ],
        },
      });
    }
    return Promise.reject(new Error("not found"));
  });

  render(
    <MemoryRouter initialEntries={["/candidates?candidateId=c123"]}>
      <CandidatesAll />
    </MemoryRouter>
  );

  // Verifies real candidate info from DB
  expect(await screen.findByText("Vijendra")).toBeTruthy();
  expect(screen.getByText("algorithemicedge@gmail.com")).toBeTruthy();
  expect(screen.getByText("Req: AI Research Lead")).toBeTruthy();
  // What matters is that the 69 is the overallScore the API returned and not a
  // stand-in. It used to be a "69% Match" badge restating the score; it is now
  // the scorecard ring, whose accessible name states the figure — and an
  // unscored candidate's ring says "Not run", never a number.
  expect(screen.getByRole("img", { name: "CV screening: 69 out of 100" })).toBeTruthy();
  expect(screen.getAllByText("Generative AI expertise").length).toBeGreaterThanOrEqual(1);
  // The CV quote sits inside its criterion's row — open the row to read it.
  fireEvent.click(screen.getByRole("button", { name: /Generative AI expertise/, expanded: false }));
  expect(screen.getByText(/8 years of experience delivering GenAI solutions/)).toBeTruthy();

  // The per-criterion reasoning now lives on the ATS Score Breakdown tab,
  // which is where the CV-screening evidence was consolidated.
  fireEvent.click(screen.getByRole("tab", { name: /ATS Score Breakdown/i }));
  expect(await screen.findByText(/Validated 8 years delivering GenAI solutions/)).toBeTruthy();

  // Verifies NO dummy/leaked data is present in the DOM
  expect(screen.queryByText(/Razorpay/i)).toBeNull();
  expect(screen.queryByText(/Stripe/i)).toBeNull();
  expect(screen.queryByText(/200k req\/s/i)).toBeNull();
  expect(screen.queryByText(/45M transactions/i)).toBeNull();
  expect(screen.queryByText(/Kafka stream topologies/i)).toBeNull();
  expect(screen.queryByText(/contact@pratap\.ai/i)).toBeNull();
  expect(screen.queryByText(/Senior Software Engineer \(Platform\)/i)).toBeNull();
  expect(screen.queryByText(/SDE-III Job Rubric/i)).toBeNull();
});
