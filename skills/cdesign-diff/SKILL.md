---
name: cdesign-diff
description: Use when asked to check a claude.ai/design shared URL, compare a component's HTML/CSS against a Claude Design spec, verify design implementation accuracy, or locate a specific component within a Claude Design output.
---

# Claude Design Review

## Overview
Fetch a Claude Design from a `claude.ai/design` shared URL, extract its HTML/CSS, locate the relevant component within it, and diff it against the real implementation template and styles.

## When to Use
- "Check this Claude Design URL"
- "Does this component match the design?"
- "Where is X in the design?"
- "What does the design spec say for this component?"

## Step 1 — Load the Design URL

Claude Design pages are React/SPA apps — a plain fetch returns the shell HTML before content renders. Drive a real browser through the `bash` tool with Playwright (install once: `npm i -D playwright && npx playwright install chromium`), saving a full-page screenshot and the rendered DOM:

```bash
node -e '
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("https://claude.ai/design/...", { waitUntil: "networkidle" });
  await page.waitForSelector("body");
  await page.screenshot({ path: "/tmp/design.png", fullPage: true });
  const html = await page.content();
  require("fs").writeFileSync("/tmp/design.html", html);
  await browser.close();
})();
'
```

Then `read_image` on `/tmp/design.png` to see the rendered design, and `grep`/parse `/tmp/design.html` for the component markup.

## Step 2 — Capture a Visual Reference

The full-page screenshot is your ground truth for the visual comparison. If the design has multiple screens or states (tabs, sidebar nav), click through each and screenshot each state (add `page.click` steps to the script and re-screenshot).

## Step 3 — Extract the Design Markup

From the saved HTML, locate the component's section. For actual CSS values, evaluate computed styles in the same script:

```js
const styles = await page.evaluate(() => {
  const el = document.querySelector(".your-component-selector");
  const s = window.getComputedStyle(el);
  return { fontSize: s.fontSize, color: s.color, backgroundColor: s.backgroundColor, padding: s.padding, gap: s.gap };
});
```

## Step 4 — Locate a Specific Component

1. **By visual label**: search the saved HTML / accessibility snapshot for the component name or a nearby heading.
2. **By selector**: look for semantic class names (`.card`, `.header`, `.button-group`).
3. **By scroll position**: if the design has multiple sections, `window.scrollTo` and re-screenshot.

## Step 5 — Read the Implementation

Find the real component files in the repo — template, styles, and script. Locate them with `glob`/awareness of the repo layout (e.g. `**/components/<name>/**`) rather than assuming paths. Read them in full before comparing.

## Step 6 — Compare and Report

Check these dimensions:

| Dimension | What to check |
|---|---|
| **Layout** | flex/grid direction, alignment, gap values |
| **Spacing** | padding and margin vs design |
| **Typography** | `font-size`, `font-weight`, `line-height` |
| **Color** | background, text, border — match to CSS variables |
| **Sizing** | explicit width/height/min/max |
| **States** | hover, focus, active, disabled styles present |
| **Element order** | DOM order matches design left-to-right / top-to-bottom |

Report as a diff table:

| Property | Design spec | Implementation | Action |
|---|---|---|---|
| Title `font-size` | `24px` | `1.25rem` (20px) | Fix to `1.5rem` |
| Card `gap` | `16px` | `gap: 1rem` ✓ | OK |
| Hover background | `#F5F5F5` | not set | Add |
| Focus ring | `2px solid blue` | missing | Add (WCAG) |

Flag missing interactive states (hover, focus, disabled) as a separate block — they are usually omitted rather than wrong.

## Common Pitfalls

| Pitfall | Fix |
|---|---|
| Page not fully rendered | Wait for a visible heading (`waitForSelector`) before screenshot |
| Computed color is `rgb(...)` not hex | Convert: `rgb(245,245,245)` → `#F5F5F5` |
| Design uses px, implementation uses rem | Convert to one unit (base 16px) before comparing |
| Multiple breakpoints | Resize the viewport and re-screenshot each |
| Token names differ | Map by value, not by name |
