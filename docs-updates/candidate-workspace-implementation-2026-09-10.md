# Candidate workspace implementation — 10 September 2026

## What changed

The enterprise-recruiter critique has been implemented as a focused admin refinement, preserving the original AptusHire design and current hiring safeguards. No production candidate records, interview outcomes, scores, invitations or saved notes were changed by this implementation.

### Navigation

- Five primary destinations: Overview, Profile & CV, Assessments, Interview, Activity.
- Relevant subsections replace the 21-option More detail dropdown.
- Old Summary, Overall Score, Evaluation, Detailed Evaluation and Recording links resolve to the shared Interview workspace; old CV Analysis/ATS Breakdown links resolve to CV screening, and Full Log to Activity.
- Claims & probes now opens its actual recorded evidence or a specific empty state instead of falling back to Overview. Pending probes are explicitly not verified claims.
- Active parent navigation remains selected for nested views.
- Candidate context stays visible while scrolling at tablet/desktop widths. On phones the wrapping navigation remains in document flow so it cannot hide anchor destinations.
- The role link opens the existing job-applications route.

### Interview evidence and review

- Candidate Interview and Full interview report use one shared evidence/review component.
- Both default to the full conversation when available. Processed Q&A is an explicit separate choice, with a warning that responses may be grouped and exchanges omitted.
- Speaker roles are normalized consistently without changing stored evidence.
- Recording requests are pinned to the report's session ID when available. Recording links are still minted only on an explicit playback click and remain audit-logged.
- Transcript search, readable turns, consistent timestamps and honest unavailable/empty states were added. Seeking remains disabled when timing cannot be verified.
- The empty interview gauge is replaced by a compact limitation summary. Valid measurable full-report scores retain the original report styling.
- Answer segments and substantive questions are labelled as different measures, not the impossible “2 answered of 1 asked” ratio.
- Actual attempt timing includes timezone. Stored scheduling time is behind an explicitly labelled scheduling disclosure; no explanation of the historical discrepancy is invented.
- Human review is available beside evidence on wide screens and below it on narrow screens, with a prominent Review evidence entry point.
- False “AI + Recruiter” attribution and automated “Recruiter Feedback” have been removed. Actual saved reviews retain author, time and attempt/version.
- Review notes remain required; recording one neither changes the application stage nor sends a candidate message.
- Drafts survive candidate subsection changes and failed in-app evidence refreshes. This is in-memory draft retention during the visit, not persisted autosave across closing/reloading the page.

### Less duplication and clearer source information

- CV screening factors, result and document methodology are grouped together. Empty score rings are no longer rendered as instruments.
- Screening threshold results are explicitly separate from application stage and recruiter decisions.
- Duplicated timeline and screening panels were removed from Hiring actions.
- Saved application/source comparison, document signals and field provenance now live under Profile & CV > Resume. Existing source information remains available.
- Saved experience dates are not silently rewritten to match a resume. The comparison explains that these are submitted fields, not independently verified facts.
- Invalid project/repository strings no longer become local /candidates/GitHub links. Only valid HTTP(S) links without embedded credentials are linked.
- Offer status remains available under Activity.
- Only the matching ended-early attempt's lifecycle event is labelled “Interview ended — ended early”; other historical events are not reinterpreted.
- Monitoring is described as active during the session, not currently active. Unexplained numeric risk emphasis is removed from the candidate monitoring summary; limitations and unscored camera-quality context remain.
- Full-report monitoring details follow the evidence/review workspace and are collapsed by default.
- Template-generated follow-ups in the report now request evidence for the named unassessed requirement instead of asking for a generic “example” of a degree. Previously stored probe text is preserved as evidence, not silently rewritten.

## How to inspect locally

Open http://localhost:5173/candidates/6a9f5606821cdc7119a91f73?returnTo=%2Fcandidates&section=ai-interview and hard-refresh with Ctrl+Shift+R.

1. Confirm the five primary sections and Interview subsections.
2. Confirm the compact no-reliable-score state, actual attempt date and explicit answer/question units.
3. Click Review evidence: the note form should be available on this page.
4. Compare Full conversation and Processed Q&A. Search for a word and then clear it. Do not treat the processed view as verbatim.
5. Open Full interview report: its default conversation, speaker labels and times should agree with the candidate page.
6. Open Claims & probes, Criteria and Monitoring: the Interview parent should remain active.
7. Open Profile & CV > CV screening, then Resume > Submitted application and source comparison.
8. Open Activity and Recorded stages. Unrecorded stages must not appear completed.
9. Open Hiring actions: it should focus on actual actions and no longer repeat the whole profile.
10. On a disposable test record only, verify note submission and stage movement separately. The implementation's automated tests mock the save endpoint; no real review was submitted during browser verification.

If the dev server is stopped:

```powershell
Set-Location 'D:\Autonoetic_edge\Vijendra pratap\recruiter-new-AI\AptusHire-Admin'
npm run dev
```

The existing backend is still required. No environment or database migration changes were made.

## Verification

- Full automated admin suite: 145 tests passed across 26 files. Production build passed. Final `git diff --check` passed.
- New regression coverage: legacy routes, correct parent state, raw/processed distinction, speaker normalization, unsafe links, explicit review-only submission, no playback mint on mount, subsection draft retention, failed-refresh draft retention, and matching-attempt lifecycle labels.
- Independent finish review identified draft-loss and mobile-anchor risks; these were corrected.
- Browser inspected desktop 1280x720 and phone 390x844, including candidate/report evidence, review jump and grouped navigation. No horizontal page overflow was measured in those phone views.
- No real note submission, hiring mutation, playback, invitation or PDF download was performed. Backend/PDF generation logic was not changed. Full screen-reader and 200%-zoom certification are not claimed.
- Existing inconsistencies in stored schedule/profile data remain preserved and labelled, not “repaired” by guessing. Assignment owners, deadlines and unavailable workflow capabilities were not fabricated.

## Main implementation files

- src/components/candidate/CandidatePortal.jsx
- src/components/candidate/InterviewWorkspace.jsx
- src/components/candidate/InterviewReview.jsx
- src/components/report/InterviewPlayback.jsx
- src/pages/CandidateDetail.jsx
- src/pages/InterviewReport.jsx
- src/lib/interviewEvidence.js
- src/lib/recruiterReview.js

Impeccable guided preservation of the established identity, progressive disclosure, readable states, and the independent finishing review. The earlier critique remains a historical snapshot, not a fresh certification of the changed screen.
