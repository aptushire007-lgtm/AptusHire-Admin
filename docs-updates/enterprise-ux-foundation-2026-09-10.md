# Enterprise UX foundation — 10 September 2026

This is the first implementation slice of the 40-page enterprise UX specification. The full rollout remains active. `output/ux-review/IMPLEMENTATION-STATUS.md` in the parent workspace tracks the entire report, including items not yet implemented.

## Behavior delivered

- A canonical `/jobs/:id` workspace names the role and its saved publication status. Overview, Candidates, Evaluation plan, Job post and Assessment results stay within that context. Existing edit, rubric, question, assessment and applicant URLs remain compatible. Job-title links carry the jobs collection query back through local navigation. The shell no longer remounts the whole page tree on each pathname change. Missing/error/permission responses receive specific recovery UI; superseded reads cannot populate a different job.
- Overview separates saved job facts, rubric approval and publication. Evaluation links explain the purpose of existing editors. Job post provides an applicant-facing content preview, explicit careers-page publication confirmation and access to existing board controls. An uncertain publish response requires checking server status before retrying. These screens do not yet replace the server readiness contract planned for the next slice.
- Job form rules now produce field errors, linked hints and a focused error summary. Untouched initial inputs do not show validation failures. Failed loads cannot expose an empty edit form; failed saves retain entered values. Save prevents further editing while in progress. Successful edits return to the named job overview.
- The data router allows a shared guard to protect links, browser Back and programmatic route changes. Reload/close uses the browser’s unsaved-change warning. Successful saves bypass the guard. Early title-only autosave is not claimed: the existing Job model still requires a description, and the separate server draft resource remains pending.
- Shared overlays support right placement, an explicit initial focus target, described dialogs, optional footers, busy dismissal protection and dirty-dismissal confirmation. Dirty content remains mounted when confirming departure. The background is inert and scrolling is locked while overlays are open; nested dismissal retains the remaining overlay’s isolation. Hidden/disabled controls are excluded from focus wrapping. Toast announcement regions now live outside the inert application root.
- Interviews now distinguishes failed queue loading from a valid empty queue. It links queued candidates to their interview evidence, without claiming a report exists. Deleted candidate references do not produce undefined profile links. Removing a queue entry names the candidate/job, explains the limited effect and requires confirmation. Failures appear inside the dialog.

## Verification

- Full admin suite: **168 tests passed across 31 files**. Command: `npx vitest run --pool=threads --maxWorkers=2 --minWorkers=1 --reporter=dot`.
- Focused foundation suite: **23 tests passed across five files**, covering field/summary recovery, failed load/save, successful navigation, browser Back, unload warnings, numeric dependencies, overlay focus/dismissal, nested inertness, live-region placement, job return context, superseded reads, queue failures/deleted references and uncertain publication responses.
- Production build passed. Targeted `git diff --check` passed.
- Browser fixture inspected at **1280×800** and **390×844**: role overview, evaluation navigation, job-post preview and edit form. At phone width, local navigation wraps and measured document width remains within the viewport. Unsaved navigation opens a readable dialog with initial focus on Stay; Tab wraps among its controls. Invalid title submission focuses the summary; its link focuses the title with `aria-invalid=true` and the linked error ID. Explicit discard restores the saved role context.
- Independent finish review identified the shell remount/return-context issue, inaccessible dialog-error channel and uncertain-publication claim. All three were corrected before the final verification.
- Test environment adjustment: jsdom’s AbortSignal was incompatible with Node’s native Request used by the data router. Router tests now use matching native abort classes; navigation and requests are not mocked away.

Logs are in the parent workspace’s `output/ux-review/`: `admin-regression-tests.log`, `foundation-tests.log`, `admin-build.log`.

## Verification boundaries and next work

Browser checks used a clearly labeled synthetic preview with a stubbed API. No live job was published, queue entry removed, applicant evaluated or external message sent. The preview entry is not imported by the production application.

This slice does not establish production database behavior, large-tenant performance, screen-reader certification, 200% zoom coverage or a recruiter usability study. The backend and candidate app were not changed in this slice. Server drafts, four-stage setup, server readiness, activity, candidate inspection drawers, query/search bounds, AI operations, remaining page blueprints and full release gates remain on the original implementation ledger.

## Surface contract

Mode: Operate. Recruiters should know which role they are working on, which artifact they are editing and which action is next. Inherit the existing forest/white workspace and readable type. Use a named object header and wrapping local navigation; no second permanent sidebar. Preserve the existing approval/freeze semantics and distinguish saved draft, approved artifact and public posting. The report already fixes the visual direction. Server readiness and resumable early drafts are the next dependencies.
