import { Bot, FileCheck2, FileCode, ShieldCheck, Layers, Briefcase, Check, Plus, Minus, Lock } from "lucide-react";
import { HUES, STEP_HUE } from "../../lib/featureHues.js";

/**
 * Step 2 of job creation — "What will this job include?"
 *
 * This replaced ~520 lines of hand-written JSX: six option rows and six preview
 * panes, each styled on its own. That is why they had drifted — one row used
 * teal where the others used blue, only the previewed row had a visible border,
 * and every pane invented its own header. Now each feature is one entry in
 * FEATURES and every card and pane is drawn by the same code.
 *
 * Two actions are deliberately kept apart:
 *   - clicking a CARD shows what that feature does (the pane on the right);
 *   - the CHECKBOX, or the pane's Add/Remove button, decides whether it is in.
 * The old rows wrapped the title in the checkbox's <label>, so clicking a
 * feature's name to read about it silently toggled it instead.
 *
 * Titles are unchanged, verbatim — the suite locates options by them.
 */

const FEATURES = [
  {
    key: "aiInterview",
    title: "AI Interview",
    summary: "Adaptive voice & video interview",
    icon: Bot,
    hue: STEP_HUE.interview,
    recommended: true,
    heading: "AI Voice & Video Interview",
    tagline: "Conducted by voice and video",
    description: "An interview that happens without you in the room — and without a single scheduling email.",
    steps: [
      "An AI Interviewer asks approved role questions, listens, and dynamically probes deeper on resume claims.",
      "Every answer is transcribed, analyzed, and scored against your calibrated rubric criteria.",
      "Recruiters review timestamped video recordings, AI summaries, and verified skill scores.",
    ],
    illustration: () => (
      <div className="w-64 rounded-xl border border-slate-300 bg-slate-900 p-2 shadow-md">
        <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-slate-800 p-2 text-center text-white">
          <div className="flex flex-col items-center justify-center rounded bg-slate-700/80 p-3">
            <div className="mb-1 h-6 w-6 rounded-full bg-slate-500" />
            <span className="text-[11px] text-slate-300">Candidate</span>
          </div>
          <div className="flex flex-col items-center justify-center rounded bg-slate-700/80 p-3">
            <div className="mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">
              AI
            </div>
            <span className="text-[11px] text-slate-300">Interviewer</span>
          </div>
        </div>
        <div className="mt-1.5 flex justify-center">
          <div className="h-1.5 w-10 rounded-full bg-slate-700" />
        </div>
      </div>
    ),
  },
  {
    key: "cvEvaluation",
    title: "CV Evaluation",
    summary: "Scores every résumé against your rubric",
    icon: FileCheck2,
    hue: STEP_HUE.cv,
    heading: "CV Evaluation (ATS Screening)",
    tagline: "Automated resume criteria scoring",
    description:
      "Parse incoming resumes against your role requirements with traceable rubric scoring and automated threshold gating.",
    steps: [
      "Resumes are parsed to extract verified skills, years of experience, and project achievements.",
      "Each criterion in the job's role rubric is scored from 0 to 100 with clear evidence citations.",
      "Candidates passing the ATS threshold (e.g. 60/100) automatically advance to assessment or interview.",
    ],
    illustration: () => (
      <div className="w-64 space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <span className="text-[11px] font-bold text-slate-700">ATS Criteria Scorecard</span>
          <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[11px] font-bold text-sky-700">84/100</span>
        </div>
        <div className="space-y-1 text-[11px] text-slate-600">
          <div className="flex justify-between">
            <span>Technical Competence</span>
            <span className="font-semibold text-slate-900">90%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-[90%] bg-sky-500" />
          </div>
          <div className="flex justify-between pt-1">
            <span>Experience Depth</span>
            <span className="font-semibold text-slate-900">80%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-[80%] bg-sky-500" />
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "test",
    title: "Skills Assessment (Test)",
    summary: "Timed, proctored technical test",
    icon: FileCode,
    hue: STEP_HUE.assessment,
    heading: "Skills Assessment (Technical Test)",
    tagline: "Timed coding & domain quizzes",
    description:
      "Deploy structured assessment papers with timed technical questions, automated test suites, and proctoring.",
    steps: [
      "Assign an approved assessment paper with custom coding exercises or multiple-choice sections.",
      "Candidates take the timed exam inside the secure portal with anti-cheat telemetry.",
      "Code compilation results and question breakdowns appear directly on the candidate's scorecard.",
    ],
    illustration: () => (
      <div className="w-64 rounded-xl border border-slate-200 bg-slate-900 p-3 text-white shadow-xs">
        <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-1 text-[11px]">
          <span className="text-slate-400">Section 1 • Coding</span>
          <span className="font-mono text-rose-300">24:50 remaining</span>
        </div>
        <div className="rounded bg-slate-950 p-2 font-mono text-[11px] text-emerald-400">
          ✓ Test Case 1 Passed
          <br />✓ Test Case 2 Passed
        </div>
      </div>
    ),
  },
  {
    key: "reviewQueue",
    title: "Human Review Queue",
    summary: "A recruiter settles the borderline calls",
    icon: ShieldCheck,
    hue: STEP_HUE.review,
    heading: "Human Recruiter Review Queue",
    tagline: "Borderline audit & score calibration",
    description:
      "Keep human recruiters in the loop for borderline candidate scores, disputed claims, and final hiring audits.",
    steps: [
      "Candidates near the ATS cutoff threshold or with ambiguous answers are flagged for human review.",
      "Recruiters inspect the transcript clips, verify evidence, and calibrate or override AI scoring.",
      "Full audit log tracking protects hiring decisions against bias or false positives.",
    ],
    illustration: () => (
      <div className="w-64 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-[11px] shadow-xs">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-bold text-amber-900">Flagged: Borderline ATS Score</span>
          <span className="rounded bg-amber-100 px-1 text-[11px] font-bold text-amber-800">Needs Audit</span>
        </div>
        <p className="text-slate-600">Score 58/100 (Threshold 60) — Question 3 requires human verification.</p>
      </div>
    ),
  },
  {
    key: "ats",
    title: "My Candidates (ATS)",
    summary: "Every applicant for this role, on one board",
    icon: Layers,
    hue: "slate",
    always: true,
    heading: "My Candidates (ATS)",
    tagline: "Comes with every job",
    description: "One pipeline for this role, and email that sends itself as people move through it.",
    steps: [
      "Applicants, invitees and uploads all land here automatically.",
      "Drag a candidate to the next stage — rename or reorder the stages to match how you hire.",
      "With auto-send on, each stage change fires its own email template, so nobody waits on you.",
    ],
    illustration: () => (
      <div className="grid w-72 grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
        {["bg-slate-300", "bg-sky-400", "bg-brand-700"].map((bar) => (
          <div key={bar} className="rounded border border-slate-100 bg-white p-2 shadow-2xs">
            <div className={`mb-1 h-2 w-8 rounded ${bar}`} />
            <div className="h-1.5 w-14 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    ),
  },
  {
    key: "jobPost",
    title: "Job Post",
    summary: "A public listing on your careers page",
    icon: Briefcase,
    hue: "slate",
    always: true,
    heading: "Job Post & Careers Portal",
    tagline: "Comes with every job",
    description: "Public careers portal listing with branded application page and direct candidate link.",
    steps: [
      "Publish your role with one click to make it visible on your company's careers portal.",
      "Candidates review full responsibilities, requirements, and submit their application directly.",
      "Headcount caps and vacancy controls automatically close the role once openings are filled.",
    ],
    illustration: ({ title }) => (
      <div className="w-64 rounded-xl border border-slate-200 bg-white p-3 text-[11px] shadow-xs">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-bold text-slate-900">{title || "Public Role Title"}</span>
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-brand-800">Active Post</span>
        </div>
        <p className="mb-2 text-slate-500">Remote / Hybrid • Full-time</p>
        <div className="w-full rounded bg-slate-900 py-1 text-center font-medium text-white">Apply for this role</div>
      </div>
    ),
  },
];

/** One option. The whole card previews it; only the checkbox includes it. */
function FeatureCard({ feature, included, focused, onFocus, onToggle }) {
  const hue = HUES[feature.hue];
  const Icon = feature.icon;
  // An excluded feature reads as OFF at a glance — grey tile, quieter text —
  // without looking disabled: it is still a live choice, one click away.
  const on = feature.always || included;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={focused}
      onClick={onFocus}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onFocus();
        }
      }}
      className={`group flex cursor-pointer items-center gap-3.5 rounded-xl border p-4 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${
        focused
          ? `${hue.selected} shadow-sm`
          : "border-hairline bg-white hover:-translate-y-px hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      {feature.always ? (
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500"
          title="Always included"
        >
          <Lock className="h-3 w-3" aria-hidden="true" />
        </span>
      ) : (
        <input
          type="checkbox"
          checked={included}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          // Named by aria-label rather than by wrapping the title in a <label>:
          // wrapping made a click on the feature's NAME toggle it, when a
          // recruiter clicking a name wants to read what the feature does.
          aria-label={`Include ${feature.title}`}
          className={`h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 ${hue.check}`}
        />
      )}
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
          on ? hue.tile : "bg-slate-100 text-slate-400"
        }`}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`truncate text-sm font-semibold ${on ? "text-slate-900" : "text-slate-600"}`}>
            {feature.title}
          </span>
          {feature.recommended && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${hue.pill}`}>
              Recommended
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">{feature.summary}</span>
      </span>
    </div>
  );
}

/** What the focused feature does — and the way to add or remove it. */
function FeaturePane({ feature, included, onToggle, title }) {
  const hue = HUES[feature.hue];
  const Icon = feature.icon;
  return (
    <div
      // Keyed by feature, so switching replays the entrance. The motion is a
      // 4px rise and a fade — whole pixels, so text never rasterises soft — and
      // it is switched off under prefers-reduced-motion (see index.css).
      key={feature.key}
      className={`feature-pane-in flex flex-1 flex-col overflow-hidden rounded-2xl border border-hairline bg-gradient-to-b ${hue.wash} via-white to-white`}
    >
      <div className="flex-1 p-6">
        <div className="flex items-start gap-3.5">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${hue.tile}`} aria-hidden="true">
            <Icon className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base leading-snug font-semibold text-slate-900">{feature.heading}</h3>
            <p className={`mt-0.5 text-sm font-medium ${hue.text}`}>{feature.tagline}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
              feature.always || included ? hue.pill : "bg-slate-100 text-slate-600"
            }`}
          >
            {feature.always ? "Always included" : included ? "Included" : "Not included"}
          </span>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-600">{feature.description}</p>

        <p className="mt-6 mb-3 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">How it works</p>
        {/* A connected timeline rather than a bare numbered list: the rail
            between the markers is what makes "this happens, then this"
            legible before a word of it is read. */}
        <ol>
          {feature.steps.map((step, i) => {
            const last = i === feature.steps.length - 1;
            return (
              <li key={step} className="relative flex gap-3">
                {!last && (
                  <span className={`absolute top-7 bottom-0 left-[11px] w-0.5 rounded-full ${hue.rail}`} aria-hidden="true" />
                )}
                <span
                  className={`relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${hue.marker}`}
                >
                  {i + 1}
                </span>
                <span
                  className={`mb-2 flex-1 rounded-lg px-2.5 py-1.5 text-sm leading-relaxed text-slate-700 transition-colors ${hue.hoverRow}`}
                >
                  {step}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-5 flex justify-center">{feature.illustration({ title })}</div>
      </div>

      {!feature.always && (
        <div className="flex items-center justify-between gap-3 border-t border-hairline bg-white/80 px-6 py-3.5">
          <p className="text-xs text-slate-500">
            {included ? "This step will run for every applicant." : "This step is currently skipped."}
          </p>
          <button
            type="button"
            onClick={onToggle}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${
              included
                ? "border border-hairline bg-white text-slate-700 hover:border-slate-300 hover:bg-canvas"
                : "bg-brand-800 text-white hover:bg-brand-700"
            }`}
          >
            {included ? (
              <>
                <Minus className="h-4 w-4" aria-hidden="true" /> Remove from job
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" aria-hidden="true" /> Add to job
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default function FeaturePicker({ includes, onToggle, focused, onFocus, title }) {
  const selectable = FEATURES.filter((f) => !f.always);
  const always = FEATURES.filter((f) => f.always);
  const current = FEATURES.find((f) => f.key === focused) || FEATURES[0];
  const card = (f) => (
    <FeatureCard
      key={f.key}
      feature={f}
      included={Boolean(includes[f.key])}
      focused={f.key === current.key}
      onFocus={() => onFocus(f.key)}
      onToggle={() => onToggle(f.key)}
    />
  );

  return (
    <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto pt-5 md:grid-cols-12">
      <div className="flex flex-col gap-5 md:col-span-5">
        <div>
          <p className="mb-2.5 text-[11px] font-semibold tracking-wider text-slate-500">PICK WHAT TO INCLUDE</p>
          <div className="flex flex-col gap-2.5">{selectable.map(card)}</div>
        </div>
        <div>
          <p className="mb-2.5 text-[11px] font-semibold tracking-wider text-slate-500">ALWAYS INCLUDED</p>
          <div className="flex flex-col gap-2.5">{always.map(card)}</div>
        </div>
        <p className="mt-auto flex items-center gap-1.5 text-xs text-slate-500">
          <Check className="h-3.5 w-3.5 text-brand-700" aria-hidden="true" />
          You can change any of these after the job is created.
        </p>
      </div>
      <div className="flex flex-col md:col-span-7">
        <FeaturePane
          feature={current}
          included={Boolean(includes[current.key])}
          onToggle={() => onToggle(current.key)}
          title={title}
        />
      </div>
    </div>
  );
}
