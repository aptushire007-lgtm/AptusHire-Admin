/* Hallmark · genre: modern-minimal · macrostructure: Split Studio
 * design-system: DESIGN.md (locked) · designed-as-app
 * H2 hero knobs: ratio=7/5, right=proof column, divider=negative space
 * Split knobs: 4 movements, alternating direction, artifact per movement
 * nav: N1b (shared component, unchanged) · footer: Ft5 Statement
 * enrichment: Tier-A hand-built artifact panels (LoopArtifacts.jsx)
 * pre-emit critique: P5 H5 E5 S5 R4 V5
 * contrast: pass (40–41) · honest: pass (46) · chrome: pass (47) · tokens: pass (48)
 * responsive: pass (49–53) · icons: pass (30) · eyebrow/section-head: pass (54)
 *
 * Replaces: Narrative Workflow — six stacked text cards of equal weight, which
 * carried the right argument in the most monotonous form available. Each stage
 * now pairs with the artifact it actually produces, because a product whose
 * claim is "look at the evidence" should show the evidence rather than describe
 * it in a sixth consecutive paragraph.
 *
 * Deliberately NOT carried over from the supplied reference: the dark neural
 * backdrop and glow wave (DESIGN.md § Don't — looking futuristic undermines the
 * claim that a code path computed the score), the borrowed logo wall (gate 46 —
 * fabricated endorsement), and the three equal icon-above-heading-above-body
 * cards (a named critical tell in its own right). The reference's *structure* —
 * visual anchor, 3-up strip, visual-per-step — is what was worth taking.
 *
 * Motion is down from four revealed sections to one: the diptych halves
 * cross-fade in staggered, per the Split Studio reveal spec. Everything else on
 * the page is simply there.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Building2, Check, Clock3, FileCheck2, FileText, Gift, GitCompare, MessageSquare, RefreshCw, Scale, Send, Settings2, ShieldCheck, Users, Video, Volume2, VolumeX, Zap } from "lucide-react";
import api from "../api/client.js";
import MarketingNavbar from "../components/marketing/MarketingNavbar.jsx";
import { FinalCTA, ClosingStatement, Footer } from "../components/marketing/FinalCTA.jsx";
import WorkflowCards from "../components/marketing/WorkflowCards.jsx";
import Button from "../components/ui/Button.jsx";
import Tilt from "../motion/Tilt.jsx";

// The hero's bottom benefit strip — four short, verifiable claims rather than
// the vague "trusted by" tagline a reference deck would put here.
const HERO_BENEFITS = [
  { icon: Users, title: "Fairer Hiring", body: "Reduce bias with evidence-based evaluations." },
  { icon: ShieldCheck, title: "Auditable Decisions", body: "Every score is traceable and explainable." },
  { icon: Zap, title: "Save Recruiter Time", body: "Screen faster without losing depth." },
  { icon: BarChart3, title: "Better Candidates", body: "Focus on the right talent, not just keywords." },
];

// The honest replacement for the reference's "trusted by 99,000+ brands" logo
// wall. We have no customer logos to show, and inventing them is the fastest
// way to lose the argument this page is making. What we do have is the record
// the product leaves behind — which is the thing a buyer is actually shopping
// for when their legal team is in the room.
const EVIDENCE = [
  {
    icon: FileCheck2,
    iconClass: "bg-brand-100 text-brand-700",
    title: "A record for a bias audit",
    body: "Every assessment can be re-run with identity signals removed and the two results compared. A divergence flags the assessment for human review rather than burying it.",
  },
  {
    icon: Clock3,
    iconClass: "bg-amber-100 text-amber-700",
    title: "A decision you can re-derive",
    body: "Each assessment stores a hash of its inputs, its prompt versions, and its scorer version — so a decision made today can be reproduced, line for line, months from now.",
  },
  {
    icon: ShieldCheck,
    iconClass: "bg-violet-100 text-violet-700",
    title: "A person on every adverse action",
    body: "Automatic rejection is opt-in and off by default, and the deterministic fallback can never emit an adverse recommendation on its own.",
  },
];

// Capability index. Each row maps to a shipped surface — nothing aspirational.
const CAPABILITIES = [
  {
    icon: FileText,
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
    name: "Résumé screening",
    body: "Every application is parsed and scored against the role's approved rubric, with the evidence for each criterion attached to the result.",
  },
  {
    icon: Video,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    name: "AI interviews",
    body: "Adaptive technical and behavioural interviews over a secure expiring link, targeted at the claims screening could not verify.",
  },
  {
    icon: Users,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    name: "Candidate pipeline",
    body: "Fourteen stages from applied through to joined, updated live across every recruiter's view without a refresh.",
  },
  {
    icon: FileCheck2,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    name: "Evidence reports",
    body: "Each report names the criterion, the quoted evidence, and the confidence behind every judgement it records.",
  },
  {
    icon: MessageSquare,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    name: "Review queue",
    body: "Anything the engine is honestly unsure about is routed to a person, carrying the reason it was routed and the evidence behind it.",
  },
  {
    icon: Send,
    iconBg: "bg-cyan-100",
    iconColor: "text-cyan-600",
    name: "Automatic invitations",
    body: "Candidates who pass are invited automatically with a secure link, a schedule, and instructions. No manual scheduling thread.",
  },
  {
    icon: RefreshCw,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    name: "Reproducibility",
    body: "Every assessment carries a hash of its inputs, prompt versions, and scorer version, so a decision can be re-derived months later.",
  },
  {
    icon: GitCompare,
    iconBg: "bg-fuchsia-100",
    iconColor: "text-fuchsia-600",
    name: "Bias counterfactuals",
    body: "Assessments are re-run with identity signals removed and the two results compared. A divergence flags the assessment for human review.",
  },
];

// The refusals. Stated plainly because they are the product position, and
// because each one is a constraint the codebase actually enforces.
const REFUSALS = [
  ["No number without a source", "Every fact behind a score carries the verbatim line it came from. Facts that cannot be cited are discarded, not estimated."],
  ["No automatic rejection", "Auto-reject is opt-in and off by default, and the deterministic fallback can never emit an adverse recommendation. A person signs every adverse action."],
  ["No generic benchmark", "Nobody is scored against a global average or a model's opinion of a good résumé — only against this role's approved rubric, naming the criterion that drove each judgement."],
  ["No borrowed confidence", "Degraded, fallback, and estimated results are labelled as such everywhere they surface — on screen, in the PDF, and in the API. A placeholder is never dressed as a measurement."],
];

function formatPrice(amount) {
  if (amount === 0) return "Free";
  return `₹${amount.toLocaleString("en-IN")}`;
}

// Same card treatment as the standalone /pricing page (Pricing.jsx) — icon
// chip per position, independent of whatever key the plan carries.
const PLAN_STYLES = [
  { icon: Gift, iconBg: "bg-sky-100", iconColor: "text-sky-600" },
  { icon: Users, iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
  { icon: Zap, iconBg: "bg-brand-100", iconColor: "text-brand-700" },
  { icon: Building2, iconBg: "bg-violet-100", iconColor: "text-violet-600" },
];

export default function Landing() {
  const [plans, setPlans] = useState([]);
  // Autoplay only works muted (browser policy) — start muted, let a visible
  // control turn sound on rather than silently failing to play at all.
  const [videoMuted, setVideoMuted] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/subscriptions/plans")
      .then((res) => !cancelled && setPlans(res.data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-slate-900 transition-colors">
      <MarketingNavbar />

      {/* Hero — H2 split diptych at 7/5. Never wrapped in Reveal: above-the-fold
          content paints immediately rather than waiting on an observer. */}
      {/* Bottom padding runs ≥1.4× the top so the hero pulls into the next
          section's rhythm rather than floating above it (gate 44a). */}
      {/* The aurora wash is full-bleed, so it needs a wrapper the centred,
          max-width hero cannot provide on its own. `-z-10` keeps it behind the
          text without taking the section out of flow. */}
      <div className="relative overflow-hidden">
        {/* Hero photo — faded left-to-right and into the white section below so
            the heading (which sits on the left) stays fully legible, while the
            image itself is still visible further right and near the bottom. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-cover bg-[center_20%]"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.75) 32%, rgba(255,255,255,0.2) 62%, rgba(255,255,255,0.05) 100%), linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.05) 60%, rgba(255,255,255,0.9) 100%), url('/welcome-hero.png')",
          }}
          aria-hidden="true"
        />
        {/* Layered explicitly rather than with `-z-10` — a negative z-index does
            not stay inside `position: relative`, and the wash would slide behind
            the page's white background and disappear. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-aurora" aria-hidden="true" />
      <section className="relative flex mx-auto max-w-[90rem] flex-col gap-y-16 px-5 pt-16 pb-20 sm:px-8 lg:pt-16 lg:pb-24">
        <div className="max-w-4xl">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Scale className="h-4 w-4 text-brand-600" aria-hidden="true" />
            Evidence-bound hiring intelligence
          </p>
          {/* Two-tone display: the second line carries the accent. Solid colour,
              never a gradient fill — gradient text is the most-recognised AI
              headline tell there is. */}
          <h1 className="mt-5 text-4xl leading-[1.08] font-extrabold tracking-tight text-brand-800 [overflow-wrap:anywhere] sm:text-5xl lg:text-[4rem] xl:text-[4.75rem]">
            Every score traces
            <span className="block text-brand-600">to a quoted line.</span>
          </h1>
          <p className="mt-6 text-[22px] font-semibold text-slate-800 sm:text-2xl lg:text-[26px]">
            The model never emits the score. Code computes it — from evidence it was required to cite.
          </p>
          <p className="mt-5 max-w-prose text-lg text-slate-600">
            AptusHire screens candidates against a frozen, recruiter-approved rubric for the role, then shows you
            the criterion, the quoted evidence, and the arithmetic behind every number it produces. The kind of
            record you can hand to a hiring manager, an auditor, or a candidate who asks why.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Button as={Link} to="/register-company" size="lg" className="whitespace-nowrap">
              Start free trial <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              as={Link}
              to="/demo"
              variant="secondary"
              size="lg"
              className="whitespace-nowrap !border-[#BFDDF5] !text-brand-800 hover:!bg-[#EAF5FF]"
            >
              Request a demo
            </Button>
          </div>

          <p className="mt-6 text-sm text-slate-500">
            No credit card for the trial. Automatic rejection is off by default.
          </p>
        </div>

        {/* Bottom benefit strip — a single subtle glass card, full hero width. */}
        <div>
          <div className="grid gap-x-8 gap-y-6 rounded-2xl border border-hairline/70 bg-surface/70 p-6 backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-4 lg:p-7">
            {HERO_BENEFITS.map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF5FF] text-brand-700">
                  <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-slate-600">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      </div>

      {/* Full-bleed cinematic video, directly after the hero. */}
      <section className="relative h-screen w-full overflow-hidden bg-slate-950">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/welcome-hero-video.mp4"
          autoPlay
          muted={videoMuted}
          loop
          playsInline
        />
        <button
          type="button"
          onClick={() => setVideoMuted((m) => !m)}
          aria-label={videoMuted ? "Unmute video" : "Mute video"}
          className="absolute right-6 bottom-6 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {videoMuted ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
        </button>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-canvas to-transparent"
          aria-hidden="true"
        />
      </section>

      {/* Evidence strip — the honest occupant of the reference's logo-wall slot.
          Three elevated cards (matching the WorkflowCards' visual language
          below) rather than divided text columns — a card holds its own
          shape at any viewport width instead of wrapping unevenly. */}
      <section className="relative overflow-hidden border-y border-slate-200 bg-canvas">
        <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-brand-100/50 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-16 -bottom-24 h-64 w-64 rounded-full bg-amber-100/40 blur-3xl" aria-hidden="true" />
        <div
          className="pointer-events-none absolute top-6 right-8 hidden h-28 w-28 opacity-50 sm:block"
          style={{ backgroundImage: "radial-gradient(var(--color-slate-300) 1px, transparent 1px)", backgroundSize: "14px 14px" }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-[90rem] px-5 py-14 sm:px-8 lg:py-16">
          <h2 className="max-w-3xl text-[28px] leading-[1.25] font-extrabold tracking-tight text-balance text-brand-800 [overflow-wrap:anywhere] sm:text-[32px] lg:text-[34px]">
            What you hand to the people who ask <span className="text-brand-600">how a decision was made.</span>
          </h2>

          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-3">
            {EVIDENCE.map((item) => (
              <div key={item.title}>
                <div className="flex items-center gap-2.5">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.iconClass}`}>
                    <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <h3 className="text-[15px] font-bold text-brand-800 [overflow-wrap:anywhere] sm:text-base">{item.title}</h3>
                </div>
                <p className="mt-2.5 text-[14px] leading-relaxed text-slate-600 sm:text-[15px]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Decision workflow — text on the left, the loop as four connected
          product cards spanning the full width below. A side-by-side split
          squeezed the cards into too narrow a column and forced their short
          titles ("Job Description", "Evaluation & Scoring") to break
          mid-word; a full-width row gives every card enough room that a
          title never needs to wrap past one line. */}
      <section id="how-it-works" className="relative overflow-hidden px-5 py-24 sm:px-8 lg:py-28">
        <div className="pointer-events-none absolute -top-16 -left-24 h-64 w-64 rounded-full bg-amber-100/40 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-24 -bottom-16 h-72 w-72 rounded-full bg-brand-100/50 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto max-w-[90rem]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold whitespace-nowrap text-brand-700">
            <Settings2 className="h-3.5 w-3.5" aria-hidden="true" /> From job description to verifiable decision
          </span>
          <h2 className="mt-5 max-w-4xl text-[34px] leading-[1.15] font-extrabold tracking-tight text-balance text-brand-800 sm:text-[40px] lg:text-[44px]">
            One loop, from job description to <span className="text-brand-600">defensible decision</span>
          </h2>
          <p className="mt-5 max-w-2xl text-base text-slate-600 sm:text-lg">
            Most platforms bolt a language model onto an applicant tracker and return a number. This is the sequence
            that replaces it — and the artifact each stage leaves behind.
          </p>
          <p className="mt-4 max-w-2xl text-xs leading-relaxed text-slate-500">
            The panels show the shape of each artifact. They illustrate the format; none of them is a candidate
            record, and no figure on this page is a measurement of a real person.
          </p>

          <div className="mt-14">
            <WorkflowCards />
          </div>
        </div>
      </section>

      {/* Capability index. Icon-led rows in a single elevated card, over the
          same background artwork used on the login page. */}
      <section id="features" className="relative overflow-hidden border-t border-slate-200">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/brand/login-bg.png')" }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-[90rem] px-5 py-24 sm:px-8">
          <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-brand-600 uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
            Platform overview
          </span>
          <h2 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-brand-900 [overflow-wrap:anywhere] sm:text-4xl">
            What the platform does
          </h2>
          <p className="mt-4 max-w-prose text-lg text-slate-600">
            One workspace for jobs, candidates, interviews, and the record of how each decision was reached.
          </p>

          <dl className="mt-12 divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-lift sm:p-3">
            {CAPABILITIES.map((item) => (
              <div key={item.name} className="flex flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:gap-6">
                <div className="flex items-center gap-4 sm:w-72 sm:shrink-0">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}>
                    <item.icon className={`h-5 w-5 ${item.iconColor}`} aria-hidden="true" />
                  </span>
                  <dt className="font-bold text-slate-900 [overflow-wrap:anywhere]">{item.name}</dt>
                </div>
                <dd className="text-slate-600 sm:flex-1">{item.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* The refusals — the position, stated plainly. */}
      <section id="why-us" className="mx-auto max-w-[90rem] px-5 py-24 sm:px-8">
        <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-900 [overflow-wrap:anywhere] sm:text-4xl">
          What this platform will not do
        </h2>
        <p className="mt-4 max-w-prose text-lg text-slate-600">
          These are constraints in the code, not promises in a brochure. They are also the reason the output holds up
          when someone asks how a decision was made.
        </p>

        <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {REFUSALS.map(([title, body]) => (
            <div key={title}>
              <h3 className="text-lg font-semibold tracking-tight text-slate-900 [overflow-wrap:anywhere]">{title}</h3>
              <p className="mt-2 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing — real plan data from the API. All four cards equal weight —
          no "most popular" highlight, no ring, same button on every card. */}
      <section id="pricing" className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-[90rem] px-5 py-20 sm:px-8">
          <h2 className="max-w-3xl text-[32px] font-extrabold tracking-tight text-slate-900 [overflow-wrap:anywhere] sm:text-[36px]">
            Pricing
          </h2>
          <p className="mt-2 max-w-prose text-[15px] text-slate-600">Start free. Move up as your hiring volume grows.</p>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan, i) => {
              const style = PLAN_STYLES[i % PLAN_STYLES.length];
              const Icon = style.icon;
              return (
                <Tilt
                  key={plan.key}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-surface p-6 shadow-card"
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.iconBg}`}>
                    <Icon className={`h-5 w-5 ${style.iconColor}`} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-slate-900 [overflow-wrap:anywhere]">{plan.name}</h3>
                  <p className="mt-1 text-[13px] text-slate-500">{plan.description}</p>
                  <p className="mt-5 text-[32px] leading-none font-extrabold text-slate-900">
                    {formatPrice(plan.pricing.monthly)}
                    {plan.pricing.monthly > 0 && <span className="text-sm font-medium text-slate-500"> /mo</span>}
                  </p>
                  <ul className="mt-5 flex-1 space-y-2.5 border-t border-slate-100 pt-5 text-sm text-slate-700">
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                      {plan.limits.maxJobs.toLocaleString()} active jobs
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                      {plan.limits.maxAiInterviews.toLocaleString()} AI interviews / month
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                      {plan.limits.maxRecruiters.toLocaleString()} recruiter seats
                    </li>
                  </ul>
                  <Button as={Link} to="/register-company" variant="secondary" className="mt-6 w-full whitespace-nowrap">
                    Get started
                  </Button>
                </Tilt>
              );
            })}
            {plans.length === 0 && <p className="col-span-full text-sm text-slate-500">Loading plans…</p>}
          </div>
        </div>
      </section>

      <FinalCTA />
      <ClosingStatement />
      <Footer />
    </div>
  );
}
