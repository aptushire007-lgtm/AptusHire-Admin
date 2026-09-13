import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import CandidatePortal from "../src/components/candidate/CandidatePortal.jsx";
vi.mock('../src/api/client.js', () => ({ default: { get: vi.fn().mockResolvedValue({ data: { status: 'none' } }) } }));

describe("candidate review workspace", () => {
  it("opens interview evidence directly without reviving withheld scores", async () => {
    const onManage = vi.fn();
    render(<MemoryRouter><CandidatePortal
      candidate={{ _id: "test", status: "shortlisted", basicDetails: { name: "Test applicant" }, ats: { overallScore: 27 } }}
      report={{ hasInterview: true, interview: {
        status: "ended_early",
        competencyTriplet: { communication: 10, technicalKnowledge: 10 },
        evaluation: { overallScore: 20, summary: "Recommend against hiring.", communication: 10 },
      } }}
      onManage={onManage}
    /></MemoryRouter>);
    expect(screen.queryByText("Recommend against hiring.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Interview", exact: true }));
    await screen.findByText('No conversation text is available for this session.');
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("10/100")).not.toBeInTheDocument();
    expect(screen.queryByText("0/100")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hiring actions" }));
    expect(onManage).toHaveBeenCalledOnce();
  });
});
