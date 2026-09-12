import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import Button from "../src/components/ui/Button.jsx";
import { Badge, StatCard } from "../src/components/ui/Card.jsx";

const read = file => readFileSync(resolve(process.cwd(), "src", file), "utf8");

describe("original Recruitment-AI admin design contract", () => {
  it("uses the original typography without forced browser zoom", () => {
    const css = read("index.css");
    expect(css).toContain('--font-display: "Lexend", "Inter"');
    expect(css).toContain('--aptus-forest: #0E3B2E');
    expect(css).toContain('--aptus-lime: #7CDE4A');
    expect(css).not.toMatch(/\bzoom\s*:/);
    expect(css).not.toContain('#176B45');
  });
  it("keeps the original compact primary button and loading safety", () => {
    render(<Button loading>Save review</Button>);
    const button = screen.getByRole("button", { name: "Save review" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("bg-brand-800", "h-8", "tap-target");
  });
  it("keeps newer variant names working within the original palette", () => {
    render(<Button variant="gold" size="xs">Continue</Button>);
    expect(screen.getByRole("button", {name:"Continue"})).toHaveClass("bg-brand-400", "h-7");
  });
  it("keeps compact captions and pending statuses readable", () => {
    render(<><StatCard label="Applications" value={3} note="All roles" /><Badge tone="amber">Needs review</Badge></>);
    expect(screen.getByText("All roles")).toHaveClass("text-slate-500");
    expect(screen.getByText("Needs review")).toHaveClass("text-amber-700");
  });
  it("restores the original sidebar without reviving unbounded candidate loading", () => {
    const shell = read("components/dashboard/DashboardShell.jsx");
    expect(shell).toContain('w-[236px]');
    expect(shell).toContain('<CompanyDataProvider includeCandidates={false}>');
    expect(shell).not.toContain('allCandidates.length');
    expect(shell).toContain('label: "Screening reviews"');
  });
});
