---
name: dsh-plugin-dev
description: Write and add custom plugins to customize DeepSeek Harness (dsh). Use when the user wants to extend dsh with new behavior — event hooks, tools, context injection, config — or modify/reinstall an existing plugin such as handoff-on-compaction.
whenToUse: The user asks to add a new dsh plugin, customize dsh behavior, write a plugin, hook a dsh event (agent/pre-step, session/event), or build on the handoff-on-compaction pattern.
---

# Writing and adding dsh plugins

DeepSeek Harness is a Cordis application: **a plugin is a TypeScript module
that exports an `apply(ctx)` function**. Cordis calls it when the plugin
loads; everything you register on `ctx` (event listeners, tools, timers) is
auto-cleaned when the plugin unloads.

## Always read first (canonical docs)

- `docs/user/develop/basic/index.md` — your first plugin (`apply`, `inject`, cleanup, the three plugin forms)
- `docs/user/develop/basic/config.md` — Schemastery config schema
- `docs/user/develop/framework/events.md` — emit / bail / serial / waterfall event modes
- `docs/cordis-tutorial/01-first-plugin.md` — the framework underneath
- `docs/subsystems/compaction.md` — the compaction seam and its events

These live in the dsh checkout (e.g. `/Volumes/Satechi 1/Dev/deepseek-harness`).

## The two extension points most customizations use

| Extension point | Kind | Use |
|---|---|---|
| `session/event` | emit (firehose) | Observe every durable session event: `user/message`, `assistant/message`, `tool/result`, `compaction/*`, ... |
| `agent/pre-step` | serial | Run before each model request; wrap `next()` and add messages to the request batch (inject context/instructions). |

Pattern (from the `time-context` package — the cleanest reference):

```ts
ctx.on('agent/pre-step', async ({ agent, signal }, next): Promise<PreStepDecision> => {
  const decision = await next()                       // delegate downstream FIRST
  if (decision.kind === 'reject' || signal.aborted) return decision
  return {
    kind: 'enter',
    messages: [
      ...decision.messages,
      createUserMessage({
        content: [{ type: 'text', text: '...' }],
        source: { kind: 'plugin', plugin: name, form: 'snapshot', sections: [{ name, text }] },
      }),
    ],
  }
}, { prepend: true })   // prepend so this listener runs before others
```

Import helpers: `createUserMessage` from `@deepseek-ai/dsh-llm`, types from
`@deepseek-ai/dsh-agent` (`PreStepDecision`) and `@deepseek-ai/dsh-session`
(`SessionEvent`). The agent's live session is `agent.session`.

### Type gotcha: declaration merging

Events added by other packages (e.g. `compaction/*`) extend `SessionEventMap`
via a `declare module '@deepseek-ai/dsh-session/types'` block. To see them in
your types, import the extending package's types — side-effect import is enough:

```ts
import '@deepseek-ai/dsh-compaction/types'   // registers compaction/* on SessionEventMap
```

## Worked example: handoff-on-compaction

Installed plugin: `/Volumes/Satechi 1/dsh-system-work/handoff-on-compaction`
(src/index.ts is heavily commented — read it). It injects "run the handoff
skill" when automatic compaction fires at the token cap:

1. `session/event`: on `compaction/start` with `typeof data.turn === 'number'`
   (automatic; manual /compact has `turn: null`) → flag `agent.session.id`.
2. `agent/pre-step`: if flagged, append one `createUserMessage` ordering the
   handoff skill; delete the flag (one-shot).

## Worked example: handoff-on-compaction

Installed plugin: `/Volumes/Satechi 1/dsh-system-work/handoff-on-compaction`
(src/index.ts is heavily commented — read it). It implements the **full
handoff cycle**: when automatic compaction fires at the token cap it (a) injects
"run the handoff skill", (b) waits for the document, (c) **auto-creates a new
session** that resumes from it via the web RPC, and (d) keeps **one handoff
document per lineage** — deleted when replaced or when the task completes.

Patterns beyond the basic two hooks (all in this plugin):

- **Detect a specific tool call**: `session/event` `tool/call` events carry
  `{ name, arguments }` where `arguments` is a JSON string — parse it to
  find e.g. the `skill` tool invoking `handoff`.
- **One-shot state per session**: a `Map<sessionId, Flag>` set at the trigger,
  consumed at finalize; persisted lineage in `$DSH_HOME/handoffs/.state.json`.
- **Speak the web RPC from a plugin**: the web UI talks to the server via
  `POST http://127.0.0.1:3080/api/<method>` with
  `{ type: 'client-request', rpcId, method, payload }` and reads
  `{ type: 'server-response', rpcId, result: { ok, value } }`. The plugin
  uses `session.create` (pass `cwd` — no workspace lookup needed) and
  `session.prompt` (`mode: 'queue'`, `content: [{ type: 'text', text }]`).
- **Config schema** (`docs/user/develop/basic/config.md`): export
  `interface Config` + a Schemastery `Config` schema with defaults; Cordis
  validates and fills them.
- **Node stdlib in plugins**: plugins run in Node — `node:fs`/os/path are
  fine; add `@types/node` (or a `typeRoots` pointing at the checkout's
  `node_modules/@types`) to typecheck.

## Step-by-step: add a new plugin to the web profile

1. **Scaffold** a package, e.g. `/Volumes/Satechi 1/dsh-system-work/<name>/`
   with `src/index.ts`, `package.json` (type module, peerDependencies on the
   `@deepseek-ai/*` packages it imports), optional `tsconfig.json`.
2. **Resolve imports**: the plugin runs outside the checkout, so give it a
   `node_modules` symlink to the profile's real deps:
   `ln -s ~/.dsh/profiles/node_modules <plugin>/node_modules`
   (typecheck with the checkout's tsc: `node node_modules/typescript/bin/tsc -p <plugin>/tsconfig.json --noEmit`).
3. **Wire it** in `~/.dsh/profiles/web/cordis.patch.yml` — a top-level array of
   loader patch entries. Insert the plugin by absolute path (no build needed):

   ```yaml
   - insert:
       - id: <plugin-id>
         name: '/absolute/path/to/<plugin>/src/index.ts'
   ```

   For an npm-installed package instead: `dsh plugin --profile web add <pkg>`
   then `name: '<pkg>'`.
4. **Validate** (read-only, no server restart needed):
   `pnpm dsh web --dump-config` from the checkout — grep for your plugin id and
   confirm any overridden entries (`disabled`, `config`) show the expected values.
5. **Restart the server** to load the plugin (kill the running `pnpm dsh web`
   and relaunch — the Dock launcher or `pnpm dsh web`). The web server is the
   harness itself: restarting it ends the current agent session.

## Common customizations

- **Enable a disabled bundle plugin** (e.g. compaction): patch by id with
  `disabled: false` + `config:` — the web profile ships
  `@deepseek-ai/dsh-compaction-basic` and `@deepseek-ai/dsh-command-compact`
  disabled; enabling them turns on the context token cap.
- **Config schema**: export `interface Config` + a Schemastery `Config` schema;
  Cordis validates and fills defaults. Anything two deployments may set
  differently must be a config field.
- **Dependencies**: `export const inject = ['tools']` — apply runs only after
  those services exist.
- **Cleanup**: register disposers with `ctx.effect(() => () => ...)`.

## Troubleshooting

- **Plugin silently not loaded**: module specifier typo is reported via the
  logger, not a crash — check the boot log and the spelling.
- **Import fails to resolve** (`ERR_MODULE_NOT_FOUND` for `@deepseek-ai/*`):
  the plugin's `node_modules` symlink is missing or wrong — repoint it at
  `~/.dsh/profiles/node_modules`.
- **`compaction/start` not type-checking**: forgot the
  `import '@deepseek-ai/dsh-compaction/types'` augmentation import.
- **Handoff prompt never fires**: compaction-basic is still disabled (patch
  `disabled: false`) or the handoff skill still has `disable-model-invocation: true`.
- **Server config didn't change after editing cordis.patch.yml**: restart the
  server — patches apply at boot.

## Record

After successfully adding a plugin, capture the takeaway in the Obsidian vault
(see the `obsidian-vault` skill): `DSH/DSH Plugin Development.md`.
