---
name: domain-modeling
description: Build and sharpen a project's domain model. Use when the user wants to pin down domain terminology or a ubiquitous language, record an architectural decision, or when another skill needs to maintain the domain model.
---

# Domain Modeling

Actively build and sharpen the project's domain model as you design — challenge terms, invent edge-case scenarios, and write the glossary and decisions down the moment they crystallise. (Merely *reading* `CONTEXT.md` for vocabulary is not this skill; this is for when you're changing the model.)

## File structure

Most repos have a single context:

```
/
├── CONTEXT.md
├── docs/
│   └── adr/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

If a `CONTEXT-MAP.md` exists at the root, the repo has multiple contexts; the map points to where each lives. Create files lazily — only when you have something to write.

## During the session

1. **Challenge against the glossary** — when the user uses a term that conflicts with existing language in `CONTEXT.md`, call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"
2. **Sharpen fuzzy language** — propose a precise canonical term for vague or overloaded words. "You're saying 'account' — do you mean the Customer or the User?"
3. **Discuss concrete scenarios** — stress-test domain relationships with invented edge cases that force precise boundaries.
4. **Cross-reference with code** — check whether the code agrees with what the user states; surface contradictions.
5. **Update CONTEXT.md inline** — when a term is resolved, capture it immediately using [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md). `CONTEXT.md` is a glossary and nothing else — no implementation details, no scratch pad, no spec.
6. **Offer ADRs sparingly** — only when all three hold: hard to reverse, surprising without context, and the result of a real trade-off. Use [ADR-FORMAT.md](./ADR-FORMAT.md).
