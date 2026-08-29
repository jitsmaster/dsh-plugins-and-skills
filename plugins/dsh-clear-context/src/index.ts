/**
 * dsh-clear-context — a `/clear` command that TRULY wipes the current
 * session's model-visible context and lets you keep using the same session.
 *
 * Why not `/compact`? Compaction summarizes the old history and keeps a
 * recent tail. `/clear` shadows the ENTIRE model-visible surface with no
 * summary and an empty replacement, so the next model request starts from an
 * empty conversation in the same session (same id, title, workspace).
 *
 * How it works (the same durable machinery compaction uses, driven directly):
 *   1. `compaction/start`  — durable bracket marker (turn: null = manual)
 *   2. `compaction/summary` — log-only metering event; arms the token-meter
 *      shadow price for the exact replaced range (no summary content shown)
 *   3. the replacement      — a surface `replace` event shadowing every
 *      current surface node. Blank mode appends an EMPTY-CONTENT
 *      `assistant/message`, which the projection derives to null, so the
 *      transcript goes completely blank; `marker: true` appends a one-line
 *      user message instead.
 *   4. `compaction/end`     — closes the bracket, releasing the durable lock
 *
 * The durable event log keeps the raw history (search/audit still see it);
 * only the model-visible surface and the UI transcript are cleared.
 *
 * @module dsh-clear-context
 */

// Registers `compaction/*` on the session event map (side-effect import).
import '@deepseek-ai/dsh-compaction/types'

import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import { CompactionId } from '@deepseek-ai/dsh-compaction'
import type { CommandInvocation, CommandResult } from '@deepseek-ai/dsh-commands'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { MessageId } from '@deepseek-ai/dsh-llm/brand'
import Schema from '@deepseek-ai/schemastery'
import type { SessionEvent } from '@deepseek-ai/dsh-session'

export const name = 'dsh-clear-context'
export const inject = ['commands', 'sessions']

/** Plugin configuration. */
export interface Config {
  /**
   * Leave a single "[context cleared]" user message instead of a fully blank
   * transcript. Blank mode is the faithful "true clear"; the marker mode is
   * friendlier for a human reading the session later.
   */
  marker: boolean
}

export const Config: Schema<Config> = Schema.object({
  marker: Schema.boolean()
    .description('Leave a single "[context cleared]" marker message instead of a fully blank transcript')
    .default(false),
})

const USAGE = 'Usage: /clear (no arguments)'

/**
 * Whether a compaction transaction is durably open right now. Mirrors the
 * compaction backend's live-lock rule: an unmatched `compaction/start` with
 * no later `compaction/end` is the durable lock. Scan from the end so a
 * stale pre-seed marker from a prior lifecycle cannot block.
 */
function hasUnmatchedCompactionStart(events: readonly SessionEvent[]): boolean {
  for (let index = events.length - 1; index >= 0; index--) {
    const type = events[index].type
    if (type === 'compaction/start') return true
    if (type === 'compaction/end') return false
  }
  return false
}

/** Last `step/start`'s turn/step numbers, for the synthetic replacement node. */
function lastTurnStep(events: readonly SessionEvent[]): { turn: number; step: number } {
  let turn = 1
  let step = 1
  for (const event of events) {
    if (event.type === 'step/start') {
      if (typeof event.data.turn === 'number') turn = event.data.turn
      if (typeof event.data.step === 'number') step = event.data.step
    }
  }
  return { turn, step }
}

/** Best-effort heuristic token price of the shadowed surface nodes. */
function measureShadowedTokens(ctx: Context, session: { surface: { nodes: readonly number[] } }): number {
  const meter = ctx.get('tokenMeter')
  if (meter === undefined) return 0
  try {
    const measurement = meter.measure(session)
    const seqSet = new Set(session.surface.nodes)
    return measurement.nodes
      .filter((node: { seq: number; tokens: number }) => seqSet.has(node.seq))
      .reduce((sum: number, node: { seq: number; tokens: number }) => sum + node.tokens, 0)
  } catch {
    return 0 // measurement is advisory; the clear must not fail on it
  }
}

/** Execute one argument-free true-context-clear request. */
async function executeClear(
  ctx: Context,
  config: Config,
  invocation: CommandInvocation,
): Promise<CommandResult> {
  if (invocation.rawInput.trim().length > 0) {
    return { kind: 'error', text: USAGE }
  }
  const session = invocation.agent.session
  if (session.surface.nodes.length === 0) {
    return { kind: 'success', text: 'Nothing to clear — the context is already empty.' }
  }
  if (hasUnmatchedCompactionStart(session.events)) {
    return { kind: 'error', text: 'A compaction is in progress; try /clear again in a moment.' }
  }
  try {
    const outcome = await invocation.agent.runMaintenance(async () => {
      // Re-read the surface inside the maintenance window (a queued input may
      // have advanced it between the check above and here).
      const nodes = session.surface.nodes
      if (nodes.length === 0) return { cleared: 0 }
      const start = nodes[0]
      const end = nodes[nodes.length - 1]
      const compactionId = CompactionId(randomUUID())
      const sourceCommandId = invocation.commandId
      const lifecycle = { compactionId, turn: null, sourceCommandId }
      const startEvent = session.append('compaction/start', lifecycle)

      const provider = invocation.agent.options.provider
        ?? session.requestHeader()?.config.provider
        ?? ''
      const model = invocation.agent.options.model
        ?? session.requestHeader()?.config.model
        ?? ''
      const shadowedTokenCount = measureShadowedTokens(ctx, session)
      const summaryEvent = session.append('compaction/summary', {
        compactionId,
        sourceCommandId,
        summary: [{ type: 'text', text: config.marker ? '[context cleared]' : 'Context cleared by /clear.' }],
        shadowedRange: { start, end },
        shadowedSeqs: [...nodes],
        shadowedTokenCount,
        provider,
        model,
      })

      // The surface replacement: shadow every current node. The compaction
      // metering event must stay directly adjacent (it is, above).
      const sourceEventSeqs = [startEvent.seq, summaryEvent.seq, ...nodes]
      if (config.marker) {
        session.append('user/message', createUserMessage({
          content: [{ type: 'text', text: '[context cleared]' }],
          source: { kind: 'plugin', plugin: 'clear' },
        }), { surfaceOp: { op: 'replace', start, end }, sourceEventSeqs })
      } else {
        // An empty-content assistant/message derives to null, so the
        // transcript and the next model request are completely empty.
        const { turn, step } = lastTurnStep(session.events)
        session.append('assistant/message', {
          turn,
          step,
          message: {
            id: MessageId(`clear-${randomUUID()}`),
            role: 'assistant',
            content: [],
            source: { kind: 'model', provider, model },
          },
        }, { surfaceOp: { op: 'replace', start, end }, sourceEventSeqs })
      }

      session.append('compaction/end', lifecycle)
      await ctx.sessions.flush(session)
      return { cleared: nodes.length }
    })
    if (outcome.cleared === 0) {
      return { kind: 'success', text: 'Nothing to clear — the context is already empty.' }
    }
    return {
      kind: 'success',
      text: `Cleared ${outcome.cleared} history items. This session continues with an empty context.`,
    }
  } catch (error: unknown) {
    if (invocation.signal.aborted) return { kind: 'error', text: 'Clear cancelled.' }
    throw error
  }
}

/**
 * Register `/clear` for every composed human-command adapter.
 * @param ctx - context carrying the command registry and the sessions service.
 * @param config - validated plugin configuration.
 */
export function apply(ctx: Context, config: Config): void {
  const active = new Set<Promise<CommandResult>>()
  const handler = (invocation: CommandInvocation): Promise<CommandResult> => {
    const operation = executeClear(ctx, config, invocation)
    active.add(operation)
    const retire = (): void => { active.delete(operation) }
    void operation.then(retire, retire)
    return operation
  }

  ctx.effect(function* () {
    yield async () => { await Promise.allSettled(active) }
    yield ctx.commands.register({
      name: 'clear',
      description: 'Truly clear this session\'s context (the model forgets everything; the session continues)',
      handler,
    })
  }, 'dsh-clear-context lifecycle')
}
