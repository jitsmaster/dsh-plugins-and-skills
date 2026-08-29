---
name: writing-great-skills
description: Reference for writing and editing skills well — the vocabulary and principles that make a skill predictable.
disable-model-invocation: true
---

A skill exists to wrangle determinism out of a stochastic system. **Predictability** — the agent taking the same _process_ every run, not producing the same output — is the root virtue; every lever below serves it.

**Bold terms** are defined in [GLOSSARY.md](GLOSSARY.md).

## Invocation

- A **model-invoked** skill keeps a **description** so the agent can fire it autonomously and other skills can reach it. It contributes to **context load** — the description sits in the window every turn. Omit `disable-model-invocation`; write a model-facing description with rich trigger phrasing.
- A **user-invoked** skill strips the description from the agent's reach: only the user typing its name can invoke it. Set `disable-model-invocation: true`; the description becomes a human-facing one-line summary.

Pick model-invocation only when the agent must reach the skill on its own, or another skill must. When user-invoked skills multiply past what you can remember, cure the pile-up with a **router skill**.

## Writing the description

A model-invoked **description** states what the skill is and lists the **branches** that should trigger it. Every word increases **context load**, so prune hard:

- Front-load the skill's **leading word**.
- One trigger per branch — synonyms renaming a single branch are **duplication**.
- Cut identity already in the body; keep triggers plus any "when another skill needs…" reach clause.

## Information hierarchy

Two content types mix freely: **steps** (ordered actions; each ends on a **completion criterion** — checkable, and where it matters exhaustive) and **reference** (definitions/rules consulted on demand). Ranked:

1. In-skill step — primary tier.
2. In-skill reference — flat peer-sets are fine.
3. External reference — pushed out behind a **context pointer**, loaded only when the pointer fires.

A demanding completion criterion drives thorough **legwork**. **Progressive disclosure** moves material down the ladder; **co-location** keeps a concept's definition, rules, and caveats together.

## When to split

- **By invocation** — split off a model-invoked skill when it has a distinct **leading word** that should trigger it alone, or another skill must reach it.
- **By sequence** — split a run of steps when the steps ahead tempt the agent to rush the one in front (**premature completion**).

## Pruning

Keep each meaning in a **single source of truth**. Check every line for **relevance**. Then hunt **no-ops** sentence by sentence — delete the whole sentence when one fails, don't trim words.

## Leading words

A **leading word** is a compact concept already living in the model's pretraining (e.g. _lesson_, _fog of war_, _tracer bullets_). It anchors execution in the body and invocation in the description, in the fewest tokens. Hunt for restatements that leading words retire.

## Failure modes

- **Premature completion** — ending a step before it's done. Sharpen the completion criterion first; only then hide post-completion steps by splitting.
- **Duplication** — the same meaning in two places.
- **Sediment** — stale layers that settle because adding feels safe.
- **Sprawl** — a skill too long even when every line is live. Cure: disclose reference behind pointers, split by branch/sequence.
- **No-op** — a line the model obeys by default. The test: does it change behaviour versus the default?
- **Negation** — steering by prohibition backfires. Prompt the **positive**; keep prohibitions only as hard guardrails you can't phrase positively, paired with what to do instead.

## Verifying a change

An edited skill is a claim that a described problem no longer exists — a claim needs evidence.

- **Snapshot before, diff after.** Copy the file aside before editing; diff after. The diff is ground truth.
- **An independent reviewer closes the loop.** Hand the original problem — not just the diff — to a reviewer with no stake in the fix (a fresh `subagent` with no shared context) and ask it to re-verify against the file as it now stands.

A change is done only when the diff shows exactly the intended edit and the independent reviewer confirms the problem no longer reproduces and nothing else contradicts the fix.
