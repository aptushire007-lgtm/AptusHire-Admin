/**
 * Floating product-UI panel for the marketing hero's right column.
 * Sits over the hero's own background photo (a separate absolute layer in
 * Landing.jsx) — this component renders no background of its own, only the
 * small "proof" cards and the candidate score card.
 */
import { BarChart3, CheckCircle2, UserCheck } from "lucide-react";

const TONE = {
  green: "bg-emerald-50 text-emerald-600",
  navy: "bg-[#EAF5FF] text-[#123B6D]",
};

function FloatCard({ className, icon: Icon, tone = "green", title, subtitle, badge }) {
  return (
    <div
      className={`absolute flex w-[210px] items-start gap-2.5 rounded-2xl border border-white/70 bg-white/92 px-3.5 py-3 shadow-[0_10px_28px_-10px_rgba(18,59,109,0.35)] backdrop-blur-sm ${className}`}
    >
      <span className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${TONE[tone]}`}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {badge && (
          <span className="absolute -right-1 -bottom-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
            <CheckCircle2 className="h-2.5 w-2.5 text-white" aria-hidden="true" />
          </span>
        )}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold leading-tight text-slate-900 [overflow-wrap:anywhere]">{title}</p>
        <p className="mt-0.5 text-[12px] leading-tight text-slate-500 [overflow-wrap:anywhere]">{subtitle}</p>
      </div>
    </div>
  );
}

const SCORES = [
  { label: "Technical Skills", value: 92 },
  { label: "Problem Solving", value: 85 },
  { label: "Communication", value: 78 },
  { label: "Role Fit", value: 86 },
];

function CandidateScoreCard({ className }) {
  return (
    <div
      className={`absolute w-[236px] rounded-2xl border border-white/70 bg-white/95 p-4 shadow-[0_18px_44px_-14px_rgba(18,59,109,0.4)] backdrop-blur-sm ${className}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Candidate</p>
        <p className="text-[13px] font-bold text-[#123B6D]">
          Overall <span className="text-emerald-600">87</span>/100
        </p>
      </div>
      <div className="mt-3 space-y-2.5">
        {SCORES.map((s) => (
          <div key={s.label}>
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span>{s.label}</span>
              <span className="num font-semibold text-slate-800">{s.value}</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[#2F9CF4]" style={{ width: `${s.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HeroProductUI() {
  return (
    <div className="relative h-[500px] w-full" aria-hidden="true">
      {/* Spread toward the edges, top/middle/bottom — the centre of the
          background photo (where a person is standing) is left clear. */}
      <FloatCard className="top-0 left-0" icon={CheckCircle2} tone="green" title="Rubric approved" subtitle="Senior Backend Engineer · v3" />
      <FloatCard className="top-20 right-0" icon={CheckCircle2} tone="green" title="Evidence verified" subtitle="4 cited lines matched" />
      <FloatCard className="top-[212px] left-2" icon={UserCheck} tone="navy" title="Routed to human review" subtitle="Repeated readings disagreed" />
      <FloatCard className="top-[292px] right-2" icon={BarChart3} tone="green" badge title="Decision trace ready" subtitle="All criteria accounted for" />
      <CandidateScoreCard className="right-4 bottom-0" />
    </div>
  );
}
