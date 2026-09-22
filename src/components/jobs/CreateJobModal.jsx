import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCode,
  Globe,
  Plus,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import api from "../../api/client.js";
import { useToast } from "../ui/Toast.jsx";
import { validateJobForm, JOB_FIELD_LABELS } from "../../lib/jobForm.js";
import FeaturePicker from "./FeaturePicker.jsx";

// Exact date formatter matching "10 Sep '26" in reference images
function formatShortDate(date = new Date()) {
  const d = new Date(date);
  const day = d.getDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getMonth()];
  const year = String(d.getFullYear()).slice(-2);
  return `${day} ${month} '${year}`;
}

const SAMPLE_JD = `About the Role:
We are seeking a talented, proactive professional to join our team. In this position, you will take ownership of key initiatives, collaborate closely with cross-functional team members, and contribute directly to high-impact products.

Key Responsibilities:
• Lead core deliverables aligned with strategic milestones.
• Work in close collaboration with product, engineering, and design teammates.
• Maintain high operational standards and uphold rigorous quality benchmarks.
• Identify workflow efficiencies and propose scalable technical solutions.
• Participate in technical reviews and mentor teammates.

Requirements & Qualifications:
• 3+ years of relevant experience in a comparable capacity.
• Demonstrated track record of delivering resilient, high-quality outcomes.
• Strong problem-solving, architectural, and analytical capabilities.
• Excellent verbal and written communication skills across teams.
• Bachelor's degree in a relevant discipline or equivalent practical experience.`;

// 4 Priority Tiers strictly aligned with AptusHire's backend IMPORTANCE_TIERS (rubricEngine.js)
const PRIORITY_TIERS = {
  critical: {
    key: "critical",
    label: "Must Have",
    badgeClass: "bg-red-50 text-red-600 border-red-200",
    borderClass: "border-l-red-500",
    dotClass: "bg-red-500",
    bars: 4,
    multiplier: 8,
    subtitle: "Crucial requirement",
    color: "#EF4444",
  },
  important: {
    key: "important",
    label: "Very Important",
    badgeClass: "bg-amber-50 text-amber-600 border-amber-200",
    borderClass: "border-l-amber-500",
    dotClass: "bg-amber-500",
    bars: 3,
    multiplier: 4,
    subtitle: "High impact",
    color: "#F59E0B",
  },
  helpful: {
    key: "helpful",
    label: "Important",
    badgeClass: "bg-emerald-50 text-emerald-600 border-emerald-200",
    borderClass: "border-l-emerald-500",
    dotClass: "bg-emerald-500",
    bars: 2,
    multiplier: 2,
    subtitle: "Standard weight",
    color: "#10B981",
  },
  bonus: {
    key: "bonus",
    label: "Good to Have",
    badgeClass: "bg-emerald-50 text-brand-800 border-emerald-200",
    borderClass: "border-l-indigo-500",
    dotClass: "bg-brand-700",
    bars: 1,
    multiplier: 1,
    subtitle: "Bonus qualification",
    color: "#6366F1",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Role-Adaptive Criteria Engine (Automated synthesis for any domain)
// ─────────────────────────────────────────────────────────────────────────────
export function generateCriteriaForRole(title = "", description = "", skills = []) {
  const text = `${title} ${description} ${(skills || []).join(" ")}`.toLowerCase();

  // 1. Marketing / Growth / Brand / Content / SEO / Social Media
  if (text.match(/\b(market|growth|brand|seo|content|campaign|social media|advertising|demand gen|copywrit|acquisition|pr\b|public relations)\b/i)) {
    return [
      {
        id: "crit-1",
        label: "Campaign Strategy & Multi-Channel ROI",
        description: "Proven track record designing, executing, and scaling multi-channel marketing campaigns that drive measurable pipeline and revenue growth.",
        importance: "critical",
      },
      {
        id: "crit-2",
        label: "Audience Segmentation & Funnel Analytics",
        description: "Deep expertise analyzing customer journeys, conversion rates, CAC/LTV dynamics, and attribution modeling across marketing touchpoints.",
        importance: "important",
      },
      {
        id: "crit-3",
        label: "Brand Positioning & High-Impact Messaging",
        description: "Ability to translate product value propositions into compelling narrative messaging, creative assets, and cohesive brand storytelling.",
        importance: "helpful",
      },
      {
        id: "crit-4",
        label: "Cross-Functional Collaboration & Agency Management",
        description: "Collaborates seamlessly with sales, product, and external agency partners to ensure go-to-market alignment and execution excellence.",
        importance: "bonus",
      },
    ];
  }

  // 2. Sales / Business Development / Account Executive
  if (text.match(/\b(sales|account exec|business dev|sdr\b|bdr\b|account manag|quota|commercial|pipeline closing|deal)\b/i)) {
    return [
      {
        id: "crit-1",
        label: "Pipeline Generation & Quota Achievement",
        description: "Consistent history of exceeding revenue targets, prospecting high-value accounts, and managing complex multi-stakeholder sales cycles.",
        importance: "critical",
      },
      {
        id: "crit-2",
        label: "Consultative Discovery & Value Selling",
        description: "Ability to uncover core customer pain points, navigate enterprise decision hierarchies, and articulate quantifiable financial ROI.",
        importance: "important",
      },
      {
        id: "crit-3",
        label: "Contract Negotiation & Deal Closing",
        description: "Skilled in objection handling, commercial contract negotiations, and accelerating procurement and legal approvals.",
        importance: "helpful",
      },
      {
        id: "crit-4",
        label: "CRM Hygiene & Forecasting Accuracy",
        description: "Disciplined CRM management, reliable quarterly forecasting, and collaborative territory planning.",
        importance: "bonus",
      },
    ];
  }

  // 3. Product Management
  if (text.match(/\b(product manag|product owner|technical product|group product|cpo\b|head of product|scrum product)\b/i)) {
    return [
      {
        id: "crit-1",
        label: "Strategic Roadmapping & Product Vision",
        description: "Synthesizes customer feedback, competitive intelligence, and business goals into a clear, prioritized product roadmap.",
        importance: "critical",
      },
      {
        id: "crit-2",
        label: "Cross-Functional Feature Execution",
        description: "Partners effectively with engineering and design to drive end-to-end delivery of high-quality features on predictable timelines.",
        importance: "important",
      },
      {
        id: "crit-3",
        label: "User Research & Product Telemetry",
        description: "Combines qualitative user discovery interviews with quantitative telemetry, funnels, and A/B experimentation to validate hypotheses.",
        importance: "helpful",
      },
      {
        id: "crit-4",
        label: "Stakeholder Alignment & Tradeoff Management",
        description: "Clearly communicates strategic priorities and navigates executive tradeoffs with transparency and data-backed rationale.",
        importance: "bonus",
      },
    ];
  }

  // 4. Design / UX / UI
  if (text.match(/\b(design|ux\b|ui\b|graphic|interaction design|visual design|product design|figma|prototyp)\b/i)) {
    return [
      {
        id: "crit-1",
        label: "User-Centered Flows & Interactive Prototyping",
        description: "Creates intuitive, frictionless user flows, wireframes, and interactive prototypes tested and validated with real end users.",
        importance: "critical",
      },
      {
        id: "crit-2",
        label: "Design Systems & Visual Craft",
        description: "Deep mastery of visual hierarchy, typography, interaction patterns, and scalable design system component libraries.",
        importance: "important",
      },
      {
        id: "crit-3",
        label: "Usability Testing & Design Research",
        description: "Conducts evaluative usability studies and synthesizes qualitative feedback into actionable product improvements.",
        importance: "helpful",
      },
      {
        id: "crit-4",
        label: "Engineering Handoff & Implementation Integrity",
        description: "Collaborates closely with frontend engineers to inspect production builds and ensure pixel-perfect fidelity.",
        importance: "bonus",
      },
    ];
  }

  // 5. Data Science / AI / Machine Learning / Analytics
  if (text.match(/\b(data scien|machine learning|ml\b|ai\b|deep learning|nlp\b|computer vision|data analy|analytics|bi\b|sql|etl|pipeline)\b/i)) {
    return [
      {
        id: "crit-1",
        label: "Statistical Modeling & Algorithmic Rigor",
        description: "Designs, trains, and validates robust predictive models and statistical algorithms with rigorous cross-validation and benchmark testing.",
        importance: "critical",
      },
      {
        id: "crit-2",
        label: "Data Architecture & Pipeline Engineering",
        description: "Proficient building reliable SQL transformations, data pipelines, and scalable feature stores for production workloads.",
        importance: "important",
      },
      {
        id: "crit-3",
        label: "Business Impact & Insight Translation",
        description: "Translates complex analytical findings and model metrics into concrete, actionable strategic recommendations for stakeholders.",
        importance: "helpful",
      },
      {
        id: "crit-4",
        label: "Experimentation Design & A/B Testing",
        description: "Formulates statistically sound hypothesis tests, sample size determinations, and variance reduction methodologies.",
        importance: "bonus",
      },
    ];
  }

  // 6. HR / Talent Acquisition / People Operations
  if (text.match(/\b(hr\b|human resources|recruiter|talent|people ops|talent acquisition|hiring|people partner)\b/i)) {
    return [
      {
        id: "crit-1",
        label: "Full-Cycle Sourcing & Candidate Engagement",
        description: "Proven track record sourcing, evaluating, and closing top-tier talent across diverse organizational functions.",
        importance: "critical",
      },
      {
        id: "crit-2",
        label: "Hiring Manager Partnership & Advisory",
        description: "Acts as a strategic talent advisor, helping hiring managers define role profiles, calibrate rubrics, and run structured loops.",
        importance: "important",
      },
      {
        id: "crit-3",
        label: "People Operations & Regulatory Compliance",
        description: "Ensures compliance with employment laws, workplace policies, seamless onboarding workflows, and structured documentation.",
        importance: "helpful",
      },
      {
        id: "crit-4",
        label: "Employer Brand & Culture Advocacy",
        description: "Champions an inclusive company culture and elevates candidate experience across all touchpoints.",
        importance: "bonus",
      },
    ];
  }

  // 7. Finance / Accounting / Operations
  if (text.match(/\b(finance|accountant|accounting|controller|fp&a|financial analyst|audit|budget|payroll|operations|procurement)\b/i)) {
    return [
      {
        id: "crit-1",
        label: "Financial Modeling & Budget Stewardship",
        description: "Maintains rigorous financial forecasts, cash-flow models, budget variance analysis, and audit-ready fiscal reporting.",
        importance: "critical",
      },
      {
        id: "crit-2",
        label: "Operational Efficiency & Process Optimization",
        description: "Identifies workflow bottlenecks, automates recurring procedures, and implements scalable standard operating protocols.",
        importance: "important",
      },
      {
        id: "crit-3",
        label: "Statutory Compliance & Internal Controls",
        description: "Upholds compliance with accounting standards (GAAP/IFRS), tax obligations, and risk mitigation frameworks.",
        importance: "helpful",
      },
      {
        id: "crit-4",
        label: "Cross-Departmental Financial Advisory",
        description: "Partners with business unit leaders to analyze unit economics, cost optimizations, and strategic capital allocation.",
        importance: "bonus",
      },
    ];
  }

  // 8. Software Engineering / Tech / Developer (if matched)
  if (text.match(/\b(engineer|developer|software|frontend|backend|fullstack|devops|sre|cloud|system|architect|qa\b|tester|security)\b/i)) {
    return [
      {
        id: "crit-1",
        label: "Core Technical Competency & Architecture",
        description: "Demonstrates deep understanding of software engineering fundamentals, architectural patterns, and production system resilience.",
        importance: "critical",
      },
      {
        id: "crit-2",
        label: "Practical Problem Solving & Clean Code",
        description: "Ability to dissect ambiguous technical challenges, isolate root causes, and write clean, maintainable code under constraints.",
        importance: "important",
      },
      {
        id: "crit-3",
        label: "System Scalability & Performance Optimization",
        description: "Proven track record designing distributed systems, caching strategies, and database indexing for high throughput.",
        importance: "helpful",
      },
      {
        id: "crit-4",
        label: "Cross-Functional Collaboration & Mentorship",
        description: "Clearly articulates technical tradeoffs to product stakeholders and proactively mentors engineering teammates.",
        importance: "bonus",
      },
    ];
  }

  // 9. General Professional / Role-Specific Fallback
  return [
    {
      id: "crit-1",
      label: "Domain Expertise & Role Competency",
      description: `Demonstrates comprehensive subject matter mastery and practical execution capability for the ${title || "role"}.`,
      importance: "critical",
    },
    {
      id: "crit-2",
      label: "Execution Discipline & Problem Solving",
      description: "Proven ability to take ownership of complex initiatives, resolve ambiguous blockers, and deliver measurable outcomes on schedule.",
      importance: "important",
    },
    {
      id: "crit-3",
      label: "Cross-Functional Communication & Teamwork",
      description: "Communicates clearly and proactively across teams, fostering alignment and collaborative problem-solving.",
      importance: "helpful",
    },
    {
      id: "crit-4",
      label: "Continuous Learning & Adaptability",
      description: "Rapidly assimilates new domain requirements, workflows, and tools to maintain high operational excellence.",
      importance: "bonus",
    },
  ];
}

const DEFAULT_CRITERIA = generateCriteriaForRole();

// ─────────────────────────────────────────────────────────────────────────────
// Canvas Particle Swirl Component (Modal 6 - reference: media_1789123155068.png)
// ─────────────────────────────────────────────────────────────────────────────
function ParticleSwirlCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext?.("2d");
    if (!ctx) return;
    let animId;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;

    const count = 90;
    const particles = [];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(Math.random() * 2 - 1);
      const radius = 55 + Math.random() * 25;
      particles.push({
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
        size: Math.random() * 2.2 + 1.2,
        color: Math.random() > 0.4 ? "#3B82F6" : "#06B6D4",
        alpha: Math.random() * 0.7 + 0.3,
      });
    }

    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Central soft glow
      const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 70);
      grad.addColorStop(0, "rgba(59, 130, 246, 0.25)");
      grad.addColorStop(0.5, "rgba(6, 182, 212, 0.1)");
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 70, 0, Math.PI * 2);
      ctx.fill();

      angle += 0.015;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const tilt = 0.4;
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);

      const projected = particles.map((p) => {
        const x1 = p.x * cosA - p.z * sinA;
        const z1 = p.x * sinA + p.z * cosA;
        const y1 = p.y * cosT - z1 * sinT;
        const z2 = p.y * sinT + z1 * cosT;

        const fov = 180;
        const scale = fov / (fov + z2 + 80);
        const px = cx + x1 * scale;
        const py = cy + y1 * scale;
        const alpha = Math.max(0.15, Math.min(1, ((z2 + 80) / 160) * p.alpha));

        return { px, py, scale, z: z2, alpha, color: p.color, size: p.size };
      });

      projected.sort((a, b) => a.z - b.z);

      projected.forEach((p) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.px, p.py, p.size * p.scale, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 8 * p.scale;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={180}
      className="mx-auto block"
      aria-label="Creating job animation"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Modal Component
// ─────────────────────────────────────────────────────────────────────────────
/**
 * The one header every step of job creation uses: Back, the step's question,
 * where you are, Close.
 *
 * Each step used to hand-roll its own, so they drifted: some had a divider and
 * some did not, and one carried a static `bg-brand-700` bar styled like a
 * progress indicator that measured nothing. No step said how many remained.
 * This draws a real one — a segment per step, filled up to this one — with the
 * count in words beside it, so "how much is left" is answerable at a glance.
 *
 * The 88px side columns hold the title dead centre whether or not there is a
 * Back button, so the heading does not shift sideways as you move through the
 * steps. `id="create-job-modal-title"` is what the dialog is labelled by.
 */
function StepHeader({ title, onBack, onClose, position, total }) {
  return (
    <div className="border-b border-hairline pb-4">
      <div className="grid grid-cols-[88px_1fr_88px] items-center gap-2">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-hairline px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-800"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
            </button>
          )}
        </div>
        <h2 id="create-job-modal-title" className="text-center font-display text-lg leading-snug font-semibold text-slate-900">
          {title}
        </h2>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-canvas hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-800"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      {position > 0 && total > 1 && (
        <div className="mt-3 flex flex-col items-center gap-1.5">
          <div className="flex w-full max-w-[240px] gap-1" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={`h-1 flex-1 rounded-full ${i < position ? "bg-brand-700" : "bg-slate-200"}`} />
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Step {position} of {total}
          </p>
        </div>
      )}
    </div>
  );
}

export default function CreateJobModal({ isOpen, onClose, onCreated, onInspectJob, initialDraft = null }) {
  const navigate = useNavigate();
  const toast = useToast();

  // Step state: 1: New Hiring Project | 2: Capabilities | 3: Setup Mode | 4: Review Interview | 5: Rubric Builder | 6: Creation & Loading
  const [step, setStep] = useState(1);

  // Step 1 Form State
  const [title, setTitle] = useState("");
  const [projectName, setProjectName] = useState("");
  const [isProjectNameCustom, setIsProjectNameCustom] = useState(false);
  // Location, department and openings used to be hardcoded into the create
  // payload ("Remote / Hybrid", "General", 1) because the wizard never asked.
  // Every job created here was stored with the same three values regardless of
  // the actual role, and the recruiter had no way to tell — so they are inputs
  // now. Blank is allowed for the two optional ones and sends nothing, which
  // shows as "Location not specified" rather than a confident wrong answer.
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [numberOfOpenings, setNumberOfOpenings] = useState("1");

  // Step 2 Capabilities State - authentic AptusHire features only
  const [includes, setIncludes] = useState({
    aiInterview: true,
    cvEvaluation: true,
    test: false,
    reviewQueue: true,
  });
  const [focusedFeature, setFocusedFeature] = useState("aiInterview");

  // Where the recruiter is in the flow, and how much is left. The step count
  // genuinely varies — the AI interview and skills test screens only appear
  // when those are included — so it is derived from `includes` rather than
  // fixed, and updates live as the recruiter ticks options on step 2.
  const flow = [1, 2, 3, ...(includes.aiInterview ? [4] : []), 5, ...(includes.test ? ["assessment"] : [])];
  const progress = { position: flow.indexOf(step) + 1, total: flow.length };

  // Step 3 Setup options: 'jd' (upload or enter) | 'title' (AI generate) | 'duplicate'
  const [setupMode, setSetupMode] = useState("jd");
  const [jdTab, setJdTab] = useState("enter");
  const [jdText, setJdText] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");

  // Existing past projects for duplication
  const [pastProjects, setPastProjects] = useState([]);
  const [selectedPastJobId, setSelectedPastJobId] = useState("");
  const [pastProjectsSearch, setPastProjectsSearch] = useState("");

  // Step 4 Review AI Interview State
  const [interviewTab, setInterviewTab] = useState("general"); // 'general' | 'questions'
  const [interviewerName, setInterviewerName] = useState("Maya");
  const [interviewerTitle, setInterviewerTitle] = useState("Senior Technical Recruiter");
  const [interviewDuration, setInterviewDuration] = useState(15);
  const [interviewLanguage, setInterviewLanguage] = useState("English (US)");
  const [cvProbingEnabled, setCvProbingEnabled] = useState(true);
  const [questionMode, setQuestionMode] = useState("dynamic"); // 'dynamic' | 'preset'
  const [prescreeningQuestions, setPrescreeningQuestions] = useState([
    "Can you walk us through a recent high-impact project you led from concept to deployment?",
    "How do you approach debugging complex edge-cases or architectural bottlenecks?",
    "What considerations do you prioritize when designing scalable, reliable system components?",
  ]);

  // Step 5 Rubric Criteria Builder State
  const [criteria, setCriteria] = useState(() => generateCriteriaForRole());
  const [hasUserEditedCriteria, setHasUserEditedCriteria] = useState(false);
  const [activePriorityPickerIndex, setActivePriorityPickerIndex] = useState(null);

  // Skills Assessment Configuration State (Step "assessment" when includes.test is true)
  const [testDifficulty, setTestDifficulty] = useState("adaptive"); // 'adaptive' | 'easy' | 'medium' | 'hard'
  const [testDuration, setTestDuration] = useState(45); // 30, 45, 60, 90 mins
  const [testProctoring, setTestProctoring] = useState(true);
  const [testSoftLock, setTestSoftLock] = useState(true);
  const [testAutoGenerateItems, setTestAutoGenerateItems] = useState(true);
  const [customTestTopics, setCustomTestTopics] = useState("");

  // Step 6 Async Submission & Loading State
  const [creationProgress, setCreationProgress] = useState(0);
  const [creationMilestone, setCreationMilestone] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreationComplete, setIsCreationComplete] = useState(false);
  // Steps that did not complete. Surfaced on the done screen so "created" never
  // stands in for "fully configured".
  const [creationWarnings, setCreationWarnings] = useState([]);
  const [createdJob, setCreatedJob] = useState(null);
  const [publishingImmediately, setPublishingImmediately] = useState(false);
  const [error, setError] = useState("");
  const [generationNotice, setGenerationNotice] = useState("");

  const fileInputRef = useRef(null);

  // Load past projects for Option 3
  useEffect(() => {
    if (isOpen) {
      api.get("/jobs")
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
          setPastProjects(list);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Reset or prefill from draft when opening
  useEffect(() => {
    if (isOpen) {
      setError("");
      setGenerationNotice("");
      setCreatedJob(null);
      setIsCreationComplete(false);
      setCreationProgress(0);
      setCreationMilestone(0);
      setActivePriorityPickerIndex(null);
      setTestDifficulty("adaptive");
      setTestDuration(45);
      setTestProctoring(true);
      setTestSoftLock(true);
      setTestAutoGenerateItems(true);
      setCustomTestTopics("");

      if (initialDraft) {
        const draftTitle = initialDraft.job?.title || initialDraft.values?.title || "";
        setTitle(draftTitle);
        setProjectName(draftTitle ? `${draftTitle} hiring` : "");
        setIsProjectNameCustom(false);

        if (initialDraft.values?.description) {
          setJdText(initialDraft.values.description);
          setSetupMode("jd");
          setJdTab("enter");
        } else if (initialDraft.source === "title") {
          setSetupMode("title");
        }

        // Advance to step 2 if title is already set
        if (draftTitle) {
          setStep(2);
        } else {
          setStep(1);
        }
      } else {
        setStep(1);
        setTitle("");
        setProjectName("");
        setIsProjectNameCustom(false);
        setJdText("");
        setUploadedFileName("");
        setSetupMode("jd");
      }
    }
  }, [isOpen, initialDraft]);

  // Update project name automatically when title changes if user hasn't typed custom name
  function handleTitleChange(val) {
    setTitle(val);
    setError("");
    if (!isProjectNameCustom) {
      const todayStr = formatShortDate();
      setProjectName(val ? `${val} - Project, ${todayStr}` : "");
    }
    if (!hasUserEditedCriteria) {
      setCriteria(generateCriteriaForRole(val, jdText));
    }
  }

  function handleProjectNameChange(val) {
    setProjectName(val);
    setIsProjectNameCustom(true);
  }

  function toggleInclude(key) {
    setIncludes((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Handle file drop/upload in Step 3.
  //
  // This reads the file as TEXT — there is no PDF or DOCX extraction here. Every
  // failure path used to load a generic sample job description and report
  // "Extracted job description from <file>", so a recruiter who uploaded a PDF
  // got boilerplate they had every reason to believe came from their document,
  // and the rubric was then compiled from it. A file this cannot read is now
  // refused and says why.
  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const unreadable = () => {
      setUploadedFileName("");
      e.target.value = "";
      toast.error(
        `Could not read "${file.name}". Upload a plain-text (.txt or .md) file, or paste the description into the box.`
      );
    };

    // A binary container read as text is mostly control bytes and replacement
    // characters. Pasting that into the description would poison the rubric, so
    // it is treated as unreadable rather than "extracted".
    const looksLikeText = (s) => {
      const sample = s.slice(0, 4000);
      const junk = (sample.match(/[�\x00-\x08\x0E-\x1F]/g) || []).length;
      return sample.trim().length > 0 && junk / Math.max(1, sample.length) < 0.01;
    };

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string" && looksLikeText(content)) {
        setUploadedFileName(file.name);
        setJdText(content);
        toast.success(`Loaded "${file.name}"`);
      } else {
        unreadable();
      }
    };
    reader.onerror = unreadable;
    try {
      reader.readAsText(file);
    } catch {
      unreadable();
    }
  }

  // Step 1 -> Step 2
  function handleStep1Continue(e) {
    e?.preventDefault();
    if (!title.trim()) {
      setError("Please enter a job title to proceed.");
      return;
    }
    setError("");
    setStep(2);
  }

  // Step 2 -> Step 3
  function handleStep2Continue() {
    setError("");
    setStep(3);
  }

  // Step 3 -> Step 4 or Step 5
  async function handleStep3Continue() {
    setError("");
    if (setupMode === "jd" && !jdText.trim()) {
      setError("Please enter or upload a job description to continue.");
      return;
    }
    if (setupMode === "duplicate" && !selectedPastJobId) {
      setError("Please select a past project to clone from.");
      return;
    }

    // If Option B (AI Title), perform initial synthesis
    if (setupMode === "title" && !jdText.trim()) {
      setGenerationNotice(`Synthesizing role requirements for "${title}"...`);
      try {
        const genRes = await api.post("/jobs/generate-jd", {
          title: title.trim(),
          ...(department.trim() ? { department: department.trim() } : {}),
        });
        if (genRes.data?.description) {
          setJdText(genRes.data.description);
        } else {
          setError("Generation returned no description. Write or paste one on the next step.");
        }
      } catch {
        // A generation failure used to silently substitute two sentences of
        // filler, which then became the stored description AND the input the
        // rubric was compiled from. Say it failed and let the recruiter write
        // the real thing.
        setError(
          "Could not generate a job description for this title. Write or paste one below, or try again."
        );
        setGenerationNotice("");
        return;
      } finally {
        setGenerationNotice("");
      }
    }

    // If AI Interview is included, advance to Step 4 (Interview Review), else Step 5 (Rubrics)
    if (!hasUserEditedCriteria) {
      setCriteria(generateCriteriaForRole(title, jdText));
    }
    if (includes.aiInterview) {
      setStep(4);
    } else {
      setStep(5);
    }
  }

  // Step 4 -> Step 5
  function handleStep4Continue() {
    setError("");
    if (!hasUserEditedCriteria) {
      setCriteria(generateCriteriaForRole(title, jdText));
    }
    setStep(5);
  }

  // Auto-generate criteria manually on demand
  function handleAutoGenerateCriteria() {
    const fresh = generateCriteriaForRole(title, jdText);
    setCriteria(fresh);
    setHasUserEditedCriteria(false);
    toast.success(`Suggested criteria reset for "${title || 'this role'}".`);
  }

  // Step 5 Criterion Helpers
  function handleUpdateCriterion(index, field, val) {
    setHasUserEditedCriteria(true);
    setCriteria((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  }

  function handleDeleteCriterion(index) {
    if (criteria.length <= 1) {
      toast.info("At least one evaluation criterion is required.");
      return;
    }
    setHasUserEditedCriteria(true);
    setCriteria((prev) => prev.filter((_, i) => i !== index));
    if (activePriorityPickerIndex === index) {
      setActivePriorityPickerIndex(null);
    }
  }

  function handleAddCriterion() {
    setHasUserEditedCriteria(true);
    const newId = `crit-${Date.now()}`;
    setCriteria((prev) => [
      ...prev,
      {
        id: newId,
        label: "New Role Competency",
        description: "Specify key behaviors, technical outcomes, and qualifications evaluated for this role.",
        importance: "helpful",
      },
    ]);
  }

  function handleSelectPriority(index, importanceKey) {
    handleUpdateCriterion(index, "importance", importanceKey);
    setActivePriorityPickerIndex(null);
  }

  // Direct Publish Action from Step 6
  async function handlePublishImmediately() {
    if (!createdJob?._id || publishingImmediately) return;
    setPublishingImmediately(true);
    try {
      // 1. Fetch current readiness checklist
      let readiness = null;
      try {
        const rCheck = await api.get(`/jobs/${createdJob._id}/readiness`);
        readiness = rCheck.data;
      } catch {}

      const rubricCheck = readiness?.checks?.find((c) => c.key === "rubric");
      const questionsCheck = readiness?.checks?.find((c) => c.key === "questions");
      const assessmentCheck = readiness?.checks?.find((c) => c.key === "assessment");
      const journeyCheck = readiness?.checks?.find((c) => c.key === "journey");

      // 2. Ensure rubric is approved if not ready
      if (!rubricCheck || !rubricCheck.ready) {
        try {
          const rubRes = await api.post(`/rubrics/job/${createdJob._id}/compile`);
          if (rubRes.data?._id) {
            await api.post(`/rubrics/${rubRes.data._id}/approve`).catch(() => {});
          }
        } catch {}
      }

      // 3. Ensure questions are approved if not ready
      if (!questionsCheck || !questionsCheck.ready) {
        try {
          const qRes = await api.post(`/jobs/${createdJob._id}/question-set/auto-draft`);
          if (qRes.data?._id) {
            await api.post(`/jobs/${createdJob._id}/question-set/${qRes.data._id}/approve`).catch(() => {});
          }
        } catch {}
      }

      // 4. Handle assessment paper check
      if (assessmentCheck && !assessmentCheck.ready && assessmentCheck.required) {
        const proceed = window.confirm(
          "This job has Skills Assessment (Test) enabled, but no assessment paper has been created yet.\n\nWould you like to publish now with AI Interview & CV Evaluation (and configure the skills test later)?"
        );
        if (proceed) {
          await api.put(`/jobs/${createdJob._id}`, { assessmentPolicy: "off" });
        } else {
          toast.info("Please configure and approve an assessment paper before publishing.");
          setPublishingImmediately(false);
          return;
        }
      }

      // 5. Handle journey review if needed
      if (journeyCheck && !journeyCheck.ready && journeyCheck.required && readiness?.fingerprint) {
        try {
          await api.post(`/jobs/${createdJob._id}/review-journey`, {
            fingerprint: readiness.fingerprint,
            revision: readiness.setupRevision || 1,
          }).catch(() => {});
        } catch {}
      }

      // 6. Publish the job
      const res = await api.patch(`/jobs/${createdJob._id}/publish`);
      const published = res.data || { ...createdJob, status: "published" };
      setCreatedJob(published);
      onCreated?.(published);
      toast.success(`"${published.title}" is now published and live on your careers page!`);
    } catch (err) {
      const failedCheck = err.response?.data?.readiness?.checks?.find((c) => c.status === "needs_attention");
      const msg = failedCheck?.reason || err.response?.data?.error || "Could not publish job. Please check prerequisites.";
      toast.error(msg);
    } finally {
      setPublishingImmediately(false);
    }
  }

  // Step 5 Continue
  function handleStep5Continue() {
    setError("");
    if (includes.test) {
      setStep("assessment");
    } else {
      executeProjectCreation();
    }
  }

  // Execute Project Creation and run animated loader (Step 6)
  async function executeProjectCreation() {
    setError("");
    setStep(6);
    setIsSubmitting(true);
    setCreationProgress(5);
    setCreationMilestone(0);

    // Only what the recruiter actually supplied.
    //
    // These used to be seeded with invented content — a generic sample JD,
    // "Standard qualifications and proven role expertise required.", three
    // filler skills, 3 years, "Bachelor's Degree", department "General" — and
    // whatever survived was written to the job record. The rubric then compiled
    // against fiction, candidates were screened against it, and the recruiter
    // never saw a field they had not filled in. Undefined means "not stated":
    // the schema's own defaults apply and the UI renders "not specified".
    let finalDescription = jdText.trim();
    let finalRequirements;
    let finalSkills;
    let minExp;
    let dept = department.trim() || undefined;
    let education;

    // Real milestones, not a timer. `creationProgress` is advanced by the steps
    // below as each one actually completes — the old version ticked upward on a
    // random interval and reached "90%" whether or not a single call had
    // returned, then declared success on a 1500 ms timeout.
    const progressInterval = null;

    // Anything that fails without stopping creation is collected here and shown
    // on the done screen. Previously each of these was `.catch(() => {})` and
    // the modal reported unconditional success, so a job whose rubric never
    // compiled looked identical to one that did.
    const warnings = [];

    try {
      setCreationMilestone(1);
      setCreationProgress(15);

      // Handle duplicate if applicable
      if (setupMode === "duplicate" && selectedPastJobId) {
        const sourceJob = pastProjects.find((p) => p._id === selectedPastJobId);
        if (sourceJob) {
          finalDescription = finalDescription || sourceJob.description;
          finalRequirements = sourceJob.requirements;
          finalSkills = sourceJob.requiredSkills;
          minExp = sourceJob.minExperienceYears;
          dept = dept || sourceJob.department;
          education = sourceJob.requiredEducation;
        }
      }

      // A job's description is what candidates read and what the rubric is
      // compiled from. There is no honest default for it, so an empty one stops
      // here instead of being filled with a sample.
      if (!finalDescription) {
        setStep(5);
        setIsSubmitting(false);
        const msg =
          "Add a job description before creating this project — it is what candidates read and what the scoring rubric is built from.";
        setError(msg);
        toast.error(msg);
        return;
      }

      // Format interview instructions from Step 4 configuration
      const interviewInstructions = `Interviewer: ${interviewerName} (${interviewerTitle}). Language: ${interviewLanguage}. Duration: ${interviewDuration} min. Questions mode: ${questionMode}. CV Probing: ${
        cvProbingEnabled ? "Enabled" : "Disabled"
      }. Prescreening questions: ${prescreeningQuestions.filter((q) => q.trim()).join(" | ")}`;

      // Omitted keys are dropped rather than sent as invented values, so the
      // schema's own defaults apply and an unanswered field stays unanswered.
      const payload = {
        title: title.trim(),
        description: finalDescription,
        numberOfOpenings: Number(numberOfOpenings),
        atsThreshold: 60,
        minExperienceYears: minExp ?? 0,
        interviewInstructions,
        interviewMinQuestions: Math.max(3, Math.floor(interviewDuration / 5)),
        interviewMaxQuestions: Math.max(6, Math.floor(interviewDuration / 3)),
        assessmentPolicy: includes.test ? "manual" : "off",
        ...(dept ? { department: dept } : {}),
        ...(location.trim() ? { location: location.trim() } : {}),
        ...(finalRequirements ? { requirements: finalRequirements } : {}),
        ...(finalSkills?.length ? { requiredSkills: finalSkills } : {}),
        ...(education ? { requiredEducation: education } : {}),
      };

      const clientErrors = validateJobForm(payload);
      if (Object.keys(clientErrors).length > 0) {
        setStep(5);
        setIsSubmitting(false);
        const errorMsg = Object.entries(clientErrors)
          .map(([k, v]) => `${JOB_FIELD_LABELS[k] || k}: ${v}`)
          .join(" ");
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      const res = await api.post("/jobs", payload);
      const created = res.data;
      setCreatedJob(created);

      setCreationMilestone(2);
      setCreationProgress(45);

      // Compile, sync & approve rubric criteria. A failure here is NOT fatal to
      // the job, but it is not silent either: without an approved rubric no
      // candidate can be screened, and the recruiter has to know that before
      // they publish.
      try {
        const rubRes = await api.post(`/rubrics/job/${created._id}/compile`);
        if (rubRes.data?._id) {
          if (hasUserEditedCriteria) {
            const formattedCriteria = criteria.map((c, i) => ({
              id: `crit_${i + 1}`,
              label: c.label.trim() || `Criterion ${i + 1}`,
              importance: c.importance,
              rationale: c.description.trim() || c.label.trim(),
              evidenceTypes: ["skill", "experience", "project"],
            }));
            try {
              await api.patch(`/rubrics/${rubRes.data._id}`, { criteria: formattedCriteria });
            } catch {
              warnings.push("Your edited criteria could not be saved — the compiled rubric was kept instead. Review it in the Rubric tab.");
            }
          }
          try {
            await api.post(`/rubrics/${rubRes.data._id}/approve`);
          } catch {
            warnings.push("The scoring rubric was created but not approved. Approve it in the Rubric tab before screening starts.");
          }
        } else {
          warnings.push("No scoring rubric was produced for this role. Compile one in the Rubric tab.");
        }
      } catch {
        warnings.push("The scoring rubric could not be compiled. Open the Rubric tab to compile and approve it — candidates are not screened until you do.");
      }

      setCreationMilestone(3);
      setCreationProgress(70);

      // Auto-draft interview question set
      if (includes.aiInterview) {
        try {
          const qRes = await api.post(`/jobs/${created._id}/question-set/auto-draft`);
          if (qRes.data?._id) {
            try {
              await api.post(`/jobs/${created._id}/question-set/${qRes.data._id}/approve`);
            } catch {
              warnings.push("The interview question set was drafted but not approved. Approve it in the Questions tab.");
            }
          } else {
            warnings.push("No interview question set was drafted. Create one in the Questions tab.");
          }
        } catch {
          warnings.push("The interview question set could not be drafted. Open the Questions tab to create one.");
        }
      }

      // If Skills Assessment (Test) was chosen, compile and calibrate the paper
      if (includes.test) {
        try {
          const paperRes = await api.post(`/assessments/papers/job/${created._id}/compile`);
          if (paperRes.data?._id) {
            const paperId = paperRes.data._id;
            const paperChanges = {
              difficultyPolicy: testDifficulty === "adaptive"
                ? { mode: "claim_tiered" }
                : { mode: "fixed", fixedTier: testDifficulty },
              integrityDefaults: {
                proctoring: testProctoring,
                softLock: {
                  enabled: testSoftLock,
                  flagThreshold: 3,
                  action: "pause",
                },
              },
            };
            if (customTestTopics.trim()) {
              paperChanges.instructions = `Assessment Focus: ${customTestTopics.trim()}`;
            }

            // The duration picker used to set state and stop there — the paper
            // kept whatever the compiler chose, so a recruiter who picked "90
            // mins" got a test of some other length and was never told. The API
            // takes per-section limits, so the chosen total is split across
            // sections in proportion to how many questions each one serves. The
            // server clamps each section to a sane seconds-per-item range, so
            // the stored total is read back below rather than assumed.
            const sections = paperRes.data.sections || [];
            const totalServed = sections.reduce((sum, s) => sum + (s.servedItemCount || 0), 0);
            if (sections.length && totalServed > 0) {
              paperChanges.sections = sections.map((s) => ({
                id: s.id,
                timeLimitSec: Math.round((testDuration * 60 * (s.servedItemCount || 0)) / totalServed),
              }));
            }
            try {
              const saved = await api.patch(`/assessments/papers/${paperId}`, paperChanges);
              // Report the length the paper actually has, not the one that was
              // requested — the server clamps each section to a defensible
              // seconds-per-question range and may land elsewhere.
              const savedSec = (saved.data?.sections || []).reduce((sum, s) => sum + (s.timeLimitSec || 0), 0);
              const savedMin = Math.round(savedSec / 60);
              if (paperChanges.sections && savedMin > 0 && savedMin !== testDuration) {
                warnings.push(
                  `The test is ${savedMin} minutes, not ${testDuration} — the length is capped per question for the number of questions in this paper. Adjust it in the Assessment tab.`
                );
              }
            } catch {
              warnings.push("The assessment paper was created, but your difficulty, timing and integrity settings were not applied. Check them in the Assessment tab.");
            }

            if (testAutoGenerateItems) {
              try {
                await api.post(`/assessments/papers/${paperId}/items/generate`);
              } catch {
                warnings.push("Assessment questions were not generated. Generate them in the Assessment tab before sending the test.");
              }
            }
          } else {
            warnings.push("No assessment paper was produced. Create one in the Assessment tab.");
          }
        } catch {
          warnings.push("The skills assessment could not be compiled. Open the Assessment tab to build it.");
        }
      }

      // Milestone 4: Workspace Ready (100%) — reached because the work finished,
      // not because a timer elapsed.
      setCreationProgress(100);
      setCreationMilestone(4);
      setCreationWarnings(warnings);
      setIsCreationComplete(true);
      setIsSubmitting(false);
      onCreated?.(created);
      if (initialDraft?._id) {
        api.delete(`/jobs/setup-drafts/${initialDraft._id}`).catch(() => {});
      }
      if (warnings.length) {
        toast.info(`Job created with ${warnings.length} step${warnings.length === 1 ? "" : "s"} still to finish.`);
      } else {
        toast.success("Job created");
      }
    } catch (err) {
      // Stays on step 6: the failure is the API's (quota, conflict, network),
      // so "Retry project creation" there is the right next action. The two
      // returns above go back to step 5 instead, because those are the
      // recruiter's own input to fix and retrying would fail identically.
      setIsSubmitting(false);
      const status = err.response?.status;
      const respData = err.response?.data;

      if (status === 429) {
        setError(respData?.error || "Monthly job posting quota reached. Upgrade your plan to post more requisitions.");
        toast.error("Job posting quota reached.");
      } else if (respData?.code === "JOB_CONFLICT") {
        setError(respData?.error || "A job with this requisition code or title already exists.");
        toast.error("Job conflict detected.");
      } else if (respData?.fieldErrors) {
        const fieldMsg = Object.entries(respData.fieldErrors)
          .map(([k, v]) => `${JOB_FIELD_LABELS[k] || k}: ${v}`)
          .join(" ");
        setError(fieldMsg);
      } else {
        setError(respData?.error || "Could not create the job. Please try again.");
      }
    }
  }

  // Filtered past projects for Option 3
  const filteredPastProjects = useMemo(() => {
    if (!pastProjectsSearch.trim()) return pastProjects.slice(0, 10);
    const q = pastProjectsSearch.toLowerCase();
    return pastProjects.filter((p) => p.title?.toLowerCase().includes(q) || p.department?.toLowerCase().includes(q));
  }, [pastProjects, pastProjectsSearch]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-job-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
    >
      {/* ──────────────────────────────────────────────────────────────────────────
          STEP 1: "New Hiring Project" (Image 1 / Modal 2)
      ────────────────────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="relative w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
          {/* "Create a job", not Flowmingo's "New Hiring Project": everywhere
              else in this product the thing is a Job, and the dialog that
              creates one should use the same word as the button that opened it. */}
          <StepHeader title="Create a job" onClose={onClose} {...progress} />
          <div className="mb-5" />

          <form onSubmit={handleStep1Continue} className="space-y-4">
            <div>
              <label
                htmlFor="job-title-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Job Title <span className="text-slate-400 font-normal">(visible to candidates)</span>
              </label>
              <input
                id="job-title-input"
                type="text"
                autoFocus
                placeholder="e.g. AI Specialist"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full rounded-xl border border-brand-700 px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-emerald-100/70 transition placeholder:text-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="project-name-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Internal name <span className="text-slate-500 font-normal">(only your team sees this)</span>
              </label>
              <input
                id="project-name-input"
                type="text"
                placeholder={title ? `${title} - Project` : "Project Name"}
                value={projectName}
                onChange={(e) => handleProjectNameChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-brand-700 focus:outline-none focus:ring-3 focus:ring-emerald-50 transition"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Auto-filled from Job Title — edit if you want.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="job-location-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Location <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="job-location-input"
                  type="text"
                  placeholder="e.g. Bengaluru · Hybrid"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-brand-700 focus:outline-none focus:ring-3 focus:ring-emerald-50 transition"
                />
              </div>
              <div>
                <label htmlFor="job-department-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Department <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="job-department-input"
                  type="text"
                  placeholder="e.g. Engineering"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-brand-700 focus:outline-none focus:ring-3 focus:ring-emerald-50 transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="job-openings-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Number of openings
              </label>
              <input
                id="job-openings-input"
                type="number"
                min="1"
                max="10000"
                step="1"
                value={numberOfOpenings}
                onChange={(e) => setNumberOfOpenings(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-brand-700 focus:outline-none focus:ring-3 focus:ring-emerald-50 transition sm:w-40"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                The role closes automatically once this many offers are accepted.
              </p>
            </div>

            {error && (
              <p role="alert" className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {error}
              </p>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={!title.trim()}
                className="rounded-full bg-brand-800 hover:bg-brand-700 text-white px-7 py-2 text-xs font-bold shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Continue
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          STEP 2: "What will this project include?" (Images 2 & 3 / Modal 3)
      ────────────────────────────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="relative w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
          <StepHeader title="What will this job include?" onBack={() => setStep(1)} onClose={onClose} {...progress} />

          {/* Six option rows and six preview panes used to be written out
              here by hand, ~520 lines, each styled on its own — which is how
              they drifted apart. One data-driven component now draws them all
              the same way; see FeaturePicker.jsx. */}
          <FeaturePicker
            includes={includes}
            onToggle={toggleInclude}
            focused={focusedFeature}
            onFocus={setFocusedFeature}
            title={title}
          />

          <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleStep2Continue}
              className="rounded-full bg-brand-800 hover:bg-brand-700 text-white px-7 py-2 text-xs font-bold shadow-xs transition cursor-pointer"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          STEP 3: "How would you like to set things up?" (Images 4 & 5 / Modal 1)
      ────────────────────────────────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
          <StepHeader title="How would you like to set things up?" onBack={() => setStep(2)} onClose={onClose} {...progress} />

          <div className="mt-4 space-y-3 flex-1 overflow-y-auto pr-1">
            {/* Option 1: From Job Description */}
            <div
              className={`rounded-2xl border transition ${
                setupMode === "jd"
                  ? "border-brand-700 ring-2 ring-emerald-50 bg-white"
                  : "border-slate-200/80 bg-white hover:border-slate-300"
              } p-4.5`}
            >
              <label
                className="flex items-start gap-3 cursor-pointer"
                onClick={() => setSetupMode("jd")}
              >
                <input
                  type="radio"
                  name="setupMode"
                  checked={setupMode === "jd"}
                  onChange={() => setSetupMode("jd")}
                  className="mt-0.5 h-4 w-4 text-black focus:ring-black accent-black cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">From Job Description</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-brand-800 border border-emerald-200">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Richest starting point — most accurate output
                  </p>
                </div>
              </label>

              {setupMode === "jd" && (
                <div className="mt-4 pl-7 space-y-3 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex rounded-full bg-slate-100 p-1">
                      <button
                        type="button"
                        onClick={() => setJdTab("upload")}
                        className={`rounded-full px-3.5 py-1 text-xs font-semibold transition cursor-pointer ${
                          jdTab === "upload"
                            ? "bg-white text-slate-900 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Upload JD
                      </button>
                      <button
                        type="button"
                        onClick={() => setJdTab("enter")}
                        className={`rounded-full px-3.5 py-1 text-xs font-semibold transition cursor-pointer ${
                          jdTab === "enter"
                            ? "bg-white text-slate-900 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Enter Your JD
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setJdTab("enter");
                        setJdText(SAMPLE_JD);
                        toast.info("Sample loaded — edit it to describe your actual role before continuing.");
                      }}
                      className="text-xs font-semibold text-brand-800 hover:underline cursor-pointer inline-flex items-center gap-1"
                    >
                      Don't have a JD? Try with a sample →
                    </button>
                  </div>

                  {jdTab === "upload" && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl border-2 border-dashed border-slate-200/90 bg-slate-50/50 p-6 text-center hover:bg-slate-50 transition cursor-pointer"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <UploadCloud className="mx-auto h-7 w-7 text-slate-400 mb-2" />
                      <p className="text-xs font-bold text-slate-700">
                        {uploadedFileName || "Upload JD file"}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        (e.g. PDF, Docx, TXT)
                      </p>
                    </div>
                  )}

                  {jdTab === "enter" && (
                    <div>
                      <textarea
                        rows={6}
                        placeholder="Paste your job description here (responsibilities, qualifications, requirements)..."
                        value={jdText}
                        onChange={(e) => setJdText(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-brand-700 focus:outline-none focus:ring-3 focus:ring-emerald-50 leading-relaxed transition"
                      />
                      <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                        <span>Include core responsibilities for optimal rubric compilation.</span>
                        <span>{jdText.length} characters</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Option 2: From Job Title only */}
            <div
              className={`rounded-2xl border transition ${
                setupMode === "title"
                  ? "border-brand-700 ring-2 ring-emerald-50 bg-white"
                  : "border-slate-200/80 bg-white hover:border-slate-300"
              } p-4.5`}
            >
              <label
                className="flex items-start gap-3 cursor-pointer"
                onClick={() => setSetupMode("title")}
              >
                <input
                  type="radio"
                  name="setupMode"
                  checked={setupMode === "title"}
                  onChange={() => setSetupMode("title")}
                  className="mt-0.5 h-4 w-4 text-black focus:ring-black accent-black cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">From Job Title only</span>
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 border border-violet-200 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> AI Powered
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    AI generates from this title alone (less specific, still usable):{" "}
                    <span className="font-semibold text-slate-800">{title || "Job Title"}</span>
                  </p>
                </div>
              </label>

              {setupMode === "title" && (
                <div className="mt-4 pl-7 border-t border-slate-100 pt-3">
                  <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3.5 text-xs text-violet-900 flex items-start gap-2.5">
                    <Sparkles className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Instant AI Job Description:</span>
                      <p className="mt-0.5 text-slate-600 text-[11px] leading-relaxed">
                        Clicking Continue will immediately synthesize role responsibilities, essential qualifications, required skills, and screening criteria based on <strong>"{title}"</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Option 3: Duplicate previous project */}
            <div
              className={`rounded-2xl border transition ${
                setupMode === "duplicate"
                  ? "border-brand-700 ring-2 ring-emerald-50 bg-white"
                  : "border-slate-200/80 bg-white hover:border-slate-300"
              } p-4.5`}
            >
              <label
                className="flex items-start gap-3 cursor-pointer"
                onClick={() => setSetupMode("duplicate")}
              >
                <input
                  type="radio"
                  name="setupMode"
                  checked={setupMode === "duplicate"}
                  onChange={() => setSetupMode("duplicate")}
                  className="mt-0.5 h-4 w-4 text-black focus:ring-black accent-black cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-sm font-bold text-slate-900">Duplicate a previous job</span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Start from a copy of an existing job.
                  </p>
                </div>
              </label>

              {setupMode === "duplicate" && (
                <div className="mt-4 pl-7 space-y-3 border-t border-slate-100 pt-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search past projects..."
                      value={pastProjectsSearch}
                      onChange={(e) => setPastProjectsSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-emerald-50"
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/40 p-1">
                    {filteredPastProjects.length === 0 ? (
                      <p className="p-3 text-center text-xs text-slate-400">No past projects found</p>
                    ) : (
                      filteredPastProjects.map((p) => (
                        <label
                          key={p._id}
                          className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition"
                        >
                          <input
                            type="radio"
                            name="selectedPastJob"
                            checked={selectedPastJobId === p._id}
                            onChange={() => setSelectedPastJobId(p._id)}
                            className="h-3.5 w-3.5 text-black focus:ring-black accent-black cursor-pointer"
                          />
                          <div className="flex-1 text-xs">
                            <span className="font-semibold text-slate-900">{p.title}</span>
                            <span className="text-slate-400"> — {formatShortDate(p.createdAt)}</span>
                            <span className="block text-[10px] text-slate-500">
                              {p.candidatesCount || 0} candidates · {p.department || "General"}
                            </span>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {generationNotice && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-violet-50 p-2.5 text-xs text-violet-800 border border-violet-200 animate-pulse">
              <Sparkles className="h-4 w-4 text-violet-600 animate-spin" />
              <span>{generationNotice}</span>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleStep3Continue}
              disabled={
                (setupMode === "jd" && !jdText.trim()) ||
                (setupMode === "duplicate" && !selectedPastJobId)
              }
              className="rounded-full bg-brand-800 hover:bg-brand-700 text-white px-7 py-2 text-xs font-bold shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          STEP 4: "Review your AI Interview" (Images 2 & 3 / Modal 4)
      ────────────────────────────────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
          {/* Header */}
          <StepHeader title="Review your AI Interview" onBack={() => setStep(3)} onClose={onClose} {...progress} />

          {/* Subtabs: General Settings vs Questions */}
          <div className="pt-4 flex justify-center">
            <div className="inline-flex rounded-full bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setInterviewTab("general")}
                className={`rounded-full px-5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  interviewTab === "general"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                General Settings
              </button>
              <button
                type="button"
                onClick={() => setInterviewTab("questions")}
                className={`rounded-full px-5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  interviewTab === "questions"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Questions
              </button>
            </div>
          </div>

          {/* Tab 1: General Settings */}
          {interviewTab === "general" && (
            <div className="mt-4 space-y-4 flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Interviewer Name
                  </label>
                  <input
                    type="text"
                    value={interviewerName}
                    onChange={(e) => setInterviewerName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-emerald-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Interviewer Title
                  </label>
                  <input
                    type="text"
                    value={interviewerTitle}
                    onChange={(e) => setInterviewerTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-emerald-50"
                  />
                </div>
              </div>

              {/* Duration Slider */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-brand-800" />
                    <span className="text-xs font-semibold text-slate-800">Interview Duration</span>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-brand-800 border border-emerald-200">
                    {interviewDuration} min
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={interviewDuration}
                  onChange={(e) => setInterviewDuration(Number(e.target.value))}
                  className="w-full accent-brand-800 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>10m</span>
                  <span>20m</span>
                  <span>30m</span>
                  <span>45m</span>
                  <span>60m</span>
                </div>
                <p className="text-[11px] text-brand-800 font-medium pt-0.5">
                  Recommended: 15-20 min for standard screening depth.
                </p>
              </div>

              {/* Language Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Interview Language
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <select
                    value={interviewLanguage}
                    onChange={(e) => setInterviewLanguage(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-xs text-slate-900 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-emerald-50 bg-white cursor-pointer"
                  >
                    <option value="English (US)">English (US)</option>
                    <option value="English (UK)">English (UK)</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Spanish">Spanish</option>
                    <option value="German">German</option>
                    <option value="French">French</option>
                  </select>
                </div>
              </div>

              {/* How the AI interview runs */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 flex items-start gap-2.5">
                <Bot className="h-4 w-4 text-brand-800 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  <strong>Voice &amp; video:</strong> The AI interviewer conducts natural conversational evaluations and adapts follow-ups in real time according to your rubric.
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Questions */}
          {interviewTab === "questions" && (
            <div className="mt-4 space-y-4 flex-1 overflow-y-auto pr-1">
              {/* CV Probing Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 hover:bg-slate-50/50 transition">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Generate questions based on candidate's CV
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    When enabled, the AI reads the candidate's resume and asks targeted follow-ups on their past projects and stated skills.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-3">
                  <input
                    type="checkbox"
                    checked={cvProbingEnabled}
                    onChange={(e) => setCvProbingEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-800"></div>
                </label>
              </div>

              {/* Question Mode */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Question Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuestionMode("dynamic")}
                    className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
                      questionMode === "dynamic"
                        ? "border-brand-700 bg-emerald-50/30 text-slate-900 ring-1 ring-brand-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xs font-bold block">Real-time Dynamic</span>
                    <span className="text-[10px] text-slate-500">AI adapts questions organically</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuestionMode("preset")}
                    className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
                      questionMode === "preset"
                        ? "border-brand-700 bg-emerald-50/30 text-slate-900 ring-1 ring-brand-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xs font-bold block">Preset Questions</span>
                    <span className="text-[10px] text-slate-500">Strict sequence of fixed prompts</span>
                  </button>
                </div>
              </div>

              {/* Pre-screening Questions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Pre-screening questions (asked to all candidates):
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPrescreeningQuestions((prev) => [
                        ...prev,
                        "What key technical challenge have you recently overcome?",
                      ])
                    }
                    className="text-xs font-semibold text-brand-800 hover:text-brand-800 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add question
                  </button>
                </div>

                <div className="space-y-2">
                  {prescreeningQuestions.map((q, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={q}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPrescreeningQuestions((prev) => {
                            const copy = [...prev];
                            copy[idx] = val;
                            return copy;
                          });
                        }}
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-emerald-50"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (prescreeningQuestions.length <= 1) {
                            toast.info("Keep at least one screening question.");
                            return;
                          }
                          setPrescreeningQuestions((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* This was a toggle. It was never sent anywhere, and the thing it
                  offered to switch off cannot be switched off: the apply endpoint
                  rejects an application with no résumé (400, "resumeId or
                  resumeVersionId is required"). A control that does nothing and
                  implies an option that does not exist is worse than the plain
                  statement of fact. */}
              <div className="flex items-start gap-2 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">
                    Every applicant submits a CV
                  </span>
                  <p className="text-[10px] text-slate-500">
                    An application cannot be submitted without a résumé, so interview
                    answers can always be cross-referenced against it.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleStep4Continue}
              className="rounded-full bg-brand-800 hover:bg-brand-700 text-white px-7 py-2 text-xs font-bold shadow-xs transition cursor-pointer"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          STEP 5: "Define what makes a successful candidate" (Image 5 / Modal 5)
      ────────────────────────────────────────────────────────────────────────── */}
      {step === 5 && (
        <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
          {/* Header */}
          <StepHeader title="Define what makes a successful candidate" onBack={() => setStep(includes.aiInterview ? 4 : 3)} onClose={onClose} {...progress} />

          {/* Starting-point banner.
              This used to read "✨ AI Calibrated: <role>" over criteria that
              come from a keyword lookup table in this file (see
              generateCriteriaForRole) — no model is involved at this step. The
              real rubric is compiled server side after the job is created, from
              the job description. Saying so here is the difference between a
              starting point the recruiter edits and a calibration they trust. */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200 p-2.5 px-3.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-200/80 text-slate-700 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                Suggested for {title || "this role"}
              </span>
              <span className="text-[11px] text-slate-600">
                A starting point matched to the role title — edit it. The scoring rubric
                is compiled from your job description after the project is created.
              </span>
            </div>
            <button
              type="button"
              onClick={handleAutoGenerateCriteria}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              <span>Reset to suggestions</span>
            </button>
          </div>

          {/* Criteria Cards List */}
          <div className="mt-4 space-y-3 flex-1 overflow-y-auto pr-1">
            {criteria.map((c, idx) => {
              const tier = PRIORITY_TIERS[c.importance] || PRIORITY_TIERS.helpful;
              const isPickerOpen = activePriorityPickerIndex === idx;

              return (
                <div
                  key={c.id || idx}
                  className={`relative rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:shadow-xs border-l-4 ${tier.borderClass}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Criterion Title */}
                    <input
                      type="text"
                      value={c.label}
                      onChange={(e) => handleUpdateCriterion(idx, "label", e.target.value)}
                      placeholder="Criterion Title"
                      className="font-bold text-xs text-slate-900 border-none p-0 focus:outline-none focus:ring-0 w-full"
                    />

                    {/* Priority Badge & Delete */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setActivePriorityPickerIndex(isPickerOpen ? null : idx)
                        }
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold border transition cursor-pointer ${tier.badgeClass}`}
                        title="Click to change priority tier"
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${tier.dotClass}`} />
                        <span>{tier.label}</span>
                        <span className="text-[11px] opacity-75">({tier.bars}/4)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCriterion(idx)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition cursor-pointer"
                        title="Remove criterion"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mt-2">
                    <textarea
                      rows={2}
                      maxLength={200}
                      value={c.description}
                      onChange={(e) => handleUpdateCriterion(idx, "description", e.target.value)}
                      placeholder="Explain what satisfactory performance looks like for this criterion..."
                      className="w-full text-xs text-slate-600 border border-slate-100 rounded-lg p-2 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-100 resize-none"
                    />
                    <div className="flex justify-end text-[10px] text-slate-400">
                      <span>{c.description?.length || 0}/200 characters</span>
                    </div>
                  </div>

                  {/* Floating Priority Selector Popup (media_1789123155041.png) */}
                  {isPickerOpen && (
                    <div className="absolute right-4 top-12 z-20 w-64 rounded-xl bg-white p-2.5 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                        Select Priority Level
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {Object.values(PRIORITY_TIERS).map((pTier) => (
                          <button
                            key={pTier.key}
                            type="button"
                            onClick={() => handleSelectPriority(idx, pTier.key)}
                            className={`flex flex-col items-start p-2 rounded-lg border text-left transition cursor-pointer ${
                              c.importance === pTier.key
                                ? "border-brand-700 bg-emerald-50/30 ring-1 ring-brand-700"
                                : "border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`h-2 w-2 rounded-full ${pTier.dotClass}`} />
                              <span className="text-[11px] font-bold text-slate-900">
                                {pTier.label}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 leading-tight">
                              {pTier.subtitle}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Criterion Button */}
            <button
              type="button"
              onClick={handleAddCriterion}
              className="w-full rounded-xl border-2 border-dashed border-slate-200 py-3 text-center text-xs font-semibold text-slate-600 hover:border-brand-700 hover:text-brand-800 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add criterion
            </button>
          </div>

          {/* Footer */}
          <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleStep5Continue}
              className="rounded-full bg-brand-800 hover:bg-brand-700 text-white px-7 py-2 text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-2"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          STEP "assessment": "Skills Assessment (Test) Configuration"
      ────────────────────────────────────────────────────────────────────────── */}
      {step === "assessment" && (
        <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
          {/* Header */}
          <StepHeader title="Skills Assessment Configuration" onBack={() => setStep(5)} onClose={onClose} {...progress} />

          <div className="flex-1 overflow-y-auto space-y-4 pt-4 pr-1">
            {/* Banner: Grounded in Rubric */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 flex items-start gap-2.5">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-800 text-white mt-0.5">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="text-xs text-brand-900">
                <span className="font-bold">Grounded in your calibrated rubric:</span> Test questions will be compiled directly from the {criteria.length} evaluation criteria you defined in the previous step. No generic or hallucinated trivia questions.
              </div>
            </div>

            {/* 1. Difficulty & Adaptive Engine */}
            <div className="rounded-xl border border-slate-200/80 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Assessment Rigor & Difficulty Mode
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    How questions will be calibrated to candidates
                  </p>
                </div>
                <Sliders className="h-4 w-4 text-slate-400" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {[
                  {
                    id: "adaptive",
                    title: "Adaptive (Seniority-Based)",
                    badge: "Recommended",
                    desc: "Dynamically calibrates question depth to candidate's background & CV seniority",
                  },
                  {
                    id: "easy",
                    title: "Foundational (Junior)",
                    badge: "Direct",
                    desc: "Focuses on language syntax, core definitions, and standard operational logic",
                  },
                  {
                    id: "medium",
                    title: "Intermediate (Mid-Level)",
                    badge: "Balanced",
                    desc: "Practical engineering scenarios, architecture design, and problem solving",
                  },
                  {
                    id: "hard",
                    title: "Advanced (Senior/Staff)",
                    badge: "Rigorous",
                    desc: "Deep edge-case debugging, scalability tradeoffs, and failure recovery",
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTestDifficulty(item.id)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition cursor-pointer ${
                      testDifficulty === item.id
                        ? "border-brand-700 bg-emerald-50/40 ring-1 ring-brand-700 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-bold text-slate-900">{item.title}</span>
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {item.badge}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 leading-snug">
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Duration & Pacing */}
            <div className="rounded-xl border border-slate-200/80 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Test Duration & Question Target
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Target time allocated for candidate completion
                  </p>
                </div>
                <Clock className="h-4 w-4 text-slate-400" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {[
                  { mins: 30, label: "30 mins", sub: "~6-8 questions" },
                  { mins: 45, label: "45 mins", sub: "~10-12 questions", badge: "Standard" },
                  { mins: 60, label: "60 mins", sub: "~14-16 questions" },
                  { mins: 90, label: "90 mins", sub: "~20 questions" },
                ].map((d) => (
                  <button
                    key={d.mins}
                    type="button"
                    onClick={() => setTestDuration(d.mins)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition cursor-pointer ${
                      testDuration === d.mins
                        ? "border-brand-700 bg-emerald-50/40 ring-1 ring-brand-700 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-900">{d.label}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{d.sub}</span>
                    {d.badge && (
                      <span className="mt-1 text-[8px] font-bold text-brand-800 bg-emerald-100/60 px-1.5 py-0.2 rounded-full">
                        {d.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Anti-Cheat & Integrity Controls */}
            <div className="rounded-xl border border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Integrity & Anti-Cheat Controls
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Proctoring telemetry and browser environment monitoring
                  </p>
                </div>
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50/80 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={testProctoring}
                    onChange={(e) => setTestProctoring(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-black focus:ring-black accent-black cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900">
                      Periodic Camera Snapshots
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Captures low-res tamper-evident webcam snapshots periodically to prevent proxy test-takers.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50/80 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={testSoftLock}
                    onChange={(e) => setTestSoftLock(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-black focus:ring-black accent-black cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900">
                      Tab-Switch & Blur Soft Lock
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Detects when candidate leaves the test tab or window. After 3 strikes, the test pauses automatically until reviewed.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-emerald-50/60 border border-emerald-100 p-2.5 text-[11px] text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Triple-Solver Verification Active:</strong> Generated items must pass independent solving by 3 separate AI models before being served to candidates.
                </span>
              </div>
            </div>

            {/* 4. Focus Topics & Key Skills */}
            <div className="rounded-xl border border-slate-200/80 p-4 space-y-2.5">
              <label htmlFor="custom-test-topics" className="block">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Role Focus Topics & Core Tech Stack
                  </h3>
                  <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Highlight specific frameworks, languages, or domain focus areas for the question pool
                </p>
                <input
                  id="custom-test-topics"
                  type="text"
                  placeholder="e.g. React 19, TypeScript, Concurrency, SQL Optimization, System Design"
                  value={customTestTopics}
                  onChange={(e) => setCustomTestTopics(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              {/* Quick Topic Suggestions */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["Algorithms", "System Architecture", "Debugging", "API Design", "Performance", "Security"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (!customTestTopics.includes(tag)) {
                        setCustomTestTopics((prev) => (prev ? `${prev}, ${tag}` : tag));
                      }
                    }}
                    className="text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full transition cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Live Question Generation Option */}
            <div className="rounded-xl border border-slate-200/80 p-3.5 bg-slate-50/50">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={testAutoGenerateItems}
                  onChange={(e) => setTestAutoGenerateItems(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Synthesize and verify question pool immediately upon project creation
                </span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setStep(5)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              Back to Rubric
            </button>
            <button
              type="button"
              onClick={executeProjectCreation}
              className="rounded-full bg-brand-800 hover:bg-brand-700 text-white px-7 py-2 text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Create job</span>
            </button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          STEP 6: "Creating your hiring project..." (Image 6 / Modal 6)
      ────────────────────────────────────────────────────────────────────────── */}
      {step === 6 && (
        <div className="relative w-full max-w-lg rounded-2xl bg-white p-7 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-150">
          {!isCreationComplete ? (
            <div>
              {/* 3D Glowing Particle Swirl Canvas */}
              <ParticleSwirlCanvas />

              <h2
                id="create-job-modal-title"
                className="text-lg font-bold text-slate-900 mt-2"
              >
                Creating your job…
              </h2>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Configuring AI interviewer, compiling evaluation rubrics, and provisioning candidate pipelines.
              </p>

              {/* Progress Bar */}
              <div className="mt-5">
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-800 via-brand-600 to-brand-400 transition-all duration-300 ease-out"
                    style={{ width: `${creationProgress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold mt-1">
                  <span>Processing components</span>
                  <span>{creationProgress}%</span>
                </div>
              </div>

              {/* Sequential Milestones */}
              <div className="mt-6 text-left space-y-2.5 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[11px] font-bold ${
                      creationMilestone >= 1 ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    ✓
                  </div>
                  <span className={creationMilestone >= 1 ? "font-semibold text-slate-900" : "text-slate-400"}>
                    Synthesizing role brief & requirements
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[11px] font-bold ${
                      creationMilestone >= 2 ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    ✓
                  </div>
                  <span className={creationMilestone >= 2 ? "font-semibold text-slate-900" : "text-slate-400"}>
                    Calibrating scoring rubric criteria
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[11px] font-bold ${
                      creationMilestone >= 3 ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    ✓
                  </div>
                  <span className={creationMilestone >= 3 ? "font-semibold text-slate-900" : "text-slate-400"}>
                    Generating interview question set
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[11px] font-bold ${
                      creationMilestone >= 4 ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    ✓
                  </div>
                  <span className={creationMilestone >= 4 ? "font-semibold text-slate-900" : "text-slate-400"}>
                    Initializing ATS pipeline & workspace
                  </span>
                </div>
              </div>

              {error && (
                <div className="mt-4 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={executeProjectCreation}
                    className="mt-2 text-xs font-bold text-red-700 underline cursor-pointer"
                  >
                    Retry project creation
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Creation Success State */
            createdJob && (
              <div>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>

                <h2 id="create-job-modal-title" className="text-lg font-bold text-slate-900">
                  Job created
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {creationWarnings.length === 0
                    ? `"${createdJob.title}" is configured and active. Where would you like to go next?`
                    : `"${createdJob.title}" was created, but some setup did not finish.`}
                </p>

                {/* Steps that failed. The modal used to report unconditional
                    success here while every follow-up call was swallowed, so a
                    role with no rubric and no questions looked ready to publish. */}
                {creationWarnings.length > 0 && (
                  <div
                    role="alert"
                    className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-900"
                  >
                    <p className="font-bold">Finish these before candidates apply:</p>
                    <ul className="mt-1.5 space-y-1 list-disc pl-4">
                      {creationWarnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Summary Card */}
                <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 text-left text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Role:</span>
                    <span className="font-semibold text-slate-800">{createdJob.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Department:</span>
                    <span className="font-semibold text-slate-800">
                      {createdJob.department || "Not specified"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Location:</span>
                    <span className="font-semibold text-slate-800">
                      {createdJob.location || "Not specified"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Active Modules:</span>
                    <div className="flex gap-1 flex-wrap">
                      {includes.aiInterview && (
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-800">AI Interview</span>
                      )}
                      {includes.cvEvaluation && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">CV Eval</span>
                      )}
                      {includes.test && (
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-800">Skills Assessment</span>
                      )}
                      <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700">ATS</span>
                    </div>
                  </div>
                </div>

                {/* Guided Navigation Buttons */}
                <div className="mt-6 space-y-2.5">
                  {/* Primary: Publish Job to Careers Portal Now */}
                  {createdJob.status !== "published" ? (
                    <button
                      type="button"
                      onClick={handlePublishImmediately}
                      disabled={publishingImmediately}
                      className="w-full flex items-center justify-between rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-60"
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        <span>{publishingImmediately ? "Publishing Job..." : "Publish Job to Careers Portal Now"}</span>
                      </div>
                      <span className="text-[11px] bg-emerald-700/80 px-2 py-0.5 rounded text-emerald-100">Make Live</span>
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 py-2.5 px-4 text-xs font-bold text-emerald-800">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>Published & Open for Applicants on Careers Portal</span>
                    </div>
                  )}

                  {/* Skills Assessment Studio Quick Action if Test was Included */}
                  {includes.test && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onInspectJob) {
                          onInspectJob(createdJob, "assessment");
                        } else {
                          navigate(`/jobs/${createdJob._id}/assessment`);
                        }
                      }}
                      className="w-full flex items-center justify-between rounded-xl bg-brand-700 hover:bg-brand-800 text-white px-4 py-3 text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4" />
                        <span>Configure Skills Assessment Studio</span>
                      </div>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onInspectJob) {
                        onInspectJob(createdJob, "rubric");
                      } else {
                        navigate(`/jobs?jobId=${createdJob._id}&tab=rubric`);
                      }
                    }}
                    className="w-full flex items-center justify-between rounded-xl bg-[#0E3B2E] hover:bg-[#154d3d] text-white px-4 py-3 text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    <span>Review Evaluation Plan & Scoring Rubric</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onInspectJob) {
                        onInspectJob(createdJob, "overview");
                      } else {
                        navigate(`/jobs?jobId=${createdJob._id}`);
                      }
                    }}
                    className="w-full flex items-center justify-between rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 px-4 py-2.5 text-xs font-semibold transition cursor-pointer"
                  >
                    <span>Inspect Requisition (Drawer)</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs text-slate-400 hover:text-slate-600 transition pt-1 cursor-pointer"
                  >
                    Close and stay on Hiring Projects
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
