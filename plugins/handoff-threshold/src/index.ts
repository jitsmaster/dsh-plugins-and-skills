/**
 * handoff-threshold — enforce a handoff once a session's context crosses a
 * token threshold, then auto-start a NEW session that resumes from it.
 *
 * This is the persistent (file-based) form of the previously verified dynamic
 * plugin. It survives server restarts and applies to every top-level session.
 *
 * Behavior:
 *   1. On each `agent/pre-step`, measure the live session via
 *      `ctx.tokenMeter.measure(session).totalTokens`.
 *   2. When it exceeds `THRESHOLD` (default 200000), inject a one-shot user
 *      message ordering the agent to write a handoff document to
 *      `<workspace>/dsh-handoff-<lineage>.md`.
 *   3. On later pre-steps, once that document is readable (or after
 *      `maxSteps`), create a continuation session in the same workspace via
 *      `ctx.sessionController.create` and queue a resume prompt embedding the
 *      handoff body via `ctx.sessionController.prompt({ requestId, ... })`.
 *   4. A `handedOff` guard ensures each session is handed off at most once.
 *
 * Lineage: every handoff in one task chain shares a SINGLE stable lineage id
 * (the originating session) and a SINGLE handoff document path derived from it
 * (`dsh-handoff-<lineage>.md`). A continuation session inherits its lineage via
 * a persisted map (`$DSH_HOME/handoffs/.handoff-threshold-lineage.json`), so it
 * reads, overwrites and deletes the SAME document its predecessors used — no
 * stale per-session handoff docs accumulate across a long lineage.
 *
 * Deletion: the PREVIOUS handoff document is removed at the moment of the NEXT
 * handoff (its body is already embedded in the continuation's resume prompt),
 * not only when the task finally completes. The resume prompt still tells the
 * final session to delete the doc on completion, as a belt-and-suspenders.
 *
 * Extension points (see docs/user/develop/framework/events.md):
 *   - agent/pre-step (serial, prepended) — measure, inject, finalize.
 *   - session/event — observe the (optional) `skill` → `handoff` tool call.
 *
 * The doc is read with the plugin's `fs` service (read-only from the workspace
 * is enough — the agent writes the document with its own tools); deletion uses
 * `node:fs` directly because the plugin runs in Node.
 */
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import type { PreStepDecision } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { Workspace } from '@deepseek-ai/dsh-workspace'
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

/** Display name used in diagnostics and as the injection source. */
export const name = 'handoff-threshold'

/** Plugin configuration (all optional — defaults shown). */
export interface Config {
  /** Context-token threshold above which a handoff is enforced (default 200000). */
  threshold?: number
  /** Pre-steps to wait for the handoff document before giving up and resuming blind (default 8). */
  maxSteps?: number
}

export const Config: Schema<Config> = Schema.object({
  threshold: Schema.number().default(200000),
  maxSteps: Schema.number().default(8),
})

interface Flag {
  lineage: string
  docRel: string
  skillSeen: boolean
  steps: number
  finalizing: boolean
}

/** Persisted lineage map: continuation sessionId -> lineage id. */
interface LineageState {
  sessions: Record<string, string>
}

export function apply(ctx: Context, config: Config): void {
  const THRESHOLD = config.threshold ?? 200000
  const MAX_STEPS = config.maxSteps ?? 8

  // sessionId -> flag; sessions already handed off are never triggered again.
  const flags = new Map<string, Flag>()
  const handedOff = new Set<string>()

  // ---- persisted lineage map (survives restarts) ----------------------------
  const dshHome = process.env.DSH_HOME ?? join(homedir(), '.dsh')
  const handoffsDir = join(dshHome, 'handoffs')
  const stateFile = join(handoffsDir, '.handoff-threshold-lineage.json')
  mkdirSync(handoffsDir, { recursive: true })
  const state: LineageState = { sessions: {} }
  const saveState = (): void => {
    try { writeFileSync(stateFile, JSON.stringify(state, null, 2)) } catch (error) {
      console.error(`[${name}] could not persist lineage state: ${error}`)
    }
  }
  try {
    const raw = JSON.parse(readFileSync(stateFile, 'utf8')) as unknown
    if (raw !== null && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>
      const sessions = typeof obj.sessions === 'object' && obj.sessions !== null
        ? obj.sessions as Record<string, unknown>
        : obj
      for (const [id, lineage] of Object.entries(sessions)) {
        if (typeof lineage === 'string') state.sessions[id] = lineage
      }
    }
  } catch { /* first run — no state yet */ }

  // The handoff document lives in the workspace root, named by LINEAGE (stable
  // across the whole chain) so each hop overwrites and then deletes the same
  // file. Origin sessions (no inherited lineage) name it after themselves.
  const docRelFor = (lineage: string): string => `dsh-handoff-${lineage}.md`

  ctx.on('session/event', (session, event: SessionEvent) => {
    if (event.type !== 'tool/call' || event.data.name !== 'skill') return
    const flag = flags.get(session.id)
    if (flag === undefined) return
    try {
      const args = JSON.parse(event.data.arguments) as { name?: string }
      if (args && args.name === 'handoff') flag.skillSeen = true
    } catch { /* malformed args — ignore */ }
  })

  ctx.on('agent/pre-step', async ({ agent, signal }, next): Promise<PreStepDecision> => {
    const decision = await next()
    if (decision.kind === 'reject' || signal.aborted) return decision

    const tokenMeter = ctx.get('tokenMeter')
    const sessions = ctx.get('sessions')
    const fs = ctx.get('fs')
    const sessionController = ctx.get('sessionController')
    if (tokenMeter === undefined || sessions === undefined || fs === undefined || sessionController === undefined) {
      return decision
    }

    const id = agent.id
    const session = sessions.get(id)
    if (session === undefined) return decision
    if (session.header && session.header.origin === 'subagent') return decision
    if (handedOff.has(id)) return decision

    let flag = flags.get(id)

    // ---- Trigger: crossing the threshold orders a handoff (one-shot) ----
    if (flag === undefined) {
      let tokens = 0
      try { tokens = tokenMeter.measure(session).totalTokens } catch { return decision }
      if (tokens <= THRESHOLD) return decision
      // Inherit the lineage from a persisted continuation map, else start one.
      const lineage = state.sessions[id] ?? id
      const docRel = docRelFor(lineage)
      flag = { lineage, docRel, skillSeen: false, steps: 0, finalizing: false }
      flags.set(id, flag)
      console.log(`[${name}] session ${id} context ${tokens} tokens exceeds ${THRESHOLD}; ordering handoff (lineage=${lineage})`)
      const text = [
        `Your context window is now over the ${THRESHOLD} token threshold (estimated ${tokens} tokens).`,
        `Write a handoff document now that summarizes this session's work so a fresh session can continue seamlessly.`,
        `Save the handoff document to ${docRel} (in this workspace root). A new session will be started automatically from that document.`,
      ].join(' ')
      return {
        kind: 'enter',
        messages: [
          ...decision.messages,
          createUserMessage({
            content: [{ type: 'text', text }],
            source: { kind: 'plugin', plugin: name, form: 'instructions' },
          }),
        ],
      }
    }

    // ---- Finalize: once the doc exists, or after a bounded wait, resume ----
    if (flag.finalizing) return decision
    flag.steps += 1

    let docText: string | null = null
    try {
      const target = await fs.resolve(flag.docRel, session.header.cwd === undefined ? undefined : { cwd: session.header.cwd })
      const read = (await fs.readText(target)).trim()
      if (read !== '') docText = read
    } catch { /* not written yet */ }

    const ready = docText !== null
    const timedOut = flag.steps >= MAX_STEPS
    if (!ready && !timedOut) return decision

    flag.finalizing = true
    try {
      // Resolve the workspace that owns the source session so the resume
      // session is grouped under the same workspace (passing only `cwd`
      // creates an "ungrouped" session not attached to any workspace).
      // Prefer matching by the source session's canonical cwd via
      // `resolveByPath`: that finds the owning workspace even when the source
      // session is not yet accounted in any workspace's `sessionIds` (which
      // happens when the source was itself created as an ungrouped session).
      const workspaceRegistry = ctx.get('workspaceRegistry')
      let workspace: Workspace | undefined
      if (workspaceRegistry !== undefined) {
        const byCwd = session.header.cwd === undefined
          ? undefined
          : await workspaceRegistry.resolveByPath(session.header.cwd)
        workspace = byCwd
          ?? workspaceRegistry.list().find(candidate => candidate.sessionIds.includes(session.id))
      }
      const created = await sessionController.create(
        workspace !== undefined
          ? { workspaceId: workspace.id }
          : session.header.cwd === undefined ? {} : { cwd: session.header.cwd },
      )
      const newId = created.sessionId
      // Record the continuation's lineage so its own handoff reuses the same
      // document path (and lineage-stable deletion).
      state.sessions[newId] = flag.lineage
      saveState()
      const body = docText === null
        ? '(The plugin could not read the document body before the timeout. Locate the handoff document and resume the task from it.)'
        : docText
      const resumePrompt = [
        'A previous session in this task lineage exceeded the 200k context threshold and wrote a handoff document.',
        'Resume the task directly from it. Do not restate the handoff.',
        '',
        '<handoff-document>',
        body,
        '</handoff-document>',
        '',
        `Handoff document path: ${flag.docRel} (in this workspace root)`,
        `Task lineage: ${flag.lineage}`,
        '',
        'Rules for this session:',
        `1. If you hit the 200k context threshold again, write a NEW handoff document to ${flag.docRel} (replace it — the previous handoff is deleted automatically). A new session will be started from it.`,
        `2. When the task is COMPLETE, delete the handoff document at ${flag.docRel} so no stale handoff lingers.`,
      ].join('\n')
      const admitted = await sessionController.prompt({
        requestId: `handoff-${Date.now()}-${id}`,
        sessionId: newId,
        mode: 'queue',
        content: [{ type: 'text', text: resumePrompt }],
      }, signal)
      // Delete the PREVIOUS handoff document now that its body is embedded in
      // the continuation's resume prompt. This keeps exactly one lineage doc at
      // a time — removed at the next handoff, not only when work completes.
      if (session.header.cwd !== undefined) {
        try {
          const prevDoc = join(session.header.cwd, flag.docRel)
          if (existsSync(prevDoc)) {
            rmSync(prevDoc, { force: true })
            console.log(`[${name}] deleted previous handoff doc ${flag.docRel} for lineage ${flag.lineage}`)
          }
        } catch (error) {
          console.error(`[${name}] could not delete previous handoff doc ${flag.docRel}: ${error}`)
        }
      }
      console.log(`[${name}] auto-resumed lineage ${flag.lineage} -> ${newId} (accepted=${admitted.accepted}, doc=${docText !== null})`)
    } catch (err) {
      console.error(`[${name}] finalize failed for session ${id}: ${err && (err as Error).message ? (err as Error).message : String(err)}`)
    }
    handedOff.add(id)
    flags.delete(id)
    return decision
  }, { prepend: true })
}
