---
name: codex-security-audit
description: Runs squad's manual, read-only security audit in Codex against the threat model declared in .claude/squad.md, focusing on tenant isolation, data leaks, prompt injection, destructive paths, and public boundaries. Use when the user invokes $squad:codex-security-audit, requests the squad security role, or asks for a pre-release high-risk audit.
---

# Run the squad security role in Codex

1. Resolve `SKILL_DIR` as the directory containing this `SKILL.md`, then resolve `PLUGIN_ROOT` as
   the absolute path `SKILL_DIR/../..`.
2. Read `PLUGIN_ROOT/agents/security.md` completely.
3. Ignore only its Claude YAML `tools:` and `model:` fields and Claude-specific invocation wording.
   Follow the body, scope, evidence standard, ticket format, and output contract.
4. Keep product code read-only. Writing audit tickets in the configured tickets path is allowed
   because the role explicitly produces them; never implement the fixes in this skill.

Use the existing `.claude/squad.md` as the shared Claude/Codex project contract. Stop when its
`§Security` threat model is absent instead of inventing one.

When patrol invokes this role for discovery, return findings to patrol without writing tickets;
the patrol architect owns ticket creation. In a direct security audit, follow the role's ticket rules.
