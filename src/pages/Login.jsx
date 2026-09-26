import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, BarChart3, Eye, EyeOff, FileText, Lock, Mail, ShieldCheck, Users } from "lucide-react";
import api from "../api/client.js";
import { saveAdminAuth } from "../auth/adminAuth.js";
import { Input, Label, FormGroup, Checkbox } from "../components/ui/Field.jsx";
import Button from "../components/ui/Button.jsx";
import BrandLogo from "../components/ui/BrandLogo.jsx";

const FEATURES = [
  {
    icon: Users,
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
    title: "Manage your job postings",
    body: "Create, edit and track hiring pipelines.",
  },
  {
    icon: FileText,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    title: "Review AI-powered insights",
    body: "Evaluate candidates with clear evidence.",
  },
  {
    icon: BarChart3,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    title: "Collaborate with your team",
    body: "Work together with notes, reviews and feedback.",
  },
  {
    icon: ShieldCheck,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    title: "Keep your hiring defensible",
    body: "Maintain a complete, audit-ready record.",
  },
];

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 19 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 16.3 3 9.7 7.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 36.4 26.7 37 24 37c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 40.6 16.2 45 24 45z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C40.8 36 44 30.6 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: location.state?.email || "", password: "" });
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNeedsVerification(false);
    setSubmitting(true);
    try {
      const res = await api.post("/auth/login", form);
      if (res.data.user.role !== "admin" && res.data.user.role !== "superadmin") {
        setError("This account does not have admin access.");
        return;
      }
      saveAdminAuth({ token: res.data.token, refreshToken: res.data.refreshToken, user: res.data.user });
      const redirectTo = location.state?.from || "/";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === "EMAIL_NOT_VERIFIED") {
        setNeedsVerification(true);
      } else if (code === "PAYMENT_REQUIRED" && err.response.data.token) {
        saveAdminAuth({
          token: err.response.data.token,
          refreshToken: err.response.data.refreshToken,
          user: err.response.data.user,
        });
        navigate("/pricing", { replace: true });
        return;
      }
      setError(err.response?.data?.error || "Could not log in");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    try {
      await api.post("/auth/resend-verification", { email: form.email });
    } finally {
      setResendSent(true);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FAFDFF]">
      {/* Supplied background artwork — replaces the earlier hand-built
          blob/dot-grid approximation of this same decoration. */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/brand/login-bg.png')" }}
        aria-hidden="true"
      />

      <div className="relative mx-auto flex min-h-screen max-w-[1280px] flex-col justify-center gap-14 px-5 py-12 sm:px-8 lg:flex-row lg:items-center lg:gap-10 lg:py-16">
        {/* Left column — brand story. Hidden on small screens so the form,
            the thing a returning admin actually needs, is what loads first. */}
        <div className="hidden w-full max-w-lg lg:block lg:flex-1">
          <BrandLogo to="/welcome" size="lg" className="mb-10" />

          <span className="inline-flex items-center gap-2 rounded-full bg-[#EAF5FF] px-3.5 py-1.5 text-xs font-bold tracking-wide text-brand-700 uppercase">
            <span className="h-2 w-2 rounded-full bg-brand-600" aria-hidden="true" />
            Welcome back
          </span>

          <h1 className="mt-5 text-[44px] leading-[1.1] font-extrabold tracking-tight text-brand-900 [overflow-wrap:anywhere] xl:text-5xl">
            Log in to your
            <span className="block text-brand-600">workspace</span>
          </h1>

          <p className="mt-5 max-w-md text-lg text-slate-600">
            Continue building a fairer, faster and more transparent hiring process with AptusHire.
          </p>

          <div className="mt-10 space-y-6">
            {FEATURES.map((item) => (
              <div key={item.title} className="flex items-start gap-4">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}>
                  <item.icon className={`h-5 w-5 ${item.iconColor}`} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-bold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-[15px] text-slate-600">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — the form card. */}
        <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-[420px] lg:shrink-0">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-lift sm:p-8">
            <div className="flex flex-col items-center text-center">
              <BrandLogo to="/welcome" size="lg" />
              <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-brand-900 [overflow-wrap:anywhere]">
                Welcome back
              </h2>
              <p className="mt-1 text-sm text-slate-500">Log in to your admin workspace</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-7">
              {error && (
                <p className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>
              )}
              {needsVerification && (
                <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                  {resendSent ? (
                    "A new verification link has been sent if that account exists."
                  ) : (
                    <button type="button" className="font-semibold underline" onClick={handleResend}>
                      Resend verification email
                    </button>
                  )}
                </p>
              )}

              <FormGroup>
                <Label required>Email</Label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <Input
                    type="email"
                    value={form.email}
                    onChange={update("email")}
                    placeholder="Enter your email address"
                    className="pl-10"
                    required
                  />
                </div>
              </FormGroup>

              <FormGroup>
                <Label required>Password</Label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={update("password")}
                    placeholder="Enter your password"
                    className="pr-10 pl-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute top-1/2 right-3.5 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              </FormGroup>

              <div className="mb-5 flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-700">
                  <Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  Remember me
                </label>
                <Link to="/forgot-password" className="font-semibold text-brand-700 hover:underline">
                  Forgot your password?
                </Link>
              </div>

              <Button
                type="submit"
                loading={submitting}
                className="!h-[52px] w-full !rounded-xl !bg-brand-900 !text-[15px] hover:!bg-brand-800"
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" /> Log in
              </Button>
            </form>

            <div className="mt-6 flex items-center gap-3 text-xs font-medium text-slate-400">
              <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
              or continue with
              <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
            </div>

            {/* Not wired to a real provider yet — shown to match the design
                but disabled rather than pretending to sign anyone in. */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled
                aria-disabled="true"
                title="Coming soon"
                className="flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-600 opacity-60"
              >
                <GoogleIcon /> Continue with Google
              </button>
              <button
                type="button"
                disabled
                aria-disabled="true"
                title="Coming soon"
                className="flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-600 opacity-60"
              >
                <MicrosoftIcon /> Continue with Microsoft
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              Don't have a workspace?{" "}
              <Link to="/register-company" className="font-semibold text-brand-700 hover:underline">
                Register your company
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
