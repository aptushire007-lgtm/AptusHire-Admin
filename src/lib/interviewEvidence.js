// Presentation adapters only. Stored conversation and evaluation records are never rewritten.
export function normalizeTurns(turns = []) {
  return turns.map(turn => ({ ...turn,
    role: ['ai', 'assistant', 'interviewer'].includes(turn.role) ? 'ai' : ['candidate', 'user'].includes(turn.role) ? 'candidate' : 'unknown',
    text: turn.text || turn.content || '',
  }));
}

export function conversationEvidence(interview) {
  const raw = interview?.conversationLog;
  const full = Array.isArray(raw) && raw.length > 0;
  return { transcript: normalizeTurns(full ? raw : interview?.transcript || []), full };
}

export function safeEvidenceUrl(value) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return null;
  try { const url = new URL(value); return url.username || url.password ? null : url.href; } catch { return null; }
}

export function interviewDate(value) {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime()) ? date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }) : 'Not recorded';
}

export function activityLabel(entry, interview) {
  // Qualify only the matching attempt's event; do not relabel historical attempts.
  const sameEnd = entry.at && interview?.completedAt && new Date(entry.at).getTime() === new Date(interview.completedAt).getTime();
  return sameEnd && interview?.status === 'ended_early' && entry.stage === 'ai_interview_completed' ? 'Interview ended — ended early' : null;
}
