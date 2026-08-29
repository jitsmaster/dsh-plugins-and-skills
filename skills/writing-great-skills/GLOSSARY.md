# Glossary — Building Great Skills

The domain model for what makes a skill great. A skill exists to wrangle determinism out of a stochastic system; the root virtue is **Predictability**, and every term below is a lever on it. This is the disclosed reference for [`writing-great-skills`](SKILL.md).

Terms are grouped by axis: **Invocation**, **Information Hierarchy**, **Steering**, and **Pruning**. Each **failure mode** lives beside the lever that cures it.

**Bold terms** in any definition are themselves defined here.

## Predictability

The degree to which a skill makes the agent behave the same _way_ on every run — the same process, not the same output. The root virtue every other term serves; cost and maintainability are symptoms of it, not rivals.

_Avoid_: consistency, reliability, robustness, output-determinism

## Invocation

### Model-Invoked

A skill that keeps its **description**, so the agent can see it and fire it autonomously — and the human can still type its name. Pays a permanent **context load**. Reachable by other skills. Pick it only when the agent must reach the skill on its own; otherwise drop the description.

_Avoid_: ability, tool, capability

### User-Invoked

A skill with its **description** stripped — invisible to the agent, reachable only by the human typing its name. Trades discoverability for zero **context load**. Nothing but the human can reach it.

_Avoid_: procedure, workflow, command

### Description

The skill's machine-readable trigger, and the one **context pointer** a **model-invoked** skill keeps loaded at all times. Its presence _is_ the invocation axis.

_Avoid_: frontmatter, summary

### Context Pointer

A reference held in the agent's context that names out-of-context material and encodes the condition for reaching it. Its wording, not the target, decides when and how reliably the agent reaches. A must-have target behind a weakly worded pointer is a variance bug.

_Avoid_: link, reference, import

### Context Load

The cost a **model-invoked** skill imposes — its **description**, always loaded, spending tokens and attention.

_Avoid_: token cost, context bloat

### Cognitive Load

The cost a **user-invoked** skill imposes on the human — what they must remember: which skills exist and when to reach for each. The price of human agency.

_Avoid_: human index, burden, overhead

### Router Skill

A **user-invoked** skill that points at other user-invoked skills — naming each and when to reach for it. It can only hint, never fire them. The cure for **cognitive load**.

_Avoid_: dispatcher, menu, registry, index

### Granularity

How finely you divide skills. Finer division spends one of the two loads. Two cuts: by **invocation** (split off a model-invoked skill with a distinct **leading word**) and by **sequence** (split a run of **steps** whose **post-completion steps** need hiding).

_Avoid_: chunking, modularity

## Information Hierarchy

### Information Hierarchy

A skill's content ranked by how immediately the agent needs it: **steps** (in-file, primary), **reference** in-file (secondary), **reference** disclosed behind a **context pointer**. A skill with no steps uses just the bottom two rungs — a fine arrangement.

_Avoid_: structure, organization, layout

### Steps

The ordered actions the agent performs — when present, the primary tier. Every step ends on a **completion criterion**.

_Avoid_: workflow, instructions, choreography

### Reference

Material the agent refers to on demand. Secondary to **steps** when steps exist; otherwise the entire content. Prime candidate for **progressive disclosure**.

_Avoid_: supporting material, docs, background

### External Reference

**Reference** living outside the skill system — a plain file, not invocable — that any skill can point at. The only shared home two **user-invoked** skills can use.

_Avoid_: doc, resource, knowledge base

### Progressive Disclosure

Moving **reference** down the ladder behind a **context pointer** so the top stays legible. Licensed by **branching**: disclose what only some branches need, inline what every path needs.

_Avoid_: lazy loading, chunking

### Co-location

Keeping material the agent needs at once in one place — definition, rules, and caveats under a single heading. The within-file companion to the **Information Hierarchy**.

_Avoid_: grouping, clustering, cohesion

### Sprawl

_Failure mode._ A skill too long, independent of staleness or repetition. The cure is the **information hierarchy**: disclose reference, split by branch/sequence.

_Avoid_: bloat, length, size, verbosity

## Steering

### Branch

A distinct way a skill can be invoked — so different runs take different paths through it.

_Avoid_: path, case, fork

### Leading Word

A compact concept already living in the model's pretraining (a _Leitwort_) that the agent thinks with while running the skill — e.g. _lesson_, _fog of war_, _tracer bullets_. Repeated as a token, it anchors behaviour with priors the model already holds. Coining your own works only if you define it clearly.

_Avoid_: keyword, term, motif

### Completion Criterion

The condition that tells the agent a unit of work is done. Its **clarity** resists **premature completion**; its **demand** sets **legwork**. The strongest criteria are both checkable and exhaustive.

_Avoid_: done condition, exit condition, stopping rule

### Legwork

The work an agent does behind the scenes within a single step — reading, exploring, digging — latent in wording, controlled by the agent. Raised by a **leading word** or a demanding **completion criterion**.

_Avoid_: scope, effort, diligence, coverage

### Post-Completion Steps

The **steps** following the current one. Visible, they pull the agent forward into **premature completion**; the defence is hiding them by splitting the sequence.

_Avoid_: horizon, fog of war, lookahead

### Premature Completion

_Failure mode._ Ending the current step before it's genuinely done, attention slipping to _being done_. A tug-of-war between visible **post-completion steps** (pull) and the **completion criterion**'s clarity (resistance). Defences in order: sharpen the bound first; hide later steps only if it's irreducibly fuzzy and you observe the rush.

_Avoid_: premature closure, the rush, shortcutting

### Negation

_Failure mode._ Steering by prohibition drags the forbidden behaviour into context. Cure: prompt the **positive**. A prohibition earns its place only as a hard guardrail paired with the positive target.

_Avoid_: ironic rebound, don't-prompting, the pink elephant

## Pruning

### Single Source of Truth

Each meaning in exactly one authoritative place. **Duplication** is its violation.

_Avoid_: home, canonical location

### Duplication

_Failure mode._ The same meaning given more than one **single source of truth**. Costs maintenance, tokens, and inflates prominence.

_Avoid_: repetition, redundancy

### Relevance

Whether a line still bears on what the skill does. Distinct from **no-op**: relevance asks whether a line bears on the task, not whether it changes behaviour.

_Avoid_: load-bearing, staleness, freshness

### Sediment

_Failure mode._ Stale layers that settle because adding feels safe and removing feels risky. The default fate of any skill without a pruning discipline.

_Avoid_: accretion, bloat, cruft, rot

### No-Op

_Failure mode._ An instruction that changes nothing because the model already does it by default. The test: does a line change behaviour versus the default? Model-relative, not reader-relative.

_Avoid_: redundant instruction, restating the obvious, belaboring
