---
description: Autonomous bug hunt — scans the project, creates a ticket per finding and fixes the P1s on its own (developer→qa loop). P2/P3 stay queued for /squad:run.
argument-hint: "[area to focus on] [--sec] [--wf]"
---

Run a **bug patrol** over the current project:

$ARGUMENTS

You (LEAD) orchestrate; agents do NOT call each other. Caveman mode. Non-blocking permissions
(acceptEdits). The BOARD (`<tickets-path>/BOARD.md`, format in `/squad:run`) is written ONLY by you.

## Flow

0. **Precondition:** read `.claude/squad.md` (no squad.md → STOP). Create the run worktree the same
   way as `/squad:run` — it's the same serial cap, so a patrol and a run never collide:
   `bash ${CLAUDE_PLUGIN_ROOT}/scripts/worktree.sh new <repo> PATROL-<YYYYMMDD>-<NN>`. Fails on the cap → there's
   a live run: STOP and say so. BOARD (inside the worktree): Active run = "patrol [area]",
   `Worktree:`, `Base:`, phase `patrol`.
1. **Scan (read-only, in parallel if possible):**
   - Run the gate from `squad.md §Verification` — red is already a finding.
   - @qa in exploratory mode: look for real bugs, TODOs/FIXMEs that flag something broken, dead
     code, copy/strings that don't match what the code does, deleted or disabled tests.
     Focus on [area] if one was given. Read-only: report, don't fix.
   - With `--sec`: @security too (its own protocol; it writes its own tickets).
2. **Tickets:** hand the findings to @architect in ONE batch → it writes small tickets with
   priority `P1` (broken/real risk) / `P2` (minor bug) / `P3` (cleanup). **Cap 10 tickets per
   run** — extras go into the report as "not ticketed". Record them all in the BOARD as `ready`.
   Patrol tickets go **WITHOUT a `Chain:` field** — findings = independent tickets; if two
   findings share the same cause, it's ONE ticket. Findings tickets follow `templates/ticket.md`
   like any other: title `[Area] Expected result`, a `Type:` line (`bug`, `logic` or `cleanup`;
   `security` for `--sec` findings), and a Problem that says which part of the product is affected
   and what the impact is — readable cold by a PM, verifiable by @qa. NEVER a
   bag ticket ("5 hardenings of X"). "Clean in everything else" goes in the patrol report, not in
   any ticket. BOARD Notes for these rows follow `/squad:run`'s rule: the 1st note is the headline
   (section + impact, plain language), run jargon goes in the later bullets or nowhere.
3. **Autonomous P1 fix** — **cap 3 per run**, in order:
   For fixes that affect a user flow, first apply `/squad:run` steps 0c/1b and
   `docs/flow-review.md`: show and approve the HTML, reusing an unchanged approved artifact.
   each P1 goes through the `/squad:run` step 2 loop (developer → qa, max 3 iterations, BOARD at
   every transition, learnings on APPROVED). `blocked` → next P1.
4. **Close:** only if the user explicitly requested "prueba con WF" / `--wf`, apply
   `/squad:run` step 0d and append one final WF ticket after the P1 fixes, using those fixes as
   dependencies (queued P2/P3 findings are outside this run's implementation scope). Run step
   3b for that ticket: logic/coherence checks, retained video, human review and attachments to
   its own Trello card. Otherwise record `WF: off` and skip that extra gate. Always apply step
   3c for final high-risk changes. Set phase `idle`
   only when the verified queue is complete, with `Next step: merge + clean` until close.
   Commit BOARD + tickets + flow planning artifacts by explicit path, then
   `worktree.sh merge` + `clean` (same as `/squad:run`). A `blocked` P1 → **don't merge**: the
   worktree stays alive; likewise for incomplete required flow/PM review or Trello evidence
   delivery. Report: findings by priority · tickets created · P1s fixed
   (commits) · blocked with reason · what's queued for `/squad:run`.

## Rules

- A finding without a concrete repro/evidence is NOT a ticket — it goes in the report as an open question.
- Don't invent findings to justify the run: a clean patrol = "patrol clean", and that's it.
- `squad.md` Forbidden zones: don't scan them to "improve" them and don't touch them in fixes.
- Quota fallback: same as `/squad:run` (override `opus` in the call).
