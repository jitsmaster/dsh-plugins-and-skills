---
name: app-brief
description: Turn a rough app/feature idea into a structured brief — what it does, who it's for, what problem it solves, what material it draws on, and what ships — ready to hand to brainstorming or an implementation skill.
disable-model-invocation: true
---

# App Brief

A **brief** pins down an app or feature idea before any implementation skill touches it: what, who, why, source material, deliverables. Skip straight to code and any one of the five stays implicit — implicit assumptions are where features drift from what the user meant.

## Steps

1. **Ask the five questions in one message**, plain text:
   - What will it do?
   - Who will use it?
   - What problem does it solve?
   - What material should it be based on — a specific article/spec the user provides, or should you research it?
   - What are the deliverables (code, doc, design, all three)?

   *Done when:* all five have an answer, even if some are "you decide" — record which were user-supplied versus delegated.

2. **If the material question was delegated** ("have AI research it"), dispatch the `research` skill against that specific sub-question — not a general survey. Fold findings into 2–3 sourced bullets.

   *Done when:* every claim used in the brief traces to a fetched source, not assumed knowledge.

3. **Write the brief as a self-contained prompt** — every sentence must stand alone with zero reference to "this conversation" or anything a cold reader wouldn't have. Fill every section, cut none:

   ```
   ## Brief: <name>

   **What it does:** <capability, 1-3 sentences>
   **Who uses it:** <audience/persona>
   **Problem it solves:** <the gap this closes, and for whom>
   **Grounded in:** <source material — link/doc the user gave, or research findings from step 2, with citations>
   **Deliverables:** <concrete artifact list, e.g. "working Angular component + spec + test suite">

   ---
   Execute the above: <imperative restatement of the task, folding in every fact above, written as instructions to an agent that has never seen this conversation>
   ```

   *Done when:* no section contains "TBD", a question mark, or a restatement of another section's words — every section names a concrete noun an agent could act on.

4. **Show the full assembled prompt to the user verbatim** in a fenced code block — this is the artifact they're here for, not a summary of it. Then ask, in plain text, whether to execute it now in a fresh, empty-context agent.

5. **If the user says yes**, dispatch the prompt from step 3 verbatim as the `prompt` field of a `subagent` call with `run_in_background: false` (a fresh agent — never a fork that inherits this conversation; that defeats the point). Do not add scaffolding, do not summarize it first, do not fold in anything from this conversation beyond what is already in the prompt text. If the user says no or doesn't answer, stop here; the shown prompt is the deliverable.
