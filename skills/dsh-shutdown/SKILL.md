---
name: dsh-shutdown
description: Shut down the DeepSeek Harness (dsh) web server — usually after installing or changing plugins, which only load at boot — and optionally update + rebuild the harness first. Use when the user wants to stop/restart dsh, apply plugin or config changes, update dsh to a new version, or rebuild it.
whenToUse: The user asks to shut down dsh, restart the server, apply plugin/config changes that need a reboot, update the harness to the latest version, or rebuild it. The agent performs the update/build/shutdown itself; the START is always manual by the human.
---

# Shutting down (and rebuilding) dsh

dsh loads config and plugins **at boot**, so installing/enabling plugins
(e.g. via `dsh plugin --profile web add <pkg>` or the plugin-hub panel) or
editing `~/.dsh/profiles/web/cordis.patch.yml` only takes effect after the
server restarts. The agent can update, build, validate, and shut the server
down itself — but **the human must start dsh again manually** (the agent runs
on the server; once it is down, no agent remains to restart it).

## Golden rules

- **Shutdown is the LAST action.** Killing the server kills this agent turn
  mid-flight — the tool call dies. Do everything else (update, build,
  validate, install) first.
- **Sessions survive the restart.** They persist in `~/.dsh/sessions`, so the
  same conversation resumes after the user restarts dsh.
- **Always end by telling the user to start dsh manually** (Dock icon or
  `pnpm dsh web`).

## Steps

### 1. (Only if updating the harness) Sync + build

```sh
cd "/Volumes/Satechi 1/Dev/deepseek-harness"
git fetch origin
git merge --ff-only origin/master    # working tree must be clean first
pnpm install
pnpm run build                       # build:lib:host → build:lib:client → web
```

Verify artifacts: `apps/cli/lib/bin.js`, `apps/web/dist/index.html`,
`packages/typert/*/lib`, `packages/client/modules/lib/client.js`.

### 2. Install / change plugins (as requested)

```sh
pnpm dsh plugin --profile web add <pkg-or-git-spec>
```

After the install, `dsh.profile.bundles` is reconciled automatically for
packages declaring `dsh.bundle.patch`. See the `dsh-plugin-dev` skill for
plugin authoring.

### 3. Validate before shutdown (read-only, no restart needed)

```sh
cd "/Volumes/Satechi 1/Dev/deepseek-harness"
pnpm dsh web --dump-config
```

Grep the output for the expected rows (e.g. `plugin-console` for the plugin
hub; confirm the user patch layer rows like `handoff-on-compaction` are
still present). A resolution error here means the restart will fail — fix it
before shutting down.

### 4. Shut the server down gracefully

```sh
kill -TERM "$(cat ~/Library/Logs/deepseek-harness/web.pid)"   # or find the PID:
lsof -nP -iTCP:3080 -sTCP:LISTEN
```

- SIGTERM gives the plugin tree up to 5 s to dispose and exits 0; a second
  signal forces immediate exit.
- Verify it is down: `lsof -nP -iTCP:3080 -sTCP:LISTEN` prints nothing.
- Expected: the agent's own tool call is interrupted here — that is normal
  and means the shutdown worked.

### 5. Tell the user to start dsh manually

The launcher cannot be triggered by the agent:

- **Dock icon** "DeepSeek Harness" (probes `http://127.0.0.1:3080`, starts
  `pnpm dsh web` from the checkout if nothing answers, opens the browser,
  then exits), or
- **Terminal**: `cd "/Volumes/Satechi 1/Dev/deepseek-harness" && pnpm dsh web`

Say explicitly: "dsh is shut down — start it manually (Dock icon or
`pnpm dsh web`)".

## Troubleshooting

- **`--dump-config` fails or a row is missing** → do NOT shut down; fix the
  composition (profile `package.json` bundles, `cordis.patch.yml`) first.
- **Port 3080 still listening after SIGTERM** → the drain may still be
  running; wait a few seconds, then send one more SIGTERM (a second signal
  forces immediate exit). Never SIGKILL a process you do not own.
- **User asks to kill the launcher process** → the launcher
  (`/Applications/DeepSeek Harness.app`) exits after starting the server; if
  a stale instance holds the launch lock, kill it with **SIGKILL** — SIGTERM
  triggers its cleanup trap, which stops the server too.

## Full reference

- Vault note: `DSH/Update and Build DSH.md` in the Obsidian vault (worked
  example 2026-08-17: rc.5 → rc.7 + dsh-plugin-hub install).
- [[Start DSH]] vault note — launcher behavior, logs, PID location.
