---
name: grilling
description: Grill the user relentlessly about a plan, decision, prompt, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
---

# Grilling

Interview me relentlessly about every aspect of the plan until we reach a shared understanding. Walk down each branch of the decision tree, resolving dependencies between decisions one by one. For each question, give your recommended answer.

When the thing being grilled is a prompt meant to generate code, the decision tree has five mandatory branches — it is not a **brief** until each is answered:

1. **What** it will do
2. **Who** will use it
3. **Why** — what problem it solves
4. **Grounding** — what material it is based on: an existing spec/article to follow, or research I should do
5. **Deliverables** — what concretely comes out (files, tests, docs, etc.)

## Rules

- Ask questions **one at a time**; wait for my answer before the next. Multiple questions at once is bewildering.
- If a *fact* is already stated in the prompt or findable in the environment (filesystem, existing ticket, docs), treat it as answered — do not ask me. Only *decisions* are mine to make.
- Do not act on anything until I confirm we have reached a shared understanding. For code generation, that means the brief is complete.
