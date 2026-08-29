---
name: obsidian-vault
description: Personal knowledge base — consult before significant work and capture reusable takeaways after, for coding and non-coding tasks alike. Use when starting any non-trivial task (debug, feature, prompt/skill design, planning, writing), search the vault first for prior notes and use them, then after finishing automatically record fixes, working patterns, resolved gotchas, and decisions that no existing note covers.
---

# Obsidian Vault — Personal Knowledge Loop

The vault is a second brain: **consult before you act, capture after you finish.** Two hooks wrap every significant task — coding or not.

## Vault location

`$HOME/Documents/Obsidian Vault` by default — override with the `OBSIDIAN_VAULT` env var or a `vault.path` line in `~/.config/obsidian-vault/config` (env var beats config). If the folder does not exist, create it before writing notes.

**On this machine the vault is pinned at `/Volumes/Satechi/Documents/Obsidian Vault`** (recorded in `~/.config/obsidian-vault/config`).

## Structure

Topic folders — `Troubleshooting`, `prompting`, `Daily Notes`, per-project folders — not flat. New notes go in the matching existing topic folder; only create a new folder for a genuinely new topic area; only leave a note at the vault root when no folder fits.

## Naming & linking

- **Title Case** filenames for new notes. Existing notes predate this — leave them.
- Wikilinks `[[Note Title]]` connect related notes, across folders.
- New notes list related notes as wikilinks at the bottom.
- **Index notes** (`<Folder> Index.md`): plain wikilink lists; create one the first time a folder grows past a handful of notes.

---

## A. Consult before significant work (the recall hook)

Trigger: before starting any non-trivial task — debugging, implementing a feature, designing a prompt or skill, planning, writing a doc, or learning something new.

1. **Search the vault** against the task's key terms:
   - Filename: `glob` `**/*<term>*.md` under the vault path
   - Content: `grep` `<term>` under the vault path, include `*.md`
   - Related: `grep` for the topic folder's `Index` note and skim it
2. **Read every hit** whose title or snippet looks relevant — don't stop at the first.
3. **Use the knowledge**: fold what the notes say into the task (prior fixes, preferred patterns, conventions, decisions). If a note answers the question, don't re-derive it.

*Done when:* all relevant notes are read and applied, or confirmed absent (nothing found). A miss is fine — proceed; you'll capture the result afterward.

## B. Capture after significant work (the documentation hook)

Trigger: after completing meaningful work — a fix, a feature, a working prompt pattern, a resolved gotcha, a decision, a useful command — anything a future you would want to find.

1. **Ask: is there a takeaway?** If the work was trivial, one-off, or fully covered by an existing note — skip capture. Otherwise continue.
2. **Dedupe**: search the vault (same as A1) for existing coverage.
   - **Covered** → stop. If the existing note is missing the new detail, add one short section to it instead of a new note.
   - **Not covered** → create a note:
   - Title Case filename in the matching topic folder
   - Content: self-contained — a reader with no other context can act on it alone. Include the *what* (the fix/pattern), the *why* (the problem it solves), and the *how* (concrete steps/commands). Keep it to the point — no padding.
   - Wikilinks to related notes at the bottom
3. **Log to today's daily note**: append one line under `## Learnings / takeaways` in `Daily Notes/<YYYY-MM-DD>.md` (create the file from `templates/Daily Note.md` if missing), linking `[[The New Note]]`.
4. **Maintain the index**: if the folder has grown and lacks an `Index` note, create/update it (plain wikilink list).

*Done when:* the takeaway is captured exactly once — either in an updated existing note or a new note — and referenced from today's daily note.

## C. Manual operations (on direct request)

- **Search**: run A1-A2, then summarize what exists (note titles + one-line gist each).
- **Organize**: move misfiled notes into the right topic folder, update links, refresh indexes.
- **Create a note explicitly**: follow B2's create path, skip the dedupe if the user says it's new.

---

## Ground rules

- **Never create a duplicate.** When in doubt, update the existing note.
- **Never store conversation state** (in-progress context, uncommitted decisions) in the vault — only durable, reusable knowledge.
- **Keep notes small and actionable.** One idea per note; a reader should act on it in seconds.
- **Auto-capture is quiet**: log to the daily note, mention created/updated notes briefly in your final response — don't ask permission for routine captures.
