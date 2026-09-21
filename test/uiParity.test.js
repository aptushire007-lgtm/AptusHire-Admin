// The two frontends carry duplicate UI kits by design — DESIGN.md § Do's says
// "keep the two frontends' UI kits identical", and Panels.jsx repeats it in its
// own header. Nothing enforced it, and the cost of that showed up in the chip
// bug (see chip.test.jsx): a single missing `shrink-0` clipped filter labels on
// narrow screens, and because the file is duplicated it was wrong in BOTH apps
// and had to be found and fixed twice.
//
// That is the failure this pins. Not "the files are identical" — they legitimately
// are not, the admin kit has surfaces the candidate app has no use for — but
// "the components that exist in both are the same component". A fix applied to
// one copy and forgotten in the other fails here, at the moment it is made,
// rather than months later on somebody's phone.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8").replace(/\r\n/g, "\n");

const ADMIN_PANELS = read("../src/components/ui/Panels.jsx");
const USER_PANELS = read("../../AptusHire-Frontend/src/components/ui/Panels.jsx");

/**
 * Pull one `export function NAME(...) { ... }` block out of a source file by
 * matching braces from the opening one. Crude by intent: a real parser would be
 * a dependency and a moving part, and every brace inside these components —
 * template literals included — is balanced.
 */
function extractComponent(source, name) {
  const start = source.indexOf(`export function ${name}(`);
  if (start === -1) return null;

  // Step over the parameter list before brace-matching. Every one of these
  // components takes a destructured props object, so the signature contains
  // braces of its own — matching from the declaration closes on the end of the
  // PARAMETERS and yields a signature where a component body was wanted.
  let i = source.indexOf("(", start);
  let parens = 0;
  for (; i < source.length; i += 1) {
    if (source[i] === "(") parens += 1;
    else if (source[i] === ")" && (parens -= 1) === 0) break;
  }

  const bodyStart = source.indexOf("{", i);
  if (bodyStart === -1) return null;

  let depth = 0;
  for (let j = bodyStart; j < source.length; j += 1) {
    if (source[j] === "{") depth += 1;
    else if (source[j] === "}" && (depth -= 1) === 0) return source.slice(start, j + 1);
  }
  return null;
}

// Components that exist in both kits and must not drift at all.
//
// <Chip> is deliberately NOT here any more. Its visual treatment diverged when
// the candidate portal was rebranded to orange + navy (see tokens.test.js
// § BRAND): the portal's chip carries a shadow and a hover fill the admin's
// does not. That is a design decision about one app's chrome, not the
// copy-paste drift this file was written to catch — and pretending otherwise
// would mean either deleting the portal's hover state to satisfy a test, or
// loosening the comparison until it stopped catching anything.
//
// What <Chip> still owes is checked below and is the part that actually broke:
// the same props, and the `shrink-0` / `whitespace-nowrap` pair in both copies.
const SHARED = ["ChipRow"];

/**
 * Blank out palette choices before comparing.
 *
 * The two apps no longer share a brand: the candidate portal was deliberately
 * rebranded to orange + navy (see tokens.test.js § BRAND). Its <Chip> therefore
 * reaches for `brand-500` where the admin reaches for `brand-800`, and a
 * byte-identical comparison called that drift when it is a design decision.
 *
 * What this test is actually for is STRUCTURAL parity — the props, the markup,
 * and the `shrink-0` whose absence caused the bug this file exists for. So the
 * colour step is normalised away and everything else still has to match
 * exactly. A lost prop, a renamed component, a dropped `shrink-0` or a changed
 * `text-sm` all still fail, which is the whole point.
 *
 * Only genuine colour names are matched, so sizing utilities that share a
 * prefix (`text-sm`, `border-2`, `ring-1`) are deliberately left alone.
 */
const COLOR_NAMES =
  "brand|accent|slate|hairline|rule|canvas|emerald|amber|red|teal|indigo|violet|white|black|transparent|current";
const PALETTE = new RegExp(
  String.raw`\b((?:[a-z-]+:)*(?:border|bg|text|ring|shadow|outline|from|via|to|divide|placeholder|caret|fill|stroke))` +
    String.raw`-(?:\[[^\]]*\]|(?:${COLOR_NAMES})(?:-\d{1,3})?)(?:\/\d{1,3})?`,
  "g"
);
const ignorePalette = (source) => source.replace(PALETTE, "$1-<palette>");

describe("UI kit parity — admin and user share these components", () => {
  for (const name of SHARED) {
    it(`<${name}> is structurally identical in both apps`, () => {
      const mine = extractComponent(ADMIN_PANELS, name);
      const theirs = extractComponent(USER_PANELS, name);

      // A null here means the component was renamed or removed on one side,
      // which is itself the drift this test is looking for.
      expect(mine, `${name} not found in admin/src/components/ui/Panels.jsx`).toBeTruthy();
      expect(theirs, `${name} not found in user/src/components/ui/Panels.jsx`).toBeTruthy();
      expect(ignorePalette(theirs)).toBe(ignorePalette(mine));
    });
  }

  it("<Chip> keeps the same props in both apps, whatever each one paints them", () => {
    // The signature is the contract every call site in either app is written
    // against, so it has to match even though the styling no longer does. A
    // prop added on one side and forgotten on the other is exactly the drift
    // that used to hide behind the removed byte-identity check.
    const signature = (source) => {
      const block = extractComponent(source, "Chip");
      return block?.slice(0, block.indexOf(")") + 1).replace(/\s+/g, " ");
    };
    const mine = signature(ADMIN_PANELS);
    expect(mine, "admin Chip").toBeTruthy();
    expect(signature(USER_PANELS)).toBe(mine);
  });

  it("keeps the chip shrink fix in BOTH copies, not just the one that was reported", () => {
    // Belt and braces alongside the identity check above: this states the actual
    // invariant in words, so a future edit that changes both copies in the same
    // wrong way still fails. The identity test alone would happily pass on two
    // matching regressions.
    for (const [label, source] of [["admin", ADMIN_PANELS], ["user", USER_PANELS]]) {
      const chip = extractComponent(source, "Chip");
      expect(chip, `${label} Chip`).toContain("shrink-0");
      expect(chip, `${label} Chip`).toContain("whitespace-nowrap");
    }
  });
});
