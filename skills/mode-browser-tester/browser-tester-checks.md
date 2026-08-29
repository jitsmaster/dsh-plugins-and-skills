# Browser Tester — Anomaly Taxonomy & Findings Schema

Disclosed reference for `SKILL.md`. Read this when Task 4 needs the anomaly taxonomy, or Task 5 needs the findings-table schema.

---

## Anomaly Taxonomy (Task 4)

### Display Anomalies
- Layout breaks or misalignments
- Missing, incorrect, or unexpected UI elements
- Incorrect data rendered (wrong value, stale value, wrong formatting)
- Loading states that do not resolve
- Style or visual regressions vs. the expected behavior in the test plan

### Console / Network / State Anomalies
- JavaScript errors (`error`-level entries from `browser_console_messages`)
- Unhandled promise rejections
- Network request failures — 4xx or 5xx responses (`browser_network_requests`)
- Redux/NgRx state errors or warnings (selector returning `undefined`, action dispatched with no matching reducer case, effect throwing)
- React/Angular framework warnings (e.g. missing `trackBy`, binding to an undefined property, change-detection errors)

A **snack error** (the red/pink Angular Material toast with a "Dismiss" button) counts as a display anomaly — detect it the same way `ctnp-navigator` does: scan the accessibility tree for an `alert` role element containing a "Dismiss" button. Do not dismiss it; leave it visible for the screenshot.

---

## Findings Report Schema (Task 5)

One row per finding, in this exact column order:

| Column | Description |
|---|---|
| **Finding ID** | Unique identifier for the finding (e.g. `F-01`) |
| **Test Case ID** | Associated test case from the approved test plan |
| **Severity** | Critical / High / Medium / Low — see Severity Levels in `SKILL.md` |
| **Anomaly Type** | Display Issue / Console Error / Network Error / State Error |
| **Description** | Clear human-readable description of the issue |
| **Steps to Reproduce** | Exact steps that triggered the issue |
| **Expected Behavior** | What should have happened, per the test plan |
| **Actual Behavior** | What actually happened |
| **Screenshot Reference** | Path to the captured screenshot (`.visual-qa/screenshots/tc-{id}-step-{n}.png`) |
| **Suspected UI Component** | Component name(s) likely responsible |
| **Suspected State / Hook** | Local state, context, or hook likely involved |
| **Suspected NgRx Redux Pieces** | Slice name, action, selector, or reducer likely involved |
| **Associated Server-Side API** | Endpoint or service call related to the issue (if applicable) |
| **Raw Error Message** | Exact console error or log output (if applicable) |

Sort the compiled table by Severity (Critical first). Every finding must be self-contained — an agent with no other context should be able to locate, diagnose, and fix it from this row alone.
