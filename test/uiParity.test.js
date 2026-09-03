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

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const ADMIN_PANELS = read("../src/components/ui/Panels.jsx");
const USER_PANELS = read("../../user/src/components/ui/Panels.jsx");

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

// Components that exist in both kits and must not drift.
const SHARED = ["Chip", "ChipRow"];

describe("UI kit parity — admin and user share these components", () => {
  for (const name of SHARED) {
    it(`<${name}> is identical in both apps`, () => {
      const mine = extractComponent(ADMIN_PANELS, name);
      const theirs = extractComponent(USER_PANELS, name);

      // A null here means the component was renamed or removed on one side,
      // which is itself the drift this test is looking for.
      expect(mine, `${name} not found in admin/src/components/ui/Panels.jsx`).toBeTruthy();
      expect(theirs, `${name} not found in user/src/components/ui/Panels.jsx`).toBeTruthy();
      expect(theirs).toBe(mine);
    });
  }

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
