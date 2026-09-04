import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Video, Download } from "lucide-react";
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

export default function InterviewPlayback({ candidateId, transcript = [], startedAt, id }) {
  const videoRef = useRef(null);
  const activeRef = useRef(null);
  const [state, setState] = useState({ status: "unknown", url: null, durationMs: null, startedAt: null });
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [now, setNow] = useState(0);

  // Status only, no `mint` — see the header. Most sessions have no recording, and
  // the layout below depends on knowing that before it draws a dead player.
  useEffect(() => {
    let cancelled = false;
    if (!candidateId) return undefined;
    api
      .get(`/interview-sessions/candidate/${candidateId}/recording`)
      .then((res) => {
        if (!cancelled)
          setState({
            status: res.data?.status || "none",
            url: null,
            durationMs: res.data?.durationMs ?? null,
            // The measured capture clock, present only on browser-captured rows.
            startedAt: res.data?.startedAt ?? null,
          });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "none", url: null, durationMs: null, startedAt: null });
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed, state.url]);

  // Keep the active transcript line in view, but only while the video is the
  // thing driving the scroll — `block: "nearest"` so a reviewer who has scrolled
  // away to read something is not yanked back on every timeupdate.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
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
    if (!state.durationMs) return false;
    const last = lines.filter((l) => l.offset != null).at(-1);
    if (!last) return false;
    return last.offset <= (state.durationMs / 1000) * 1.1;
  }, [anchorMeasured, lines, state.durationMs]);

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
    try {
      const res = await api.get(`/interview-sessions/candidate/${candidateId}/recording?mint=1`);
      setState((p) => ({
        ...p,
        status: res.data?.status,
        url: res.data?.url,
        durationMs: res.data?.durationMs ?? p.durationMs,
        startedAt: res.data?.startedAt ?? p.startedAt,
      }));
    } finally {
      setLoading(false);
    }
  }

  if (!checked) return null;
  const hasRecording = state.status === "completed";
  // No recording AND no transcript is nothing to show. A transcript with no
  // recording still renders — that is most sessions, and the questions and
  // answers are the evidence; the video is the corroboration.
  if (!hasRecording && !lines.length) return null;

  // The index of the line the video is currently inside.
  const activeIndex = canSeek
    ? lines.reduce((best, l) => (l.offset != null && l.offset <= now ? l.index : best), -1)
    : -1;

  return (
    <Card id={id} className="scroll-mt-32">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-[#1A1A1A]">
          <Video className="h-4 w-4 text-brand-600" aria-hidden="true" /> AI Interview
        </h3>
        {state.url && (
          <a
            href={state.url}
            download
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8E8E4] px-2.5 py-1.5 text-xs font-semibold text-[#1A1A1A] hover:bg-[#F5F5F0]"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" /> Download video
          </a>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ---- Left: the questions, in order ------------------------------ */}
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-semibold tracking-[0.06em] text-[#6B6B6B] uppercase">
            Questions asked ({questions.length})
          </p>
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
                        ? "border-brand-300 bg-[#FFE8DC]/60"
                        : "border-[#E8E8E4] bg-[#F5F5F0] hover:bg-[#FFE8DC]/30"
                    } ${canSeek && q.offset != null ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <span className="block text-xs leading-relaxed text-[#1A1A1A] [overflow-wrap:anywhere]">{q.text}</span>
                    {stamp && (
                      <span className="mt-1 block text-[11px] font-semibold tabular-nums text-brand-700">{stamp}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {/* ---- Right: the recording and the transcript --------------------- */}
        <div className="min-w-0">
          {hasRecording ? (
            state.url ? (
              <>
                <video
                  ref={videoRef}
                  src={state.url}
                  controls
                  onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => {
                    e.currentTarget.playbackRate = speed;
                    // The element's own duration beats the stored one — it is the
                    // file actually in front of the reviewer.
                    if (Number.isFinite(e.currentTarget.duration)) {
                      setState((p) => ({ ...p, durationMs: e.currentTarget.duration * 1000 }));
                    }
                  }}
                  className="aspect-video w-full rounded-lg bg-slate-900"
                />
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs font-semibold text-[#6B6B6B]">Speed</span>
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSpeed(s)}
                      aria-pressed={speed === s}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        speed === s ? "bg-brand-600 text-white" : "bg-[#F5F5F0] text-[#6B6B6B] hover:bg-[#F5F5F0]"
                      }`}
                    >
                      {s === 1 ? "Normal" : `${s}x`}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[#E8E8E4]-mid bg-[#F5F5F0]">
                <button
                  type="button"
                  onClick={loadVideo}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  {loading ? "Loading…" : "Play interview recording"}
                </button>
                {/* Said before the click, not after. Watching someone's interview
                    is recorded against your name, and that is the kind of thing a
                    person should know in advance rather than discover in a log. */}
                <p className="px-4 text-center text-[11px] text-[#6B6B6B]">
                  Opening the recording is audit-logged against your account.
                </p>
              </div>
            )
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-[#E8E8E4]-mid bg-[#F5F5F0] px-6 text-center">
              {/* Four different absences, four different sentences. "No video"
                  covers a session that was never recorded, one still in progress,
                  one whose footage arrived but could not be assembled, and one
                  that failed outright — and a reviewer needs to know which,
                  because only one of them means the candidate's interview is
                  missing something. */}
              <p className="text-xs leading-relaxed text-[#6B6B6B]">
                {state.status === "recording"
                  ? "Recording in progress — check back once the interview has finished."
                  : state.status === "partial"
                    ? "The recording was captured but could not be assembled into a playable file. The footage is stored and the interview itself is complete — the transcript below is the record."
                    : state.status === "failed"
                      ? "Recording was enabled for this interview but no video arrived. Nothing was lost from the interview itself — the transcript below is the record."
                      : "No recording was captured for this session. The transcript below is the record."}
              </p>
            </div>
          )}

          <div className="mt-4">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className="text-[11px] font-semibold tracking-[0.06em] text-[#6B6B6B] uppercase">Transcript</p>
              {state.url && !anchorTrusted && (
                // The honest version of a feature that does not work here, rather
                // than buttons that jump somewhere plausible and wrong.
                <p className="text-[11px] text-[#6B6B6B]">Times shown, but seeking is off — see below</p>
              )}
            </div>
            <div className="max-h-[18rem] space-y-1 overflow-y-auto rounded-lg border border-[#E8E8E4] p-2">
              {lines.map((l) => {
                const stamp = clock(l.offset);
                const active = l.index === activeIndex;
                return (
                  <div
                    key={l.index}
                    ref={active ? activeRef : null}
                    className={`flex gap-2 rounded px-1.5 py-1 text-[11px] leading-relaxed ${
                      active ? "bg-[#FFE8DC]" : ""
                    }`}
                  >
                    {stamp ? (
                      <button
                        type="button"
                        onClick={() => seek(l.offset)}
                        disabled={!canSeek}
                        className={`shrink-0 font-semibold tabular-nums ${
                          canSeek ? "cursor-pointer text-brand-700 hover:underline" : "cursor-default text-[#9B9B9B]"
                        }`}
                      >
                        {stamp}
                      </button>
                    ) : (
                      <span className="shrink-0 text-[#9B9B9B] tabular-nums">--:--</span>
                    )}
                    <span
                      className={`min-w-0 [overflow-wrap:anywhere] ${
                        l.role === "ai" ? "text-[#6B6B6B]" : "font-medium text-[#1A1A1A]"
                      }`}
                    >
                      {l.text}
                    </span>
                  </div>
                );
              })}
            </div>
            {state.url && !anchorTrusted && (
              <p className="mt-2 text-[11px] leading-relaxed text-[#6B6B6B]">
                The timestamps are measured from when the session started, and for this interview they run past the end
                of the video — so capture began late, and jumping to one would land in the wrong place. They&rsquo;re shown
                as a running order rather than as links.
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
