---
name: codex-board
description: Pushes the current project's squad BOARD.md to its configured Trello board, with an optional dry run. Use when the user invokes $squad:codex-board, asks Codex to sync or preview the squad board, or wants the one-way BOARD-to-Trello mirror.
---

# Sync the squad board

1. Resolve `SKILL_DIR` as the directory containing this `SKILL.md`, then resolve `PLUGIN_ROOT` as
   the absolute path `SKILL_DIR/../..`.
2. Read `PLUGIN_ROOT/commands/board.md` completely and follow it.
3. Translate `$ARGUMENTS` to the user's skill arguments and `${CLAUDE_PLUGIN_ROOT}` to the absolute
   `PLUGIN_ROOT`.

The shared project contract remains `.claude/squad.md` for compatibility with both hosts. Accept
credentials from the shell, `~/.codex/squad.env`, or the legacy `~/.claude/squad.env`; never print
their values. When `~/.codex/squad.env` exists, invoke the script with
`SQUAD_ENV_FILE="$HOME/.codex/squad.env"`. BOARD.md is always the source of truth. A Trello edit is
a one-way mirror only.
