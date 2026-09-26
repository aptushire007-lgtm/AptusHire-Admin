/* The page's closing sequence: FinalCTA -> ClosingStatement -> Footer.
 * A dark premium-SaaS band deliberately broken out of Landing.jsx's light
 * theme — see the navbar (also repainted dark) and the reference spec this
 * was built against. Kept as its own file, not inline JSX, since it's four
 * distinct sections with their own exact typography contract.
 */
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Button from "../ui/Button.jsx";

const TRUST_ITEMS = ["Evidence-backed", "Human review", "Reproducible decisions", "Audit-ready"];

export function TrustIndicators() {
  return (
    <ul className="mt-[34px] flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm text-[#C0CDDB]">
      {TRUST_ITEMS.map((item, i) => (
        <li key={item} className="flex items-center gap-7">
          {i > 0 && <span className="hidden h-[18px] w-px bg-white/[0.18] sm:block" aria-hidden="true" />}
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#24D982]" aria-hidden="true" />
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.12] bg-[#061321]">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/brand/image.png')" }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-[1200px] px-5 pt-[85px] pb-20 text-center sm:px-8">
        <span className="inline-flex items-center gap-3 text-[13px] font-semibold tracking-[2.5px] text-[#AFC2D8] uppercase">
          <span className="h-2.5 w-2.5 rounded-full bg-[#27D17F]" aria-hidden="true" />
          Ready to make hiring more defensible?
        </span>

        <h2 className="mx-auto mt-[22px] max-w-[1000px] text-[36px] leading-[1.08] font-extrabold tracking-[-1px] text-[#F8FAFC] [overflow-wrap:anywhere] sm:text-[44px] md:text-[52px] lg:text-[62px] lg:leading-[1.02] lg:tracking-[-2px]">
          Run one role through AptusHire.
          <span className="block text-[#168FF2]">Read the record.</span>
        </h2>

        <p className="mx-auto mt-[22px] max-w-[720px] text-[16px] leading-[1.55] text-[#A8B8CB] sm:text-[18px]">
          Register your company, publish a job, and see exactly what comes back — the criteria, the quoted
          evidence, and the points behind every decision.
        </p>

        <div className="mt-[30px] flex flex-wrap items-center justify-center gap-3.5">
          <Button
            as={Link}
            to="/register-company"
            className="!h-[58px] !w-full !max-w-[340px] !rounded-[9px] !bg-white !text-[16px] !font-bold !text-[#071321] hover:!bg-[#EAF5FF] sm:!w-[235px]"
          >
            Start free trial <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Button>
          <Button
            as={Link}
            to="/demo"
            variant="outline"
            className="!h-[58px] !w-full !max-w-[340px] !rounded-[9px] !border-white/45 !bg-transparent !text-[16px] !font-semibold !text-white hover:!bg-white/5 sm:!w-[205px]"
          >
            Request a demo
          </Button>
        </div>

        <p className="mt-[18px] text-[13px] text-[#72859B]">
          No credit card required · Automatic rejection is off by default
        </p>

        <TrustIndicators />
      </div>
    </section>
  );
}

export function ClosingStatement() {
  return (
    <section className="bg-[#071725]">
      <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8">
        <h2 className="max-w-[760px] text-[30px] leading-[1.15] font-bold tracking-[-1px] text-[#F8FAFC] [overflow-wrap:anywhere] sm:text-[36px] lg:text-[40px]">
          Hiring decisions are about people. <span className="text-[#2196F3]">They should be defensible in writing.</span>
        </h2>
        <p className="mt-[18px] max-w-[650px] text-[17px] leading-[1.55] text-[#9DAFC2]">
          Give recruiters the evidence, context, and audit trail they need to explain every decision.
        </p>
      </div>
    </section>
  );
}

const FOOTER_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

export function Footer() {
  return (
    <footer id="contact" className="border-t border-white/10 bg-[#061321]">
      <div className="mx-auto max-w-[1200px] px-5 pt-7 pb-8 sm:px-8">
        <div className="grid grid-cols-1 items-center gap-8 sm:grid-cols-[1fr_auto_1fr]">
          <div>
            <span className="flex items-center gap-2 font-display font-bold text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#148FF0] text-xs text-white">
                H
              </span>
              AptusHire
            </span>
            <p className="mt-3 text-[12px] text-[#708399]">© {new Date().getFullYear()} AptusHire. All rights reserved.</p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-x-[30px] gap-y-2 text-[13px] text-[#9BAABD] sm:justify-center">
            {FOOTER_LINKS.map((link) => (
              <a key={link.label} href={link.href} className="whitespace-nowrap transition-colors hover:text-white">
                {link.label}
              </a>
            ))}
            <Link to="/demo" className="whitespace-nowrap transition-colors hover:text-white">
              Demo
            </Link>
            {/* Not a link — there's no resources/docs route in this app yet,
                and a footer link that goes nowhere is worse than no link. */}
            <span className="cursor-default whitespace-nowrap text-[#65788D]" aria-disabled="true">
              Resources
            </span>
          </nav>

          <div className="flex flex-col gap-1.5 text-right leading-[1.8] sm:items-end">
            <a href="mailto:sales@AptusHire.ai" className="text-[14px] whitespace-nowrap text-[#D7E1EC] transition-colors hover:text-white">
              sales@AptusHire.ai
            </a>
            <a href="tel:+911140001234" className="num text-[13px] whitespace-nowrap tabular-nums text-[#8295A9] transition-colors hover:text-white">
              +91 11 4000 1234
            </a>
          </div>
        </div>

        {/* Same reasoning as "Resources" above: no legal pages exist yet, so
            these are labelled plainly rather than linked to nowhere. */}
        <div className="mt-[26px] flex flex-wrap gap-x-6 gap-y-2 border-t border-white/[0.08] pt-[18px] text-[12px] text-[#65788D]">
          <span className="cursor-default" aria-disabled="true">Privacy</span>
          <span className="cursor-default" aria-disabled="true">Terms</span>
          <span className="cursor-default" aria-disabled="true">Security</span>
        </div>
      </div>
    </footer>
  );
}
