/**
 * Pins the token layer, in both frontends.
 *
 * The bug this exists for: `index.css` carried TWO `@theme` blocks. The first
 * declared the official AptusHire brand ramp; the second, added later for an
 * unrelated screen, redeclared `--color-brand-*`, `--color-slate-*` and
 * `--color-canvas` in a desaturated sage palette. Tailwind resolves duplicate
 * custom properties by source order, so the second silently won and the entire
 * product — both apps, every screen — shipped in a palette nobody had chosen.
 *
 * Nothing caught it because nothing could: the build was clean, the tests were
 * green, and the brand tokens were right there in the file, thirty lines above
 * the ones that were actually being used. It survived long enough for ~300
 * literal `#214740` / `#C1EBAD` values to be written against it across the
 * candidate app, each one pinning the wrong palette a little harder.
 *
 * So the invariant is stated three ways, because the failure was silent in all
 * three directions: the override must not come back, the brand values must
 * still be the ones declared, and no call site may re-pin the retired ramp.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const dir = (rel) => fileURLToPath(new URL(rel, import.meta.url));

const SHEETS = {
  admin: read("../src/index.css"),
  user: read("../../AptusHire-Frontend/src/index.css"),
};

// The values each brand block declares. If a future edit wants to change one of
// these, it should have to change this list too — that is the point.
//
// PER APP, because the two frontends no longer share a palette: the candidate
// portal was deliberately rebranded to orange + navy (its index.css carries a
// labelled "ORANGE SCALE" and explicit `green aliases → orange` compatibility
// lines, with ~400 call sites behind them). Asserting the admin's green values
// against it was testing a merge that had already been undone on purpose, and
// the fix was never to repaint the portal — it was to write down that it owns
// its own ramp.
//
// The invariant this file exists for is UNCHANGED and still enforced for both:
// a palette must not silently override itself. Each app simply declares which
// palette it is.
const BRAND = {
  admin: {
    "--color-brand-400": "#7CDE4A",
    "--color-brand-500": "#2FBE62",
    "--color-brand-800": "#0E3B2E",
    "--color-brand-900": "#0C1F1B",
    "--color-accent-400": "#12B98A",
    "--color-canvas": "#FAFCF8",
    "--color-canvas-deep": "#F3F7F1",
    "--color-hairline": "#E3EBE4",
    "--color-rule": "#F0F4EF",
  },
  // No `--color-accent-400`: the portal does not declare one, and inventing an
  // expectation for a token that does not exist is how this list stops being a
  // record of what shipped.
  user: {
    "--color-brand-400": "#FB923C",
    "--color-brand-500": "#F97316",
    "--color-brand-800": "#9A3E08",
    "--color-brand-900": "#7C3009",
    "--color-canvas": "#F8FAFC",
    "--color-canvas-deep": "#F1F5F9",
    "--color-hairline": "#E2E8F0",
    "--color-rule": "#F1F5F9",
  },
};

// The retired sage ramp. Any reappearance, in a stylesheet or a component, is
// the regression.
const RETIRED = ["#214740", "#2E4F48", "#3B5D52", "#5A7B71", "#C1EBAD", "#D2ECC9", "#EAF9E1", "#ECF3EB", "#DFE5DF"];

/**
 * The contents of every `@theme` block, concatenated.
 *
 * Scoping to `@theme` is what separates the bug from the feature. A property
 * redeclared inside `html.dark` is a dark-mode override and entirely correct —
 * `--color-canvas` legitimately becomes #081210 there. A property redeclared in
 * a SECOND `@theme` is the silent override, because both blocks apply at the
 * same specificity and the later one simply wins with nothing to signal it.
 */
function themeBlocks(css) {
  const out = [];
  const re = /@theme\s*\{/g;
  let m;
  while ((m = re.exec(css))) {
    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;
    for (; i < css.length && depth; i += 1) {
      if (css[i] === "{") depth += 1;
      else if (css[i] === "}") depth -= 1;
    }
    out.push(css.slice(start, i - 1));
  }
  return out.join("\n");
}

/** Every declaration of `prop` inside an `@theme` block, in source order. */
function declarationsOf(css, prop) {
  return [...themeBlocks(css).matchAll(new RegExp(`^\\s*${prop}\\s*:\\s*([^;]+);`, "gm"))].map((m) =>
    m[1].trim()
  );
}

/**
 * Every source file.
 *
 * This used to exclude the report and ATS surfaces by name
 * (`components/report`, `InterviewReport`, `AssessmentReport`,
 * `ScoreExplanation`). That exclusion was written when those screens were
 * out of scope for a restyle, and it quietly turned into a blind spot: while
 * nothing was looking, ScoreExplanation.jsx — the screen that shows a candidate
 * exactly why they scored what they scored — accumulated a whole private colour
 * ramp of Tailwind defaults (#34d399, #059669, #fbbf24, #d97706, #fb7185,
 * #dc2626, #94a3b8, #475569, #64748b, #e2e8f0). None of them are in this
 * product's palette and the sweep could not see a single one.
 *
 * BrandLogo is still excluded, and only BrandLogo: a logo is a fixed mark with
 * its own gradient, not a themed surface.
 */
function sourceFiles(root) {
  const out = [];
  const skip = /BrandLogo/;
  (function walk(d) {
    for (const entry of readdirSync(d)) {
      const p = join(d, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.jsx?$/.test(entry) && !skip.test(p)) out.push(p);
    }
  })(root);
  return out;
}

/** Every `--color-*` token the stylesheets declare, as bare names ("brand-500"). */
function declaredColorTokens(css) {
  return new Set(
    [...themeBlocks(css).matchAll(/^\s*--color-([A-Za-z0-9-]+)\s*:/gm)].map((m) => m[1])
  );
}

describe("design tokens", () => {
  for (const [app, css] of Object.entries(SHEETS)) {
    describe(app, () => {
      it("declares each brand token exactly once, at the documented value", () => {
        for (const [prop, value] of Object.entries(BRAND[app])) {
          const found = declarationsOf(css, prop);
          // The count matters as much as the value. A second declaration is
          // how the original bug worked: the first one stayed correct and
          // stopped being the one that shipped.
          expect(found, `${prop} should be declared exactly once`).toHaveLength(1);
          expect(found[0].toUpperCase()).toBe(value);
        }
      });

      it("does not redeclare a brand ramp in a later @theme block", () => {
        // Multiple @theme blocks are fine and this file has several — they
        // extend different namespaces. What is not fine is two of them
        // claiming the same custom property.
        const declared = [...themeBlocks(css).matchAll(/^\s*(--color-[a-z]+-\d+)\s*:/gm)].map((m) => m[1]);
        const seen = new Set();
        const duplicates = declared.filter((d) => (seen.has(d) ? true : (seen.add(d), false)));
        expect(duplicates).toEqual([]);
      });

      it("carries no value from the retired sage palette", () => {
        // Comments are stripped first: this file explains the regression it
        // guards against, and naming the hex is how it explains it.
        const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
        for (const hex of RETIRED) {
          expect(withoutComments.toUpperCase()).not.toContain(hex);
        }
      });
    });
  }

  it("no component re-pins the retired palette as an arbitrary value", () => {
    const offenders = [];
    for (const root of [dir("../src"), dir("../../AptusHire-Frontend/src")]) {
      for (const file of sourceFiles(root)) {
        const source = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
        for (const hex of RETIRED) {
          if (source.toUpperCase().includes(hex)) offenders.push(`${file} → ${hex}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  /**
   * THE GUARD THAT WAS MISSING.
   *
   * Ten call sites painted chart bars with `bg-chart-positive`,
   * `bg-chart-negative`, `bg-chart-brand` and `bg-chart-neutral`. No
   * `--color-chart-*` token was ever declared. Tailwind emits no rule for a
   * utility whose variable does not exist, so each of those classes was inert
   * and every one of those bars rendered with a transparent interior —
   * `grep -c chart-positive dist/assets/*.css` returned 0.
   *
   * Nothing failed. The build was clean, the JSX was correct, the class names
   * read plausibly, and a `<div>` with `width: 64%` and no background simply
   * shows nothing. It is the same failure mode as the duplicate `@theme` block
   * this file was originally written for: a colour decision that silently
   * evaluates to nothing at all.
   *
   * So: any `bg-|text-|ring-|border-|from-|to-|via-|fill-|stroke-` utility
   * naming a token family this project defines must name a token that EXISTS.
   */
  it("every themed colour utility names a token that is actually declared", () => {
    // Families this project owns. Tailwind's own built-in ramps (emerald, amber,
    // red, teal, slate…) are re-declared in index.css and are checked too;
    // families Tailwind ships that we never touch are not our problem here.
    const OWNED = /^(chart|verdict|brand|accent|canvas|hairline|rule)-/;
    const UTIL =
      /\b(?:bg|text|ring|border|from|to|via|fill|stroke|outline|decoration|divide|shadow|accent|caret)-((?:chart|verdict|brand|accent|canvas|hairline|rule)-[a-z0-9-]+?)(?:\/\d{1,3})?(?=["'\s`}]|$)/g;

    const offenders = [];
    for (const [app, root] of [
      ["admin", dir("../src")],
      ["user", dir("../../AptusHire-Frontend/src")],
    ]) {
      const declared = declaredColorTokens(SHEETS[app]);
      for (const file of sourceFiles(root)) {
        const source = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
        for (const m of source.matchAll(UTIL)) {
          const token = m[1];
          if (!OWNED.test(token)) continue;
          // `verdict-positive-tint` is a token; so is `brand-500`. Both are
          // matched whole, so a miss is a genuinely undeclared name.
          if (!declared.has(token)) offenders.push(`${file} → ${m[0]} (no --color-${token})`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

