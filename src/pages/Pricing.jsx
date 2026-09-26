import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Check, Gift, Users, Zap } from "lucide-react";
import api from "../api/client.js";
import { getAdminAuth } from "../auth/adminAuth.js";
import MarketingNavbar from "../components/marketing/MarketingNavbar.jsx";
import OnboardingSteps from "../components/marketing/OnboardingSteps.jsx";
import { Skeleton } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";

function formatPrice(amount) {
  if (amount === 0) return "Free";
  return `₹${amount.toLocaleString("en-IN")}`;
}

// Reference design pairs each card position with a fixed icon + tint,
// independent of whatever key the plan happens to carry from the API.
const PLAN_STYLES = [
  { Icon: Gift, iconBg: "bg-sky-100", iconColor: "text-sky-600" },
  { Icon: Users, iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
  { Icon: Zap, iconBg: "bg-brand-100", iconColor: "text-brand-700" },
  { Icon: Building2, iconBg: "bg-violet-100", iconColor: "text-violet-600" },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [error, setError] = useState("");
  const [isOnboarding, setIsOnboarding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.get("/subscriptions/plans");
        if (!cancelled) setPlans(res.data);
      } catch (err) {
        if (!cancelled) setError("Could not load subscription plans");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    if (getAdminAuth()?.token) {
      api
        .get("/auth/me")
        .then((res) => {
          if (!cancelled) setIsOnboarding(res.data.company?.status !== "active");
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, []);

  function choosePlan(planKey) {
    // Checkout requires a signed-in admin and bounces anonymous visitors to
    // /login — but a visitor browsing pricing has no account yet, so send
    // them to register instead. The chosen plan rides along in state so
    // Checkout can be resumed with it once they're signed in.
    if (!getAdminAuth()?.token) {
      navigate("/register-company", { state: { planKey, billingCycle } });
      return;
    }
    navigate("/checkout", { state: { planKey, billingCycle } });
  }

  return (
    <div className="min-h-screen bg-white">
      <MarketingNavbar />
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        {isOnboarding && <OnboardingSteps current={4} />}

        <div className="text-left">
          <h1 className="text-[32px] font-extrabold tracking-tight text-slate-900 sm:text-[36px]">Pricing</h1>
          <p className="mt-2 text-[15px] text-slate-600">Start free. Move up as your hiring volume grows.</p>
        </div>

        {error && <p className="mt-6 text-sm font-medium text-red-600">{error}</p>}

        <div className="mt-8 flex">
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1">
            {["monthly", "yearly"].map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() => setBillingCycle(cycle)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  billingCycle === cycle ? "bg-surface text-brand-700 shadow-sm" : "text-slate-500"
                }`}
              >
                {cycle === "monthly" ? "Monthly" : "Yearly · save more"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3 rounded-2xl border border-slate-200 p-6">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}

          {plans.map((plan, i) => {
            const popular = plan.key === "professional";
            const style = PLAN_STYLES[i % PLAN_STYLES.length];
            const Icon = style.Icon;
            return (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div
                  className={`relative flex h-full flex-col rounded-2xl border bg-white p-6 ${
                    popular ? "border-brand-500 shadow-lift ring-1 ring-brand-500" : "border-slate-200"
                  }`}
                >
                  {popular && (
                    <span className="mb-3 inline-flex w-fit items-center rounded-md bg-brand-700 px-2.5 py-1 text-[11px] font-bold text-white">
                      Most popular
                    </span>
                  )}
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.iconBg}`}>
                    <Icon className={`h-5 w-5 ${style.iconColor}`} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{plan.name}</h3>
                  <p className="mt-1 text-[13px] text-slate-500">{plan.description}</p>
                  <div className="font-display mt-5 text-[32px] leading-none font-extrabold text-slate-900">
                    {formatPrice(plan.pricing[billingCycle])}
                    {plan.pricing[billingCycle] > 0 && (
                      <span className="text-sm font-medium text-slate-500">
                        {" "}/{billingCycle === "monthly" ? "mo" : "yr"}
                      </span>
                    )}
                  </div>
                  <div className="mt-5 border-t border-slate-100 pt-5">
                    <ul className="flex-1 space-y-2.5 text-sm text-slate-700">
                      {[
                        `${plan.limits.maxJobs.toLocaleString()} active jobs`,
                        `${plan.limits.maxAiInterviews.toLocaleString()} AI interviews / month`,
                        `${plan.limits.maxRecruiters.toLocaleString()} recruiter seats`,
                        `${plan.limits.maxResumeParsing.toLocaleString()} resume parses / mo`,
                        `${(plan.limits.storageLimitMb / 1000).toFixed(1)} GB storage`,
                      ].map((line) => (
                        <li key={line} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button
                    variant={popular ? "primary" : "secondary"}
                    className="mt-6 w-full"
                    onClick={() => choosePlan(plan.key)}
                  >
                    Get started
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
