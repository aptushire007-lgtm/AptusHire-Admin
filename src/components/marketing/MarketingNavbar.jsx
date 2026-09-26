/* Hallmark · nav: N1b canonical SaaS three-section, dark variant
 * knobs: centre links=3, dropdowns=none, scroll=always-solid
 * theme: AptusHire dark premium SaaS refresh
 *
 * Was a light nav (bg-surface). Repainted dark per the reference spec: solid
 * #020A14, no blur — "Do NOT make the navbar transparent" was explicit in the
 * brief, so the sticky blur that used to soften the light version is gone too.
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown, Menu, Sun, X } from "lucide-react";
import BrandLogo from "../ui/BrandLogo.jsx";

// Only destinations that resolve from any page this navbar renders on.
const LINKS = [
  { label: "How it works", href: "/welcome#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Demo", href: "/demo" },
];

const LINK_FOCUS =
  "rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#168CF0]";

function Wordmark({ onClick }) {
  return (
    <BrandLogo to="/welcome" onClick={onClick} theme="dark" size="lg" className={LINK_FOCUS} />
  );
}

export default function MarketingNavbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#020A14]">
      <div className="mx-auto flex h-[78px] max-w-[1280px] items-center justify-between px-5 sm:px-8">
        <Wordmark />

        {/* Centred cluster — the section N1b adds over the wordmark/links/button bar. */}
        <nav aria-label="Main" className="hidden items-center gap-9 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`text-[15px] font-medium whitespace-nowrap text-[#E5EDF6] transition-colors duration-150 hover:text-white ${LINK_FOCUS}`}
            >
              {link.label}
            </a>
          ))}
          {/* Placeholder, not a link — there's no resources/blog/docs page
              in this app yet. Shown so the nav matches the reference layout;
              wire this to a real destination once that content exists. */}
          <span
            className="flex cursor-default items-center gap-1 text-[15px] font-medium whitespace-nowrap text-[#E5EDF6]"
            aria-disabled="true"
          >
            Resources
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          </span>
        </nav>

        <div className="hidden items-center gap-6 md:flex">
          <button
            type="button"
            aria-label="Toggle theme"
            className="flex h-[46px] w-[46px] items-center justify-center rounded-[10px] border border-white/[0.12] bg-white/[0.02] transition-colors hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168CF0]"
          >
            <Sun className="h-[19px] w-[19px] text-[#F5C542]" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className={`text-sm font-medium whitespace-nowrap text-[#D7E2EE] transition-colors hover:text-white ${LINK_FOCUS}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => navigate("/register-company")}
            className="inline-flex h-12 w-[170px] items-center justify-center gap-1.5 rounded-lg bg-[#148FF0] px-5 text-sm font-bold whitespace-nowrap text-white transition-colors duration-150 hover:bg-[#EAF5FF] hover:text-[#071321] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168CF0]"
          >
            Register company <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          className={`-mr-2 flex h-11 w-11 items-center justify-center text-white md:hidden ${LINK_FOCUS}`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="marketing-nav-sheet"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <div id="marketing-nav-sheet" className="border-t border-white/[0.08] bg-[#020A14] px-5 pt-3 pb-5 md:hidden">
          <nav aria-label="Main" className="flex flex-col">
            {LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={`flex min-h-11 items-center text-[15px] font-medium whitespace-nowrap text-[#E5EDF6] ${LINK_FOCUS}`}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2 border-t border-white/[0.08] pt-4">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="flex h-11 items-center justify-center rounded-lg border border-white/[0.12] text-sm font-medium whitespace-nowrap text-white"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => navigate("/register-company")}
              className="flex h-12 items-center justify-center gap-1.5 rounded-lg bg-[#148FF0] text-sm font-bold whitespace-nowrap text-white"
            >
              Register company <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
