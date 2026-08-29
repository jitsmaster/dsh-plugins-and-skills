---
name: wfcheck
description: Report live status of a specific in-flight agent or background job from this session.
disable-model-invocation: true
---

Reports what one agent or job is actually doing right now — its status, elapsed time, and any progress — from DSH's own agent/job registry.

## Steps

1. **Find the agent/job id.** Look back through this conversation for a `subagent` call's `subagentId`, a `subagent_fork` id, or a background `bash` job id. If exactly one is visible, use it. If more than one, list them for the user and ask which — never pick on their behalf.

   *Completion criterion:* a single id is confirmed from this conversation, or none exists. If none exists, tell the user plainly that nothing is running in this conversation to check, and stop — never scan the filesystem or guess.

2. **Query the registry.** Use `list_agents` (for subagents — shows `running`/`idle`/`ready` status) or `job_output`/`job_list` (for background bash jobs — shows status and output so far). For a subagent, `send_message` is not needed here; just report what `list_agents` says.

   *Completion criterion:* the registry entry for the chosen id was read.

3. **Present the status.** Print a plain-text report — never the `ask_user_question` tool for this:

   - id and label
   - status (`running` / `idle` / `ready` / `completed` / `killed` / `failed`)
   - for jobs: output produced so far (trimmed) and whether it's still running
   - for agents: whether it is still working or waiting between turns

   *Completion criterion:* every field above is printed, or explicitly marked absent if missing.
