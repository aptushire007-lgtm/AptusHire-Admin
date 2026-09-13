import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Video } from "lucide-react";
import { Card } from "../ui/Card.jsx";
import api from "../../api/client.js";

/**
 * The AI interview, played back: questions on the left, the recording on the
 * right, the transcript under it with timestamps that seek.
 *
 * ---------------------------------------------------------------------------
 * THE TIMESTAMPS ARE DERIVED, AND THE UI SAYS SO WHEN THEY CANNOT BE TRUSTED
 * ---------------------------------------------------------------------------
 *
 * An offset into the video is `turn.at - <when capture began>`, and there are
 * two answers to that second term.
 *
 * Browser-captured recordings stamp `recordingStartedAt` on their first chunk,
 * so the anchor is measured and the timestamps are exact. LiveKit Egress rows —
 * every recording made before the capture path moved into the browser — have no
 * such field and never will, so for those the anchor falls back to the moment
 * the INTERVIEW started, which is right only if capture began with it. Usually
 * it did. Sometimes it did not: camera permission granted late, an upload that
 * started on the second attempt, a resumed session.
 *
 * Seeking to a confidently wrong place is worse than not seeking, because the
 * reviewer believes what they land on. So a derived anchor is sanity-checked
 * against the recording's real duration (`anchorTrusted` below): if the last
 * turn lands past the end of the video, the anchor is wrong, and the timestamps
 * render as plain labels with a line saying why rather than as broken buttons.
 * A measured anchor skips that check — it is not a guess to be second-guessed.
 *
 * ---------------------------------------------------------------------------
 * LOADING THE VIDEO IS AN AUDITED ACT
 * ---------------------------------------------------------------------------
 *
 * The mount check asks for status only. The signed URL is minted on an explicit
 * click, because that request is what writes `interview.recording.view` to the
 * audit log — and an auto-playing report would log every recruiter who scrolled
 * past as having watched someone's interview.
 */

const SPEEDS = [0.5, 1, 1.5, 2, 2.5, 3];

function clock(seconds) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return null;
  const s = Math.floor(seconds);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function InterviewPlayback(props) {
  return <Playback key={props.sessionId || props.candidateId} {...props} />;
}

function Playback({ candidateId, sessionId, transcript = [], startedAt, id, recordingOnly = false, transcriptLabel = "Transcript" }) {
  const videoRef = useRef(null);
  const activeRef = useRef(null);
  const [state, setState] = useState({ status: "unknown", url: null, durationMs: null, startedAt: null });
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [playbackVersion, setPlaybackVersion] = useState(0);
  const [fileId, setFileId] = useState("");
  const [query, setQuery] = useState("");
  const mounted = useRef(true);
  const resumeAt = useRef(0);
  const endpoint = sessionId ? `/interview-sessions/recordings/${sessionId}` : `/interview-sessions/candidate/${candidateId}/recording`;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Status only, no `mint` — see the header. Most sessions have no recording, and
  // the layout below depends on knowing that before it draws a dead player.
  useEffect(() => {
    let cancelled = false;
    if (!candidateId && !sessionId) return undefined;
    setChecked(false);
    setError("");
    api
      .get(endpoint)
      .then((res) => {
        if (!cancelled)
          setState({
            status: res.data?.status || "none",
            url: null,
            durationMs: res.data?.durationMs ?? null,
            // The measured capture clock, present only on browser-captured rows.
            startedAt: res.data?.startedAt ?? null,
            canPlay: res.data?.canPlay,
            sessionId: res.data?.sessionId,
            files: res.data?.files || [],
            source: res.data?.source,
          });
      })
      .catch(() => {
        if (!cancelled) setError("Could not check recording availability. Try again.");
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint, candidateId, sessionId, refresh]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed, state.url]);

  // Keep the active transcript line in view, but only while the video is the
  // thing driving the scroll — `block: "nearest"` so a reviewer who has scrolled
  // away to read something is not yanked back on every timeupdate.
  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [now]);

  // The capture clock. `recordingStartedAt` when the recorder measured it; the
  // interview's own start when it did not. `anchorMeasured` is what the rest of
  // the component reads to know which of the two it is holding.
  const anchorMeasured = Boolean(state.startedAt);
  const anchor = state.startedAt || startedAt;

  // Offsets in seconds from the capture anchor, for every turn that has a
  // wall-clock time. Turns without one simply have no timestamp — never a zero,
  // which would send every unstamped line to the beginning of the video.
  const lines = useMemo(() => {
    const t0 = anchor ? new Date(anchor).getTime() : null;
    return (transcript || []).map((turn, i) => ({
      ...turn,
      index: i,
      offset: t0 && turn.at ? Math.max(0, (new Date(turn.at).getTime() - t0) / 1000) : null,
    }));
  }, [transcript, anchor]);

  const questions = lines.filter((l) => l.role === "ai" && l.kind === "question");

  // Does the DERIVED clock actually fit inside the recording? A 10% slack covers
  // the ordinary case where capture stops a moment after the last turn. Skipped
  // entirely for a measured anchor: the check exists to catch a bad guess, and
  // applying it to a real measurement would throw away good timestamps whenever
  // a recording was trimmed or a chunk was lost.
  const anchorTrusted = useMemo(() => {
    if (anchorMeasured) return true;
    if (state.source === "egress" || state.files?.length) return false;
    if (!state.durationMs) return false;
    const last = lines.filter((l) => l.offset != null).at(-1);
    if (!last) return false;
    return last.offset <= (state.durationMs / 1000) * 1.1;
  }, [anchorMeasured, lines, state.durationMs, state.source, state.files]);

  const canSeek = Boolean(state.url) && anchorTrusted;

  function seek(offset) {
    if (!canSeek || offset == null || !videoRef.current) return;
    videoRef.current.currentTime = offset;
    videoRef.current.play?.().catch(() => {
      /* autoplay policy — the reviewer can press play; the seek still happened */
    });
  }

  async function loadVideo() {
    setLoading(true);
    setError("");
    resumeAt.current = videoRef.current?.currentTime || now;
    try {
      // Pin playback to the session whose metadata was checked, even if a new attempt appeared.
      const playbackEndpoint = state.sessionId ? `/interview-sessions/recordings/${state.sessionId}` : endpoint;
      const res = await api.get(`${playbackEndpoint}?mint=1${fileId ? `&file=${encodeURIComponent(fileId)}` : ""}`);
      if (!mounted.current) return;
      if (!res.data?.url) throw new Error("Recording file is not available yet.");
      setPlaybackVersion(n => n + 1);
      setState((p) => ({
        ...p,
        status: res.data?.status,
        url: res.data?.url,
        durationMs: res.data?.durationMs ?? p.durationMs,
        startedAt: res.data?.startedAt ?? p.startedAt,
        expiresAt: res.data?.expiresAt,
      }));
    } catch (err) {
      if (mounted.current) setError(err.response?.data?.error || "Could not load the recording. Try again.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }

  if (!checked) return <p role="status" className="p-4 text-sm text-slate-500">Checking recording availability…</p>;
  const hasRecording = state.canPlay ?? state.status === "completed";
  // No recording AND no transcript is nothing to show. A transcript with no
  // recording still renders — that is most sessions, and the questions and
  // answers are the evidence; the video is the corroboration.
  // An explicit empty state remains visible.

  // The index of the line the video is currently inside.
  const activeIndex = canSeek
    ? lines.reduce((best, l) => (l.offset != null && l.offset <= now ? l.index : best), -1)
    : -1;

  return (
    <Card id={id} className="scroll-mt-32">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Video className="h-4 w-4 text-brand-600" aria-hidden="true" /> Interview recording
        </h3>
        {state.url && (
          <button
            type="button"
            onClick={loadVideo}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-canvas"
          >
            {loading ? "Refreshing…" : "Refresh playback link"}
          </button>
        )}
      </div>

      {error && <div role="alert" className="mb-4 space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        <p>{error}</p>
        <button type="button" disabled={loading} onClick={hasRecording ? loadVideo : () => setRefresh(n => n + 1)} className="font-semibold underline">Try again</button>
      </div>}
      {state.files?.length > 1 && <label className="mb-4 block space-y-1 text-sm text-slate-700">
        <span className="font-semibold">Recording file</span>
        <span className="block text-xs text-slate-500">This attempt has multiple captures. Choose the file you want to review.</span>
        <select aria-label="Recording file" value={fileId} onChange={event => {
          setFileId(event.target.value); setState(current => ({ ...current, url: null }));
          setNow(0); resumeAt.current = 0; setError("");
        }} disabled={loading} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
          <option value="">Choose a recording</option>
          {state.files.map((file, index) => <option key={file.id} value={file.id}>Recording {index + 1}{file.recordedAt ? ` — ${new Date(file.recordedAt).toLocaleString()}` : ""}</option>)}
        </select>
      </label>}
      <div className="grid gap-4">
        {/* ---- Left: the questions, in order ------------------------------ */}
        {!recordingOnly && <div className="min-w-0">
          <p className="mb-2 text-sm font-semibold text-[#5B6B63]">
            Indexed question markers ({questions.length})
          </p>
          {questions.length === 0 && <p className="mb-3 text-sm text-[#5B6B63]">This conversation has no question markers. Read the transcript below; this does not mean no questions were asked.</p>}
          <ol className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
            {questions.map((q) => {
              const stamp = clock(q.offset);
              return (
                <li key={q.index}>
                  <button
                    type="button"
                    onClick={() => seek(q.offset)}
                    disabled={!canSeek || q.offset == null}
                    className={`w-full rounded-lg border p-2.5 text-left transition-colors ${
                      activeIndex >= q.index
                        ? "border-brand-300 bg-brand-50/60"
                        : "border-slate-200 bg-canvas hover:bg-brand-50/30"
                    } ${canSeek && q.offset != null ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <span className="block text-xs leading-relaxed text-slate-700 [overflow-wrap:anywhere]">{q.text}</span>
                    {stamp && (
                      <span className="mt-1 block text-[11px] font-semibold tabular-nums text-brand-700">{stamp}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>}

        {/* ---- Right: the recording and the transcript --------------------- */}
        <div className="min-w-0">
          {hasRecording ? (
            state.url ? (
              <>
                <video
                  key={playbackVersion}
                  ref={videoRef}
                  src={state.url}
                  controls
                  playsInline
                  preload="metadata"
                  aria-label="Interview recording"
                  tabIndex={0}
                  onError={() => setError("Playback stopped or the link expired. Refresh the playback link to try again.")}
                  onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => {
                    const video = e.currentTarget;
                    // Capture the value now: currentTarget is cleared after event dispatch.
                    const duration = video.duration;
                    video.playbackRate = speed;
                    if (resumeAt.current && Number.isFinite(duration)) {
                      video.currentTime = Math.min(resumeAt.current, duration);
                      resumeAt.current = 0;
                    }
                    // The element's own duration beats the stored one — it is the
                    // file actually in front of the reviewer.
                    if (Number.isFinite(duration)) {
                      setState((p) => ({ ...p, durationMs: duration * 1000 }));
                    }
                  }}
                  className="aspect-video w-full rounded-lg bg-slate-900"
                />
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs font-semibold text-slate-600">Speed</span>
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSpeed(s)}
                      aria-pressed={speed === s}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        speed === s ? "bg-brand-600 text-white" : "bg-canvas text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {s === 1 ? "Normal" : `${s}x`}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex min-h-28 w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-canvas">
                <button
                  type="button"
                  onClick={loadVideo}
                  disabled={loading || (state.files?.length > 1 && !fileId)}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  {loading ? "Loading…" : "Play interview recording"}
                </button>
                {/* Said before the click, not after. Watching someone's interview
                    is recorded against your name, and that is the kind of thing a
                    person should know in advance rather than discover in a log. */}
                <p className="px-4 text-center text-[11px] text-slate-500">
                  Opening the recording is audit-logged against your account.
                </p>
              </div>
            )
          ) : (
            <div className="flex min-h-28 w-full items-center justify-center rounded-lg border border-dashed border-hairline bg-[#FAFCF8] px-6 text-center">
              {/* Four different absences, four different sentences. "No video"
                  covers a session that was never recorded, one still in progress,
                  one whose footage arrived but could not be assembled, and one
                  that failed outright — and a reviewer needs to know which,
                  because only one of them means the candidate's interview is
                  missing something. */}
              <p className="text-xs leading-relaxed text-[#5B6B63]">
                {state.status === "unknown"
                  ? "Recording availability could not be confirmed. Check again to load this interview."
                  : state.status === "recording"
                  ? "The recording is not yet available. Use the transcript below or check again later."
                  : state.status === "pending"
                    ? "The recording is being prepared. Check availability again shortly."
                  : state.status === "partial"
                    ? "Recording data arrived, but a playable file is not available. Review the available transcript; this does not establish that the interview was completed."
                    : state.status === "failed"
                      ? "Recording was enabled, but no playable video is available. Review the available transcript; missing video is not evidence of candidate performance."
                      : "No recording was captured for this session. The transcript below is the record."}
              </p>
            </div>
          )}

          {!hasRecording && <button type="button" onClick={() => setRefresh(n => n + 1)} className="mt-3 text-sm font-semibold text-brand-700 underline">Check availability again</button>}
          {!recordingOnly && <div id="sec-transcript" className="mt-4 scroll-mt-32">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h4 className="text-sm font-semibold text-[#5B6B63]">{transcriptLabel}</h4>
              {!anchorTrusted && (
                // The honest version of a feature that does not work here, rather
                // than buttons that jump somewhere plausible and wrong.
                <p className="text-[11px] text-[#5B6B63]">Times shown, but seeking is off — see below</p>
              )}
            </div>
            <label className="mb-3 block text-sm">Search conversation<input type="search" value={query} onChange={event => setQuery(event.target.value)} className="mt-1 block min-h-11 w-full rounded-md border border-slate-300 px-3" /></label>
            <div className="max-h-[32rem] space-y-2 overflow-y-auto rounded-lg border border-[#E3EBE4] p-3">
              {!lines.length && <p className="text-sm text-slate-600">No conversation text is available for this session.</p>}
              {query && !lines.some(line => line.text?.toLowerCase().includes(query.toLowerCase())) && <p className="text-sm text-slate-600">No matching turns. Clear the search to see the conversation.</p>}
              {lines.filter(line => !query || line.text?.toLowerCase().includes(query.toLowerCase())).map((l) => {
                const stamp = clock(l.offset);
                const active = l.index === activeIndex;
                return (
                  <div
                    key={l.index}
                    ref={active ? activeRef : null}
                    className={`flex gap-2 rounded px-1.5 py-2 text-sm leading-relaxed ${
                      active ? "bg-[#EAF8E4]" : ""
                    }`}
                  >
                    {stamp ? (
                      <button
                        type="button"
                        onClick={() => seek(l.offset)}
                        disabled={!canSeek}
                        className={`shrink-0 font-semibold tabular-nums ${
                          canSeek ? "cursor-pointer text-brand-700 hover:underline" : "cursor-default text-[#5B6B63]"
                        }`}
                      >
                        {stamp}
                      </button>
                    ) : (
                      <span className="shrink-0 text-[#5B6B63] tabular-nums">--:--</span>
                    )}
                    <div
                      className={`min-w-0 [overflow-wrap:anywhere] ${
                        l.role === "ai" ? "text-[#5B6B63]" : "font-medium text-[#0C1F1B]"
                      }`}
                    >
                      <span className="mb-0.5 block text-[11px] font-semibold text-[#5B6B63]">
                        {l.role === "candidate" ? "Candidate" : l.role === "ai" ? "AI interviewer" : "Unknown speaker"}
                      </span>
                      <p>{l.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {!anchorTrusted && (
              <p className="mt-2 text-[11px] leading-relaxed text-[#5B6B63]">
                Recording timing could not be verified against this transcript. Timestamps show the running order;
                use the video controls to seek.
              </p>
            )}
          </div>}
        </div>
      </div>
    </Card>
  );
}
