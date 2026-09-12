---
version: 1
slug: "src-components-jobs-jobworkspacelayout-jsx"
primary_target: "src/components/jobs/JobWorkspaceLayout.jsx"
related_targets: ["src/pages/dashboard/JobOverview.jsx","src/pages/dashboard/JobEvaluation.jsx","src/pages/dashboard/JobPost.jsx"]
---

# Job workspace

Mode: Operate. Recruiters configure a named role, review its evaluation artifacts and candidates, and explicitly choose publication destinations.

The enterprise UX report fixes the direction: inherit the existing forest/white workspace; use a named job header and wrapping local navigation above the content. Preserve filtered collection return context and compatible editor URLs. Display saved publication state separately from rubric approval; never imply a draft is public or a queued interview has a completed report.

The recognizable interaction is continuity: changing artifact keeps the job visible, and unsaved editing requires a deliberate choice before departure. Error summaries link to actual fields. Overlays protect focus without losing edits or suppressing error announcements.

Guided setup now composes private server drafts, revisions, four stages and server readiness with the existing editors. Shared job administrators can inspect and acknowledge the candidate journey without accessing a creator's private draft. Job activity, exact communication/consent previews, durable generation and database integration validation remain pending. See the implementation ledger and setup changelog for current evidence and the full remaining scope.
