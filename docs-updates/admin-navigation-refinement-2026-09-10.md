# Admin interface and navigation refinement

## Assessment and design plan

React 18, Vite 5 and React Router 6 provide one persistent authenticated shell with lazy route content. Tailwind 4 supplies the token system; Inter and Lexend and Lucide are already installed. CompanyDataContext owns workspace reads, URL parameters preserve candidate/pipeline context, Axios handles tenant-scoped APIs, and sockets refresh workflow state. Shared Card, PageHeader, Field, DataTable, Menu and Modal components should be reused. Charts and evidence-report components stay intact.

Problems: the top bar repeats a greeting on every route; Search only navigates to Candidates; recordings and billing are missing from navigation; collapsed links lack accessible names; settings is one long page; jobs defaults to cards with a nonfunctional Search button; candidate records lack stable column headings. Existing workflow edits are preserved.

Palette: forest #0E3B2E, ink #0C1F1B, muted #5B6B63, canvas #F5F7F6, white #FFFFFF, border #DEE5E1. Keep semantic status colors and label their meaning. Existing Inter handles 14px UI text and 12px metadata; Lexend supports 24px page titles. Tabular Inter numerals align counts. Controls use 8px corners, panels 10px, spacing uses 4/8/12/16/24px.

Layout, left aligned:

```text
Workspace rail | Section / current page       Search workspace  Notifications
               | Page title                              Primary action
Recruit        | Views / search / filters
Review         | Column headers
Analyze        | Operational records and contextual actions
Admin          | Results count / pagination
Account        |
```

Review against brief: preserve AptusHire's forest identity; put emphasis on the active navigation row and operational content, avoid decorative metric treatments and invented product sections. Search offers existing pages, loaded workspace jobs, and explicit server-backed candidate search. Role-specific platform navigation uses the existing super-admin role; no new permission system or APIs are invented. Styling is scoped to the authenticated workspace so public and candidate-facing surfaces retain their presentation.


## Implemented

- Persistent sidebar grouped into Workspace, Recruit, Review, Analyze and Admin; accessible names in the collapsed rail; recordings and billing are now discoverable. The account dropdown reuses the keyboard-aware Menu and correctly opens `/subscription`. Platform administration remains visible only for the existing `super_admin` role.
- Page-aware breadcrumbs replace the repeated top-bar greeting. Ctrl/Cmd+K opens a focus-trapped workspace search with arrow/Enter/Escape interaction, links to existing pages and loaded jobs, and an explicit candidate-name/email search through `/candidates?q=?`. No company-wide candidate fetch is added.
- Authenticated-shell typography, panel corners, neutral surfaces, focus styling and reduced-motion rules evolve the existing tokens. Public pages keep their existing styles. Home now has a visible Today header and Create job action.
- Jobs defaults to the shared semantic table, retaining the grid option, publish/rubric gates, board publication, source-tagged application links and deletion confirmation. Filters, sorting and view are retained in URL parameters. Search filters as typed; the no-op button is removed. Applied filters can be removed individually. Tables scroll inside their container and use row-shaped loading states.
- Candidates uses labeled columns for identity, latest application, stage, CV screening and application date, with comfortable/compact spacing. Existing server paging, historical report cohorts, source caveats, missing-score handling and candidate review navigation remain in place.
- Settings is divided into Organization, Screening & interviews, Data & privacy, Email notifications, Branding and Integrations. Section URLs are shareable; local edits remain available across sections. A shared save/discard bar identifies pending changes. Failed settings reads offer retry and cannot save placeholder defaults. Switches now have accessible names. The existing settings API payload remains unchanged.

## Validation

- Existing admin tests and new interaction tests cover navigation/search, active and collapsed links, billing destination, role visibility, settings draft persistence, save payload, discard and load-error recovery, URL filters, server pagination and score caveats.
- Production build passes. See final test totals below.
- Browser verification could not be performed: the browser inventory was empty and opening the in-app browser returned `Browser is not available: iab`. No screenshots, visual breakpoints or live authentication flows are claimed as tested.
- No backend or candidate-frontend files were edited in this pass. No real job publication, hiring decision, candidate message, setting update or deletion was performed during verification; mutations are covered with mocks.

## Manual review

Run `npm run dev` from `AptusHire-Admin`, with the existing backend available. Check `/`, `/jobs`, `/candidates`, `/settings?section=screening`, and `/settings?section=integrations`. Use Ctrl/Cmd+K, arrow keys, Enter and Escape; collapse/expand the sidebar and open Account options. Check the table at laptop and mobile widths, keyboard focus, 200% zoom, and return navigation after opening a candidate. Existing settings drafts persist between sections within the same visit; they are not persisted after leaving Settings or refreshing.

Final verification: **124 tests passed across 23 files** with `npm test -- --maxWorkers=2 --minWorkers=1`; `npm run build` passed (2,457 modules). Whitespace checks passed for the changed tracked implementation files. Existing React Router future-flag notices remain non-failing.
