---
target: Candidate interview enterprise recruiter UX review
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-09-10T10-16-16Z
slug: src-components-candidate-candidateportal-jsx
---
Method: dual-agent (A: /root/candidate_design_review · B: /root/candidate_ui_evidence)

# Candidate workspace — enterprise recruiter UX critique

Date: 10 September 2026.
Target: candidate 6a9f5606821cdc7119a91f73, initially section=ai-interview.
Primary source: src/components/candidate/CandidatePortal.jsx.

## Verdict and scope

The visual foundation is usable, but this is not yet a dependable enterprise recruiter decision workspace. The biggest issue is not the forest-green design: it is contradictory evidence, misleading attribution, duplicate destinations, and separation of evidence from the review action.

Browser inspected all 21 More detail options, all four primary sections, detailed evaluation's three tabs, full interview report, expanded report evaluation, transcript jumps, recording availability, and the opened Hiring actions area. Inspected at approximately 910x698 and desktop1280x720. No candidate data, stages, notes, invitations or settings changed. No recording played, file downloaded, or failed network/save action simulated. Narrow-phone, full keyboard/screen-reader, and successful persistence flows are not certified. This evaluates the interface, not the candidate's suitability.

## Design specificity and what works

The palette, type and restrained borders have a coherent identity. Keep them. The fragmented information architecture still feels like multiple reporting modules assembled into one screen.

- Candidate identity, application stage and limited interview evidence are visible together.
- Back links and report breadcrumbs preserve candidate/section context.
- Explicit separation between evidence review and stage change, withheld scores, recording audit notice, and caution around monitoring signals are worth preserving.

## Design health

Heuristic judgement, not a usability study or compliance certificate. Error-related scores are provisional because mutations/failure scenarios were not exercised.

| Heuristic | Score /4 | Main issue |
|---|---:|---|
| System status | 2 | Conflicting dates/counts; review pending is not prominent in Interview |
| Recruiter language | 2 | Instrument, no reading, review, and ATS fail require interpretation |
| Control and freedom | 3 | Useful contextual return links; undo not tested |
| Consistency | 1 | Transcript, marker and human-review attribution differ |
| Error prevention | 2 | Good review safeguards, misleading information still risks mistakes |
| Recognition over recall | 2 | 21 secondary destinations and overlapping names |
| Efficiency | 2 | Evidence and review action require separate navigation |
| Minimalist design | 2 | Empty gauges, repeated prose and duplicate panels |
| Error recovery | 2 | Some source safeguards; live failure paths untested |
| Contextual help | 2 | Good caveats, unclear metrics and missing next-step help |
| Total | 20/40 | Significant improvements needed |

## Priority findings

### P1 — Human review is falsely implied

Path: More detail > Evaluation > View detailed evaluation > Recruiter Feedback.

Evaluation displays Evaluator: AI + Recruiter while Overview and the full report state recruiter review is pending. Recruiter Feedback displays the same automated early-ending reason. Source confirms the evaluator is hardcoded (CandidatePortal.jsx:533), and Feedback renders evaluation.reviewReason || evaluation.summary (:271).

An enterprise recruiter must never confuse model output with a colleague's judgement. Use separate AI evaluation and Recruiter review sections. A human note requires actual author, timestamp and reviewed attempt/version; otherwise say No recruiter review recorded. Rename automated content Evidence limitations.
Suggested skill command: /impeccable clarify, followed by /impeccable harden.

### P1 — Different views do not present one coherent evidence record

Observed:
- Interview: 2 answered of 1 asked.
- Scheduled Sep11 but Completed Sep8, with no explanation of attempt/schedule relationship.
- Candidate Recording: zero indexed markers and Unknown speaker for interviewer turns.
- Full report: one indexed Java question and AI interviewer.
- Raw candidate transcript includes repeated prompts and end-of-interview exchanges. Full report groups responses and has a substantially different set of displayed turns without clearly identifying this as a processed view.
- Activity says AI Interview Completed while outcome says ended early.

These observations prove an interface inconsistency, not which underlying record is correct. Resolve the data semantics before visual polish. Use one attempt-specific representation for speakers, counts, dates and markers. Separate full conversation from processed question/answer view explicitly; provide a clear switch. Label answer segments separately from substantive questions. Show original schedule versus actual session timing only with an accurate explanation. Display Interview ended — ended early while retaining raw audit history.
Suggested skill command: /impeccable harden.

### P1 — Required review action is not colocated with evidence

Interview repeatedly asks for human review, but its prominent button is Hiring actions. The actual review note is in the separate Full interview report, near its end. Overview has a stronger review link than Interview itself.

A recruiter should see application stage, interview outcome, human-review status, and next required action without scrolling. Put Review evidence / Record review alongside the transcript and recording; keep stage change separate and secondary. A compact sticky identity/action strip can retain context. Recording a review must not automatically move the application.
Suggested skill command: /impeccable layout.

### P2 — Too many destinations and incorrect location states

The four primary sections are a good start, but More detail exposes 21 options, including 12 Evidence options. Summary, Evaluation, Overall Score and AI Interview overlap. Full Log is largely Activity in reverse order. Claims Probed changes the URL but renders Overview on this record. Detailed Evaluation shows Overview in the dropdown even while its content is visible. Competency Scores opens a blank content area.

Replace technical subpages with five recruiter groups:
- Overview: current status, pending work, recent activity.
- Profile & CV: resume, experience, education, projects; CV screening as a clearly named subsection.
- Assessments: assigned/completed status, test results and rubric.
- Interview: attempt summary, full transcript/recording, criteria evidence, human review.
- Activity: chronological events, human notes, stage changes.

Do not silently fall back. Unavailable claims or competency evidence needs a specific empty state. Preserve the active parent for every nested view.
Suggested skill command: /impeccable distill, then /impeccable harden.

### P2 — Space emphasizes absent scores instead of useful evidence

At the inspected widths, much of the opening screen is shell/header/metadata and the beginning of a large unscored gauge. The early-ending reason repeats in summary and two Recommendations rows. An empty field-score panel follows. CV evidence similarly gives a large centered donut more emphasis than the short supporting findings.

When evidence is limited, replace the gauge with a compact No reliable score — interview ended early banner. Show one reason, what was assessed/not assessed, and the review action. Remove empty Strengths/Gaps tabs in favour of Not assessed; do not imply zero weaknesses. Keep a compact score display only when a valid score exists, beside its basis and limitations. Use 16–24px panel padding and 12–16px internal spacing as starting points, then test with real content. Preserve readable 14px body and 12px metadata in authenticated pages.
Suggested skill command: /impeccable distill and /impeccable layout.

## Additional concrete findings

1. Hiring actions expands much more than actions: lifecycle, ATS breakdown, autofill provenance, experience, education, skills, projects and certificates. Move those to their existing information groups. Keep this area focused on change stage, interview round and genuinely relevant actions.
2. Resume extraction shows an internship ending July2026; Experience displays Present. This may be applicant data or parsing, not a visual-code bug. Show source/differences and allow an authorized correction; do not silently reconcile it.
3. Project links labelled GitHub resolve to /candidates/GitHub, not an actual repository. Validate URLs and render unavailable links as text. The incorrect destination was inspected; external repository opening was not attempted.
4. CV Screening, CV Analysis and ATS Breakdown make recruiters hunt for one screening explanation. Merge under Profile & CV with summary, criterion evidence and optional methodology.
5. ATS Breakdown says fail while primary CV view says Needs Review and application is Shortlisted. These may validly be different records, but label them: Automated CV screening result, Application stage, Recruiter review. Never make screening fail look like a human hiring decision.
6. CV findings use green checks beside low match percentages. Use neutral bullets or actual criterion pass/fail/unknown states. Assessment rubric's 0 passed must be accompanied by not assessed counts; untested does not mean failed.
7. Integrity exposes risk13, ten recorded findings and Active camera monitoring for an ended session. Explain scale and distinguish session monitoring from currently active monitoring. Group quality issues separately from potentially relevant observations, with timestamps and neutral language. Keep caveats visible.
8. Full report recommends asking for a specific example of a bachelor's degree. Use evidence-appropriate follow-ups instead of a generic template applied to every criterion.
9. Claims about professionalism and red flags should remain document observations, not person-level conclusions. Keep original evidence and limitations accessible, but move long methodological prose behind concise What this means disclosures.
10. The full report has an additional sticky breadcrumb band under the workspace bar. Avoid two persistent navigation bands crowding the evidence reading area.
11. Primary navigation controls measured44px high with14px text and aria-current on Interview. That is a useful foundation. Do not reduce all controls merely to make the page denser. The11.5px Hiring actions label is disproportionately small.
12. No immediate horizontal page overflow was measured at910px. That does not certify narrow-phone or200% zoom behavior.

## Remove, consolidate, retain

| Current element | Recommendation |
|---|---|
| Large empty interview gauge | Replace with compact limited-evidence state |
| Duplicate early-ending recommendations | One clear explanation |
| Summary / Overall Score / Evaluation as separate main destinations | One interview summary with expandable detail |
| Full Log and Application Timeline | One Activity stream with sort/filter |
| Three separate CV screening views | One CV workspace with evidence and methodology |
| Empty Competency Scores / broken Claims navigation | Accurate unavailable states; never silent fallback |
| Profile data inside Hiring actions | Move to Profile & CV |
| Unattributed Recruiter Feedback | Actual human notes only |
| Transcript, provenance and audit records | Retain; make consistent and easier to reach |
| Human-review/stage-change separation | Retain explicitly |
| Monitoring caveats and unverified identity notice | Retain without implying candidate guilt |

## Proposed Interview composition

1. Compact identity: candidate, linked job when available, application stage, human-review status.
2. Attempt strip: attempt number, actual date/time/timezone, ended/completed outcome, coverage.
3. One limitation banner when applicable, not a decorative unscored chart.
4. Main evidence area: transcript/recording switch, consistent speaker names, relative timestamps, search and valid question markers.
5. Criteria: assessed / insufficient evidence / not assessed, each with supporting excerpts where available.
6. Human review note beside evidence on wide screens, below on narrower screens; persistent access to record review.
7. Secondary stage action; clear statement of whether it sends any message. No automatic stage changes.

Ownership, next task and due date would help enterprise handoffs, but add them only if supported by real assignment/task data. Do not fabricate values to fill the design.

## Personas, cognitive load and emotional journey

High-volume recruiter: loses time comparing duplicate summaries and travelling to a separate review form. Needs one evidence workspace and retained candidate-list context.

New recruiter: may read AI + Recruiter as an actual human judgement, or no gaps as no weaknesses. Needs unmistakable source attribution and not-assessed states.

Accessibility-dependent recruiter: labelled primary controls are helpful, but nested location states and technical tab semantics need work. Full keyboard/screen-reader/zoom testing remains required.

Cognitive load is moderate in isolated panels but high across the journey: redundant options, unclear grouping, repeated prose and a memory bridge between evidence and review. Initial identity/status reassures; contradictory evidence reduces confidence; report caveats restore some trust but require more navigation.

## Deterministic scan

Assessment B scanned src/components/candidate. One gray-on-color warning at CandidatePortal.jsx:572. Manual inspection identifies a false positive: active and inactive classes are in mutually exclusive branches, not gray text on emerald together. No confirmed defect from this scan. The scan does not evaluate evidence accuracy or workflow coherence and is not a clean bill of health. Read-only browser evaluation prevented overlay injection; no live overlay/server was created.

## Acceptance criteria for a later implementation

- In10seconds a recruiter can identify stage, interview outcome, evidence limitation, review owner/status and next available task, using real data.
- Human feedback never displays automated prose as a saved human note.
- Same attempt produces consistent transcript speakers, times, counts and markers everywhere.
- Every navigation option has correct content, active parent and empty state.
- Review can be recorded without losing evidence context; candidate stage remains unchanged unless explicitly changed.
- Untested criteria cannot be mistaken for failures; absent score is not zero.
- Primary evidence appears sooner without shrinking readable text or touch targets.
- Valid project links, no fake repository destinations.
- Test completed, ended-early, unscored, missing-recording, multiple-attempt and saved-review cases.
- Verify desktop, narrow mobile, keyboard,200%zoom, and note-saving error recovery before claiming enterprise readiness.

## Questions to resolve before implementation

Should the next pass keep the current four primary sections while consolidating their internals, or adopt the five recruiter-oriented groups proposed here? Should it first deliver the attribution/evidence correctness fixes, or include the complete navigation/layout consolidation in the same scope?
