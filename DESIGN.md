---
name: AptusHire original admin
description: The user's Recruitment-AI admin design, carried into the current recruiter workflows.
colors:
  forest: "#0E3B2E"
  lime: "#7CDE4A"
  teal: "#12B98A"
  ink: "#0C1F1B"
  paper: "#FAFCF8"
  cream: "#F3F7F1"
  white: "#FFFFFF"
  hairline: "#E3EBE4"
  rule: "#F0F4EF"
  slate: "#5B6B63"
typography:
  display:
    fontFamily: "Lexend, Inter, system-ui, sans-serif"
    fontWeight: 700
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12.5px"
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "11.5px"
  numeric:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    letterSpacing: "-0.03em"
rounded:
  control: "8px"
  container: "12px"
spacing:
  row: "12px"
  panel: "18px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    height: "32px"
  card:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.container}"
---

# Design System: AptusHire original admin

## Overview

**Creative North Star: "AptusHire Flow"**

The authority is the user's existing `Recruitment-AI/admin/src` design, not the replaced HiringAnt/gray styling. This is a dense operating interface for scanning applications, checking evidence and choosing the next action.

## Colors

Forest carries primary actions; lime and teal retain the original brand identity. Paper surrounds white panels. Hairlines define panels and quieter rules divide their rows. Green, amber and red retain outcome/pending/error meaning rather than being interchangeable decoration. Full ramps live in `src/index.css`.

## Typography

Inter is the reading face and Lexend the display face. The original compact scale distinguishes body (12.5px), captions (11.5px) and row titles (13.5px). Use tabular monospace for figures, not prose. Do not reintroduce global browser zoom or oversized dashboard greetings.

## Layout

The original shell uses a 236px sidebar, collapsing to 64px, and a wrapping top bar. Below the large breakpoint, navigation is a focus-trapped drawer. Lists use bordered header/row compositions. Stat grids fit the available width instead of assuming one fixed column count. Preserve the current mobile pipeline's minimum content height and independently scrolling columns.

## Elevation & Depth

Borders carry ordinary cards. Reserve lifted shadows for menus and dialogs. Preserve the original hover and focus treatments; do not add a universal shadow to every control or panel.

## Shapes

Controls have restrained corners; cards and containers use the original rounded geometry. Compact status badges use small rectangular corners. Do not globally override every radius utility.

## Components

Use the restored `Button`, `Card`, `StatCard`, `StatGrid`, `CardHeader`, `Panels`, `Field`, `PageHeader`, `Modal`, `Menu` and report primitives. New controls use these same tokens. Buttons retain loading and disabled states; fields retain associated labels and errors; dialogs retain Escape, focus trapping and focus restoration. Filter chips retain their tested overflow behavior.

## Do's and Don'ts

- Do borrow the original component or layout before introducing a new visual pattern.
- Do adapt presentation around the current server-backed workflows.
- Do keep missing, degraded and pending evidence distinguishable from completed work.
- Don't overwrite authentication, API clients or environment configuration to restore a design.
- Don't replace real pagination or totals with old in-memory approximations.
- Don't claim every old layout is copied byte-for-byte: candidate and dashboard compositions retain current workflow requirements.


## Authenticated workspace refinement ? 10 September 2026

The admin navigation refinement evolves the restored design above. Inside `.admin-workspace`, use 14px Inter interface text, 12px metadata, 24px Lexend page headings, tabular Inter figures, a #F5F7F6 canvas and #DEE5E1 borders. Forest #0E3B2E remains the primary accent. White panels use 10px corners; controls use 8px. These scoped tokens supersede the earlier compact values for authenticated recruiting pages only.

Use the grouped, sticky 236px navigation rail (64px collapsed), route breadcrumbs and Ctrl/Cmd+K workspace search. Home owns the greeting. Jobs defaults to a semantic table with a retained card option; candidate records use the shared table primitives. Settings uses URL-linked sections with a shared draft and save bar. Preserve server pagination, candidate return context and the distinction between measured scores and absent evidence. Do not introduce unavailable product destinations to populate navigation.

See `docs-updates/admin-navigation-refinement-2026-09-10.md` for the assessment, implementation and validation limits.
