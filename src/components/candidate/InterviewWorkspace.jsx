import { useState } from 'react';
import InterviewPlayback from '../report/InterviewPlayback.jsx';
import { conversationEvidence, normalizeTurns, interviewDate } from '../../lib/interviewEvidence.js';
import { reviewInterview } from '../../lib/recruiterReview.js';

export function InterviewSummary({ interview: source }) {
  const interview = reviewInterview(source);
  if (!interview) return <p>No interview recorded.</p>;
  const ev = interview.evaluation;
  const score = ev?.overallScore;
  const limited = score == null || ev?.generatedBy === 'fallback' || interview.sessionQuality?.degraded;
  const answers = interview.substance?.totalAnswers ?? ev?.questionsAnswered;
  const questions = ev?.questionsAsked ?? interview.questionCount;
  return <section aria-label="Interview summary" className="space-y-3 text-sm text-slate-700">
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      <strong className="text-slate-950">{interview.attempt ? `Attempt ${interview.attempt}` : 'Interview'} · {interview.status?.replaceAll('_', ' ') || 'Status not recorded'}</strong>
      <span>{interview.completedAt ? 'Ended' : 'Started'} {interviewDate(interview.completedAt || interview.startedAt)}</span>
    </div>
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h2 className="font-semibold text-slate-950">{limited ? 'No reliable interview score' : `Interview score: ${score}/100`}</h2>
      <p className="mt-1 max-w-prose">{ev?.summary || (limited ? 'There is not enough assessed evidence for a reliable score. Review the available conversation before deciding the next step.' : 'AI evaluation — review the supporting evidence before making a decision.')}</p>
      <p className="mt-2 text-xs">{answers != null ? `${answers} answer segment${answers === 1 ? '' : 's'}` : 'Answer count not recorded'}{questions != null ? ` · ${questions} substantive question${questions === 1 ? '' : 's'} recorded` : ''}. These are different measures, not a completion ratio.</p>
      {limited && <p className="mt-1 text-xs">Unassessed criteria are not failed criteria. No strengths or gaps are inferred from missing evidence.</p>}
    </div>
    {!limited && <div className="grid gap-4 sm:grid-cols-2">{[['Strengths', ev?.strengths], ['Evidence gaps', ev?.weaknesses]].filter(([, rows]) => rows?.length).map(([label, rows]) => <div key={label}><h3 className="font-semibold">{label}</h3><ul className="mt-1 list-disc space-y-1 pl-5">{rows.map((row, i) => <li key={i}>{row}</li>)}</ul></div>)}</div>}
  </section>;
}

export default function InterviewWorkspace({ candidateId, interview }) {
  const [mode, setMode] = useState('full');
  const evidence = conversationEvidence(interview);
  const processed = mode === 'processed';
  const transcript = processed ? normalizeTurns(interview?.transcript) : evidence.transcript;
  return <section className="min-w-0" aria-label="Interview evidence">
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <h2 className="font-semibold text-slate-950">Conversation and recording</h2>
      {evidence.full && interview?.transcript?.length > 0 && <label className="text-sm">Conversation view <select value={mode} onChange={event => setMode(event.target.value)} className="ml-2 min-h-11 rounded-md border border-slate-300 bg-white px-3"><option value="full">Full conversation</option><option value="processed">Processed Q&amp;A</option></select></label>}
    </div>
    <p className="mb-3 text-xs text-slate-600">{processed || !evidence.full ? 'Processed Q&A: responses may be grouped and conversational exchanges omitted. This is not a verbatim conversation.' : 'Full conversation: recorded turns in their original order. Automated transcription may contain errors; verify against the recording.'}</p>
    <InterviewPlayback id="sec-playback" sessionId={interview?.sessionId} candidateId={candidateId} transcript={transcript} startedAt={interview?.startedAt} transcriptLabel={processed || !evidence.full ? 'Processed Q&A' : 'Full conversation'} />
  </section>;
}
