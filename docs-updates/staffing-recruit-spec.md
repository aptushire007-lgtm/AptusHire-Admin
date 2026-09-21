# AptusHire Staffing+Recruit — product spec

Source: `AptusHire Staffing+Recruit.docx` (Google Doc 13ewHX1OV3M...), text extracted 2026-09-21.

1. What are we building? (8 lines)
One platform for hiring. Recruiters post jobs. Candidates apply from anywhere.
AI reads resumes, scores them, and double-checks them (LinkedIn/GitHub, gaps, mismatches).
AI runs assessments and AI interviews with anti-cheating.
Human interview rounds happen on Teams / Meet / Zoom; the platform pulls the recording back and adds AI pointers.
All reports combine into one Final Score. Recruiter decides. Offer goes out from a template.
The same platform also runs staffing business: clients, white-labeled resumes, submissions, timesheets, invoices.
Payroll is not built in-house. We do "payroll-lite" and hand real payroll to experts (Section 14).
Everything about one person lives on one profile. Nothing is scattered.
2. Who is this for? (Three customers, one platform)
Customer
What they do
What they use
In-house hiring team
Hires for own company
Recruitment engine only
Recruitment agency
Places candidates permanently at clients, earns a placement fee
Recruitment engine + Clients + Submissions + White-label resumes
Staffing agency
Supplies contract staff, earns monthly margin
Everything, including Timesheets + Payroll-lite
Sometimes these are combined. Many agencies do both permanent placement and contract staffing. So the platform has a Mode switch: Settings → "What business are we?" → Recruitment / Staffing / Both.
Mode = a simple on/off for whole feature groups. Staffing OFF hides Clients, Pay, White-label. Nothing else changes.
One talent pool feeds all engines. A candidate can be placed on contract today and permanently hired next year. One profile keeps the whole story.
3. The master flow (one picture)
Job Setup — recruiter creates JD, AI helps write it.
Publish — career page, LinkedIn, Naukri, freelancer-recruiter links.
Apply — all applications land in one inbox.
AI Screening — resume score + deep checks.
Assessment — if enabled for this job.
AI Interview — if enabled, with anti-cheating.
Human Round — on Teams / Meet / Zoom, recording analysed by AI.
Offer / Place — internal hire gets offer letter; staffing candidate gets submitted to client.
Staffing branch: Client + Payroll-lite (timesheets → invoices → payout via provider).
4. Steps 1–3 — JD, process, publish (recruitment engine)
JD: recruiter fills a small form (title, skills, experience, location, salary range). AI writes the full draft. Recruiter edits and approves. JD statuses: Draft → Approved → Live → Closed.
Process per job: recruiter switches ON/OFF: Assessment, AI Interview, Human Round(s). Sets passing marks (thresholds) and score weights per stage. Saved as reusable process templates ("Standard Tech Hiring").
Publish: one click → career page + LinkedIn + Naukri + freelancer links. Each freelancer recruiter gets a unique link; candidates from it are tagged; if hired, commission is recorded.
5. Step 4 — All applications in ONE inbox
Portal, Naukri, LinkedIn, Email,  freelancer links, email uploads — everything lands in the same place, in the same format. No spreadsheets, no lost emails.
6. Step 5 — Talent Pool vs Job Pipeline (the confusion, solved)
Talent Pool = the company's master list. Every person whose resume we ever received. One record per person, forever.
Job Pipeline = one job's working board. Columns = stages. Only this job's candidates. Drag-and-drop cards.
The rule: resume arrives → person enters Talent Pool (always). Person applies or is added to a job → an Application ticket appears in that Job's Pipeline.
Same person, three jobs = one pool record, three pipeline tickets. Click the name anywhere → same full profile.
Where to show lists: daily work happens in the Job Pipeline. Searching, re-hiring old good candidates ("silver medalists"), and reporting happen in the Talent Pool. Both views, different jobs to do.
7. Step 6 — AI screening + deep checks
Score: resume vs JD, 0–100, with reasons.
Deep checks (if LinkedIn/GitHub links exist): company-name or date mismatches, skill gaps vs JD, job gaps (e.g. 2–3 years without work), missing info, and suggested questions for interviewers.
Output = Resume Report, saved on the profile.
8. Step 7 — Threshold and the auto-pilot
Score ≥ passing mark → system automatically sends email + portal notification (+ WhatsApp if enabled) with the next-step link. Recruiter does nothing.
Score < passing mark → auto "Hold" or "Reject" with a polite template message (company chooses the rule).
Every automatic action is written on the profile timeline, so humans can always see what the system did and why.
9. Step 8 — Assessment + report
Candidate takes the test online. Auto-grading. Assessment Report: section scores, time taken, strong/weak areas, question-level detail. Lands on the same profile.
10. Step 9 — AI interview with anti-cheating
Rules during the interview: camera ON, face in frame, no tab switching, no second person, no full-screen exit. Every rule-break is logged as an event (type + time + length). AI Interview Report = answer quality + communication + technical depth + proctoring event list.
11. Step 10 — Human round on Teams / Meet / Zoom
The platform does four jobs around the human meeting:
Book it: recruiter picks a slot; platform creates the meeting via Zoom / Google Meet / MS Teams and sends the link by email + portal + WhatsApp.
Brief the interviewer: one-page briefing pack = all earlier reports + AI-suggested questions ("explain the 2023–24 gap", "probe Kafka depth — resume and GitHub disagree"). The human never repeats what AI already asked.
Capture it: recording + transcript are pulled back automatically where the provider allows (Zoom cloud recording, Teams compliance recording, eligible Meet plans); otherwise the interviewer uploads the file. Candidate sees a recording-consent notice first.
Analyse it: the same AI engine reads the transcript and writes pointers: topics covered, strong/weak answers, red flags, questions forgotten, suggested round score. The human adds a short form (few ratings + notes). Together = Human Round Report.
Where the report goes: (a) into the next round's briefing pack, so no question is ever repeated; (b) into the Final Score with configurable weights (example: resume 20 / assessment 20 / AI interview 25 / human round 35).
12. Step 11 — Final score and decision
Decision screen shows all reports side by side (Resume, Assessment, AI Interview, Human Round), the Final Score on top, proctoring flags visible, and three buttons: Hire / Hold / Reject. Hire → offer letter pulled from the template library, sent by Email/WhatsApp.
13. The staffing engine — clients, submissions, white-label resumes
Client = the company that pays us. Stores contact, contract terms, agreed rates.
Job Order = a normal Job with type = client, plus bill rate (client pays us per hour) and pay rate (we pay candidate per hour). Difference = margin.
White-label management: every version is labelled and statused (Draft → Candidate approved → Sent). All versions live on the candidate profile under the Resumes tab. Master resume stays untouched as the source of truth.
No re-typing ever: the builder fills itself from the parsed profile using the same {placeholder} system as email templates.
14. PAYROLL — the honest section (read this twice)
The question: should our platform manage payroll itself?
The answer: NO. We build payroll-LITE and let payroll experts do payroll.
Why payroll is tricky (and why we stay out):
Tax rules change by country and state. PF / ESI / social security / overtime / leave rules differ everywhere.
There are filings, deadlines, forms, and year-end documents. Mistakes = fines and legal trouble.
Keeping all this correct is a full-time separate product (that is why ADP, Zoho Payroll, Deel, Gusto, RazorpayX exist).
Our goal is to make hiring easy. Building a tax engine would add huge complexity and risk for zero hiring value.
But staffing agencies still need four simple things: hours worked, client approval, how much to bill, how much to pay. That is maths + paperwork, not payroll law. So we build exactly that:
Who does what — the clean split:
We manage (payroll-lite)
Payroll provider / accountant manages
Timesheet collection
Tax deduction (TDS etc.)
Client approval flow
PF / ESI / social security
Hours × rate maths
Statutory filings and deadlines
Invoice PDF to client
Bank transfers / actual payout
Payslip preview
Compliance forms, year-end docs
Payment status tracking (Paid / Pending / Overdue)
Keeping up with law changes
Margin dashboard + reminders
Hard rules we never break: we never hold money. We never calculate tax. We never file anything. If a customer asks "can you do full payroll?", the answer is "we connect you to a payroll provider in one click."
Phases (keeps us safe and simple):
v1 (launch): timesheets + approvals + invoices + CSV export. Zero compliance risk. Works with any accountant on earth.
v2: one-click push to 1–2 payroll providers via API; paid-status syncs back automatically.
v3 (only if many customers beg): more provider integrations. Still never a tax engine.
Complexity guard: Pay screens appear only when Staffing mode is ON, and only for Admin/Finance roles. Everyone else never sees them. The rest of the platform stays exactly as simple as before.
15. Keeping it simple — the 7 organising rules
One person = one profile. Every resume version, report, message, timesheet attaches there.
One job = one board. Daily work happens there.
Modes hide what you don't use. Staffing OFF = no Clients, no Pay, no White-label anywhere.
Tabs, not new pages. The profile uses tabs so nothing gets lost and nothing gets crowded.
The timeline logs everything automatically. Every system action and every message appears there; no manual note-keeping.
Templates for anything repeated: emails, WhatsApp messages, offer letters, resumes, invoices.
Maximum 8 items in the sidebar. Everything else lives inside Settings.
16. UI / UX guide — where to put what
Sidebar (recruiter view):
Dashboard · Jobs · Candidates (Talent Pool) · Pipeline · Clients* · Pay* · Templates · Settings (* = staffing mode only)
Screen-by-screen map:
Screen
What is on it
Main button
Dashboard
Today's counts + my to-do list
—
Jobs
All jobs with status chips
+ New Job
Job detail
Tabs: JD · Process · Publish · Pipeline
Go Live
Pipeline board
Kanban columns; cards show name, score, flags
click card → profile
Talent Pool
Search + filters (skill, source, score, gap flags)
Add to Job
Candidate profile
Tabs: Overview · Applications · Reports · Resumes & White-labels · Messages · Timesheets & Pay* · Documents
Send Message
White-label builder
Left: auto-filled form · Right: live preview
Save Version / Send for Approval / PDF
Clients*
Client list → client page (contacts, job orders, rates, invoices)
+ New Client
Timesheets*
Week grid with status chips; client sees ONLY a one-link approve page
Approve / Reject
Pay*
Invoices, payroll-run export, margin summary
Run Payroll Export
Scheduler
Calendar + Connect Zoom / Meet / Teams buttons
Book
Briefing pack
One printable page: past reports + AI-suggested questions
Send to interviewer
Decision screen
4 report cards + Final Score + flags
Hire / Hold / Reject
Templates
List by type; editor with {placeholders}
+ New Template
Communications
Outbox with delivery status per message
—
Candidate portal (mobile-first)
Apply, status tracker, test/interview links, messages, timesheet entry
Apply / Submit Timesheet
Feature → location quick map:
White-label resumes → Candidate profile › Resumes tab; sent versions tracked under Job › Submissions.
Timesheets → Pay › Timesheets (recruiter); Portal › My Timesheets (candidate); one-link page (client manager).
Human-round recording + AI pointers → Candidate profile › Reports › Human Round.
Commissions (freelancers + permanent placement fees) → Pay › Commissions.
Thresholds & weights → Settings › Defaults, editable per job in Job › Process tab.
Anti-cheat rules → Settings › Interview Rules.
UX rules everyone follows:
3-click rule: any information reachable within 3 clicks.
One primary blue button per screen. Destructive actions in red with confirmation.
Colors mean something everywhere: green = passed/approved · amber = waiting or check-this · red = rejected or cheat flag.
Empty states teach: a blank screen always says what to do next in plain words.
Outsiders get tiny screens: client managers get one approve link; candidates get the portal; interviewers get the briefing pack. They never see the recruiter UI.
17. Templates + communication (Email & WhatsApp)
Template library holds: offer letter, assessment invite, interview invite, human-round invite, reminder, hold, rejection, WhatsApp short messages, invoice cover note, timesheet reminder. Placeholders like {candidate_name}, {job_title}, {score}, {link}, {date} fill themselves. Every sent message is logged on the profile with channel + time + delivery status.
18. Data model in plain words
Object
Plain meaning
Job / JobOrder
One open role; client jobs add bill rate, pay rate, client id
ProcessConfig
Stages ON/OFF + thresholds + weights for this job
Candidate
One person, master record (contact, resume, parsed skills, links, source, tags)
Application
One person + one job ticket (stage, scores, status)
Report
Resume / Assessment / AI Interview / Human Round report
ProctoringEvent
One anti-cheat log line
ScheduledInterview + ProviderConnector
Human-round booking + Teams/Meet/Zoom login
ResumeTemplate + WhiteLabelResume
Branded layout + one branded version of a resume
Client + Submission
Paying company + branded resume sent to them, with status
Timesheet + Invoice + PayrollRun
Weekly hours, bill to client, export batch to provider
Template + Communication
Saved message + one sent message log
ReferralPartner + Commission
Freelancer recruiter + payout record
19. Glossary
JD job ad · Talent Pool master list of every candidate ever · Pipeline one job's stage board · Threshold passing mark · Proctoring camera/browser rules during AI interview · Briefing pack one page that prepares a human interviewer · Pointers AI notes extracted from a meeting recording · Client company we staff for · Job Order client's vacancy with rates · Submission branded resume sent to a client · White-label resume our branded copy of a candidate's resume · Bill rate / Pay rate / Margin client pays us / we pay candidate / the difference · Timesheet weekly approved hours · Payroll-lite our timesheet-invoice-tracking layer; real payroll stays with providers · Mode the Recruitment/Staffing/Both switch · Silver medalist strong past candidate to reuse from the pool.
20. Open questions to decide next
Final score weights including human round (20/20/25/35 okay?).
Below threshold: auto-reject or auto-hold for a human glance?
Duplicate rule: same email OR same phone = same person?
Anonymous white-label: default ON or OFF per client?
Timesheet fallback when the client manager leaves — who approves?
First payroll provider to integrate in v2 (local vs global)?
Recording consent text and retention period for human rounds.
Commission trigger: offer accepted or joining date?
Default Mode for new signups: Recruitment or Both?