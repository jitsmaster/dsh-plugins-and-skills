# dsh-panel-controls

Workspace/layout controls for the DeepSeek Harness web GUI:

- **Focus workspaces** — one click hides the whole **Files / Preview / SCM**
  panel group (drives the `dsh-aionui-panel` `enabled` setting **live**), so the
  workspaces/chat column grows to fill the frame; click again to bring the
  panels back.
- **File width** — `−` / `+` adjusts the Files (Explorer) panel width
  (220–500px, stepped by 40px). Writes the `chat-workspace-width-px`
  preference; the panel re-reads it on its next init/reload (the aionui-panel
  keeps the width in a private store, so no in-page live resize is possible
  from a separate plugin — drag the panel's handle for live resize).

The control bar sits below the composer (`conversation.input.dock`).

## Install

```sh
# from this repo
dsh plugin --profile web add link:$(pwd)/plugins/dsh-panel-controls
# or copy lib/ into the profile and add the cordis.patch.yml row, then restart
```

Deploy (copy built lib + patch into the profile, add the insert row):

```sh
bash deploy.sh web
```

The host half is a no-op; all behavior is in the browser half (`lib/client.js`).

## Build

```sh
# from the dsh checkout (has tsdown + the clientBundle preset)
pnpm exec tsdown --config plugins/dsh-panel-controls/tsdown.config.ts
```

## Related

- [dsh-aionui-panel] — the Files/Preview/SCM panel system this controls
  (its `aionui-panel` `enabled` setting is the live hook).
