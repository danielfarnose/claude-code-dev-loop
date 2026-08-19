# Squad — <PROJECT>

Shared knowledge contract for squad roles in Claude Code and Codex (@pm · @architect · @developer ·
@qa). The PROCESS lives in the `squad` plugin; what is specific to THIS project lives here. The
`.claude/` path is retained so both hosts use one versioned contract. Fill in ALL sections — roles
STOP if what they need is missing.

## Product and end user
<!-- What the product is and WHO uses it. The architect and the pm prioritize/design with this
person in mind. E.g. "mobile SaaS for contractors" / "local operator dashboard". -->

## Real stack
<!-- REAL frameworks and versions, per subproject if there are several. What NOT to use (forbidden tech). -->

## Quality bar
<!-- What makes a task "done" and what is blocking. E.g. "mobile-first, iPhone Safari P0"
or "local operator desktop, NOT mobile-first". Be explicit about what does NOT apply. -->

## Required reading before working
<!-- Docs the agents read after squad.md: architecture, per-domain rules, knowledge base. -->

## §Navigation — code graph (codebase-memory-mcp) · graphify (optional)
<!-- EXACT name of the indexed project, e.g. `Project: Users-<user>-code-<repo>`. With this the
agents go straight into the graph (trace_path, get_code_snippet, search_graph) without paying for
list_projects. If the repo isn't indexed: run index_repository(repo_path=<repo>, mode="fast")
once and note the name here. After big changes, re-index or the graph lies.
Graphify (optional): if the repo has `graphify-out/` (built once with /graphify .), agents use it —
@developer runs `graphify query "<q>" --budget 1500`, @architect reads GRAPH_REPORT.md. It also
covers docs/configs, which the code graph does not see. Refresh after big merges (`/graphify
--update`) or it lies. Without graphify-out/ nothing changes — agents detect it by presence. -->

## Paths
- **Tickets:** `<path>/` — <!-- where @architect writes and @qa reads. The tickets live in
  THIS repo, always. Queue format/order if there is one. -->
- **Board:** `<tickets-path>/BOARD.md` — loop state + ticket queue. Written ONLY by the
  lead (/squad and /patrol); the agents don't touch it. If it doesn't exist, the loop creates it.
- **Trello (optional):** `Trello: board <id>` — one-way visual mirror of the BOARD (`/board` or the
  close of /squad sync it; editing Trello by hand does not persist). Without this line, no sync.
- Code: <!-- main folders -->

## §PM
<!-- Backlog, specs and roadmap paths + prioritization context. If this project doesn't use pm,
write literally: "No pm — <where the backlog lives and who curates it>". -->

## §Knowledge
<!-- Path of the project's knowledge base (default: `.claude/knowledge/`). Written by the skill
`recording-learnings` at the close of every approved ticket; read by @architect in its Step 0.
If this section is missing, the agents use the default and carry on. -->

## §Verification — @qa and @developer gate
<!-- THE exact command (or skill) that decides green/red. It is the SAME truth for developer and qa.
Add conditional extra checks: "if it touches runtime → startup smoke", "if it touches UI → ...".
Video (if a ticket marks `QA: video`): exact recording command, e.g.
`npx playwright test <spec of the flow touched> --video=on --trace=on` (artifacts in test-results/).
No e2e specs for the flow → @qa reports it as "video not available", it doesn't block. -->

## Forbidden zones (blocking for @qa)
<!-- Folders/files the dev squad NEVER touches + hard product rules. -->

## §Security
<!-- The project's THREAT MODEL, read by @security (which STOPS if this section is missing — it
never guesses a threat model). Name what would actually hurt here, not generic advice:
- Who must not see what (multi-tenant isolation, roles, data that leaks pricing or margins).
- AI entry points where untrusted text reaches a model (chat, webhooks, imported documents).
- What can destroy data (migrations, bulk deletes, restore paths).
- Public routes and what they are allowed to return.
If the project genuinely has none of this (a local single-user tool), say so literally:
"Single user, local only — no tenant isolation" so the auditor scopes itself instead of stopping. -->

## §Skills by task type
<!-- Mandatory extra skills depending on the task (e.g. design skills if it touches UI). "None extra" if
only the agents' own apply (ponytail, TDD) + the design ones (impeccable → motion-design, and
gsap-* if the project uses GSAP) that @developer applies on UI tasks when they're installed.
To disable that default in this project, say so explicitly here. -->

## Git / close
<!-- Branch policy, what gets committed/pushed on close, what never gets uploaded.
NOTE: `/squad:run` (Claude) and `$squad:codex-run` (Codex) run every task in an isolated worktree (branch `squad/<run-id>`) and merge it with
`--ff-only` into the branch that was active at start. It's serial: one run at a time. So "straight to
main" is still true — the worktree is a loop detail, not a branch policy of the
project. Declare the real base branch here (`main`, `master`) if it isn't obvious. -->
