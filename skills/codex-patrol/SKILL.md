---
name: codex-patrol
description: "Runs squad's Codex bug patrol: inspect a project for evidenced defects, create prioritized tickets, and automatically take verified P1 findings through the developer-to-QA loop. Use when the user invokes $squad:codex-patrol or asks Codex to patrol, hunt bugs, or patrol an area with optional security review."
---

# Patrol a project in Codex

1. Resolve `SKILL_DIR` as the directory containing this `SKILL.md`, then resolve `PLUGIN_ROOT` as
   the absolute path `SKILL_DIR/../..`.
2. Read `PLUGIN_ROOT/commands/patrol.md` completely and follow it as the canonical patrol process.
3. Read `PLUGIN_ROOT/skills/codex-run/SKILL.md` completely and apply its Codex translation rules,
   subagent launch contract, worktree safety, and developer/QA separation.
4. Interpret `$ARGUMENTS`, `/squad:patrol`, and `${CLAUDE_PLUGIN_ROOT}` using the translation table
   in the run skill.

The `.claude/squad.md` project contract is deliberately shared by Claude and Codex. Do not fork it.

Run the exploratory QA role as read-only. A finding without reproducible evidence is not a ticket.
When `--sec` is present, launch the security role with the same no-persistent-code-edits boundary
and explicitly request an evidence report without writing tickets; patrol gives the combined batch
to the architect so each finding has one ticket owner. Then run only P1 tickets through the
canonical implementation loop and its three-iteration cap.

Do not merge a patrol with a blocked P1. Leave its worktree and BOARD recoverable.
