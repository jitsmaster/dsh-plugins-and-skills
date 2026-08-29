# CONTEXT.md Format

## Structure

```md
# {Context Name}

{One or two sentence description of what this context is and why it exists.}

## Language

**Order**:
{One or two sentence description of the term}
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request
```

## Rules

- **Be opinionated.** Pick the best word for each concept; list others under `_Avoid_`.
- **Keep definitions tight.** One or two sentences max. Define what it IS, not what it does.
- **Only include project-specific terms.** General programming concepts don't belong.
- **Group under subheadings** when natural clusters emerge.

## Single vs multi-context repos

- **Single context:** one `CONTEXT.md` at the repo root.
- **Multiple contexts:** a `CONTEXT-MAP.md` at the root lists contexts, locations, and relationships.

The skill infers: if `CONTEXT-MAP.md` exists, read it; if only a root `CONTEXT.md`, single context; if neither, create a root `CONTEXT.md` lazily when the first term is resolved. When multiple contexts exist, infer which the current topic relates to — ask if unclear.
