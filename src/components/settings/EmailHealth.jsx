import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, MailWarning, RefreshCw } from "lucide-react";
import api from "../../api/client.js";
import { Card, Skeleton } from "../ui/Card.jsx";
import Button from "../ui/Button.jsx";

const TRANSPORT = {
  "brevo-api": { label: "Brevo API (HTTPS)", ok: true },
  smtp: { label: "SMTP relay", ok: true },
  json: { label: "Not configured — nothing is delivered", ok: false },
};

/**
 * Whether the emails this workspace sends are actually arriving.
 *
 * A recruiter moves a candidate on and assumes they were told; if the relay is
 * blocked, every one of those emails fails in a log nobody reads. This puts the
 * last seven days — and the two settings that break delivery most often, the
 * transport and an unaligned sender address — on the settings page.
 */
export default function EmailHealth() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    api
      .get("/company-settings/email-health")
      .then(({ data }) => alive && setData({ windowDays: 7, sent: 0, failed: 0, pending: 0, recentFailures: [], ...(data || {}) }))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [attempt]);

  if (failed) {
    return (
      <Card>
        <h2 className="text-base font-semibold text-slate-900">Email delivery</h2>
        <p className="mt-1 text-sm text-slate-600">Could not read delivery figures. This is not the same as no emails failing.</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
      </Card>
    );
  }
  if (!data) return <Card><Skeleton className="h-28 w-full" /></Card>;

  const transport = TRANSPORT[data.transport] || { label: data.transport, ok: true };
  const trouble = data.failed > 0 || !transport.ok || data.senderUnaligned;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            {trouble ? <MailWarning className="h-4.5 w-4.5 text-amber-600" aria-hidden="true" /> : <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" aria-hidden="true" />}
            Email delivery
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Candidate emails sent in the last {data.windowDays} days. Every send is logged whether it succeeds or not.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setData(null); setAttempt((n) => n + 1); }}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Refresh
        </Button>
      </div>

      <p className="mt-3 rounded-xl border border-hairline bg-canvas px-3 py-2 text-xs leading-relaxed text-slate-600">
        Candidate emails are addressed from <span className="font-semibold text-slate-800">the recruiter</span> — their name on the
        message, their address for replies — while {data.from ? <span className="font-mono text-[11px]">{data.from}</span> : "the workspace address"} does the
        sending, which is what keeps mail out of spam. Automated emails use the recruiter who opened the role.
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Delivered", value: data.sent, tone: "text-slate-900" },
          { label: "Failed", value: data.failed, tone: data.failed ? "text-red-700" : "text-slate-900" },
          { label: "Waiting to send", value: data.pending, tone: "text-slate-900" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-hairline bg-canvas p-3">
            <dt className="text-xs text-slate-500">{m.label}</dt>
            <dd className={`num mt-0.5 text-xl font-bold ${m.tone}`}>{m.value}</dd>
          </div>
        ))}
        <div className="rounded-xl border border-hairline bg-canvas p-3">
          <dt className="text-xs text-slate-500">Sending by</dt>
          <dd className={`mt-0.5 text-sm font-semibold ${transport.ok ? "text-slate-900" : "text-red-700"}`}>{transport.label}</dd>
          {data.from && <dd className="mt-0.5 truncate text-[11px] text-slate-500" title={data.from}>from {data.from}</dd>}
        </div>
      </dl>

      {data.senderUnaligned && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Mail is sent from <span className="font-semibold">{data.from}</span>, a personal mailbox. The relay accepts it, but receiving
            servers check whether that domain authorised us and usually junk or reject it. Send from an address on your own domain instead.
          </span>
        </p>
      )}

      {data.recentFailures?.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-bold tracking-wide text-slate-500 uppercase">Most recent failures</h3>
          <ul className="mt-2 divide-y divide-slate-100">
            {data.recentFailures.map((f, i) => (
              <li key={i} className="py-2 text-xs">
                <p className="truncate font-medium text-slate-800">{f.subject || f.category || "Email"} → {f.to}</p>
                <p className="mt-0.5 text-slate-500">
                  {f.error || "No error recorded"} · {f.at ? new Date(f.at).toLocaleString() : ""}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            These candidates were <span className="font-semibold text-slate-700">not</span> told. A timeout here usually means outbound mail
            is blocked from the server — sending over the Brevo API instead of SMTP avoids that.
          </p>
        </div>
      )}
    </Card>
  );
}
