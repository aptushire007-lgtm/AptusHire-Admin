import { beforeEach, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import InterviewPlayback from "../src/components/report/InterviewPlayback.jsx";
import Recordings from "../src/pages/dashboard/Recordings.jsx";
import api from "../src/api/client.js";

vi.mock("../src/api/client.js", () => ({ default: { get: vi.fn() } }));
beforeEach(() => api.get.mockReset());

it("handles metadata after event dispatch and resumes refreshed playback with the selected speed", async () => {
  api.get.mockResolvedValue({ data: { status: "completed", url: "https://example.test/video.mp4" } });
  render(<StrictMode><InterviewPlayback sessionId="session" startedAt="2026-09-10T00:00:00Z" transcript={[{ role: "candidate", text: "Answer", at: "2026-09-10T00:00:20Z" }]} /></StrictMode>);
  fireEvent.click(await screen.findByRole("button", { name: "Play interview recording" }));
  const video = await screen.findByLabelText("Interview recording");
  expect(screen.getByRole("button", { name: "00:20" })).toBeDisabled();
  Object.defineProperty(video, "duration", { configurable: true, value: 60 });
  fireEvent.loadedMetadata(video);
  expect(screen.getByRole("button", { name: "00:20" })).toBeEnabled();

  // Unknown media duration must not replace the last usable measurement.
  Object.defineProperty(video, "duration", { configurable: true, value: NaN });
  fireEvent.loadedMetadata(video);
  expect(screen.getByRole("button", { name: "00:20" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "1.5x" }));
  video.currentTime = 25;
  fireEvent.timeUpdate(video);
  fireEvent.click(screen.getByRole("button", { name: "Refresh playback link" }));
  await waitFor(() => expect(screen.getByLabelText("Interview recording")).not.toBe(video));
  const refreshedVideo = screen.getByLabelText("Interview recording");
  Object.defineProperty(refreshedVideo, "duration", { configurable: true, value: 60 });
  fireEvent.loadedMetadata(refreshedVideo);
  expect(refreshedVideo.currentTime).toBe(25);
  expect(refreshedVideo.playbackRate).toBe(1.5);
  expect(screen.getByRole("button", { name: "00:20" })).toBeEnabled();
});

it("checks metadata without minting; plays the exact checked session on explicit click", async () => {
  api.get.mockResolvedValueOnce({ data: { status: "completed", sessionId: "old-attempt" } })
    .mockResolvedValueOnce({ data: { status: "completed", url: "https://example.test/recording.webm?signed=1" } });
  render(<InterviewPlayback candidateId="candidate" recordingOnly />);
  fireEvent.click(await screen.findByRole("button", { name: "Play interview recording" }));
  const video = await screen.findByLabelText("Interview recording");
  expect(video).toHaveAttribute("src", "https://example.test/recording.webm?signed=1");
  expect(video).toHaveAttribute("controls");
  expect(video).not.toHaveAttribute("autoplay");
  expect(api.get.mock.calls.map(([url]) => url)).toEqual([
    "/interview-sessions/candidate/candidate/recording", "/interview-sessions/recordings/old-attempt?mint=1",
  ]);
});

it("recovers from a failed mint and refreshes an expired playback link", async () => {
  api.get.mockResolvedValueOnce({ data: { status: "completed" } })
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({ data: { status: "completed", url: "https://example.test/first.mp4" } })
    .mockResolvedValueOnce({ data: { status: "completed", url: "https://example.test/fresh.mp4" } });
  render(<InterviewPlayback sessionId="session" recordingOnly />);
  fireEvent.click(await screen.findByRole("button", { name: "Play interview recording" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  fireEvent.error(await screen.findByLabelText("Interview recording"));
  expect(screen.getByRole("alert")).toHaveTextContent("link expired");
  fireEvent.click(screen.getByRole("button", { name: "Refresh playback link" }));
  await waitFor(() => expect(screen.getByLabelText("Interview recording")).toHaveAttribute("src", "https://example.test/fresh.mp4"));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("retries unavailable metadata and explains a partial recording without claiming no footage", async () => {
  api.get.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ data: { status: "partial", canPlay: false } });
  render(<InterviewPlayback sessionId="session" recordingOnly />);
  fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
  expect(await screen.findByText(/Recording data arrived/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Play interview recording" })).not.toBeInTheDocument();
});

it("does not keep a previous session's video when switching attempts", async () => {
  api.get.mockResolvedValueOnce({ data: { status: "completed" } })
    .mockResolvedValueOnce({ data: { status: "completed", url: "https://example.test/old.mp4" } })
    .mockResolvedValueOnce({ data: { status: "none" } });
  const { rerender } = render(<InterviewPlayback sessionId="first" recordingOnly />);
  fireEvent.click(await screen.findByRole("button", { name: "Play interview recording" }));
  await screen.findByLabelText("Interview recording");
  rerender(<InterviewPlayback sessionId="second" recordingOnly />);
  expect(screen.queryByLabelText("Interview recording")).not.toBeInTheDocument();
  expect(await screen.findByText(/No recording was captured/)).toBeInTheDocument();
});

it("opens a library recording in place and links to the matching AI report attempt", async () => {
  api.get.mockImplementation(url => Promise.resolve({ data: url === "/interview-sessions/recordings" ? {
    recordings: [{ sessionId: "old-session", candidateId: "candidate", candidateName: "Alex", status: "recording", attempt: 2, jobTitle: "Engineer" }], totalPages: 1,
  } : { status: "recording", canPlay: true } }));
  render(<MemoryRouter><Recordings /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Open recording for Alex, attempt 2" }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: "Play interview recording" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open AI report for this attempt" })).toHaveAttribute("href", "/candidates/candidate/interview-report?attempt=2#sec-playback");
  expect(api.get.mock.calls.some(([url]) => url.includes("mint"))).toBe(false);
});

it("requires an explicit file choice for multiple captures of the same interview", async () => {
  api.get.mockResolvedValueOnce({ data: { status: "recording", canPlay: true, files: [{ id: "capture-one" }, { id: "capture-two" }] } })
    .mockResolvedValueOnce({ data: { status: "completed", url: "https://example.test/chosen.mp4" } });
  render(<InterviewPlayback sessionId="session" recordingOnly />);
  expect(await screen.findByRole("button", { name: "Play interview recording" })).toBeDisabled();
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "capture-two" } });
  fireEvent.click(screen.getByRole("button", { name: "Play interview recording" }));
  expect(await screen.findByLabelText("Interview recording")).toHaveAttribute("src", "https://example.test/chosen.mp4");
  expect(api.get).toHaveBeenLastCalledWith("/interview-sessions/recordings/session?mint=1&file=capture-two");
});

it("keeps transcript seeking disabled when a historical Egress capture has no measured clock", async () => {
  api.get.mockResolvedValueOnce({ data: { status: "completed", source: "egress", durationMs: 60000 } })
    .mockResolvedValueOnce({ data: { status: "completed", url: "https://example.test/history.mp4" } });
  render(<InterviewPlayback sessionId="session" startedAt="2026-09-10T00:00:00Z" transcript={[{ role: "candidate", text: "Answer", at: "2026-09-10T00:00:20Z" }]} />);
  fireEvent.click(await screen.findByRole("button", { name: "Play interview recording" }));
  await screen.findByLabelText("Interview recording");
  expect(screen.getByRole("button", { name: "00:20" })).toBeDisabled();
  expect(screen.getByText(/Recording timing could not be verified/)).toBeInTheDocument();
});
