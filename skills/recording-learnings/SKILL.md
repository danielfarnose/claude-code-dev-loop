---
name: recording-learnings
description: Captures what Claude Code or Codex learned during a squad run — gotchas, anti-patterns, non-obvious decisions, and causes of QA rejections — in the project's versioned knowledge base. Use after APPROVED before reporting, after a non-obvious debug, or when explicitly asked to record squad learnings. The path comes from .claude/squad.md §Knowledge.
---

# recording-learnings

Workflow memory. Write down what does NOT follow on its own, so the next session doesn't re-learn it.
It's the "write" half of self-learning — the "read" half is done by @architect in its Step 0.
Caveman: terse, technically exact, no filler.

`.claude/squad.md` and the default `.claude/knowledge/` are shared compatibility paths. Both Claude
Code and Codex use them; do not fork knowledge by host.

## Where

The path is declared by the current project's `.claude/squad.md §Knowledge`; if the section is missing,
default `.claude/knowledge/`. If the directory or `INDEX.md` don't exist, create them with a minimal header:

```md
# Project knowledge — <name>

Workflow memory: gotchas, anti-patterns, non-obvious decisions. Written by the
`recording-learnings` skill at the close of the loop. What's already in code/git/tickets/docs does NOT go here.

## Recent learnings
```

## When to record

- Ticket close: after @qa's `APPROVED`, before reporting success.
- **Every intermediate REJECTED in the loop**: the root cause of the rejection is a direct
  candidate (what pattern would have avoided it on the first pass?).
- After a non-obvious debug (the real cause wasn't the apparent one).
- On discovering a gotcha, anti-pattern or environment constraint.
- A decision whose "why" isn't left in code, `git log`, tickets or docs.

If none of this came up: do NOT invent. Report `learnings: 0` and move on.

## What NOT to record

- What's already in the code, `git log`, tickets or docs (don't duplicate).
- Ephemeral details of the conversation.
- How a feature works (that goes in docs or in the ticket).

## How to record

1. Pick a topic file in the knowledge directory: general → `gotchas.md`; a domain with
   several learnings → its own file (e.g. `db.md`, `auth.md`, `pipeline.md`, `deploy.md`).
2. **Dedupe first:** if an entry on the same topic already exists, UPDATE it, don't duplicate.
3. Append with this format (stable anchor = the title):
   ```
   ### <short title>
   **What:** <the fact, one line>
   **Why:** <reason / context>
   **How to apply:** <what to do next time>
   ```
4. Add/update ONE line above `## Recent learnings` in `INDEX.md`:
   `- YYYY-MM-DD — <summary> [topic](file.md#anchor)`. Date = today (currentDate from the system
   prompt; don't invent it).
5. Link between topics with relative markdown: `[text](file.md#anchor)`.

## Size rule (mandatory)

- `INDEX.md` has a **hard cap of 500 lines**. A new minimal index is valid; grow it only with real
  learnings.
- Near the cap, or a topic file >~400 lines: split into linked files and leave only a
  summary line + link in `INDEX.md`.
- Verify when done: `wc -l <path>/INDEX.md` ≤ 500.

## Report (caveman)

`learnings: N new -> <files touched>` or `learnings: 0`. Nothing else.
