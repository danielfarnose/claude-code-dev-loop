---
description: Fires the squad loop with routing (which agents run), serial worktree, recoverable BOARD, multi-ticket queue and learnings. The ONLY trigger of the loop.
argument-hint: <task> [--video] [--route R0..R6|--full] | resume | status
---

Run the **squad development loop** on:

$ARGUMENTS

You (LEAD) orchestrate; the agents do NOT call each other. Every agent reads `.claude/squad.md` of the
current project (Step 0). Caveman mode. Non-blocking permissions (acceptEdits) — subagents do not
show prompts.

## BOARD — state + visual board (ONLY you write it)

`<tickets-path>/BOARD.md` **inside the run's worktree** (tickets path from `squad.md §Paths`).
BOARD and tickets travel with the code and get merged together at closing. If it doesn't exist, create it:

```md
# Board — <project>

## Active run
- Task: <original description>
- Route: <R0..R6> · agents: <the ones that run> · reason: <one line>
- Worktree: <absolute path> · Base: <branch it merges into>
- Phase: planning | implementing | patrol | idle
- Current ticket: <slug> · Iteration: 1/3   ← in pipeline there are two: `<slug-N> (qa) · <slug-N+1> (dev)`
- Next step: <exactly what comes next>

## Tickets
| Ticket | Title | Theme | Prio | Status | Iter | Commit | Notes |
|--------|-------|-------|------|--------|------|--------|-------|
```

Ticket states: `ready → in_progress → qa → done | blocked`. Update it on EVERY transition
(agent launched, verdict, commit) — it is what makes `resume` possible. The agents do NOT touch it.
When moving to `done`/`blocked` stamp `Iter` (e.g. `2/3`) and the cause of the REJECTEDs in Notes —
that's the rejection metric, for free.

**`Theme` = the color label in Trello.** One or two words in the operator's language, about what the
ticket is to HIM: `security` · `project screen` · `publish` · `artwork` · `research` ·
`tests and gate` · `app design`. Reuse the themes already in the BOARD before inventing a new one
(each distinct name creates one more label and the board stops being scannable at a glance). Several
themes per ticket = comma-separated. Without the column the sync still works, but the cards end up
with no label: that's what the operator asked to fix on 2026-08-02 («that they come out with a
security tag, so people know»).

**How the Notes are written (a human reads them, and that human is NOT a dev).** The cell is split on
` · ` and the sync spreads it across three levels, so write it with that in mind — often it's the
ONLY thing anyone will read about the run a month from now:

1. **The 1st note is the HEADLINE** and goes loose at the top of the card: what changed for the
   product's user, in plain English. No test counts, no hashes, no CLI flags.
2. **A note starting with `Example:`** is promoted, right under the headline. Add it whenever the
   ticket is hard to understand without seeing the concrete case — the operator asked for it
   explicitly. It's one of his use cases, not a test case: *«Example: you change the palette from the
   Project screen; that used to leave 13 tests red, now nothing happens»*.
3. **The rest is the detail** and comes out as bullets: verdict, gate, what the @qa tested, cause of
   the REJECTEDs. The sync cuts at 8 bullets and 40 lines (and warns that it trimmed) — the full
   technical detail lives in the repo's ticket, not on the card.

- Bad: `**APPROVED · full gate** · studio 1044 (=), reel 56 (=) · exact diff (+69/-0) · sha256 of the 8 images verified`
- Good: `The operator can now pick 4 new styles in «Art direction» · Example: you open «Art direction», pick «illustrated urban chronicle» and your carousels come out with that linework · APPROVED, full gate (studio 1044, reel 56, producer 170) · bounded diff: +69 lines and the 8 thumbnails`

Same rule for the row's `Title`: it should be understandable without opening the ticket. File names,
flags and counts go in the following notes, not in the first one.

**Trello mirror — push on EVERY BOARD write** (if `squad.md §Paths` declares a board):

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/trello-sync.mjs <BOARD.md> <board-id>
```

One-way push, idempotent and cheap (it only touches the cards that changed). Run it as soon as you
save the BOARD: when registering the tickets, when launching each agent, on every verdict and at
closing. That way the operator sees the cards move from list to list live instead of all appearing at
the end. The agents do NOT touch Trello — the one dragging the cards is you, writing the BOARD. If the
sync fails, do NOT stop the run: report the error in one line and continue (the BOARD is the truth,
Trello is the mirror).

**Visual evidence — upload it to the card on EVERY verdict** (the BOARD carries text, not images):

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/trello-attach.mjs <board-id> <ticket-slug> <file...>
```

The @qa's screenshots (and the @developer's) live in an ephemeral scratchpad and their path dies with
the session: if they aren't uploaded, the evidence is lost and the card keeps the claim without the
proof. Run this with the paths the agent reported, right after the verdict's `trello-sync` — on
APPROVED as well as on REJECTED (the photo of the defect is the most useful one). Idempotent: it skips
what's already attached by name, so re-running it is free. Same criterion as the sync on a failure:
one line of error and you continue.

## /squad:run <task>

0. **Run worktree (you run it).** The loop is **serial**: one run = one worktree = one branch
   `squad/<run-id>`, and the next one branches off the base branch already merged.

   ```
   bash ${CLAUDE_PLUGIN_ROOT}/scripts/worktree.sh new <repo> RUN-<YYYYMMDD>-<NN>
   ```

   It prints the path to stdout — **it is the working path for the whole run**. If it fails on the cap
   (there's already a live run) → STOP: either `/squad:run resume`, or close the previous one. The main
   repo may be dirty: the worktree comes off what is *committed*, so it isn't affected (the script
   warns anyway, because dirtiness can indeed block the closing merge).
   BOARD: Active run = task, `Worktree:`, `Base:`, phase `planning`.

0b. **Routing — decide which agents run, BEFORE launching any.** Extract the signals from the
   task, **print them**, and apply the table **in strict order: the first one that matches wins**.

   | # | Route | When | Agents |
   |---|-------|------|--------|
   | 1 | `R5_NEW_PROJECT` | the repo has no `.claude/squad.md`, or it's a new product | skill `inspect-project` → pm → architect → **checkpoint** → developer → qa |
   | 2 | `R6_HIGH_RISK` | payments · auth/permissions · tenant isolation · migration · data deletion · secrets (**closed list**, the same one as `Risk: high`) | (pm if it's also ambiguous) → architect → **checkpoint** → developer → qa (**opus**) → @security |
   | 3 | `R4_PM_ARCHITECT` | ambiguous **AND** structural | pm → architect → developer → qa |
   | 4 | `R3_ARCHITECTURE` | new module · changes a contract or the data model · external integration · new dependency · background jobs · deploy/infra | architect → developer → qa |
   | 5 | `R2_PRODUCT_CLARIFICATION` | it isn't clear WHAT should happen; there are several business readings; the developer would have to invent behavior | pm → architect → developer → qa |
   | 6 | `R0_TRIVIAL` | copy · typo · doc · small style · mechanical change — **and** it doesn't touch a forbidden zone | developer (you run the gate) |
   | 7 | `R1_STANDARD` | fallback: clear requirement over a pattern that already exists | architect → developer → qa |

   Print exactly this and save it in the BOARD's `Route:`:

   ```
   Signals: new_project:no · risk:no · ambiguous:no · architecture:yes · trivial:no
   Route: R3_ARCHITECTURE · agents: architect → developer → qa · reason: new external integration
   ```

   - **Torn between two routes → the more expensive one.** Never R0 if it touches a forbidden zone of `squad.md`.
   - **Human override:** `--route R1` forces the route; `--full` = R4. Note it in the BOARD
     (`Route: R1_STANDARD (forced)`).
   - **`Route:` lives in the BOARD** → `resume` does not re-route.
   - **R2/R4/R5 start with @pm:** it writes the spec at the path from `squad.md §PM` and the @architect
     receives **the spec**, not the raw task. If `§PM` says "no pm" → drop to R1/R3 and say so.
1. @architect (task or pm spec) → 1..N ordered tickets (big task = split with dependencies).
   Register them all in the BOARD as `ready`, in order. Phase `implementing`.
   **R0 skips this step**: you write the micro-ticket yourself, in the same tickets path.
   **Chains (deferred QA):** tickets with a REAL dependency between them carry
   `Chain: <name> · N/M · gate: deferred|closing|full` (the architect marks it — it lives in
   the ticket, so `resume` respects it). No `Chain:` field = normal per-ticket flow.
   **Tickets WITHOUT a chain go FIRST in the queue.** A chain forces serial work (N+1 leans on
   N), so every chained ticket is a pipeline opportunity that is lost: placed at the end, the chain
   lets all the independent ones pipeline first. Measured in
   RUN-20260803-02 — 3 tickets, 2 in a chain, **a single** parallel opportunity in the whole run.
   Ask the @architect for it explicitly when launching it, and if it comes back with the chain up
   front without a dependency forcing it, reorder it yourself (the order is yours, the chain is his).
   **QA evidence (lives in the ticket, not in your memory — that's how `resume` respects it):**
   - Default: every ticket carries `QA: screenshots` (the normal gate's evidence).
   - With `--video`: tell the architect that every ticket touching UI carries `QA: video`.
   - The task asks for video on one specific ticket ("X with video") → the architect marks only that one.
1b. **Review checkpoint — BEFORE touching code.** Push to Trello and show the operator the queue
   in a compact table (`# · ticket · what it does in one line · chain/gate`), plus the
   `Route:` line, the hard data the architect verified and the gate's baseline. Ask "do I start or do I
   adjust scope/order?" and **wait for their answer**. Changing the scope here is free; after 9
   commits it isn't. If they ask for adjustments → go back to the @architect with them and repeat this checkpoint.
   **R0 skips it** (asking permission for a typo is friction). In `R5`/`R6` it is **mandatory**: without
   an explicit yes, no code gets written.
2. For each ticket in the queue, in order — max **3 iterations**, always show "Iteration X/3".
   **Hand each agent the worktree path** (BOARD's `Worktree:`): that's where they read, edit,
   commit and run the gate. No agent works in the main repo.

   **OpenRouter engine for @developer and @qa — attempt 1; the Agent tool is the fallback.** Within
   a session you can't mix backends per subagent, so these two run as a separate
   process:

   ```
   bash ${CLAUDE_PLUGIN_ROOT}/scripts/agent-or.sh --check     # ONCE per run, BEFORE the first agent
   # then, with the prompt (the SAME one you'd give the Agent tool) in a scratchpad file:
   bash ${CLAUDE_PLUGIN_ROOT}/scripts/agent-or.sh developer <prompt-file> <worktree>   # run_in_background
   bash ${CLAUDE_PLUGIN_ROOT}/scripts/agent-or.sh qa        <prompt-file> <worktree-review>
   ```

   **The `--check` is not optional: run it once at the start and, if it exits 78, don't even try** — note
   the reason in the BOARD and start straight on the fallback. It costs a second and avoids what happened
   on 2026-08-08: two agents launched in parallel died after 2 minutes because of an account with no
   credit, with the diagnosis arriving after the run instead of before.

   Model: `openai/gpt-5.6-sol` (override: `OPENROUTER_MODEL` in `~/.claude/squad.env`). The process's stdout is
   the agent's output (the @qa's verdict included). Rules:
   - **ENGINE failure → fall back to the usual Agent tool, same prompt, without consuming an
     iteration.** An engine failure is: exit ≠ 0 (**78 = the engine is not usable**: missing
     `OPENROUTER_API_KEY`, or the key doesn't infer, or the account has no credit for an agent
     turn), timeout, output with no new commit (developer, verify with `git log`) or with no
     `APPROVED`/`REJECTED` (qa).
   - **A REJECTED from the @qa is NOT an engine failure** — it's the normal loop: the next iteration
     goes back to OpenRouter.
   - The `ANTHROPIC_*` env lives ONLY inside the script's process — never export it in your
     session (it would redirect you entirely to OpenRouter).
   - @architect, @pm and @security do NOT change: they still go through the Agent tool.
   - Note in the BOARD which engine ran each verdict (`engine: or/gpt-5.6-sol` or
     `engine: fallback sonnet`) — without that you can't compare quality later.

   a. BOARD: → `in_progress`. @developer (ticket path) → implements + runs the gate from
      `squad.md` + commits ONLY what belongs to the ticket.
   a2. **dev‖qa pipeline — it's the default, not an optional optimization.** The @qa doesn't need the
      run's worktree: it needs **the commit**. Freeze it and launch both agents **in the same
      message**, so they run in parallel:

      ```
      bash ${CLAUDE_PLUGIN_ROOT}/scripts/worktree.sh review <repo> <run-id> <developer-hash>
      ```

      It prints to stdout a *detached* worktree at that commit, already bootstrapped (the gate runs
      there). It's disposable: reused on every verdict, `clean` takes it away, and **it doesn't consume
      the serial cap** — the run is still one.
      - @qa → that review path **plus** the absolute path of the ticket in the run's worktree (the
        tickets are only committed at closing, so they aren't in the frozen tree).
      - @developer of ticket **N+1** → the run's worktree path, as always.

      **Serial (don't parallelize) if:** N+1 declares `Chain:` with N —its code leans on the
      previous one— · the route is `R0_TRIVIAL` (there's no @qa and you run the gate: serial is
      faster) · there's no other ticket left in the queue. **Those three, and no others.**
      **Two tickets stepping on the same files is NOT a reason to serialize the @qa.** That
      clash is between *developers*, and the developers already go one at a time. The @qa reviews the
      *frozen* worktree of the commit: nobody touches it while it reviews. If the @architect warns that
      the tickets share files, that changes the order of the tickets — not the pipeline.
      **Only one @qa in flight.** If the developer delivers N+1 and N's verdict hasn't
      arrived yet, wait for that verdict before launching N+1's @qa — two reviews at once can't
      be reconciled in the BOARD.
   b. BOARD: → `qa`. **In `R0_TRIVIAL` there is no @qa: YOU run the gate.** After the developer's
      commit, run the command from `squad.md §Verification` over the worktree yourself. Green →
      `done`. Red → go back to the developer with the real output (counts as an iteration). That way
      nobody grades themselves and a typo doesn't pay for three agents.
      For the rest of the routes, read the ticket before launching: `Risk: high` → launch the @qa with
      model override `opus` in the call. The mode comes from the ticket's `Chain:` field:
      - **No `Chain:` or `gate: full`** → normal QA: reviews `git show HEAD` + runs the SAME
        gate + the ticket's evidence (`QA: video` → command from `squad.md §Verification`).
      - **`gate: deferred`** (chain intermediate) → cheap-diff QA: ONLY `git show HEAD` against the
        ticket's criteria + forbidden zones + honest copy. NO gate, no evidence (the
        developer already ran the gate green; the heavy one arrives with the closing).
      - **`gate: closing`** (last of the chain) → chain QA, with `opus` override: hand it the
        explicit range `<base>..HEAD` (base = commit of the FIRST ticket of the chain in the BOARD,
        with `^`; drift → git is the truth: count the M ticket commits PLUS the
        `fix(<chain>):` that sit on top, in `git log --oneline`) + the paths of ALL the tickets.
        It runs the full gate + the evidence + the criteria of the whole chain over
        `git diff <base>..HEAD`.
   c. REJECTED → go back to the developer with the reasons. **Launch a NEW @developer, don't resume the
      previous one with `SendMessage`.** Resuming a finished agent reloads its entire transcript and
      costs as much as a new one — measured twice: a two-string fix cost 228k tokens (more than a
      complete developer, 115k), and an amendment over the code the agent itself had just
      written —the case where the context IS used— cost **333k, more than its original commit
      (250k)**. There is no practical exception: hand the new one the ticket, `git show <hash>` and the
      @qa's reasons, which is all it needs.
      **If the developer is in flight with N+1, do NOT interrupt it:** note the REJECTED in the
      BOARD and dispatch it when it delivers. Its commit will no longer be HEAD, so the amendment goes in
      ONE new commit `fix(<ticket>): …` — the same rule that already governs the rejection of a chain
      closing.
      On iteration ≥2 hand it ALL the reasons
      from the previous rounds (the @qa marks them `(new)`/`(recurring)`; recurring = oscillation
      → note it in the BOARD's Notes). Amendment: `git commit --amend` ONLY while its commit is still
      HEAD; with commits on top (rejection of a `gate: closing`) → ONE new commit
      `fix(<chain>): …` that attacks all the reasons together, against the iterations of the closing
      ticket — never rebase. Iteration +1. After 3 REJECTEDs → BOARD `blocked` + STOP and report
      (in a chain: which reason came from which ticket). **If the blocked one has `Chain:`** → mark
      ALL the remaining tickets of that chain as `blocked` with the note `chain broken at <NN>`
      (so `resume` doesn't go on with a closing over a rotten base), and report explicitly that the
      chain's `done · gate deferred` ones ended up WITHOUT the heavy gate.
      **`REJECTED (design):`** (the defect is in the TICKET, not in the code) → go back to the
      @architect to fix the ticket and only then to the developer. It consumes an iteration all the same.
   d. APPROVED → skill `recording-learnings` (task gotchas + causes of the intermediate REJECTEDs;
      "learnings: 0" is valid). BOARD: → `done` + hash + Iter. Ticket with
      `gate: deferred` → `done` with the note `gate deferred → <closing-ticket>` (honest about what was
      verified). Next ticket.
3. Queue empty → if any `done` ticket carries `Risk: high` → ONE call to @security over those
   commits (cap 1 per run) before the report. BOARD: phase `idle` (+ push to Trello, like every
   BOARD write).
4. **Closing — return the work to the base branch.** Only with **all tickets `done`**:
   a. In the worktree, commit BOARD + tickets: `git add <BOARD.md> <tickets>` +
      `git commit -m "chore(run): board and tickets for RUN-…"`. By explicit path, never `-A`
      (the bootstrap symlinks show up as untracked by design).
   b. `bash ${CLAUDE_PLUGIN_ROOT}/scripts/worktree.sh merge <repo> <run-id> <base>` — it's `--ff-only`. If
      it refuses (the base moved), follow its instruction: `git rebase <base>` in the worktree →
      **re-run the gate** → merge again. Never merge without ff: it would put code into the base that
      the gate did not verify.
   c. `bash ${CLAUDE_PLUGIN_ROOT}/scripts/worktree.sh clean <repo> <run-id>` → deletes worktree and branch.
   **Any ticket `blocked` → do NOT merge.** BOARD `blocked`, the worktree stays alive for
   inspection, and report it explicitly. The serial cap prevents starting another run until it's resolved:
   that's on purpose.
5. Report: route used, done/blocked tickets, commits, iterations, learnings, and whether it merged or not.

## /squad:run resume

1. `bash ${CLAUDE_PLUGIN_ROOT}/scripts/worktree.sh list <repo>` → the live run. **The BOARD that counts is that
   worktree's**; the main repo's is the one from the last run already merged.
2. Read the BOARD (Active run + table) and continue EXACTLY from there — don't repeat finished phases, and
   **respect the `Route:` already written: don't re-route**.
3. If the BOARD contradicts `git log` (a commit made but not noted, a done not marked), git is the truth:
   reconcile the BOARD first and continue.
4. No active worktree and no run in the BOARD → say so and stop.

## /squad:run status

`worktree.sh list` + BOARD summarized: route, active run, count by status, blocked ones with their reason, and
whether work was left unmerged. Do NOT modify anything.

## Resilience

- Subagent fails on model quota (fable) → retry the SAME call with `opus` override
  (in the call; do NOT edit the agent's frontmatter). First quota failure in the run → the
  REST of the run uses `opus` directly in the calls to fable agents, and note
  "fable exhausted → opus" in the BOARD's Active run (so `resume` doesn't trip again).
- No task after the command and no active run in the BOARD: ask me for the task in one line.
- The run's worktree **is not deleted on a failure**: it's the one that makes `resume` possible. It's only
  cleaned after a successful merge, or by hand with `worktree.sh clean … --force`.

## Routing reference cases (check them when you touch the table)

| Task | Expected route |
|------|----------------|
| "Change the Submit button text to Get my estimate" | `R0_TRIVIAL` |
| "Add a reminder 24h before the visit" *(the project already has scheduler and email)* | `R1_STANDARD` |
| "Add a reminder 24h before the visit" *(there's no scheduler: it has to be created)* | `R3_ARCHITECTURE` |
| "I want the client to be able to approve the estimate" *(sign? confirm? pay?)* | `R4_PM_ARCHITECT` |
| "Improve the onboarding, we're losing people" *(what to change isn't defined)* | `R2_PRODUCT_CLARIFICATION` |
| "Migrate the pricing table and delete the old columns" | `R6_HIGH_RISK` |
| "Kick off the advertising platform" *(repo with no `squad.md`)* | `R5_NEW_PROJECT` |

If a real task falls into the wrong route, **the table** gets adjusted, not the case's outcome.
