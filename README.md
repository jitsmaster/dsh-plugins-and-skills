# DeepSeek Harness — Plugins and Skills

A public, versioned collection of the custom **DeepSeek Harness (dsh) plugins**
and **agent skills** developed for this machine. Everything here is locally
authored; third-party symlinked skills are intentionally excluded.

## Contents

### Plugins (`/plugins`)

Cordis plugins for the dsh web profile, installed via
`~/.dsh/profiles/web/cordis.patch.yml`.

| Plugin | Description |
| --- | --- |
| [`handoff-threshold`](plugins/handoff-threshold) | When a session's context exceeds a token threshold (default **200k**), prompts the agent to write a handoff document, then automatically starts a **new session in the same workspace** that resumes from it. Replaces the older `handoff-on-compaction`. |
| [`dsh-clear-context`](plugins/dsh-clear-context) | `/clear` — truly wipes a session's context (no summary, no tail). |
| [`dsh-cost-balance`](plugins/dsh-cost-balance) | iOS-style stats bar under the composer: session cost, account balance (incl. peak/off-peak hour billing), cache hit rate, and token usage. |

### Skills (`/skills`)

Locally-authored agent skills (each is a directory with a `SKILL.md` and any
companion files).

```
app-brief                 batch-grill-me          cdesign-diff
codebase-memory           domain-modeling         dsh-plugin-dev
dsh-shutdown              grill-me                grill-with-docs
grilling                  looper                  mode-ai-pitfall-review
mode-architect            mode-ask                mode-browser-tester
mode-code                 mode-debug              mode-devops
mode-docs-writer          mode-documentation-writer
mode-import-cleanup       mode-integration        mode-memory-and-performance-analyzer
mode-merge-conflict-resolver                      mode-post-deployment-monitoring
mode-project-research     mode-refinement-optimization
mode-regressions-analyzer mode-security-review    mode-sparc
mode-spec-pseudocode      mode-tdd                mode-tutorial
mode-user-story-creator   obsidian-vault          playwright-login-and-test
show-me                   smart-commit            sparc-graph
wfcheck                   writing-great-skills
```

## Installing a plugin

Plugins run outside the dsh checkout, so give each one a `node_modules` symlink
to the profile's real dependencies, then wire it into
`~/.dsh/profiles/web/cordis.patch.yml`:

```sh
ln -s ~/.dsh/profiles/node_modules <plugin>/node_modules
```

```yaml
# ~/.dsh/profiles/web/cordis.patch.yml
- insert:
    - id: handoff-threshold
      name: '/absolute/path/to/plugins/handoff-threshold/src/index.ts'
```

Restart the dsh server (plugins load at boot) to apply.

## Installing a skill

Copy the skill directory into `~/.agents/skills/` (or wherever this
installation's skill catalog lives). Skills are picked up on the next session.

## License

MIT
