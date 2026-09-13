import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LogIn } from "lucide-react";
import api from "../api/client.js";
import { saveAdminAuth } from "../auth/adminAuth.js";
import { Card } from "../components/ui/Card.jsx";
import { Input, Label, FormGroup } from "../components/ui/Field.jsx";
import Button from "../components/ui/Button.jsx";
import BrandLogo from "../components/ui/BrandLogo.jsx";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: location.state?.email || "", password: "" });
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendSent, setResendSent] = useState(false);

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
    <div className="relative flex min-h-screen items-center justify-center bg-[#FAFCF8] px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo to="/welcome" size="lg" className="mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 [overflow-wrap:anywhere]">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Log in to your admin workspace</p>
        </div>

        <Card className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-soft sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>
            )}
            {needsVerification && (
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
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
              <Input type="email" value={form.email} onChange={update("email")} required />
            </FormGroup>
            <FormGroup>
              <Label required>Password</Label>
              <Input type="password" value={form.password} onChange={update("password")} required />
            </FormGroup>
            <Button type="submit" size="lg" loading={submitting} className="w-full">
              <LogIn className="h-4 w-4" /> Log In
            </Button>
          </form>
          <p className="mt-5 text-center text-xs text-slate-500">
            <Link to="/forgot-password" className="font-semibold text-brand-700 hover:underline">
              Forgot your password?
            </Link>
          </p>
        </Card>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don't have a workspace?{" "}
          <Link to="/register-company" className="font-semibold text-brand-700 hover:underline">
            Register your company
          </Link>
        </p>
      </div>
    </div>
  );
}
