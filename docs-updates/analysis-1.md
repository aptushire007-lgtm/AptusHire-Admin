I've analyzed your live system (from the API tests), torn down the major players, and produced a full design package. The five visuals above (architecture diagram, Jobs board, Job pipeline, Candidate 360, AI JD wizard) are the concrete answers to your wishlist. Here's the complete plan.

---

## 1. Root cause of your confusion (diagnosis from your live system)

Your instinct is right, and the problem is structural, not cosmetic:

- **You are missing the `Application` entity.** In your live DB, a candidate document holds a single `job` field. That's why the candidate portal can't answer "which job did this person apply for?", why a candidate applying to two jobs breaks your model, and why stage/score data is glued to the person instead of to the person×job pair. Every serious ATS separates **Candidate (identity/talent pool)** from **Application (person × job, with its own stage, score, history)**. This one change unlocks: job cards → candidate lists, per-job pipelines, multi-job candidates, clean dedup, and per-application communication threads.
- **Your UI is organized by data tables, not by recruiter workflow.** Recruiters think: "What needs my attention today? → Which job? → Who's in that pipeline? → Open this person → Act." Your nav should mirror exactly that chain.
- **You already own the differentiators** — cited evidence spans (`skillProvenance`), versioned/frozen rubrics (`rubricVersion: 3, status: approved`), deterministic score ledgers, resume hashing, consent capture. The redesign must *surface* these more, not less. That evidence trail is your moat against Greenhouse/Manatal clones.

---

## 2. Competitive teardown: how the leaders present information

| Platform | Presentation model | Key information surfaced | What you should borrow |
|---|---|---|---|
| **Gem** | Unified ATS + CRM + sourcing + scheduling + fraud detection in one workspace [[18]]. Color-coded Kanban pipeline grouped by stage, shared between recruiters and hiring managers [[21]] | Talent-pool snapshots (top titles, companies, skills) per search [[19]]; nurture sequences; pipeline health & conversion reports | The **Talent Pool vs Applicants split**: candidates live in a searchable CRM pool; applications live in job pipelines |
| **Greenhouse** | Job-centric "Visual Candidate Pipeline" per opening [[29]] | Structured scorecards and interview plans per stage [[30]]; anonymized candidate views to reduce bias [[33]] | **Frozen interview plans + scorecards** — this is the same philosophy as your frozen rubric; present rubric criteria as scorecard rows |
| **Ashby** | All-in-one ATS/CRM/sourcing/scheduling/analytics [[35]] | Pipeline-history reporting (who was in which stage, when) [[36]]; every video session and email logged into a single candidate timeline [[37]] | **One chronological timeline per candidate** where assessments, interviews, emails and meetings all appear |
| **Manatal** | Kanban ATS with AI matching | Auto-enrichment of profiles from 20+ social/public platforms incl. LinkedIn & GitHub [[46]]; one-click profile creation from social data [[44]] | **Social/GitHub enrichment with provenance**, exactly like your resume spans |
| **Recruiterflow / Bullhorn / Recruit CRM** | Agency/staffing ATS+CRM: client pipelines, multichannel outreach, timesheets [[52]], placements and back-office in one [[4]], timesheets built into the CRM [[13]] | Client & job segregation, white-label portals for agencies [[59]] | The blueprint for your **future staffing/white-label/payroll phase** |
| **hireHQ / HireBook** (closest matches to the "HBK HQ" you mentioned) | AI direct-sourcing with employer-branded career pages and talent-pool nurturing [[12]]; hiring + talent management suites [[16]] | Branded career pages, pool engagement | Career-page branding + pool nurture (Phase 2/3) |

**Pattern summary:** every winner makes **the Job the container of the pipeline**, **the Candidate a rich CRM profile with a timeline**, and **automation rules explicit and visible**. Nobody shows a flat "all candidates" table as the primary view — which is exactly your current pain.

---

## 3. Target information architecture

**Entities (data model changes):**
- `Candidate` = identity only: contact keys, aliases, consent, enrichment, talent-pool tags.
- `Application` = {candidateId, jobId, source, stage, stageHistory[], scoreSnapshot, owner, timestamps}. All pipeline movement, assessments, interviews and comms hang off this.
- `Job` = JD + frozen rubric + **automation rules** + posting channels.
- Keep: `Rubric`, `ClaimGraph`, `Assessment`, `Interview`, plus new `CommEvent`, `Meeting`, `Enrichment`, `IntegrationConnection`.

**Navigation (mirrors the recruiter's mental chain):**
1. **Today** — attention queue: reviews due, interviews today, unanswered candidate replies, SLA breaches.
2. **Jobs** — card board (Mockup 2) → job detail with tabs *Pipeline | Rubric & Automation | Reports | Settings* (Mockup 3).
3. **Talent Pool** — global candidate search, segments, and the **duplicate-review queue**.
4. **Interviews** — AI-interview queue (you already have `interview-queue`) + human interview scheduling.
5. **Inbox** — all candidate communication threads (email + WhatsApp), template manager, delivery logs.
6. **Insights** — funnel per job, source effectiveness, bias-audit counterfactuals, reproducibility hashes.
7. **Settings & Integrations** — company, users, channels, calendars/video, ERP, job boards, billing.

---

## 4. Feature blueprints (your wishlist → concrete designs)

### A. Job cards → per-job candidates (Mockups 2 & 3)
Each job card shows: title, dept/location, status, **stage-count chips** (New/Screened/Interview/Offer), rubric version tag, automation badges, recent-candidate avatars. Clicking opens the Kanban pipeline for *that job only* — columns = your 14 stages collapsed into 6 working columns (Applied → Screened → Assessment → AI Interview → Review → Offer), cards show match score, top skills, days-in-stage, and an "awaiting feedback" flag like Gem's Kanban [[21]]. A global "All candidates" view still exists under Talent Pool, but every candidate row there carries a job chip, fixing your original complaint.

### B. Deduplication & identity resolution
Industry best practice: only flag duplicates on strong signals — same email, phone, or LinkedIn — after normalizing all identifiers [[60]]; run it as match → review → merge, never silent deletes [[61]].
- **On intake:** normalize email (lowercase/trim/plus-handling), phone → E.164, LinkedIn slug, GitHub handle. Exact key hit → attach a **new Application** to the existing Candidate (same person, two jobs = *not* a duplicate). Same key + same open job inside a re-apply window → update/flag the existing application per policy.
- **Fuzzy hits** (name similarity + one weak key) → side-by-side diff in a **Duplicate Review queue**; merge creates master + `aliases[]` + `mergedInto`, preserving every application, span and audit hash — Greenhouse-style merge but non-destructive [[67]].
- **Enrichment-triggered:** a LinkedIn pull that reveals a match suggests linking, same review flow.
- Result: one record per person, so pipeline counts and outreach never double-fire [[65]].

### C. AI-driven JD creation + "Pipeline Contract" (Mockup 5)
Three-step wizard: (1) paste rough notes / old JD / URL → **Draft with AI**; (2) review generated JD side-by-side with the **rubric draft** (Critical/Important/Helpful tiers) and hit **Approve & Freeze** — preserving your frozen-rubric guarantee; (3) set the **automation contract** for this job: thresholds (default from your live policy: advance ≥ 60, review ≥ 45), auto-send assessment, auto-invite to AI interview on pass, notify recruiter on completion, channel chips (Email/WhatsApp), and posting channels (LinkedIn/Naukri/Indeed). Everything the job will do autonomously is decided *once, at birth*, and visible forever on the job card — this is the "segregation made simple" you asked for.

### D. Candidate 360 with progressive disclosure (Mockup 4)
Header: verified contact badges, stage pill, and a **progress rail** (Applied → … → Offer). Sections unlock only when data exists — exactly your idea: identity & contact → resume analytics (skill chips with **quote-icon tooltips showing the cited span**, reusing `skillProvenance`) → GitHub/LinkedIn summary card (contribution graph + 3-line AI digest, Manatal-style enrichment [[44]]) → assessment report (score ledger bars) → AI interview report (Verified/Contradicted chips) → communication timeline. Locked sections show an empty state with a CTA ("Send assessment to unlock"), so the card itself teaches the recruiter what's next.

### E. Communication hub (Email + WhatsApp)
Build an **event-driven notification engine**: events (`application_received`, `assessment_sent/passed`, `interview_scheduled/completed`, `review_needed`, `offer`, `stage_changed`) → per-channel templates → delivery log → two-way threads on the application timeline. WhatsApp uses Meta's Cloud API with pre-approved template messages for status updates [[70]], which is the standard HR use-case pattern (reminders, stage updates) [[71]]; replies inside the 24-hour window can be free-form [[76]]. Extend your existing `consent` object with per-channel opt-ins (you already capture `aiProcessing` consent — add `whatsappUpdates`). Keep your governance rule: **adverse messages (rejections) always require a human approve-click before sending**. Upgrade today's `admin-notifications` counter into the Inbox with SLA badges.

### F. Scheduling + video (Zoom / Meet / Teams)
When a candidate clears the AI interview: recruiter picks panel → platform reads free/busy from Google/Outlook → candidate self-selects a slot via a secure link (email/WhatsApp) → platform creates the Zoom/Meet/Teams meeting and attaches the link + .ics to the invite → recording/transcript and scorecard land on the candidate timeline, the way Ashby logs video sessions into its timeline [[40]]. Calendar+ATS+video is a well-trodden integration pattern you can copy [[79]], with Zoom/Meet/Teams as the supported video set [[83]].

### G. ERP/HRIS + job-board syndication
Outbound webhooks + REST export on `stage_changed` and `hired` events push into the customer's ERP/HRIS; inbound sync writes back employee IDs post-onboarding. Syndication posts one JD to LinkedIn/Indeed/Naukri and stamps `source` on each Application, feeding source-effectiveness analytics (Ashby/Gem-style reporting [[36]]).

### H. Phase-3 staffing suite
Agency mode with client workspaces, white-label candidate portals and branded resume templates [[59]], placements/rate cards, timesheets flowing into payroll exports (the Recruit CRM/Bullhorn back-office pattern [[13]]), and onboarding checklists with e-sign. Keep this behind a "mode" switch so corporate tenants never see it.

---

## 5. Phased roadmap (go to market first, then expand)

**Phase 1 — Market-ready core (4–6 weeks):** nav restructure; `Application` entity + data migration; Jobs board + per-job Kanban; Candidate 360 v1 (identity, resume analytics with evidence tooltips, assessment + interview sections); exact-match dedup + merge queue; JD wizard v1 with automation contract; email event notifications; basic funnel insights.
*Gate metrics:* job-creation time < 10 min; 100% of candidates reachable from their job card; recruiter time-to-first-action on a new application; candidate reply rate.

**Phase 2 — Post-feedback expansion (6–8 weeks):** WhatsApp Cloud API two-way; GitHub/LinkedIn enrichment with provenance; scheduling + Zoom/Meet/Teams; Inbox v2 (template editor, SLAs); Insights v2 (source effectiveness, pipeline history, bias counterfactual dashboard).

**Phase 3 — Platform play:** job-board syndication, ERP/HRIS sync, then staffing/white-label/timesheets/payroll/onboarding as paid add-ons.

This sequencing lets you ship the navigational fix and the job-centric view (your biggest confusion killers) immediately, test with real recruiters, and fund the long tail from pull, not speculation.

---

## 6. Notes & open questions

- On **"HBK HQ"**: I couldn't verify a product under that exact name; the closest live matches are **hireHQ** (AI direct sourcing + talent engagement) [[5]] and **HireBook** [[16]], but the CRM segregation you described is best embodied by **Gem, Recruiterflow and Bullhorn**, so I anchored the analysis there. Send me the exact URL if you meant another product and I'll re-run the teardown.
- Decisions I need from you to finalize specs: (a) re-apply window policy per job; (b) whether WhatsApp is opt-in at application time (recommended, ties to consent); (c) which ERP/HRIS your first 3 design partners actually use; (d) whether agency/staffing mode is a separate SKU or a toggle.

The visuals above are your discussion artifacts: the architecture diagram for engineers, the four mockups for design sprints and investor/demo conversations. Want me to turn any single blueprint (e.g., the dedup merge queue or the WhatsApp event catalog) into a detailed spec with API contracts next?