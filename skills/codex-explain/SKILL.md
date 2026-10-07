---
name: codex-explain
description: Explains a flow in the active repository with a simple interactive map, verified file/function references, runtime agents and an optional step-by-step tutor for the project's language. Use when the user invokes $squad:codex-explain or asks Squad to explain or teach a project's workflow and code; this does not start a development run.
---

# Explain the active project

Resolve `PLUGIN_ROOT` as the absolute path two directories above this skill directory. Read
`PLUGIN_ROOT/commands/explain.md` completely and apply it; `${CLAUDE_PLUGIN_ROOT}` means this
`PLUGIN_ROOT`, and `$ARGUMENTS` means the user's requested flow and optional `--tutor`.

Use native Codex subagents for a bounded architect trace when helpful, with
`PLUGIN_ROOT/agents/architect.md`, the exact repository/scope and a read-only responsibility.
Do not start `codex-run`, install a runtime or require a project contract for an explanation.
Read the available Visualize skill before rendering inline; without it, use the shared
standalone renderer. Both versions explain the same project/code evidence.
