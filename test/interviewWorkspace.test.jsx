import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { it, expect, vi, beforeEach } from 'vitest';
import CandidatePortal from '../src/components/candidate/CandidatePortal.jsx';
import InterviewWorkspace from '../src/components/candidate/InterviewWorkspace.jsx';
import { conversationEvidence, safeEvidenceUrl, activityLabel } from '../src/lib/interviewEvidence.js';
import api from '../src/api/client.js';
vi.mock('../src/api/client.js', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
const interview = { sessionId: 'session-1', attempt: 1, status: 'ended_early', startedAt: '2026-09-08T04:00:00Z',
  conversationLog: [{ role: 'interviewer', text: 'Full original question', at: '2026-09-08T04:00:01Z' }, { role: 'user', content: 'Full original answer' }],
  transcript: [{ role: 'ai', kind: 'question', text: 'Processed question' }],
  evaluation: { overallScore: 20, questionsAnswered: 2, questionsAsked: 1, summary: 'Unsupported adverse summary' },
  recruiterReview: { eligible: true, required: true, attempt: 1, version: 'v1' },
};
beforeEach(() => { api.get.mockReset().mockResolvedValue({ data: { status: 'none', sessionId: 'session-1' } }); api.post.mockReset(); });
it('uses full conversation consistently, preserves input, and validates external evidence links', () => {
  const before = JSON.stringify(interview);
  expect(conversationEvidence(interview).transcript.map(turn => turn.role)).toEqual(['ai', 'candidate']);
  expect(JSON.stringify(interview)).toBe(before);
  for (const url of ['GitHub', '/candidates/GitHub', 'javascript:alert(1)', 'https://user:pass@example.com']) expect(safeEvidenceUrl(url)).toBeNull();
  expect(safeEvidenceUrl('https://github.com/team/project')).toBe('https://github.com/team/project');
});
it.each(['evaluation', 'evaluation-detail', 'overall-score', 'recording', 'summary-report'])('keeps legacy %s links in the Interview parent without false attribution', async section => {
  render(<MemoryRouter initialEntries={['/candidates/id?section=' + section]}><CandidatePortal candidate={{ _id: 'id', status: 'shortlisted' }} report={{ hasInterview: true, interview }} /></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'Interview', exact: true })).toHaveAttribute('aria-current', 'page');
  expect(screen.queryByRole('combobox', { name: 'More candidate details' })).toBeNull();
  expect(screen.getByText('No reliable interview score')).toBeInTheDocument();
  expect(screen.queryByText('AI + Recruiter')).toBeNull();
  expect(screen.queryByText('Unsupported adverse summary')).toBeNull();
  expect(await screen.findByText('Full original question')).toBeInTheDocument();
});
it('shows an explicit claims empty state instead of Overview', () => {
  render(<MemoryRouter initialEntries={['/candidates/id?section=claims-probed']}><CandidatePortal candidate={{ _id: 'id' }} /></MemoryRouter>);
  expect(screen.getByText('No resume claims were probed for this candidate.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Interview', exact: true })).toHaveAttribute('aria-current', 'page');
});

it('links role context to an existing job applications route', () => {
  render(<MemoryRouter><CandidatePortal candidate={{ _id: 'id', job: { _id: 'job-1', title: 'Engineer' } }} /></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Engineer' })).toHaveAttribute('href', '/jobs/job-1/candidates');
});
it('labels processed evidence, searches turns, and does not mint playback on mount', async () => {
  render(<InterviewWorkspace candidateId="id" interview={interview} />);
  await screen.findByText('Full original question');
  expect(api.get).toHaveBeenCalledWith('/interview-sessions/recordings/session-1');
  expect(api.get.mock.calls.some(([url]) => url.includes('mint'))).toBe(false);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'no-match' } });
  expect(screen.getByText(/No matching turns/)).toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Conversation view' }), { target: { value: 'processed' } });
  expect(screen.getAllByText('Processed question').length).toBeGreaterThan(0);
  expect(screen.queryByText('Full original question')).toBeNull();
});
it('qualifies only the matching attempt end event', () => {
  const end = { ...interview, completedAt: '2026-09-08T04:00:00Z' };
  expect(activityLabel({ stage: 'ai_interview_completed', at: end.completedAt }, end)).toBe('Interview ended — ended early');
  expect(activityLabel({ stage: 'ai_interview_completed', at: '2026-09-07T04:00:00Z' }, end)).toBeNull();
});
