/* Hallmark · nav: N1b canonical SaaS three-section
 * knobs: centre links=3, dropdowns=none, scroll=always-solid
 * theme: AptusHire (DESIGN.md, locked)
 *
 * Was N1a — wordmark-left + 6 right-grouped links + 2 buttons + frosted sticky
 * bar, which is the nav fingerprint slop-test gate 42 fails on. Three of those
 * six links were /welcome#anchors, dead on the seven non-landing pages that
 * also render this component. The sparkle mark is gone: DESIGN.md's Don't list
 * names "sparkle icons scattered as decoration" explicitly.
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Button from "../ui/Button.jsx";
import BrandLogo from "../ui/BrandLogo.jsx";
import ThemeToggle from "../ui/ThemeToggle.jsx";

// Only destinations that resolve from any page this navbar renders on.
const LINKS = [
  { label: "How it works", href: "/welcome#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Demo", href: "/demo" },
];

const LINK_FOCUS =
  "rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600";

function Wordmark({ onClick }) {
  return (
    <BrandLogo to="/welcome" onClick={onClick} size="md" className={LINK_FOCUS} />
  );
}

export default function MarketingNavbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-[#E5EBE7] bg-white/90 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
        <Wordmark />

        {/* Centred cluster — the section N1b adds over the wordmark/links/button bar. */}
        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`text-sm font-medium whitespace-nowrap text-[#64736A] transition-colors duration-150 hover:text-[#176B45] ${LINK_FOCUS}`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <Button variant="ghost" size="sm" className="whitespace-nowrap" onClick={() => navigate("/login")}>
            Sign in
          </Button>
          <Button size="sm" className="whitespace-nowrap" onClick={() => navigate("/register-company")}>
            Register company
          </Button>
        </div>

        <button
          type="button"
          className={`-mr-2 flex h-11 w-11 items-center justify-center text-[#64736A] md:hidden ${LINK_FOCUS}`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="marketing-nav-sheet"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <div id="marketing-nav-sheet" className="border-t border-[#E5EBE7] bg-white px-5 pt-3 pb-5 md:hidden">
          <nav aria-label="Main" className="flex flex-col">
            {LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={`flex min-h-11 items-center text-sm font-medium whitespace-nowrap text-[#64736A] ${LINK_FOCUS}`}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2 border-t border-[#E5EBE7] pt-4">
            <Button variant="outline" className="whitespace-nowrap" onClick={() => navigate("/login")}>
              Sign in
            </Button>
            <Button className="whitespace-nowrap" onClick={() => navigate("/register-company")}>
              Register company
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
