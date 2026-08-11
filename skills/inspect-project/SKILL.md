---
name: inspect-project
description: Inspects a repository and writes or refreshes its .claude/squad.md — the contract the squad's global agents read. Use it when onboarding a new project into the loop (route R5), when the squad.md has drifted from the real code, or when an agent STOPS because a section is missing. Read-only over the code: it never modifies it.
argument-hint: "[project path] [--refresh]"
---

# inspect-project

Onboards a repo into the squad: reads the real code and **writes `.claude/squad.md`**. It's the
alternative to filling in the template by hand — which is how drift happens (a `verify.sh` that
covers 5 subprojects and a `squad.md` that announces 3).

Read-only over the code. The **only** file you write is `.claude/squad.md`.
Caveman: terse, technically exact, no filler.

## The rule that overrides every other

**Anything you can't confirm by reading the repo goes in as `unknown`.** A `squad.md` with honest
gaps works: the agents STOP and ask. An invented `squad.md` makes them work on lies.

And in particular: **never invent the `§Verification` command.** It's the gate — the only shared
truth between `@developer` and `@qa`. Propose candidates with their evidence and **ask for
confirmation** before writing it.

## Process

1. **Confirm the path** and that it's a git repo. If `.claude/squad.md` already exists:
   - without `--refresh` → say so and stop (don't overwrite it unasked);
   - with `--refresh` → refresh mode (below).
2. **Read the manifests**, don't guess the stack: `package.json` (+ the ones in subfolders),
   `go.mod`, `pyproject.toml`, `Cargo.toml`, `requirements.txt`, `Gemfile`. Frameworks, real
   versions and scripts come from there.
3. **Map the structure**: top-level folders, subprojects (each with its own manifest),
   entry points, where the code lives vs. the assets vs. the docs.
4. **Detect the candidate gate**, in this order of preference:
   - `scripts/verify.sh` or another verification script that already exists;
   - the `package.json` scripts (`test`, `typecheck`, `lint`, `build`) or the stack's
     equivalent (`go test ./...`, `pytest`);
   - a project skill (`.claude/skills/`) — careful: **a gate can be a skill, not a bash
     command**; don't force a `verify.sh` where there isn't one.
   If there are several subprojects, the real gate is usually "all of them" — check what each covers.
5. **Sensitive zones**: auth, payments, migrations (`migrations/`, `supabase/migrations/`), secrets
   (`.env*`), production config, infra. They go to `§Forbidden zones`.
6. **Paths**: where the tickets live (`tickets/`, `docs/dev/tickets/`…), whether there's a `BOARD.md`,
   whether there's knowledge (`.claude/knowledge/`), whether there's backlog/roadmap for `§PM`.
7. **Git**: current branch and real policy (`git log` of the main branch: are there merges of feature
   branches or direct commits?). Don't propose a policy the repo doesn't use.
8. **Run read-only commands only** (`git log`, `ls`, `cat` of manifests). Never install, migrate,
   build or run tests: it can have side effects and it's not your job.
9. **Write `.claude/squad.md`** from `${CLAUDE_PLUGIN_ROOT}/templates/squad.md`, with ALL its
   sections. The ones you couldn't confirm: `unknown — <what's left to find out>`.
10. **Report**: what you detected with evidence (the file that proves it), what stayed `unknown`, and
    the proposed gate **as a question**.

## `--refresh` mode

Don't rewrite from scratch. Compare the existing `squad.md` against the real repo and report
**divergences** before touching anything:

- declared commands that no longer exist (or that cover less than the real gate runs);
- declared paths that don't exist;
- stack or versions that changed;
- new subprojects the squad.md doesn't mention;
- template sections that are missing (`§Knowledge` is the most forgotten one — its default is
  `.claude/knowledge/`, so its absence breaks nothing, but declaring it is better).

Update **only the divergent sections**. Don't rewrite the ones that are fine: the `squad.md` carries
human context (quality bar, product rules) that you can't re-derive from the code.

## Limits

- `squad.md`: ~120 lines max. It's an operational contract, not the project's documentation.
- Don't document file by file. Folders and responsibilities.
- Don't touch code, tickets, the BOARD or `.env`.
- Don't add dependencies or scripts "that would be missing".

## Done when

- Every command you wrote really exists in the repo.
- Every path you wrote really exists.
- The sensitive zones are marked.
- The gate is confirmed by the human, or explicitly marked `unknown`.
- What's uncertain appears as `unknown`, not as an assumption dressed up as fact.
