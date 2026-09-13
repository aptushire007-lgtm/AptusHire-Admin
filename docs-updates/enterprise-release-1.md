# Enterprise release 1: verified backlog and migration design

Updated: 2026-09-09. Corporate recruiting first. This is an incremental release, not a claim of enterprise certification.

## Current status — supersedes older pending labels below

| Area | Completed locally | Still required |
| --- | --- | --- |
| Reports | Read-time summary safeguards, consistent count labels, score-source clarification, PDF regression matrix (completed, zero, suppressed, no evaluation, no interview) | Real multi-page export visual parity, broader keyboard/zoom testing and historical instrument-policy audit |
| Candidate workspace | Job navigation, URL filters, mobile pipeline, retry/error states, historical applications removed from active moves | Full critical-flow browser coverage |
| Identity | Stable-account-only automatic grouping; unlinked applications remain separate; empty-identity lookup blocked; tenant-scoped grouped job lookup | Approved copied-data audit/restore and re-application policy decision; no new Person collection justified yet |
| Scaling | Server-paged company candidate list (50 records), Jobs application-count aggregate, Today summary with 20 application tasks/page, Pipeline query-specific 50-record pages and server summaries; all shell routes skip full application loading | Pipeline metrics stream matching records server-side in constant memory, but still scan them per request. Jobs still loads its full job catalogue for client filters; measured large-tenant load testing and further query optimisation remain |
| Bulk actions | Concurrent batch guard; valid-transition filtering; updated/failed/skipped results; unresolved selections retained | Staging end-to-end validation of email/event side effects and partial failures |
| Enterprise rollout | Existing authorization, audit, retention, dispatch and connector code inventoried | Staging isolation/recovery/load tests, automation controls, chosen calendar/SSO providers, tenant configuration, credentials and partner approvals |

The broad enterprise plan is not fully finished. Browser/export assurance, automation controls and measured performance work remain; they are not all blocked by missing credentials. Production rollout and real-data validation require explicit target/configuration inputs. No real stage moves, messages, identity merges or database migrations were performed. UI redesign has not started in this continuation, per the user's sequencing request.

## Backend/data-loading continuation — 2026-09-09

- Today now reads `/candidates/dashboard-summary`: tenant-scoped application counts, trend buckets, stage distribution, five recent applications, four interview records and twenty attention applications per page. Published-rubric tasks retain their existing job-based source.
- Pipeline now reads `/candidates/pipeline`: server job/search/phase/sort/page filters, fifty applications per page, full-filter metrics and stage counts, global active/historical totals. Account data is not grouped or rewritten. Both job joins enforce the authenticated company independently.
- Pipeline summary accumulation uses a narrow cursor projection and constant accumulator memory. It is not a precomputed/materialised aggregate or proof of large-tenant performance. Counts and records can change between concurrent reads; no snapshot-consistency guarantee is claimed.
- Board/list page controls explicitly distinguish full-filter counts from visible cards. Bulk selection is page-scoped and cleared on filter/page changes. Stage actions pause during stale/error reads and concurrent moves. Search debounce does not remove input focus.
- The shell no longer requests the full application collection on any route. Existing layout and visual design were retained; only functional paging/status text was added.
- Verified: 102 admin tests, 1,169 backend tests, production admin build (2,450 modules), and both repository whitespace checks pass. Browser reads on the local Demo Company show 23 historical-inclusive applications, one active pipeline record, and 22 historical records outside the board. Empty search preserves focus and shows no matching results. No live hiring action was tested by mutating data.
- Local test: keep both dev servers running; open `/` then `/pipeline?view=list`. Try a name/skill search and a phase filter, then clear them. On tenants with more than fifty matching active applications, page controls must preserve global counts while showing only fifty cards. Unit tests cover a 501-record summary and clamped page eleven; this is not a seeded 501-record browser/load test.
- Rollback: revert the new summary/pipeline endpoint and their consuming page changes together; no schema migration or data rollback is needed. Preserve unrelated workspace changes.

### Still open before calling the enterprise roadmap complete

1. Engineering/verification: full job-catalogue server pagination, measured query/load optimisation, real multi-page PDF/browser parity and broader critical-flow coverage, historical instrument-policy review, and detailed reconciliation of the differing legacy report UI.
2. Next UI phase: visual implementation, keyboard/zoom verification and explicit automation-control UX. These have not been silently marked complete.
3. External release gates: approved copied database and restore target, staging side-effect/isolation tests, calendar/SSO provider and tenant configuration, and re-application policy decision. Existing restriction and disconnected integrations remain unchanged.

## Interview-report restoration — explicit follow-up request

The user subsequently requested the previous Recruitment-AI interview-report implementation at `/candidates/:id/interview-report`. The prior page was restored as the base, with eight report-specific components isolated under `src/components/recruitment-ai-report` so other reports are unaffected. Human-review projection, current PDF/playback safeguards, request-race protection and corrected count labels are retained. This targeted restoration supersedes the earlier deferral of legacy report UI reconciliation; the broader UI redesign remains separate.

## Source treatment

- `analysis-1.md`: product hypotheses and workflow direction. Numbered competitor citations have no resolvable bibliography; referenced mockups are absent. Verify vendor claims before integration commitments.
- `copmi-analysed-feature-2.md`: discovery checklist, not a verified authenticated audit. Do not assume its 405/auth or bundle-size diagnosis applies locally.
- Previous project located at `D:/Autonoetic_edge/Vijendra pratap/Recruitment-AI`. Its `backend/utils/interviewReportEngine.js` is byte-equivalent under git diff to the current engine. The prior interview-report page and its presentation components were restored on explicit user request as documented above; no wholesale backend or repository pull was performed.

## Verified gap register

| ID | Status / evidence | Action and acceptance gate |
| --- | --- | --- |
| R1 | Partial: browser review projection in `src/lib/recruiterReview.js`; PDF endpoint previously used raw report | Apply a read-time server projection to JSON and PDF endpoints. Withheld reports must not print adverse summary recommendations or overall/competency summary scores. Preserve original evidence. Projection tests added; PDF visual QA pending. |
| R2 | Partial: earlier live walkthrough found question counts with different denominators | Define asked, attempted, declined and planned separately; trace transcript/session counters before changing values. Same definition in screen and export. Pending. |
| R3 | Partial: earlier walkthrough found conflicting CV decision labels | Trace CV threshold and report chip sources; use one policy/version per application. Pending. |
| R4 | Improved in previous pass: application-based report counts and historical drilldowns | Preserve fixes; add large-data/server-pagination work before enterprise scale. |
| U1 | Partial: direct candidate tabs and hiring actions implemented; mobile pipeline still awkward | Job-scoped list fallback, preserved filters and keyboard actions; test narrow viewport and 200% zoom. Pending. |
| D1 | Confirmed structural coupling: `models/Candidate.js` contains job, company, history and per-job unique indexes | Separate identity without rewriting application-time evidence. Migration design below; no DB migration authorized by this document. |
| S1 | Present, assurance pending: JWT and role/tenant context in `middleware/auth.js` | Test denied roles and cross-tenant read/write/export access. Existing code is not proof every endpoint is secure. |
| S2 | Present, assurance pending: `models/AuditLog.js`, retention job and background workers | Verify audit coverage, access controls, retention behaviour, failed jobs and backup restoration. |
| N1 | Present: job-specific candidate route and lazy page loading in `src/App.jsx` | Build on existing routes; preserve deep links when introducing a job workspace. |
| I1 | Unverified: full two-way inbox, calendar and HRIS integrations | Inventory existing delivery paths before implementing. Choose first provider with pilot customers; no dummy connected states. |
| A1 | Deferred: agency payroll, timesheets, commissions | Corporate workflow first; separate scope and commercial decision later. |

## Person/application migration design (not executed)

### Correction after deeper dependency inspection

The initial proposal below is superseded pending an identity audit: `CandidateProfile` already exists, uniquely linked to User, and current applications link through `candidateUser` and `candidateProfile`. Intake populates those links. `candidateController.relatedApplications` already provides a company-scoped multi-role endpoint, and CandidateDetail already renders related applications. Do not introduce a competing Person collection or migrate IDs merely to satisfy the competitor document's terminology.

Added `backend/utils/applicationIdentityAudit.js` and `scripts/auditApplicationIdentities.js`: read-only planning over a local application export, no DB access or writes. Existing account/profile IDs are grouping evidence; shared emails only raise review hints. Tenant boundaries and all application IDs remain intact. Audit real copied data before deciding whether a tenant-owned talent-pool overlay is actually needed.

Dependency inventory: AssessmentSession, AtsAssessment, CandidateRejectionReport, InterviewQueue, Notification, InterviewSession, ScoreOutcome, ProctoringEvidence, UsageEvent, ClaimGraph, ReviewItem and RoundScorecard all reference legacy Candidate application IDs. Candidate also has hiredApplication references. Preserve those IDs.

### Historical proposal — conditional only, not an approved migration

- Current Candidate documents are application-shaped. Keep their IDs and API routes during transition; do not rename/drop the collection initially.
- Add tenant-scoped `Person` and a nullable `personId` on each existing application-shaped Candidate. Expose an Application API adapter over legacy records first. A physical collection rename is optional later.
- Person holds current contact/identity and pool tags. Application retains submitted contact snapshot, resume bytes/text/hash, provenance, consent receipt, job, source, owner, rubric version, score snapshots and history.
- Assessments, sessions, recordings, invitations and reports remain tied to the existing application ID. A changed person profile must not rewrite historical evidence.
- Never merge identities across tenants. Normalize email by trim/lowercase only initially; shared contact information and conflicting identities require review. Do not infer identity from a name alone or strip plus suffixes globally.
- Re-application window is unresolved. Preserve existing per-job uniqueness behaviour until product policy and index migration are approved.

### Conditional rollout sequence — only if the identity audit establishes a need

1. Inventory all `Candidate` references in schemas, routes, workers, exports and analytics. Record foreign-key counts and missing references.
2. Back up and restore a database copy; demonstrate recovery before migration work.
3. Add Person schema, nullable relationship and compatibility reader; feature flag defaults off. No destructive schema changes.
4. Build dry-run planner that emits proposed links, conflicts and counts. For ambiguity, keep separate provisional people and queue review.
5. Implement restart-safe backfill with stable mapping and unique tenant-scoped migration keys. Never send events/emails or rerun assessments during backfill.
6. Reconcile every old application ID, evidence hash, history entry and assessment/session reference. Test one person/two jobs, missing emails, shared emails, case variants and tenant boundaries.
7. Shadow-read new relationships and compare counts against legacy reads. Cut over one test tenant, then a pilot tenant after approval.
8. New intake creates/resolves person and application atomically or with a durable idempotent transaction workflow. Handle concurrent duplicate submissions explicitly.
9. Roll back by disabling relationship reads while retaining all application writes in the legacy-compatible shape. Keep mapping records for diagnosis. No drop/merge/delete migration in release 1.

## Delivery order and definition of done

1. Finish R1-R3 and export parity; browser + export checks on completed, ended-early, suppressed, no-evaluation and no-interview fixtures.
2. Finish U1 and shared error/permission states. Keep existing design tokens and direct actions; avoid adding decorative KPI cards.
3. Complete migration dependency inventory and dry-run specification; review before any real-data mutation.
4. Use the existing identity/application relationships first. A new identity rollout requires audit evidence and explicit approval; job-centred navigation does not depend on it.
5. Explicit automation, enterprise controls and customer-led integrations follow the approved roadmap.

For each slice: regression tests, build, actual browser check, changed/unchanged list, local test instructions and rollback notes. Do not mark a feature complete solely because a route/model exists.

## Local verification of this slice

- Keep backend and admin development servers running, then open `http://localhost:5173/`.
- Open an ended-early candidate's Interview report. Expect human review, no adverse summary recommendation and no overall/competency summary score. Download its PDF and compare the same fields.
- Repeat with a completed measurable interview; valid scores must remain, including zero.
- This projection preserves raw transcript evidence and any per-answer scores; it is not a complete redesign of every evidence instrument.
- Backend: `node --test test/unit/reportPresentation.test.js`.
- Admin: `npm test`; production bundle: `npm run build`.
- No database migration, external messages, integrations or legacy-code overwrite were performed in this slice.

## Follow-up implementation and verification

- Report screen: removed generic score-zone interpretations that conflicted with supplied CV verdicts; neutralised gauge colour bands. Missing/empty values stay unscored.
- Counts: distinguish attempted answer segments, minimum-word-count checks, indexed question markers and planned maximum. No historical counters rewritten; raw conversation markers are not assumed to enumerate questions.
- PDF: same count terminology, readable ended-early status, explicit unavailable overall score, page-numbered footer inside reserved margin; recommendation heading/reason kept together. Synthetic incomplete-report rendering inspected. Real-download path triggered in browser, but no accessible downloaded file was returned, so real-data PDF visual parity remains pending.
- Pipeline: URL-backed job/search/phase/view/sort; list now respects phase. Added phone-width list with candidate actions, compact phase selector, wrapping controls and job-workspace links.
- Job applications: added navigation to the job-scoped pipeline, rubric, assessments and job settings. Existing routes preserved.
- Related applications: distinguish stable-account matches from email-only hints; no longer claim email matches prove identity.
- Integrations settings: failed status loading now shows an explicit error/retry instead of silently hiding the section.
- Dashboard: added Today attention list for recorded pending states, fixed broken recent-job URLs and mislabeled interview-queue link/count. No fabricated SLA or priority.
- Job applications: real server pagination (50/page) and name/email search; job+tenant scope maintained, regex metacharacters escaped, stage filter applied before counts/page selection. URL preserves page/filter/search. Stale responses cannot replace newer search results. Unscreened schema-default zeros are no longer shown as CV scores.
- Final verification: 88 admin tests and 1,158 backend tests passed; production admin build passed (2,448 modules). Both repositories pass `git diff --check` (line-ending warnings only).
- Live Today verification: application counts no longer imply verified distinct people; shortlist does not imply offer readiness; queue count does not carry an unrelated CV average. Removed empty comparison badges and excluded CV-only passes from interview activity.

## Remaining release gates (not completed)

1. Validate identity audit against an approved database copy and demonstrate restore. No production migration or account merges.
2. Select first calendar and enterprise identity provider, target tenant and credentials through approved configuration. No invented connected integrations or SSO claims.
3. Confirm re-application policy; current restriction remains unchanged.
4. Inspect real multi-page exports and completed/no-interview fixtures; expand large-data, keyboard and 200% zoom coverage.
5. Today and Pipeline no longer fetch all application pages (2026-09-09 follow-up). Pipeline summary computation still scans narrow projected records server-side; large-tenant query optimisation and load testing remain. Jobs uses server counts but its catalogue is not yet server-filtered/paged. Workflow automation UX and measured end-to-end enterprise isolation/load/recovery tests remain open.
6. Existing `emailDispatchService` already logs, retries and reports delivery failures. Existing connector drivers are partner-gated. Their availability is not evidence of production credentials, partner approval, duplicate-send protection or end-to-end delivery; verify before enabling.

Enterprise rollout is not complete. Tests demonstrate covered behaviours, not certification or a substitute for staging validation.

## Recruiter UX implementation — 2026-09-10

The five priority re-evaluation findings are implemented: recorded lifecycle, independent per-attempt interview reviews, clearer status/evidence meanings, retained candidate navigation, and a focused default workspace. See [implementation and local test guide](recruiter-ux-implementation-2026-09-10.md) for exact scope and limitations. Latest verification: 110 admin tests, 1,171 backend tests, production build and diff whitespace checks passed. Live read-only checks confirmed the shortlisted candidate remains in Today's review tasks and unrecorded assessment completion is no longer implied. A narrow-screen zero-height pipeline was fixed and candidate navigation retested successfully. No real hiring or review mutations were performed.

## Reliability follow-up — 2026-09-09

- Workspace refresh commits only a complete core-data snapshot. A failed later application page preserves the prior snapshot and reports failure; superseded requests cannot overwrite newer data. Unmount invalidates requests and settles queued refresh promises.
- Related-application lookup now distinguishes loading/failure from an empty result and offers retry. Email-only identity hints remain qualified.
- Invalid pipeline phase deep links fall back to all phases. The active board excludes applications with missing/closed/filled/archived roles or recorded pipeline exits; candidate history remains linked. Bulk targets are rechecked against the current filtered applications.
- Pipeline refresh failure blocks stage actions and offers retry instead of presenting stale data as current.
- Verification: 95 admin tests passed; production build passed. Browser confirmed the obsolete-phase URL renders all current phases and shows one current application with a notice for 22 historical applications in the demo tenant. No stage changes were performed.
- This does not replace company-wide loading with server aggregates, verify every historical record, or complete staging isolation/recovery checks. Backend was unchanged in this follow-up; its previous 1,158-test result remains the latest backend run.

## Candidate paging and job-count follow-up — 2026-09-09

- Company candidate search, stage filters and page are URL-backed and server-paged; report cohorts keep their application denominator and creation-date range. Shared email alone never groups records. Schema-default unscored zeros are hidden, while measured zero is retained.
- Grouped candidate lookup explicitly scopes joined job metadata by tenant. Missing identity returns no siblings rather than querying empty-email records.
- Jobs uses tenant-scoped grouped application counts, not candidate payloads. The previous first-100-job cap is removed. Stage/capacity events refresh counts; superseded job requests cannot overwrite newer results.
- Dashboard shell only requests the full candidate collection for Today and Pipeline. Switching back into those routes exposes loading until the correct data scope arrives.
- Bulk stage changes no longer swallow failures as success. Results persist on screen, failed/skipped selections are retained, and simultaneous batch attempts are blocked.
- Report PDF content tests cover completed measurable scores (including zero), suppression, no evaluation and no interview. This is content verification, not a replacement for visual inspection of real exports.
- Previous-project comparison: report engine has no diff; PDF service, interview report UI, analytics UI and assessment report UI differ. No blind copy was made. Detailed behavioral reconciliation of the large interview UI diff remains open.
- Verification: 100 admin tests, 1,166 backend tests and production admin build passed. Both repositories pass diff whitespace checks. Live browser confirmed candidate search returns the expected two unlinked records and Jobs shows the expected applicant count.
- Local checks: open `/candidates`, search, change stage, open a candidate and use browser Back; verify the URL restores filters. Open `/jobs` and compare application counts with each job's application list. Use synthetic test fixtures for bulk/PDF edge cases; do not test bulk actions against real applicants.
