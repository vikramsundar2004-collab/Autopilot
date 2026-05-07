# Design System - Autopilot Browser

## Product Context
- **What this is:** An AI-powered Chromium desktop browser focused on calm tab handling, work extraction, and reviewable AI output.
- **Who it's for:** People who want one browser workspace for research, coding, email tasks, documents, slides, and design work.
- **Project type:** Desktop app, browser chrome, workspace sidebars, AI review surfaces, settings surface.

## Aesthetic Direction
- **Direction:** Cozy, focused, capable.
- **Mood:** Warm parchment surfaces, forest green actions, and clear browser hierarchy.
- **Reference:** User-provided Figma Make design and screenshot with Study Planner colors.

## Typography
- **Display:** Fraunces, used sparingly for the Autopilot brand and page headings.
- **Body/UI:** DM Sans for browser controls, labels, and settings.
- **Scale:** 12, 13, 14, 16, 18, 22, 30, 40.

## Color
- **Background:** `#f4ebdd`, parchment app atmosphere.
- **Surface:** `#fff9ef`, ivory panels and controls.
- **Surface 2:** `#efe1cb`, sand inactive tabs and secondary controls.
- **Primary:** `#1f4a37`, forest green for active commands.
- **Primary hover:** `#173929`.
- **Sage:** `#b8c7a8`.
- **Sage muted:** `#dce5d1`.
- **Clay:** `#a97955`, warm secondary accent.
- **Text:** `#33271f`.
- **Muted text:** `#7b6858`.
- **Border:** `#e2d2bb`.
- **Danger:** `#9d3b2f`.
- **Focus:** `#2f6b4f`.

## Spacing
- **Base unit:** 4px.
- **Density:** Comfortable but functional.
- **Scale:** 4, 8, 12, 16, 20, 24, 32, 48.

## Layout
- **Approach:** Browser-first workspace, not a marketing page or generic dashboard.
- **Desktop:** Thin workspace rail, browser-owned sidebar, top toolbar, then a large neutral web content workspace.
- **Narrow:** Tabs remain scrollable, toolbar wraps cleanly, settings becomes single-column.
- **Radius:** 8px for panels, 12px for controls, 18px for tabs/pills.

## AI Workflow
- **Pattern:** Generate → Preview → Approve / Edit / Reject.
- **Source clarity:** Every assistant surface should show what context is shared before the model runs.
- **Manual vs AI:** Manual file edits and artifact edits stay distinct from AI-generated revisions.
- **Ownership:** Productivity tasks should clearly say whether AI can prepare the work or the user must handle it.

## Motion
- **Approach:** Minimal-functional.
- **Duration:** 120ms for controls, 180ms for panels.
- **Easing:** `cubic-bezier(.2, .8, .2, 1)`.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-25 | Electron plus Vite React | Electron supplies Chromium, React keeps browser chrome stateful and testable. |
| 2026-04-25 | WebContentsView for page content | Main-owned web contents are a stronger browser foundation than renderer webviews. |
| 2026-04-25 | Settings changes CSS variables live | The user asked to change colors, live preview keeps that direct and reversible. |
