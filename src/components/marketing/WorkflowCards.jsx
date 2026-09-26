/* The four-card horizontal rendering of the Claim -> Probe -> Verdict loop for
 * the landing page's workflow section. A compact companion to the full
 * RubricPanel/ClaimsPanel/LedgerPanel/ProbePanel diptych in LoopArtifacts.jsx —
 * same honesty rules apply: the score bars are marked "Illustration", and
 * nothing here is a candidate record.
 */
import { ArrowDown, ArrowRight, BarChart3, CheckCircle2, ClipboardList, FileText, MessageSquareText } from "lucide-react";
import Reveal from "../../motion/Reveal.jsx";

const NUMBER_TONE = {
  brand: "bg-brand-100 text-brand-700",
  amber: "bg-amber-100 text-amber-700",
  violet: "bg-violet-100 text-violet-700",
  emerald: "bg-emerald-100 text-emerald-700",
};

function CardShell({ number, tone, icon: Icon, title, children }) {
  return (
    <div className="flex h-full w-full min-w-[200px] flex-col rounded-2xl border border-hairline bg-surface p-5 shadow-card transition hover:-translate-y-1 hover:shadow-lift lg:min-w-0">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${NUMBER_TONE[tone]}`}>
          {number}
        </span>
        <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
      </div>
      <h3 className="mt-3 text-[15px] font-bold whitespace-nowrap text-brand-800">{title}</h3>
      <div className="mt-3 flex-1">{children}</div>
    </div>
  );
}

function SkeletonLine({ w = "100%" }) {
  return <span className="block h-2 rounded-full bg-slate-100" style={{ width: w }} aria-hidden="true" />;
}

function BulletRow({ label, dotClassName }) {
  return (
    <li className="flex items-center gap-2 text-[13px] text-slate-600">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClassName}`} aria-hidden="true" />
      <span>{label}</span>
    </li>
  );
}

function IconRow({ icon: Icon, label, tileClassName, iconClassName }) {
  return (
    <li className="flex items-center gap-2 text-[13px] text-slate-600">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${tileClassName}`}>
        <Icon className={`h-3.5 w-3.5 ${iconClassName}`} aria-hidden="true" />
      </span>
      <span>{label}</span>
    </li>
  );
}

function ScoreBar({ label, value, colorClass }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
        <span className="whitespace-nowrap">{label}</span>
        <span className="num tabular-nums text-slate-800">{value}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex shrink-0 items-center justify-center text-brand-500" aria-hidden="true">
      <ArrowRight className="hidden h-5 w-5 lg:block" />
      <ArrowDown className="h-5 w-5 lg:hidden" />
    </div>
  );
}

export default function WorkflowCards() {
  return (
    <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-stretch">
      <Reveal className="w-full lg:min-w-0 lg:flex-1">
        <CardShell number={1} tone="brand" icon={FileText} title="Job Description">
          <div className="rounded-xl bg-canvas-deep/60 p-3">
            <p className="text-[12px] font-semibold text-slate-800">Senior Backend Engineer</p>
            <div className="mt-2 space-y-1.5">
              <SkeletonLine w="90%" />
              <SkeletonLine w="65%" />
            </div>
          </div>
          <ul className="mt-3 space-y-1.5">
            <BulletRow label="Role details" dotClassName="bg-brand-500" />
            <BulletRow label="Required skills" dotClassName="bg-brand-500" />
            <BulletRow label="Evaluation criteria" dotClassName="bg-brand-500" />
          </ul>
        </CardShell>
      </Reveal>

      <Arrow />

      <Reveal delay={80} className="w-full lg:min-w-0 lg:flex-1">
        <CardShell number={2} tone="amber" icon={ClipboardList} title="Evidence Collection">
          <ul className="space-y-2.5">
            <IconRow icon={FileText} label="Resume & documents" tileClassName="bg-emerald-100" iconClassName="text-emerald-600" />
            <IconRow icon={MessageSquareText} label="Assessment responses" tileClassName="bg-violet-100" iconClassName="text-violet-600" />
            <IconRow icon={ClipboardList} label="Interview notes" tileClassName="bg-brand-100" iconClassName="text-brand-600" />
          </ul>
        </CardShell>
      </Reveal>

      <Arrow />

      <Reveal delay={160} className="w-full lg:min-w-0 lg:flex-1">
        <CardShell number={3} tone="violet" icon={BarChart3} title="Evaluation & Scoring">
          <span className="mb-2.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-slate-500">
            Illustration
          </span>
          <div className="space-y-2.5">
            <ScoreBar label="Technical Skills" value={92} colorClass="bg-emerald-500" />
            <ScoreBar label="Problem Solving" value={85} colorClass="bg-brand-500" />
            <ScoreBar label="Communication" value={78} colorClass="bg-amber-500" />
            <ScoreBar label="Role Fit" value={73} colorClass="bg-violet-500" />
          </div>
        </CardShell>
      </Reveal>

      <Arrow />

      <Reveal delay={240} className="w-full lg:min-w-0 lg:flex-1">
        <CardShell number={4} tone="emerald" icon={CheckCircle2} title="Explainable Decision">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Recommended
          </span>
          <ul className="mt-3 space-y-1.5">
            <IconRow icon={CheckCircle2} label="Decision summary" tileClassName="bg-emerald-100" iconClassName="text-emerald-600" />
            <IconRow icon={CheckCircle2} label="Key evidence" tileClassName="bg-emerald-100" iconClassName="text-emerald-600" />
            <IconRow icon={CheckCircle2} label="Human review (if needed)" tileClassName="bg-emerald-100" iconClassName="text-emerald-600" />
          </ul>
        </CardShell>
      </Reveal>
    </div>
  );
}
