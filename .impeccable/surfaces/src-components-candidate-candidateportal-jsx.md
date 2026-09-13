---
version: 1
slug: "src-components-candidate-candidateportal-jsx"
primary_target: "src/components/candidate/CandidatePortal.jsx"
related_targets: ["src/components/candidate/InterviewWorkspace.jsx","src/pages/InterviewReport.jsx"]
---

# Candidate workspace

Mode: Operate. Recruiters inspect application lifecycle, CV and interview evidence, then record an explicit human review and separately choose any stage change.

The user approved five groups: Overview, Profile & CV, Assessments, Interview, Activity. Retain the existing visual identity. Keep old section URLs usable. The interview evidence and human note share a workspace; full conversation and processed Q&A must be explicitly distinguished, with consistent attempt-specific speaker/time mapping. Empty scores communicate limitations, not a decorative gauge or a zero.

Preserve source records, attribution, versioned review submission, candidate return context, audit-logged playback and stage-change safeguards. Never invent owners, dates or reviewer notes. Keep drafts through subsection navigation and in-app refresh failures. Phone anchors must not be obscured by wrapping sticky navigation.

Browser coverage and remaining verification limits are recorded in docs-updates/candidate-workspace-implementation-2026-09-10.md.
