---
name: batch-grill-me
description: A relentless interview that asks every frontier question at once, round by round.
disable-model-invocation: true
---

# Batch Grill Me

Interview the user relentlessly until you reach a shared understanding. Map the plan as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**:

1. Compute the **frontier** — every decision whose prerequisites are already settled (questions you can ask *now* without guessing at un-heard answers).
2. Ask the whole frontier in one round: number each question and give your recommended answer.
3. Wait for the user's answers before the next round. Settled answers reshape the tree and push the frontier outward; recompute and repeat.
4. A question whose answer depends on another question still open this round belongs to a *later* round.

**Finding facts is your job, never the user's.** When a frontier question needs a fact from the environment (filesystem, tools, docs), fetch it yourself — use `glob`/`grep`/`read`, or a `subagent` in the background when the lookup is heavy. Do not ask the user for anything you could look up. A running lookup is an unsettled prerequisite: only the questions downstream of it wait; ask the rest of the frontier now. The *decisions* are the user's — put each to them and wait.

Done when the frontier is empty: every branch visited, nothing silently assumed. Do not act on the plan until the user confirms you share the same understanding.
