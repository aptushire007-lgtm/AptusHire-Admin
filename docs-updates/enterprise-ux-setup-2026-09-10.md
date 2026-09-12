# Guided job setup - 10 September 2026

This continues the complete enterprise UX specification. It implements the main UX-05/06 workflow and extends the UX-02/03/04 foundations. The overall rollout remains active; this is not a claim that every report requirement is delivered.

## Behavior now available

- `/jobs/new` opens Role brief, Evaluation plan, Candidate journey, and Review & publish. The stepper uses saved jobs, actual approval/readiness checks, recorded review and publication to mark completion. Advanced screening defaults are disclosed separately. Field validation happens on blur and Continue; summary links open collapsed sections before moving focus.
- A title-only brief can be saved without creating a Job. `SetupDraft` stores company, creator, schema version, source, values, current step, revision and timestamp. Draft lists are paginated and scoped to the creator. Linked jobs are visible to company administrators; the interface explains this transition.
- Autosave waits for typing to settle and reports Saved only after acknowledgement. Continue drains any in-flight save and persists newer edits before creating a job. An uncertain request is replayed with its original key; confirmed validation failures allow corrected input. Conflicts preserve local values and require choosing the saved version or keeping local edits.
- Materialization reserves a job ID and locks the draft while creation is in progress. A lost response can be recovered without creating a second job. If status cannot be reloaded, the form stays protected and exposes a check-status action.
- Evaluation uses the existing rubric, question and assessment editors. Completed artifacts remain inspectable. Workspace headers link back to setup, and approved interview questions return to the journey stage. Assessment policy changes save explicitly to the job with its version.
- Server readiness checks the role, current rubric source, question approval/source, optional assessment availability and active question coverage in every section, remaining hiring capacity, and candidate journey review. Publication rechecks this state. Generic job creation/update cannot publish around the dedicated review action.
- Journey preview shows configured screening, question bounds/instructions, approved interview questions, assessment sections and timing, and an explicitly labeled consent summary. A fingerprint invalidates review when relevant role/evaluation/settings content changes.
- A shared `/jobs/:id/journey` route allows other authorized company admins to review candidate-facing configuration without access to the creator's private draft. Its audit event records the reviewer and fingerprint, not raw applicant or prompt content.
- Job edits include a version. Conflicting saves show the newer fields and allow using the latest version or reapplying only locally changed fields, retaining unrelated server changes.

## Verification

- Broad regression before the final review fixes: 1,184 backend tests and 176 admin tests passed.
- Latest focused backend suite: 11 tests passed, covering private scoping, idempotency, revision conflicts, quota rejection, uncertain materialization recovery, readiness, shared review, repeat review navigation, publication bypass prevention, and HTTP authentication/role rejection.
- Latest focused admin suite: 20 tests passed across three files, covering autosave acknowledgement, Continue during an in-flight save, uncertain/definitive failure retries, conflicting drafts, title-only saves, creation recovery, collapsed validation controls, resumed readiness, job conflict reconciliation, and explicit publication.
- Production build and targeted whitespace checks passed. Desktop 1280x800 and phone 390x844 fixture checks inspected the role, evaluation, journey, review, and publication confirmation. Phone content stayed within the viewport; confirmation focused Keep current status.
- Independent finish review found and prompted fixes for uncertain creation recovery, rejected-save replay, hidden validation targets, completed artifact inspection, repeat journey confirmation, teammate review access, and missing section timing.

Subsequent database integration: five tests passed against a disposable localhost MongoDB 8.2.6 server using actual Mongoose models and indexes. They cover concurrent idempotent creation, persistence after reconnect, owner/company isolation, competing revision saves, concurrent materialization, lost response after a real write, deleted linked jobs, and optimistic Job version conflicts. The test run finished with zero failures and zero skipped tests. The integration test mocks quota enforcement for materialization cases; it does not validate quota concurrency or production topology. The runner never reads the application's MongoDB URI and stops its own database after the suite.

Logs live in `output/ux-review` in the parent workspace. Browser checks use synthetic, stubbed data. Earlier unit persistence tests isolate model methods; the subsequent integration suite uses real database operations. HTTP tests exercise actual routing/authentication gates with mocked identities. No production records or real invitations were created.

## Remaining work in this area

- Extend the passing isolated database suite to actual process interruption between each materialization stage, quota concurrency and production-scale behavior. `mongodb-memory-server-core` 11.2.0 now supplies the disposable test database through `npm run test:integration`; the first run downloads its database binary. The existing `scripts/syncIndexes.js` discovers the new model automatically; the unique company/owner/clientKey index must exist before production traffic uses draft creation. No production index sync was run.
- Replace the labeled consent summary with a versioned preview of the exact candidate-facing consent and configured communication templates. Keep that contract synchronized across apps.
- Finish durable AI generation progress, source provenance and remaining editor save/conflict adoption. Existing editors are reused; this slice does not claim their full redesign or live AI integration testing.
- Audit legacy manual question sets without a source hash, candidate lifecycle/assessment eligibility rules, company visibility policy, and publication destination readiness against the full report.
- Continue candidate inspection, bounded job querying/search, tokens, tables, remaining page blueprints, candidate app flows, instrumentation and full release validation. The parent implementation ledger retains the entire original scope.
