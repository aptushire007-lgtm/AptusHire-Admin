import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { it, expect } from "vitest";
import { recordedStages, safeCandidateReturn, candidateHref } from "../src/lib/candidateJourney.js";
import CandidatePortal from "../src/components/candidate/CandidatePortal.jsx";

it("never infers skipped stages and rejects unsafe return URLs", () => {
  expect(recordedStages([{ stage: "applied" }, { stage: "next_round" }]).has("assessment_completed")).toBe(false);
  expect(recordedStages([{ stage: "next_round" }]).has("shortlisted")).toBe(true);
  for (const value of ["//evil.test", "https://evil.test", "/candidates\\evil"]) expect(safeCandidateReturn(value)).toBe("/candidates");
  expect(candidateHref("id", { pathname: "/pipeline", search: "?q=alice&page=2" })).toContain("returnTo=%2Fpipeline%3Fq%3Dalice%26page%3D2");
});

it("persists candidate section in URL and distinguishes unrecorded steps", () => {
  function Location() { return <output data-testid="location">{useLocation().search}</output>; }
  render(<MemoryRouter initialEntries={["/candidates/id?section=process&returnTo=%2Fpipeline%3Fpage%3D2"]}><CandidatePortal candidate={{ _id: "id", status: "shortlisted", stageHistory: [{ stage: "applied" }, { stage: "shortlisted" }] }} /><Location /></MemoryRouter>);
  expect(screen.getByText("Assessment Completed").parentElement).toHaveTextContent("Not recorded");
  fireEvent.click(screen.getByRole("button", { name: "Activity", exact: true }));
  expect(screen.getByTestId("location")).toHaveTextContent("section=timeline");
  expect(screen.getByTestId("location")).toHaveTextContent("returnTo=");
});
