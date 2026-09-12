import { useState } from "react";
import api from "../../api/client.js";

export default function InterviewReview({ candidateId, review, onRecorded, onReload, draftNote, onDraftChange }) {
  const [localNote, setLocalNote] = useState("");
  const note = draftNote ?? localNote;
  const setNote = onDraftChange || setLocalNote;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!review?.eligible) return null;
  async function submit(event) {
    event.preventDefault();
    if (busy || !note.trim()) return;
    setBusy(true); setError("");
    try {
      const { data } = await api.post(`/candidates/${candidateId}/interview-review`, { attempt: review.attempt, version: review.version, note: note.trim() });
      onRecorded?.(data.review); setNote("");
    } catch (err) {
      setError(err.response?.data?.error || "Your review was not saved. Your note is kept; try again.");
    } finally { setBusy(false); }
  }
  return <section aria-label="Recruiter evidence review" className="rounded-lg border border-slate-300 bg-white p-5 text-sm text-slate-700">
    <h2 className="font-semibold text-slate-950">{review.required ? "Interview evidence needs your review" : "Evidence review recorded"} · Attempt {review.attempt}</h2>
    <p className="mt-2">Reviewing evidence is separate from moving the application. This action sends no candidate message and does not change scores or hiring stage.</p>
    <div className="mt-3 flex flex-wrap gap-4"><a href="#sec-transcript" className="font-medium text-brand-700 underline">Read transcript</a><a href="#sec-playback" className="font-medium text-brand-700 underline">Check recording availability</a></div>
    {review.recorded && <div className="mt-3 border-t border-slate-200 pt-3">
      <p>{review.recorded.current ? "Reviewed" : "Previous review — session changed since then"} by {review.recorded.byName || "Recruiter"} · {new Date(review.recorded.at).toLocaleString()}</p>
      <p className="mt-1 whitespace-pre-wrap break-words">{review.recorded.note}</p>
    </div>}
    {review.required && <form onSubmit={submit} className="mt-4 space-y-3">
      <label className="block font-medium">Review note <textarea required maxLength={2000} value={note} disabled={busy} onChange={event => setNote(event.target.value)} rows={3} className="mt-2 block w-full rounded-md border border-slate-300 p-3 font-normal" placeholder="What evidence did you review, what remains uncertain, and what follow-up is needed?" /></label>
      <p className="text-xs">Recording a review does not remove evidence limitations. Any later session update reopens this task.</p>
      {error && <p role="alert" className="text-red-700">{error} {onReload && <button type="button" onClick={onReload} className="underline">Refresh evidence (keep note)</button>}</p>}
      <button type="submit" disabled={busy || !note.trim() || !review.version} className="rounded-md bg-brand-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Saving review…" : "Record evidence review"}</button>
    </form>}
    {review.history?.length > 0 && <details className="mt-4 border-t border-slate-200 pt-3"><summary className="cursor-pointer font-medium">Earlier review notes ({review.history.length})</summary><ol className="mt-3 space-y-3">{review.history.map((entry, index) => <li key={index}><p>{entry.byName || "Recruiter"} · {new Date(entry.at).toLocaleString()}</p><p className="whitespace-pre-wrap break-words">{entry.note}</p></li>)}</ol></details>}
  </section>;
}
