---
name: playwright-login-and-test
description: Use when starting any browser testing or exploration session in a local app — handles authentication with given credentials and guides stable interaction patterns via a Playwright browser driven from the bash tool
---

# Playwright Login and Test

## Overview

Authenticate into a local app via a real browser driven from the `bash` tool (Playwright), then interactively follow user instructions for navigation and testing. Always verify rendering stability before acting or reporting.

## Prerequisites: Playwright

If Playwright isn't installed, set it up once:

```bash
npm i -D playwright && npx playwright install chromium
```

Then drive the browser with small `node -e` scripts that take a screenshot and print an accessibility-ish snapshot of the page:

```bash
node -e '
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("http://localhost:PORT", { waitUntil: "networkidle" });
  // ...interaction steps...
  await page.screenshot({ path: "/tmp/page.png", fullPage: true });
  console.log(await page.content());
  await browser.close();
})();
'
```

Use `read_image` on the saved screenshot to see the actual page state before reporting or acting.

## Login

Use the credentials the user provides (or the app's documented defaults). Don't guess selectors — print the page content or use `getByLabel`/`getByRole` in the script. After login, screenshot to confirm the redirect/landing state.

## Waiting for Rendering to Stabilize

**ALWAYS** do this after every navigation or action — never skip:

1. Screenshot — observe current state
2. Check for: loading spinners, skeleton screens, "Loading..." text, progress bars
3. If loading indicators are visible → wait, then screenshot again
4. Repeat until the page appears fully rendered
5. Only then report or proceed with the next action

**Red flag:** Reporting on a page state without a confirming screenshot = likely reporting stale state.

## Interactive Testing Loop

After login, for each user instruction:

1. Screenshot current state
2. If you need to locate an element, print the page content / accessibility snapshot
3. Perform the requested action (add it to the script and re-run)
4. Wait for rendering to stabilize (see above)
5. Screenshot the result
6. Report what you observe and await the next instruction

## Common Mistakes

| Mistake | Fix |
|---|---|
| Clicking before the page settles | Always screenshot + check for spinners first |
| Reporting without confirming | Take a screenshot, then report |
| Stale selectors | Re-snapshot after navigation to get fresh DOM |
| Typing into the wrong field | Confirm which element has focus first |
