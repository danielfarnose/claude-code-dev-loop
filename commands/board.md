---
description: Trello mirror of the BOARD — one-way push from BOARD.md (the only source of truth). Editing Trello by hand does not persist.
argument-hint: "[--dry-run]"
---

Sync the current project's visual Trello board:

$ARGUMENTS

1. Read `.claude/squad.md §Paths`: the BOARD.md path and the `Trello: board <id>` line. Either one
   missing → STOP and say how to configure it (add the line in §Paths; credentials in step 3).
2. Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/trello-sync.mjs <BOARD.md path> <board-id>` (pass `--dry-run` if
   requested) and report the script's summary (created/updated/archived).
3. If it fails on credentials: tell the human to copy the plugin's `.env.example` to
   `~/.claude/squad.env` and fill it in THEMSELVES (API key + Token from https://trello.com/power-ups/admin;
   the "Secret" on that page is NOT used — it's for OAuth). The `.env` is gitignored. NEVER ask
   them for the key/token in chat and never write them into any file yourself.

Rule: BOARD.md is THE truth. The sync is one-way; anything touched by hand in Trello gets
overwritten on the next sync. Don't "fix" the BOARD to match Trello — it's the other way around.
