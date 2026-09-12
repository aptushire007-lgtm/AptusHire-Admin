# Recruiter workflow updates — 10 September 2026

This implements the five priority findings from the recruiter UX re-evaluation. It is not a claim that the wider enterprise rollout is complete.

## Implemented

1. **Recorded lifecycle, not assumed completion.** Candidate Process and expanded progress use actual stage history. Optional or absent stages say “Not recorded”; current and recorded stages are distinct. A later shortlist cannot imply that an assessment was completed.
2. **Independent interview review.** Finished interview attempts require an explicit recruiter evidence review. Today finds unresolved attempts even after stage advancement. Pipeline cards and list rows expose pending reviews. The report accepts a required note, records reviewer/time, preserves earlier notes, and never moves the candidate, changes a score or sends a candidate message. Tenant and role gates apply server-side. Stale/concurrent submissions are rejected. Repeating the same acknowledgement is idempotent. Any subsequent session update conservatively reopens review; this intentionally includes non-evidence session metadata changes until a dedicated evidence revision exists.
3. **Separate meanings.** Application stage, interview outcome, evidence limitations and recruiter acknowledgement are distinct. Recording availability no longer claims that an ended interview is still running or that missing footage proves anything about performance. Screening Review Queue describes screening exceptions only; it no longer claims that all human decisions are finished.
4. **Retained navigation.** Candidate links from company/job lists and Pipeline retain their origin query. Candidate sections and report attempt selection use URL parameters. Report breadcrumbs return to the selected candidate section. Company/job list visits provide previous/next candidates within that results page using browser history state; shared direct links have no inferred review set. Candidate reads invalidate superseded responses.
5. **Focused default view.** Overview leads with current stage, latest recorded activity and interview review state. AI narrative is collapsed; detailed choices are grouped. Advanced rescore/export/erase tools are collapsed separately within Hiring actions. Pipeline metrics and duplicated report evaluation details are expandable. The restored Recruitment-AI report components remain in use. Live narrow-screen testing found and fixed a zero-height board caused by wrapped controls inside a fixed-height container; the page now grows, and columns retain a usable minimum height with their own bounded scroll area.

## Test locally

Keep the existing backend and admin dev servers running; if the backend is not watched, restart it for the new review route/schema. No data migration is required for the additive fields. Existing completed attempts without an acknowledgement will appear as pending.

1. Open `http://localhost:5173/`: inspect Needs attention and open an interview-review task.
2. Open the candidate, then Process: compare Recorded/Not recorded against Activity. Shortlisted must not imply every earlier stage was completed.
3. From Pipeline, search and choose a view/phase. Open a candidate, select Activity, open the report, then return through its breadcrumb and Back to candidates. Filters and section should remain.
4. From company/job candidate results, use Previous/Next candidate. The count explicitly covers the current results page, not the entire database.
5. On the report, use “Read evidence and review note.” Inspect transcript/recording first. **Use a disposable test candidate** to submit a review note. Verify that the task clears, the note records its reviewer/time, and the hiring stage and scores do not change. A later session update must reopen the review. Earlier notes remain available.
6. For failures and concurrent updates, run the automated mocked tests rather than manipulating real applicants.

Commands from each corresponding repository:

```powershell
# AptusHire-Admin
npm test
npm run build
# AptusHire-Backend
npm test
```

## Verification and limits

- Admin: 110 tests passed across 20 files; production build passed (2,456 modules).
- Backend: 1,171 tests passed; focused review/summary tests cover per-attempt state, tenant-scoped queries, validation, optimistic conflicts, safe updates and preservation of earlier notes.
- Live, read-only demo check: Today now shows the unresolved interview for the shortlisted candidate; Process explicitly labels Assessment Completed as Not recorded; Pipeline shows Interview review pending; report breadcrumb retains Process; recording copy no longer says the interview is still running. After correcting the zero-height board, clicking the candidate from a narrow filtered Pipeline successfully opens the profile with a return link to `/pipeline?q=GOVIND`.
- No real review acknowledgement, hiring move, invitation, email, erasure or recording-access mint was submitted during verification.
- This pass does not certify large-tenant query performance, real database mutation/recovery, full keyboard/screen-reader coverage, 200% zoom or visual PDF pagination. Those remain release gates in `enterprise-release-1.md`.
