---
name: smart-commit
description: Use when asked to commit changes — splits them into ordered commits by layer (server before client), stages each batch explicitly, and prefixes messages with feat/fix
---

# Smart Commit

## Exception to project no-commit rules

Some projects' `AGENTS.md` say "never run `git commit`." That rule exists to stop *unprompted* commits during ordinary edits — it does not apply when the user has explicitly invoked this skill. Invoking this skill IS the explicit instruction; proceed through Step 3d and actually run `git commit` for each batch.

## Overview

Survey all uncommitted changes, group them into ordered batches by layer, then for each batch: stage the files, read the staged diff, craft a `feat:`/`fix:` message, and commit. Repeat until all changes are committed. Pushing is left to the user as a separate, explicit action.

## Shell

Run every command in this skill through the `bash` tool.

---

## Step 1: Survey the Working Tree

Run these one at a time — issuing them concurrently races git's index lock and can hang the batch:

```bash
git status                  # all modified/untracked files
git diff                    # unstaged content
git diff --staged           # staged content (should be empty at start)
git log --oneline -8        # project commit style reference
```

---

## Step 2: Plan the Batches

### Determine which layers have changes

- **Server**: backend code (e.g. `api/`, `server/`, `backend/` — whichever the repo uses)
- **Client**: frontend code (e.g. `client/`, `web/`, `frontend/`)

Read the repo layout first; don't assume paths. If there is no clear server/client split, fall back to one commit per logical change group ordered by dependency (foundation first).

### Commit order (server always before client)

**Server batches** — group by subsystem, dependencies first:
- S1 — services/logic + their tests
- S2 — controllers/routes + their tests
- S3 — models/dto/types and any remaining server files (include with S1 if they are prerequisites)

**Client batches:**
- C1 — state (actions/reducers/selectors/effects/store) + their tests
- C2 — services + their tests
- C3 — components/views + their tests

### Test file pairing rule

A test file **always commits in the same batch** as the file it tests (match by filename). If a test has no changed source counterpart, commit it in whichever batch its nearest source file belongs to.

### Skip empty batches

If a batch has no changed files, skip it and proceed.

---

## Step 3: For Each Batch — Stage → Inspect → Commit

### 3a. Stage the batch's files

```bash
git add <file1> <file2> ...
```

**Never** `git add -A` or `git add .` — always name specific files.

### 3b. Read the staged diff and analyze

```bash
git diff --staged
```

**Classify the type:**
- **`feat`** — new behavior, new method, new endpoint, new feature
- **`fix`** — corrects existing behavior, fixes a wrong value, resolves a broken flow

**If the user provided context when invoking** — a type, a description, notes — treat it as authoritative: use their stated type, seed subject and body from their intent, improve grammar and specificity, but preserve meaning. Otherwise classify from the diff.

**Analyze for rationale:** for each changed file, identify what changed (method, property, rule, etc.) and *why* — the problem it solves or behavior it enables.

### 3c. Craft the commit message

**Format — subject + body:**

```
feat: Adds scheduling support to ABTestService

- ABTestService.schedule(): new method that writes a scheduledAt date and
  transitions status to 'scheduled', needed for the timed launch flow
- CreateABTestDto: adds optional scheduledAt field with validation
```

**Subject line rules:**
- Imperative, capital first word: `Adds`, `Fixes`, `Removes`, `Extracts`, `Corrects`
- No trailing period; ≤72 characters
- Specific: not `Updates component` but `Adds retry button to save error state`
- When both feat and fix are present, use two subject lines (`feat: ...` and `fix: ...`)

**Body rules:**
- 1–4 bullet points, each on its own line starting with `- `
- Each bullet names the specific thing changed and states **why**
- Skip trivial changes (whitespace-only, rename with no semantic shift)

### 3d. Commit

Write the composed message to a scratch file, then commit from it:

```bash
git commit -F <scratch-file>
```

Do not run `git status` after each batch — a single final verify happens in Step 4.

---

## Step 4: Final Verify

After the last batch, run a single `git status` to confirm nothing is left staged or uncommitted. Then report the local commit SHAs and stop. Do not push — the user runs `git push` themselves when ready.

## Hook Failures

Never use `--no-verify`. Fix the underlying issue (lint error, type error, failing test) and retry, or report and stop if it can't be fixed.
