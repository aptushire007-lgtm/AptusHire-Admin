# Detailed recruiter UX changelog and local testing guide

**Updated:** 10 September 2026  
**Workspace:** `D:\Autonoetic_edge\Vijendra pratap\recruiter-new-AI`  
**Admin:** [Open local application](http://localhost:5173/)

## 1. Scope of this document

This documents the implementation following the recruiter-side UI/UX re-evaluation: candidate lifecycle accuracy, unresolved interview reviews, navigation, decision context and interface density. It also explains which previously restored report features were preserved.

It is not an inventory of every historical change in the repository, and it does not mean the broader enterprise roadmap is finished. Existing unrelated work was preserved.

## 2. Start or refresh the local application

If the app and API are already running, refresh the browser. The backend must load the updated route and model; restart it if it is not running with automatic reload.

If the servers are stopped, use two PowerShell terminals.

**Terminal 1 — backend:**

```powershell
Set-Location -LiteralPath 'D:\Autonoetic_edge\Vijendra pratap\recruiter-new-AI\AptusHire-Backend'
npm run dev
```

**Terminal 2 — admin:**

```powershell
Set-Location -LiteralPath 'D:\Autonoetic_edge\Vijendra pratap\recruiter-new-AI\AptusHire-Admin'
npm run dev
```

Then open [localhost:5173](http://localhost:5173/) and sign in to your existing recruiter/admin account. These commands assume the project's dependencies and existing environment configuration are already available. Do not start duplicate servers on occupied ports or replace environment files to test these changes.

The new review fields are additive; this change does not require a backfill or migration. Historical finished interviews without an explicit acknowledgement will be treated as pending review when their applications are in the active task scope.

## 3. Quick map: where each change appears

| Area | Where to open it | What to look for |
|---|---|---|
| Daily work | [Today](http://localhost:5173/) | Needs attention includes unresolved interview evidence reviews, including candidates already advanced |
| Candidate overview | [Example candidate](http://localhost:5173/candidates/6a9f5606821cdc7119a91f73) | Application now, latest recorded activity, interview evidence and review status |
| Lifecycle | Candidate → See recorded lifecycle, or More detail → Process | Current, Recorded and Not recorded labels |
| History | Candidate → Activity | Actual recorded stage events and available notes |
| Hiring controls | Candidate → Hiring actions | Stage actions separated from collapsed advanced record tools |
| Interview review | [Example report](http://localhost:5173/candidates/6a9f5606821cdc7119a91f73/interview-report) → Read evidence and review note | Transcript, review note, acknowledgement status and reviewer information |
| Pipeline | [Hiring Pipeline](http://localhost:5173/pipeline) | Interview review pending, expandable metrics and accessible cards on narrow screens |
| Screening exceptions | [Screening Review Queue](http://localhost:5173/review-queue) | Explicitly screening-only scope and a qualified empty message |
| Company candidates | [Candidates](http://localhost:5173/candidates) | Current-stage filter labels and retained origin when opening a record |
| Job candidates | Jobs → open a job's Applications | Retained filters and previous/next review navigation within the results page |

The example links depend on that record still existing in your logged-in company. A missing or inaccessible record is not a reason to bypass company permissions; use another suitable test record instead.

## 4. Detailed changes and how to inspect them

### 4.1 Lifecycle no longer assumes every previous stage was completed

**Previous problem:** Moving a candidate to a later stage visually marked earlier stages as reached, even where the history contained no such event. An assessment could therefore look completed simply because the candidate was shortlisted.

**Implemented:**

- Process now checks recorded stage history instead of position in the stage order.
- The current application stage is labelled **Current**.
- A stage present in history is labelled **Recorded**.
- A stage absent from history is labelled **Not recorded**.
- The expanded progress display in the advanced candidate tools uses the same evidence-based distinction.
- Legacy stage aliases are normalized before comparison.

**How to inspect:**

1. Open a candidate with non-sequential stage history.
2. Select **Activity** and note which stages actually appear.
3. Open **See recorded lifecycle**, or select **Process** under More detail.
4. Compare the two views.

**Expected:** A missing Assessment Completed event must not appear as Recorded merely because the candidate is Shortlisted.

**Important:** “Recorded” means a stage event exists. It does not certify evidence quality or imply every requirement was satisfied. “Not recorded” does not prove that an activity never happened outside the system, and is deliberately not labelled “Failed.”

### 4.2 Today now surfaces unresolved interview review work

**Previous problem:** A candidate could move beyond AI Interview Completed and disappear from stage-based attention lists while the interview still needed a human review.

**Implemented:**

- Today checks unresolved finished interview attempts independently of the candidate's current stage.
- An unresolved older attempt remains discoverable even when a newer attempt exists.
- The task opens the relevant report attempt using its attempt parameter.
- The dashboard continues to distinguish interview review tasks from application review and assessment-next-step tasks.
- The query remains company-scoped and excludes applications outside its active role/application scope, including missing or closed/filled/archived jobs and recorded pipeline exits.
- Review updates trigger a company-scoped event so mounted Today and Pipeline views can refresh.

**How to inspect:**

1. Open **Today**.
2. Find **Needs attention**.
3. Locate **Review interview evidence** for a candidate with a finished but unreviewed attempt.
4. Open it and check the report attempt.

**Observed in the demo:** The shortlisted example candidate now appears in Needs attention. At the time of the live check, the count was **1**. This is a snapshot, not a permanent expected count for your data.

### 4.3 Explicit recruiter evidence review with a required note

**Implemented:**

- The interview report contains a **Recruiter evidence review** section beside the transcript area.
- A top-level **Read evidence and review note** link makes that area reachable without scanning the whole report.
- Finished states eligible for review include completed, ended early, abandoned, halted and integrity-terminated interviews.
- The recruiter must enter a nonblank note, up to 2,000 characters.
- Saving records the attempt, reviewer identity/name, time and the session version reviewed.
- The form shows saving and failure states; a failed save keeps the typed note in the form.
- A current acknowledgement is displayed as **Evidence review recorded**.
- Earlier notes are preserved when a changed session is reviewed again.

**What saving does NOT do:**

- It does not shortlist, reject, hire or otherwise move the candidate.
- It does not change the interview score or remove evidence limitations.
- It does not send the candidate an email or invitation.
- It does not certify an AI recommendation as correct.
- It does not schedule or complete follow-up work mentioned in the note. Those actions still require their own workflow.

**Read-only inspection:**

1. Open an interview report.
2. Click **Read evidence and review note**.
3. Inspect the transcript, recording availability, explanatory text and disabled empty-note submit button.
4. Do not submit against a real applicant merely to test the feature.

**Disposable test-record validation:**

1. Use a designated synthetic candidate with a finished interview.
2. Read the evidence and enter a note describing what you reviewed and any follow-up needed.
3. Click **Record evidence review**.
4. Check reviewer, timestamp and note.
5. Confirm the hiring stage and scores did not change.
6. Return to Today and check that this resolved interview task is no longer pending. Other obligations may still keep the application in Needs attention.

### 4.4 Stale and competing review submissions are protected

**Implemented:**

- The API validates the candidate, attempt, version and note server-side.
- Candidate/session reads and the final write include company scope.
- Existing admin, company and subscription mutation guards protect the route.
- The write checks that neither the session nor its review changed while the recruiter was reading.
- A changed session returns a conflict instead of accepting an acknowledgement of stale evidence.
- A competing different review is not silently overwritten.
- Repeating the same acknowledgement by the same reviewer is idempotent.
- Successful recording creates an audit event and emits a company-scoped refresh event.

**Current conservative rule:** Any later InterviewSession update reopens review, including changes to session metadata. A dedicated evidence-only revision is not implemented yet. Recording the review itself does not update the session timestamp and therefore does not immediately reopen its own task.

**How to test safely:** Run the backend tests described below. Use controlled test fixtures for concurrent submissions and session changes; do not edit production records to simulate conflicts.

### 4.5 Application stage, interview outcome and evidence quality are separate

**Implemented:**

- Candidate overview shows the application stage separately from the interview outcome.
- Limited interview evidence is labelled **Limited evidence** in the candidate header rather than implying a current review-task state solely from the interview limitation.
- The overview separately reports **Recruiter review pending** or **Recruiter review recorded** when that information is available.
- Raw underscore-separated status in the report header is displayed in readable words.
- Candidate scheduling controls distinguish an ended session from a successfully completed evaluation.
- Unscored default ATS zeros are not treated as measured CV screening results in the candidate portal.

**How to inspect:** Open the example candidate and report. It is valid to see **Shortlisted**, **ended early**, and **Recruiter review pending** together: they describe different facts.

**Expected after acknowledgement:** Recording a review does not turn incomplete evidence into complete evidence. Evidence caveats remain visible.

### 4.6 Recording messages no longer misrepresent the interview outcome

**Previous problem:** A recording-service state could say “check back once the interview has finished” even when the interview had already ended early.

**Implemented:**

- The report explains that recording availability is not the interview outcome.
- A recording still unavailable from the service is described as an unavailable playable file, not proof of an ongoing interview.
- Partial/failed recording messages no longer promise that the interview completed or that nothing was lost.
- The available transcript remains the route to inspecting evidence.
- Existing audit-logged recording access behaviour is retained.

**How to inspect:** Open **Integrity & Proctoring → Candidate recording** and the playback area of a report with unavailable footage. The example report demonstrated this state during the live check.

**Not changed:** This is a truthful presentation fix, not recovery of missing recordings or a repair to the recording provider.

### 4.7 Screening Review Queue is explicitly scoped

**Implemented:**

- Sidebar entry reads **Screening reviews**.
- Page heading reads **Screening Review Queue**.
- Its empty state says there are no screening exceptions waiting there and directs recruiters to Today for interview evidence and other tasks.
- It no longer says that nothing anywhere needs a human decision.

**How to inspect:** Open [Screening Review Queue](http://localhost:5173/review-queue). An empty screening queue and a pending interview task on Today can now coexist without contradictory messaging.

### 4.8 Opening a candidate preserves the originating filters

**Implemented:**

- Links from Pipeline, company candidates and job applications carry the originating route/query.
- Candidate back navigation uses that safe internal return path.
- Return values are restricted to recognized internal route families; external/unsafe return targets fall back to Candidates.

**How to inspect:**

1. Open [Pipeline](http://localhost:5173/pipeline).
2. Search for a name and select a view or phase.
3. Open the candidate by name.
4. Use **Back to candidates**.

**Expected:** The original Pipeline query returns, rather than always opening the job's candidate list. The current back-link label remains “Back to candidates” even when its destination is Pipeline.

**Live verified:** Searching `GOVIND`, opening the candidate and returning restored `/pipeline?q=GOVIND` with the search still populated.

### 4.9 Candidate sections and report attempts are URL-backed

**Implemented:**

- Candidate section selection is stored in the `section` query parameter.
- Activity uses `section=timeline`; Process uses `section=process`.
- Report attempt selection is stored in the `attempt` parameter.
- Report links retain the candidate's selected section and return context.
- The candidate breadcrumb in the report returns to that section.

**How to inspect:** Select Activity, refresh, open the report, then click the candidate-name breadcrumb. Activity should remain selected. For a candidate with multiple attempts, change attempts and refresh to check the selected attempt persists.

**Boundary:** Directly shared URLs retain URL-backed context, but do not create a previous/next results set that was never provided.

### 4.10 Previous/next candidate review within a results page

**Implemented:**

- Company and job candidate lists supply the current results-page IDs when opening a candidate.
- The candidate page offers **Previous candidate** and **Next candidate** where neighbours exist.
- The position text explicitly says **on this results page**.
- The review set is carried in browser history state, not claimed to represent every candidate in the database.
- Candidate loading invalidates superseded responses and clears the previous candidate's displayed data on an ID change.

**How to inspect:** Open a company/job results page with at least two candidates, then open one and use the previous/next controls. Confirm the name and evidence match the selected candidate.

**Boundary:** This previous/next set is supplied by company/job lists, not every entry point. Pipeline links preserve their origin but do not supply this results-page review set.

### 4.11 Current-stage quick filters are more honest

**Implemented:**

- **Passed ATS** became **Currently ATS passed**.
- **Interview done** became **Currently interview completed**.

**Why:** These controls filter exact current stages. They are not historical “has ever completed this” filters.

**How to inspect:** Open company candidates or a job's Applications list. A shortlisted candidate does not have to appear in the exact current interview-completed filter just because they previously passed through that stage.

### 4.12 Candidate overview prioritizes the recruiter's immediate questions

**Implemented:**

- Default overview leads with **Application now**.
- **Latest recorded activity** shows the available stage event/date and note.
- **Interview evidence** shows outcome, limitations and review state.
- Direct controls open recorded lifecycle, activity and report evidence.
- AI narrative is available under **Read AI summary**, collapsed by default.
- The secondary detail selector is grouped into Profile, Evidence and Application.

**How to inspect:** Open a candidate and assess whether you can identify their current stage, latest event and outstanding interview review without opening the AI narrative.

### 4.13 Hiring actions and advanced tools are separated

**Implemented:**

- The main header's **Hiring actions** button opens the actions section.
- **Advanced record tools · rescore, export and erase** is collapsed within it.
- Stage controls are outside that inner advanced-tools disclosure.
- Existing capabilities remain available; they were not deleted merely to simplify the initial screen.

**How to inspect:** Open Hiring actions, then expand advanced tools only to inspect their placement. Do not trigger rescore, erase, invitation or stage actions on real applicants during a UI review.

### 4.14 Pipeline is less dense and no longer collapses on a narrow screen

**Implemented:**

- Summary metrics are under an expandable **Pipeline metrics** disclosure.
- The stage-based count says **In Under Review stage**, rather than implying it counts every unresolved decision.
- Board cards and list rows show **Interview review pending** when applicable.
- Live testing found that wrapped controls consumed a fixed-height page, leaving the card scroller at zero height.
- The outer page now has a minimum height and can grow vertically.
- Stage columns have a usable minimum height and a bounded scrolling area.

**How to inspect:** Resize the browser to a narrow or short viewport, open Pipeline and scroll to a populated stage. Candidate names must remain visible/clickable. Expand metrics and verify that cards are still reachable.

**Live verified:** The problematic card area changed from zero height to approximately 202 pixels with the demo's single candidate; opening that candidate then worked. The pixel value depends on data and viewport and is not a design requirement.

### 4.15 The restored Recruitment-AI report remains in use

**Preserved from the earlier restoration:**

- Legacy report score/findings presentation and restored report-specific components.
- Findings tabs, evidence panels, transcript and available playback.
- Suppression of unsupported scores/recommendations for limited evidence.
- Existing report/PDF access paths.

**Changed in this pass:**

- Added the explicit recruiter-review section and evidence jump link.
- Retained selected candidate section on return.
- Made attempt selection URL-backed.
- Clarified status and recording text.
- Put repeated **Evaluation details and provenance** behind a disclosure.

This pass did not replace the restored report with a new visual design or recover unavailable recordings. It did not visually certify every PDF export.

## 5. Main implementation files

Paths below are relative to the workspace root stated at the top of this document.

| File | Responsibility |
|---|---|
| `AptusHire-Admin/src/lib/candidateJourney.js` | Recorded-stage helper and safe return navigation |
| `AptusHire-Admin/src/components/candidate/CandidateLink.jsx` | Shared candidate links and optional results-page context |
| `AptusHire-Admin/src/components/candidate/CandidatePortal.jsx` | Overview, lifecycle, section URL state, grouped details and score reading |
| `AptusHire-Admin/src/pages/CandidateDetail.jsx` | Back/previous/next navigation, stale-load protection and hiring controls |
| `AptusHire-Admin/src/components/candidate/InterviewReview.jsx` | Review form, acknowledgement, errors and earlier notes |
| `AptusHire-Admin/src/pages/InterviewReport.jsx` | Review integration, URL-backed attempt and clarified report presentation |
| `AptusHire-Admin/src/components/report/ReportBreadcrumb.jsx` | Candidate section/context return |
| `AptusHire-Admin/src/components/report/InterviewPlayback.jsx` | Truthful unavailable-recording messages |
| `AptusHire-Admin/src/pages/dashboard/DashboardHome.jsx` | Refresh after review changes |
| `AptusHire-Admin/src/lib/recruiterTasks.js` | Independent interview review tasks |
| `AptusHire-Admin/src/pages/dashboard/HiringPipeline.jsx` | Pending-review indicators, retained links, metrics and responsive height fix |
| `AptusHire-Admin/src/lib/usePipelineData.js` | Pipeline refresh on review events |
| `AptusHire-Admin/src/pages/dashboard/CandidatesAll.jsx` | Company-list links, review set and filter wording |
| `AptusHire-Admin/src/pages/CandidateList.jsx` | Job-list links, review set and filter wording |
| `AptusHire-Admin/src/pages/dashboard/ReviewQueue.jsx` | Screening-only heading and empty message |
| `AptusHire-Admin/src/components/dashboard/DashboardShell.jsx` | Screening navigation label |
| `AptusHire-Backend/utils/interviewReview.js` | Per-attempt review state and pending-review lookup |
| `AptusHire-Backend/controllers/interviewReviewController.js` | Validated, scoped, conflict-safe acknowledgement endpoint |
| `AptusHire-Backend/models/InterviewSession.js` | Current review and earlier-review records |
| `AptusHire-Backend/controllers/candidateController.js` | Review information in interview report payload |
| `AptusHire-Backend/controllers/dashboardSummaryController.js` | Unresolved attempts in Today attention results |
| `AptusHire-Backend/controllers/pipelineReadController.js` | Pending-review information in paged pipeline rows |
| `AptusHire-Backend/routes/candidateRoutes.js` | Protected `POST /candidates/:id/interview-review` route |

## 6. Verification already completed

### Automated

- **110 admin tests passed** across 20 test files.
- **1,171 backend tests passed.**
- Production admin build passed with 2,456 transformed modules.
- Repository diff whitespace checks passed; Git reported line-ending warnings, not whitespace failures.
- Tests cover recorded-stage interpretation, unsafe return URLs, section persistence, note retention on failure, review task independence, stale/concurrent review handling, tenant-scoped queries and earlier-note preservation.
- A regression test protects the pipeline's growing outer container and filtered candidate href. Actual small-screen layout was also checked in the browser; a DOM unit test alone does not establish pixel correctness.

### Live, read-only checks

- Today showed the shortlisted candidate's unresolved interview task.
- Process showed Assessment Completed as Not recorded.
- Candidate overview separated Shortlisted, ended early and pending review.
- Report breadcrumb retained Process.
- Recording wording no longer claimed the ended interview was still running.
- Pipeline displayed the pending-review warning.
- The narrow-screen zero-height card area was reproduced and fixed.
- Opening a candidate from filtered Pipeline and returning preserved `q=GOVIND`.

### Not performed against real applicant data

- No real review note was submitted.
- No candidate was advanced, rejected, hired or erased.
- No invitation, reschedule or candidate email was sent.
- No audit-logged recording access was minted to test playback.
- No production migration or account merge was performed.

## 7. Run the checks yourself

**Admin regression tests and production build:**

```powershell
Set-Location -LiteralPath 'D:\Autonoetic_edge\Vijendra pratap\recruiter-new-AI\AptusHire-Admin'
npm test
npm run build
```

**Focused admin checks:**

```powershell
npm test -- test/candidateJourney.test.jsx test/recruiterTasks.test.js test/candidateReview.test.jsx test/legacyInterviewReport.test.jsx test/hiringPipeline.test.jsx
```

**Backend regression tests:**

```powershell
Set-Location -LiteralPath 'D:\Autonoetic_edge\Vijendra pratap\recruiter-new-AI\AptusHire-Backend'
npm test
```

**Focused backend checks:**

```powershell
node --test test/unit/interviewReview.test.js test/unit/dashboardSummary.test.js test/unit/pipelineSummary.test.js
```

These test results establish covered behaviours; they are not a production certification or a substitute for testing against an approved staging database.

## 8. Suggested manual acceptance checklist

- [ ] Today shows unresolved interview reviews even after stage advancement.
- [ ] Each review task opens the intended attempt.
- [ ] Process matches actual stage history rather than assumed sequential completion.
- [ ] Activity remains selected after refresh.
- [ ] Report breadcrumb returns to the selected candidate section.
- [ ] Pipeline filters survive candidate open/back navigation.
- [ ] Previous/next controls work from a multi-candidate company/job results page.
- [ ] Exact-stage quick filters are understood as current-stage filters.
- [ ] The default overview answers current stage, latest event and review status.
- [ ] Advanced record tools remain available but collapsed.
- [ ] Narrow-screen Pipeline cards stay reachable when controls wrap.
- [ ] Recording absence is not described as candidate failure or proof of completion.
- [ ] On a disposable fixture only, saving a review records reviewer/time/note without changing stage or scores.
- [ ] Controlled stale/concurrent review tests reject outdated writes.

Unchecked boxes are for your own acceptance run. They do not override the separate list of checks already performed above.

## 9. Remaining boundaries and enterprise release gates

The following are not claimed complete by this UX pass:

- Real database mutation/restore and disaster-recovery demonstrations.
- Large-tenant query/load testing and optimisation of server-side summary scans/lookups.
- Dedicated evidence-only revisioning instead of conservative session-update invalidation.
- Full keyboard, screen-reader, 200% zoom and device/browser coverage.
- Visual validation of real multi-page PDFs and all export fixtures.
- Enterprise identity/calendar provider selection, credentials and end-to-end integration validation.
- Re-application policy decisions and wider workflow-automation work.

Use `AptusHire-Admin/docs-updates/enterprise-release-1.md` for the broader release gates. The shorter implementation summary is `AptusHire-Admin/docs-updates/recruiter-ux-implementation-2026-09-10.md`.
