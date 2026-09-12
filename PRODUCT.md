# AptusHire admin

Recruiters use this web app to manage roles, inspect candidate applications and their recorded lifecycle, review CV/interview evidence, and make explicit hiring decisions.

The user has selected the existing `Recruitment-AI/admin` implementation as the visual authority for this app. Preserve its design, rather than inventing a replacement identity.

Keep the current company-scoped APIs, server pagination, loading/error states, evidence safeguards, candidate return navigation and recruiter-review recording. An AI evaluation is evidence for a recruiter, not an automatic hiring decision. Missing or withheld scores must not appear as measured zeroes. A stage is only recorded when supported by history.

This transfer concerns the admin only; the candidate-facing app and backend are separate projects.
