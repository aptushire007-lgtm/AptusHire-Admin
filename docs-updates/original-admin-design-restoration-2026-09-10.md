# Original admin design restoration — 10 September 2026

## Scope and source

Source: `D:\Autonoetic_edge\Vijendra pratap\Recruitment-AI\admin`

Target: `D:\Autonoetic_edge\Vijendra pratap\recruiter-new-AI\AptusHire-Admin`

The existing folders use `Autonoetic_edge`, not the differently spaced path in the request. Only this admin app was changed. The original source admin, backend, candidate-facing frontend, environment settings and credentials were not overwritten.

## What was restored

| Area | Change | Where to see it |
| --- | --- | --- |
| Design system | Original forest/lime/teal brand, paper canvas, Inter/Lexend typography, compact type scale, original corners, borders and numeric treatment; removed forced zoom and gray overrides | Every admin route |
| Navigation | Original 236px sidebar, workspace capsule, grouped navigation, collapsed rail, user menu and greeting/search/action bar | Dashboard; open the menu below desktop width |
| Dashboard | Original compact metric cards and bordered header/list structure, adapted to the current server summary and needs-attention queue | `/` |
| Candidate profile | Original compact identity/avatar/contact treatment and shared panel styling; retained current evidence sections and hiring actions | Open any candidate |
| Interview report | Original report styling carried through the shared shell/components; current evidence withholding and review-note flow retained | Candidate → Full interview report |
| Analytics | Restored original scorecard component with icons, chips and meters and its responsive card grid; retained current cohorts and date parameters | `/reports` |
| Jobs and pipeline | Original palette/components and matching source presentation, without reverting server totals, filters, pagination or narrow-screen column fixes | `/jobs`, `/pipeline` |
| Forms/editors/settings | Original field, button, dialog, menu and page styling | Job editor, rubric/questions/paper editors, settings |
| Auth and public admin screens | Original login/reset/registration, pricing, demo, payment and landing presentation | See routes below |

This is a design transfer, **not a whole-directory rollback**. Dashboard and candidate layouts are adapted to preserve newer workflows. They are not byte-for-byte replicas of every old page. The current candidate Overview/CV evidence/Interview/Activity navigation remains available; original local-only behaviors were not used to replace current working flows.

## Preserved functionality

- Company-scoped API client, authentication, error boundary and environment configuration.
- Server-side candidate and pipeline pagination, accurate application totals and stale-response guards.
- Candidate list → detail → report return context and previous/next navigation.
- Recorded-stage history rather than assumed completion of earlier stages.
- Missing/withheld scores remain distinct from measured zero.
- Independent interview-review state and the explicit recruiter-note submission.
- Current report attempt selection, evidence and playback safeguards.
- Hiring actions remain explicit; no real candidate was advanced, rejected or messaged for visual testing.
- Filter chip overflow behavior and dialog keyboard focus handling.

## Accessibility adaptations to the original

The independent finish review identified faint original colors. KPI caveats now use slate-500 instead of slate-400, pending badges use amber-700 instead of amber-600, and the workspace role uses accent-600 instead of accent-400. These are darker steps of the original palette.

Newer component compatibility names/props remain supported: StatusBadge/KpiCard, extra button variants and xs size, extra fields, large dialogs and brand-logo sizing. Page-header actions retain the current wrapping behavior.

## How to run locally

In PowerShell:

```powershell
Set-Location 'D:\Autonoetic_edge\Vijendra pratap\recruiter-new-AI\AptusHire-Admin'
npm run dev
```

Open [the admin](http://localhost:5173/). Keep the existing backend running with its existing environment; no new environment keys or database migration are required for this UI transfer. Do not start a duplicate Vite server if port 5173 is already serving this app. Hard refresh with Ctrl+Shift+R if the old styling remains.

## Review checklist

1. [Dashboard](http://localhost:5173/): original navigation, compact cards, needs-attention actions and activity charts.
2. [Jobs](http://localhost:5173/jobs): search, filters, requisition cards and real applicant counts.
3. [Candidates](http://localhost:5173/candidates): search/stage filters, card hierarchy and paging.
4. Open a candidate: compact identity block, working contact links, Overview, CV evidence, Interview and Activity; use More detail for the other sections.
5. Open [the requested interview report](http://localhost:5173/candidates/6a9f5606821cdc7119a91f73/interview-report): original evidence-report presentation, limited-evidence state, and recruiter-review link. Do not submit notes just to test appearance.
6. [Pipeline](http://localhost:5173/pipeline): board/list views, filters, visible cards when controls wrap, preserved list context.
7. [Analytics and reports](http://localhost:5173/reports): original card layout, date ranges, screening and evidence panels.
8. [Settings](http://localhost:5173/settings): restored form controls and dialogs.
9. [AI interviews](http://localhost:5173/ai-interviews) and [Screening reviews](http://localhost:5173/review-queue): original shared record styling.
10. In a separate signed-out browser, inspect [login](http://localhost:5173/login), [registration](http://localhost:5173/register-company), [password reset request](http://localhost:5173/forgot-password) and [welcome](http://localhost:5173/welcome).

## File inventory

Paths below are relative to the target admin.

### Direct source presentation transfers

- `src/App.jsx`
- `src/components/dashboard/NotificationBell.jsx`
- `src/components/dashboard/ScorecardPanel.jsx`
- `src/components/marketing/OnboardingSteps.jsx`
- `src/components/report/AssessmentCard.jsx`
- `src/components/report/InsightPanel.jsx`
- `src/components/report/InstrumentScoreCard.jsx`
- `src/components/report/ProvenanceLine.jsx`
- `src/components/report/ReportRail.jsx`
- `src/pages/AssessmentReport.jsx`
- `src/pages/Checkout.jsx`
- `src/pages/dashboard/AIInterviews.jsx`
- `src/pages/dashboard/Notifications.jsx`
- `src/pages/dashboard/PaperEditor.jsx`
- `src/pages/dashboard/QuestionSetEditor.jsx`
- `src/pages/dashboard/Recordings.jsx`
- `src/pages/dashboard/SubscriptionPage.jsx`
- `src/pages/Demo.jsx`
- `src/pages/Landing.jsx`
- `src/pages/PaymentFailed.jsx`
- `src/pages/PaymentSuccess.jsx`
- `src/pages/platform/PlatformConsole.jsx`
- `src/pages/Pricing.jsx`
- `src/pages/RegisterCompany.jsx`
- `src/pages/VerifyCompanyOtp.jsx`

### Source-based presentation with compatibility/workflow adaptations

- `src/components/candidate/CandidatePortal.jsx`
- `src/components/dashboard/DashboardShell.jsx`
- `src/components/dashboard/TrendChart.jsx`
- `src/components/marketing/EventNetwork.jsx`
- `src/components/marketing/LoopArtifacts.jsx`
- `src/components/marketing/MarketingNavbar.jsx`
- `src/components/report/CvAnalysisCards.jsx`
- `src/components/report/InterviewPlayback.jsx`
- `src/components/report/RatedAxisList.jsx`
- `src/components/report/RubricAccordion.jsx`
- `src/components/report/ScoreGauge.jsx`
- `src/components/report/TabbedFindings.jsx`
- `src/components/ui/BrandLogo.jsx`
- `src/components/ui/Button.jsx`
- `src/components/ui/Card.jsx`
- `src/components/ui/DataTable.jsx`
- `src/components/ui/Field.jsx`
- `src/components/ui/Menu.jsx`
- `src/components/ui/Modal.jsx`
- `src/components/ui/PageHeader.jsx`
- `src/components/ui/Panels.jsx`
- `src/components/ui/StageMenu.jsx`
- `src/components/ui/Toast.jsx`
- `src/pages/CandidateDetail.jsx`
- `src/pages/CandidateList.jsx`
- `src/pages/ForgotPassword.jsx`
- `src/pages/InterviewReport.jsx`
- `src/pages/JobForm.jsx`
- `src/pages/JobList.jsx`
- `src/pages/Login.jsx`
- `src/pages/NotFound.jsx`
- `src/pages/ResetPassword.jsx`
- `src/pages/dashboard/AssessmentTracker.jsx`
- `src/pages/dashboard/CandidatesAll.jsx`
- `src/pages/dashboard/DashboardHome.jsx`
- `src/pages/dashboard/HiringPipeline.jsx`
- `src/pages/dashboard/Reports.jsx`
- `src/pages/dashboard/ReviewQueue.jsx`
- `src/pages/dashboard/RubricEditor.jsx`
- `src/pages/dashboard/ScoreExplanation.jsx`
- `src/pages/dashboard/SettingsPage.jsx`

### Design contract and verification

- `src/index.css`: original stylesheet plus compatibility aliases.
- `src/components/report/marks.js`: original evidence-chart fills, symbols and legend styling.
- `src/lib/visualizationColors.js`: newer chart callers mapped to the original brand/semantic palette.
- `DESIGN.md`, `PRODUCT.md`, `.impeccable/design.json`: durable source-design reference.
- `test/originalDesign.test.jsx`: original design and compatibility regression checks.
- `test/uiParity.test.js`: normalizes CRLF/LF before comparing unchanged shared chip behavior.

## Verification

- Full admin suite: **115 tests passed across 21 files**, including five design-contract tests.
- Final production build: passed (2,456 modules transformed).
- Read-only browser inspection: dashboard, navigation drawer, candidate list, candidate detail, interview report, analytics, and pipeline board/list. Pipeline cards remained visible and the document had no horizontal overflow at the available approximately 910px viewport; wide list columns scroll inside their container.
- Analytics card labels and qualifiers wrap instead of being cut off, while keeping the original card design.
- Independent finishing review completed; reported contrast issues corrected.
- No real hiring mutations performed.
- This is not a claim that every action on every route has been end-to-end tested, nor a pixel-perfect screenshot comparison at every viewport.
