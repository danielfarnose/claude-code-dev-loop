---
name: codex-run
description: Runs or resumes squad's routed multi-agent development loop in Codex, including serial worktrees, a recoverable BOARD, architect/developer/QA separation, verification, learnings, and fast-forward merge. Use when the user invokes $squad:codex-run, asks Codex to run squad on a task, resume a squad run, or report squad status.
---

# Run the squad loop in Codex

Act as the lead. Codex subagents never orchestrate one another.

## Load the shared process

1. Resolve `SKILL_DIR` as the directory containing this `SKILL.md`, then resolve `PLUGIN_ROOT` as
   the absolute path `SKILL_DIR/../..`.
2. Read `PLUGIN_ROOT/commands/run.md` completely. It is the canonical workflow shared with Claude.
3. Apply the Codex translations below everywhere in that workflow.

## Translate Claude primitives to Codex

| Shared workflow term | Codex behavior |
|---|---|
| `/squad:run <args>` or `$ARGUMENTS` | The arguments and task in the user's `$squad:codex-run` request. |
| `${CLAUDE_PLUGIN_ROOT}` | The absolute `PLUGIN_ROOT` resolved above. |
| `Agent tool`, `@role`, or `subagent_type: role` | Launch a bounded Codex subagent with `spawn_agent` using the role prompt below. |
| `acceptEdits` | Use the current Codex sandbox and approval policy; never broaden permissions just because the shared prompt names this Claude mode. |
| OpenRouter engine and `agent-or.sh` | Skip it. Codex developer and QA roles use native Codex subagents. Record `codex/native` in BOARD engine notes. |
| Claude model names or overrides | Ignore them. Inherit the current Codex model unless the user explicitly requested a model. |
| `Skill inspect-project` | Invoke the installed `$squad:inspect-project` skill in the lead when needed. |
| Trello scripts | If `~/.codex/squad.env` exists, invoke them with `SQUAD_ENV_FILE="$HOME/.codex/squad.env"`; otherwise use their normal fallback. |

The shared `.claude/squad.md` path is intentional: it is the one versioned project contract read by
both Claude and Codex. Do not create a duplicate `.codex/squad.md`.

For `status`, squad state includes only worktrees on `squad/*` branches plus the BOARD declared by
the project contract. Ignore unrelated detached or user-created worktrees. If there is no active
squad worktree and no `.claude/squad.md` from which to resolve a BOARD, report `active run: none`
and stop; ticket counts are unavailable, not zero.

## Optional final WF ticket — identical in both hosts

Honor the canonical opt-in: "prueba con WF", "test with WF", or `--wf` sets `WF: requested`;
otherwise it is off. Preserve that choice on resume. HTML planning for user-facing changes
still applies; `--video` alone does not request a final workflow review.

Append/reuse exactly one final `Kind: flow-review` ticket after implementation/setup/repairs.
Do not dispatch it to a developer or pipeline it with unfinished work. Once its dependencies
are done, launch a fresh native Codex QA subagent with `agents/qa.md` in **Flow close** mode,
the final ticket, `docs/flow-review.md`, flow artifacts and the frozen final commit/range.
Require coherence/business-logic checks and a real browser video. The lead puts the journey
summary in that ticket's BOARD Notes and attaches video + approved HTML + report to its Trello
card using the existing scripts and Codex credentials. Mark it done only after QA, human
acceptance and required delivery. No new role, paid runner or Claude runtime is needed in Codex.

## Launch a role

For each `@pm`, `@architect`, `@developer`, `@qa`, or `@security` call:

1. Use `spawn_agent` with a concrete, bounded task name and `fork_turns: "all"`.
2. Tell the subagent to read `PLUGIN_ROOT/agents/<role>.md` completely before acting.
3. Tell it to ignore only the YAML `tools:` and `model:` fields and any Claude-specific invocation
   mechanics. The prompt body, role boundary, output contract, project contract, and gate remain
   authoritative.
4. Include the absolute main repo, worktree, ticket/spec, commit/range, prior rejection reasons,
   and expected output required by `commands/run.md`.
5. State that it must not spawn other agents. QA and security must leave no persistent product-code
   edits. QA works only in the disposable frozen review worktree, where the role's temporary
   mutation checks are allowed if every change is restored before the verdict.
6. Use `wait_agent` for completion and keep within the available concurrency slots. The
   developer/QA pipeline may overlap only as described by the canonical workflow.

Never let the implementation author approve its own work. For `R0_TRIVIAL`, the lead runs the gate,
as the shared workflow specifies.

## Safety and completion

- Treat worktree creation, commits, the declared verification gate, BOARD transitions, and the
  final `--ff-only` merge as normal in-scope steps once the user invokes this skill for a task.
- Before creating the default `~/.squad-worktrees/<project>` path, request exact write permission
  for that directory when the Codex sandbox does not already allow it. Do not silently relocate a
  recoverable run to a temporary directory.
- Preserve dirty user changes in the main repo. Work only in the squad worktree.
- Never delete a blocked or unmerged run. Leave it recoverable and report the exact resume command.
- Ask for the explicit checkpoints the shared workflow requires — the product checkpoint on
  R2/R4/R5 (the @pm's open decisions, recommendation first, then "is this the intent?") and the
  review checkpoint on R5/R6, HTML approval for user-facing changes, and final human result
  review only when WF is requested; do not turn routine internal choices into extra questions.
- Finish only after the canonical close sequence succeeds, or report a concrete blocked state with
  BOARD and worktree paths.
