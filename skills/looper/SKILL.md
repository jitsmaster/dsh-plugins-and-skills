---
name: looper
description: >-
  Design and scaffold an agent "loop" — an unattended, scheduled, self-verifying
  agent workflow. Use this whenever the user wants to automate a recurring task,
  schedule an agent, run an agent unattended or overnight, set up monitoring,
  triage, or alerting, poll something on a cadence, or turn a manual repeated
  workflow into a self-running one — even if they never say the word "loop." If a
  request implies "do this every day / on a schedule / until some condition holds,
  without me typing each time," reach for this skill. It walks the seven-question
  blueprint, picks the simplest loop pattern, and scaffolds the six building blocks
  (schedule, isolation, skill, connectors, verifier, state) with a human-gate list
  and a budget.
---

# Looper

Guide the user through designing and scaffolding a **loop**: a small self-running system in which an agent finds work, acts, gets graded by a **separate** checker, and repeats until a verifiable condition holds or a budget runs out — without a human typing each turn.

## The one rule that runs through everything

**Durable knowledge → a skill. Changing state → memory.**

Conventions, commands, "how we decide done," rubrics → the loop's **own** SKILL.md (read-only each run).
What's been tried, what passed, what's still open → an external **state file** (read **and written** each run).

Putting mutable state inside a SKILL.md is the classic anti-pattern — skills are effectively read-only per run. Enforce this split in everything you generate.

## Why loops need this at all

The agent **starts cold every run** — it forgets everything between runs. So conventions, commands, and "what's already done" must live outside the context window, on disk. The agent forgets; the repo does not.

## Process

Work in three phases, in order: **elicit → select → scaffold.** Do not jump to scaffolding before the seven answers exist. Create a `todo_write` item per phase so nothing is skipped.

## Phase 1 — Elicit the seven decisions

Ask these **one at a time, in order.** Capture the answer before moving on. Don't accept vibes where a predicate is required.

1. **Goal (recursive).** "What verifiable condition means **done for now**?" Push for a checkable predicate. Bad: "keep the repo healthy." Good: "every P1 issue has an owner and a plan comment." If the answer is a vibe, ask "how would a script know it's true?"
2. **Trigger.** "What fires it — a schedule (cron), an event (new PR, inbound email), or run-until-done?"
3. **Discovery.** "How does the agent **find** work each cycle?" (query the tracker, scan the inbox, diff CI) → a connector.
4. **Action.** "What is it allowed to **do**, through which tools?" → connectors; note whether file work needs an isolated worktree.
5. **Verification.** "Who checks the result, and against what? It must be a **separate** checker — a program where one exists." → sub-agent or script.
6. **State / memory.** "Where does **what's done / what's open** persist outside the context — a markdown ledger, a board, issues?"
7. **Human gates.** "Which actions are irreversible or high-blast-radius and need a human approval first — merging, sending external email, spending, deleting?" This is non-negotiable (see Limitations).

Then capture two more that aren't optional:

**Knowledge → skill.** "What conventions should the loop **not** re-derive every run?" (build/test commands, review standards, "we don't do it that way").

**Budget / stop.** "What caps a run — max iterations, a token cap, wall-clock?"

## Phase 1.5 — Survey reusable capabilities

Before choosing a pattern, survey what already exists that can **serve a block** instead of being built from scratch.

**1.5a — Installed.** Scan the session's available skills / tool list for capabilities ready to use immediately (a verifier skill, a connector tool, a notify skill).

**1.5b — Prior art.** Use `web_search` for existing solutions if the block is generic ("MCP server for <tracker>", "CLI for <service>"). Confirm mechanics against the source before wiring in; name a **fallback** for anything you wire in ("use X; if unavailable, do Y") so a cold start still works.

Two rules when you recommend reuse, because an external skill is **changing** state you don't control:

1. **Name a fallback** for anything you wire in.
2. **Don't bind to unverified mechanics** — note the skill's name and that its behavior should be confirmed rather than assuming flags or outputs.

Surface the shortlist to the user and let them choose what to wire in.

## Phase 2 — Select the simplest fitting pattern

Recommend **one** pattern. Default to ReAct + deterministic verifier and justify any escalation.

| If… | Pattern |
|-----|---------|
| One workstream; "done" is a program-checkable predicate | **ReAct + deterministic verifier** (default) |
| Clear criteria that need **judgement**, not just a script | **Evaluator–optimizer** |
| Work genuinely parallelizes into independent subtasks | **Orchestrator–workers** |
| You want a crude baseline / teaching loop | **Ralph** |

**Prefer the simplest pattern that works, and compose blocks rather than reaching for a heavy framework you can't debug.**

## Phase 3 — Scaffold the six building blocks

### 3a. Emit the populated fill-in template

Show the user this template filled with their answers — the contract before any files are written:

```
GOAL (verifiable): ____
TRIGGER: schedule | event | run-until-done → ____
DISCOVERY (find work): ____ (connector: ____)
ACTION (do work): ____ (tools: ____ ; isolation: worktree? y/n)
VERIFY (separate check): ____ (deterministic? y/n)
REUSE (installed): ____ (skill/tool → block it serves ; fallback: ____)
STATE (persist outside): ____ (file | board | issues)
HUMAN GATES: ____ (irreversible actions list)
KNOWLEDGE → skill: ____ (conventions the loop should not re-derive)
BUDGET / stop: ____ (max iterations | token cap | wall-clock)
```

### 3b. Scaffold the six building blocks

| # | Block | What you write | Durable or changing |
|---|-------|---------------|---------------------|
| 1 | **Scheduling** | A trigger stub (cron line / background job / run-until-done goal) | durable |
| 2 | **Isolation** | A note/command for git worktrees **if** file work runs in parallel | durable |
| 3 | **Skill** | The loop's **own** SKILL.md, installed under `~/.agents/skills/<loop-name>/` — conventions only | **durable** |
| 4 | **Connectors** | Named tools/CLIs for discovery + action | durable |
| 5 | **Verifier** | A **separate** check — a shell script or a `subagent` | durable |
| 6 | **State** | STATE.md ledger in `loops/<loop-name>/` — what's done / open | **changing** |

Concretely, write:

**`~/.agents/skills/<loop-name>/SKILL.md`** — the loop's own skill: its goal, conventions, the pattern it uses, how to run it, and what "done" means. **Conventions only — never progress.**

**`loops/<loop-name>/STATE.md`** — a ledger the loop reads and writes each run: a table of items with status, plus "last run" notes. The changing half; keep it out of the skill.

**A verifier script** — a shell script wired to the user's predicate (e.g. `test -z "$(gh issue list --state open --json number --jq '.[] | select(.number <= 5)')"`). The verifier must be **separate** from the generator and deterministic where possible.

**A trigger stub** — how the loop is **launched**. Match the launcher to the trigger type from Q2 — don't default everything to a schedule:

- **Run-until-done / on-demand** (you start it when there's new input): launch it directly in the session and let it self-terminate at the goal. **No schedule** — the trigger is **you**.
- **Scheduled** (a cadence): a cron line (`0 8 * * 1-5`) that opens a fresh agent session and runs the loop's skill by name; or a background `bash` job for simple intervals.
- **Event-driven** (fire when something appears): a loop can't **listen** for events. Either **(a) poll** — a low-frequency scheduled run that checks a queue/inbox and runs only when there's new work — or **(b) a real external launcher** (a git hook, CI/webhook, file-watcher) that invokes the loop when the event fires.

**HUMAN-GATES.md** — the irreversible-actions list **and** the budget/stop condition, together. Mandatory.

### 3c. Always emit human gates + a budget

A loop with no budget and no gates is the failure mode, not the goal. HUMAN-GATES.md must contain:

**Human gates:** every irreversible / high-blast-radius action that requires human approval before execution — merging, sending external email/messages, spending money, deleting, publishing. The loop must never cross these autonomously. If the user named none, challenge it.

**Budget / stop condition:** max iterations, token cap, or wall-clock — whichever the user chose.

Refuse to call the loop "done" if either is missing.

## Worked example

A morning triage loop (ReAct + deterministic · scheduled · soft gate):

```
GOAL (verifiable): zero P1 issues without an assignee AND a plan comment
TRIGGER: schedule → every weekday 08:00 (cron "0 8 * * 1-5")
DISCOVERY (find work): list open P1 issues (connector: gh CLI)
ACTION (do work): assign an owner, post an initial plan comment (tools: gh)
VERIFY (separate check): re-query, assert no P1 lacks assignee (deterministic? y → scripts/verify_no_p1_unassigned.sh)
REUSE (installed): gh CLI → connector; fallback: GitHub web UI via curl
STATE (persist outside): loops/triage/STATE.md — issues triaged this week
HUMAN GATES: none auto-closes; escalate (don't close) anything ambiguous
KNOWLEDGE → skill: label taxonomy, what a "plan comment" must contain
BUDGET / stop: max 25 issues/run; stop when verifier passes or cap hit
```

Pattern: ReAct + deterministic verifier (one workstream, program-checkable goal). Comments and labels are reversible, so no hard gate — but the **budget** and the **escalate-don't-close** rule still ship.

## Output discipline checklist

Before declaring the loop scaffolded, confirm:

- [ ] All seven decisions answered; goal is a checkable predicate.
- [ ] Installed capabilities surveyed (1.5a).
- [ ] Prior art searched (1.5b); entries surfaced or "none applicable — <why>" recorded.
- [ ] Anything wired in has a named fallback.
- [ ] One pattern chosen and justified.
- [ ] Populated template shown to the user.
- [ ] Six blocks scaffolded as files in the loop folder.
- [ ] A **separate** verifier exists (script or sub-agent), deterministic if possible.
- [ ] An **external state file** exists — no mutable state lives in any SKILL.md.
- [ ] HUMAN-GATES.md lists irreversible actions **and** a budget/stop condition.

## Limitations to bake in (not disclaimers)

**Prompt injection is unsolved.** A loop that reads issues, emails, or web content ingests untrusted text every cycle. The durable control is a permanent **human gate on irreversible actions** — never let the loop merge/send/spend/delete autonomously.

**Verification is the hard part.** Autonomy is only as trustworthy as the checker. Favor deterministic verifiers; keep checker separate from maker; distrust a passing self-grade.

**Token economics swing wildly.** Cadence, fan-out, and retries dominate cost. Set explicit budgets and dynamic intervals.

**Most of "agentic" is plumbing.** The discipline is in the guardrails around the decision, not in the decision being magic.
