# Flow review — HTML before building, an optional final WF ticket

Shared procedure for the lead, architect, developer and QA. Applies when a change affects a
screen, navigation, user action or its observable outcome, including backend changes that alter
that outcome. All routes use it, including R0 and forced routes; `DESIGN.md` does not replace it.
Purely internal changes with no effect on a user flow record `Flows: n/a — <reason>` in BOARD.
The HTML planning review below still applies to user-facing changes. The final workflow test,
video and product acceptance in sections 2–5 are **opt-in**: only an explicit user request such
as "prueba con WF", "test with WF", or `--wf` enables them. Here WF means the completed user
workflow; the HTML is its wireframe/prototype. `--video` remains separate per-ticket evidence.
Record `WF: off|requested` and the request in BOARD. With WF off, there is no final WF ticket,
extra recording or final product-review gate. Both Claude and Codex follow this same procedure.

Use the project's existing browser tests. Default for a web app without them: Playwright, run
locally. No TestSprite account, paid testing service, new AI runner or custom dashboard. Agents
write tests; ordinary reruns execute those tests without model calls. Tests and data preparation
belong in the target app, not the squad plugin. This guide is a procedure, not a preinstalled runner.

## 1. Map and show the change

The architect reads the real routes, actions and callers and creates/updates one small flow doc
and an adjacent standalone, clickable HTML wireframe in the project's `§Flows` path. If that
section is absent, use `<tickets-path>/flows/` and record the path in BOARD. The lead does this on
R0. Reuse one document per flow across tickets/runs; do not create a parallel spec system.

The flow doc contains:
- Stable flow ID, user/role, starting state, steps and expected result.
- Entry-point table: `screen/access | current behavior | keep/change/remove/redirect | expected
  behavior | source file | test`. Include menu, dashboard, lists, details, mobile variants,
  empty states, notifications and direct URLs when present. Search by destination/action and
  meaning, not only the button text. Multiple consistent entry points are allowed.
- Essential cases: happy path, relevant empty/error/permission states, and things that must no
  longer be possible. Link existing acceptance criteria rather than duplicating them.
- Coherence: contradictory actions or copy, missing prerequisites, dead ends, duplicate actions
  with different outcomes, and states that violate the product's rules. Flag them while planning
  the HTML, before they turn into implementation tickets; unresolved decisions go to the human.
- HTML path, mapped tickets and browser test names/paths. Unknown coverage stays explicit.

The HTML uses dummy data and shows the connected screens, entry points and changed states.
Keep it plain; no framework, backend or visual design service just for the wireframe. It is
labeled as a prototype. A small copy/style change needs only the affected context in HTML.
The lead opens it for the human before feature implementation, with the entry-point decisions.
Record explicit approval and the artifact revision (hash of the flow doc + HTML) in BOARD;
for multiple flows, record each revision. A link alone is not approval.
Fold this into the existing planning checkpoint, not another questionnaire. Unchanged approved
HTML can be reused. A changed journey/entry point needs an updated preview and approval.

## 2. One final WF ticket — only when requested

The architect (lead on R0) appends exactly one ticket for the requested flow set, using
`templates/ticket.md`. Reuse it on resume, retry or a late request; do not add one per task.
It stays last, after all implementation, test-setup and repair tickets, including chains.
For a request to test an existing flow, it can be the only ticket if the environment is ready.

- Title: `[WF] <user outcome to verify>`, e.g. `[WF] Create a quote from a client end to end`.
- Problem/Expected result: explain who follows the journey, its starting state, ordered steps
  and expected outcome in plain language. Put a short `Example:` journey in BOARD Notes so the
  Trello card explains the flow too; the sync does not read ticket files.
- 3–5 acceptance criteria: the journey and essential regressions pass; all entry-point and
  business-logic checks pass; the WF video, approved HTML and report are attached to this card;
  the human accepts the real result. State any unavailable Google-login coverage separately.
- Technical notes: `Kind: flow-review`, `Type: logic`, `QA: video`, `Flow:` docs/HTML,
  `Depends on:` all implementation/setup/repair tickets, and the real test/artifact paths.
  Do not assign it `Chain:`; it does not replace a chain's closing gate.

This is a verification ticket owned by `@qa` in **Flow close** mode, not a new agent or a
developer task. The lead waits for every dependency to be `done`, freezes the final app version,
then moves it `ready → qa`. No concurrent implementation during this final review. It stays
`qa` while awaiting the human or attachment delivery; missing setup or a failed review can
mark it `blocked`. Report the exact pending step. It reaches `done` only when flow QA, human
acceptance and required delivery are complete.

Product defects become ordinary repair tickets inserted before this same final ticket.
After repairs, reopen it and rerun the failed/affected cases against the new version. A rule
that contradicts the intended product is `REJECTED (design)` and goes to the architect/human;
do not silently change expectations to obtain a pass. Keep max three automatic flow-fix rounds.

## 3. Set up each app once — for requested WF tests

Record real commands and paths in `.claude/squad.md §Flows`: start, prepare test data/auth, run
essential flows, run affected flows, HTML report and video outputs. Discover existing commands;
if missing, put the smallest setup work in a ticket before implementing the feature. Do not call
an unconfigured or empty suite a pass. The PM should not supply credentials on every run.

### Supabase + Google: automatic test sessions

First confirm the app uses Supabase Auth, not just its database. If another library owns Google
login, reuse that library's supported test-session setup; do not replace the app's auth system.

Default: the app and Playwright run on the host; the official Supabase CLI runs local Supabase
in containers. Reuse an existing isolated test environment if already configured. Do not build
a custom Docker image or containerize the whole app just for this. Apply the app's migrations
and seed only synthetic data. Never reset a shared developer database; own a dedicated test
instance, or use isolated fixtures and cleanup only the records created by the test.

Before setup writes anything, verify the effective app URL and Supabase endpoint both point at
the declared test environment. A local app can still point at production. Worktree bootstrap
symlinks `.env*` from the main checkout: never overwrite those files or trust their defaults.
Use explicit test configuration. Default to loopback Supabase; no automatic fallback to a
hosted project, production credentials or a production session if local setup is unavailable.

Use the installed Supabase SDK and the app's existing auth helpers:
1. Seed/reuse a confirmed synthetic Auth user with a fixed email such as `qa@example.test`.
   Prepare its normal app profile, organization and role using the app's real schema. If tests
   run concurrently and change shared state, give each worker isolated users/data, or run serially.
2. In Node/test setup only, generate a magic link with
   `supabase.auth.admin.generateLink({ type: 'magiclink', email })`. Consume its token using
   Supabase's verification API to obtain a normal user session. No inbox, password entry or
   Google account is needed; refresh the session automatically on each suite run.
3. Install that session using the app's actual session mechanism, then save Playwright
   `storageState`. SPA local storage and SSR cookies are different: inspect the app and use
   its installed SDK/cookie helpers; do not assume a universal storage key or invent cookies.
   Confirm a protected page and server-side user lookup work before running the flow.
4. The browser and business requests use the regular user session. Keep RLS, organization
   boundaries and role checks enabled. Admin/service keys are setup-only: never inject them
   into the browser, a public env variable, logs, reports, video or committed files.

Do not add a public login bypass, disable authorization or pretend the fixture has a Google
identity. If behavior depends on the provider or Google API tokens, cover that separately.
Ignore auth state and local secrets in Git. Keep setup tokens out of recorded pages/traces;
record the flow in a fresh context after authentication has completed.

This verifies **the app after login**, not Google's OAuth redirects/consent. Keep a separate
Google-login smoke check when an authorized real account is available; otherwise report
`Google OAuth: not verified`. Never turn that limitation into a claim that Google login passed.

## 4. Verify and record the completed flow

Keep TDD and per-ticket QA. Run the essential suite plus affected flow cases once at run close,
after all implementation/setup tickets are done, through the final WF ticket on a frozen final
commit. Reuse closing QA evidence
only if it already covers that same final version and all required cases. Do not rerun the full
journey for every intermediate ticket. After fixes, rerun the failed and affected cases; broader
changes require the essential suite again. A changed expectation must come from the approved
flow, never from weakening an assertion until it passes.

QA independently searches for additional entry points and checks the map against the app.
Check retained/redirected accesses and assert removed or forbidden paths cannot perform the old
action. A passing happy path alone is insufficient. Treat missing, skipped or flaky required
cases as unverified; separate environment/auth failures from product failures.

Also review the journey's logic independently of its assertions: can the user finish and find
the saved result; do status, totals and ownership stay consistent after reload/back/retry; do
desktop/mobile controls agree; can an alternate access bypass a prerequisite or permission?
Check applicable cancellation, empty and error paths for dead ends or duplicate side effects.
Use the approved product rules, not invented business requirements. Each finding includes
reproduction steps, expected vs actual behavior and evidence. A green suite alone does not
override an evidenced inconsistency. Record checked cases and gaps even if no defect is found.

Record the complete affected journey with Playwright's `use.video: 'on'` in the project's
flow-test config (not an invented `--video` CLI flag). Keep successful videos too. Use a readable
viewport and meaningful `test.step` names; wait for real UI states, not arbitrary long sleeps.
Keep each journey in one test/context where possible; close contexts so videos are saved.
Use the built-in HTML report with attached videos and a trace for failures. A real browser
recording is the deliverable: no generated animation, edited reconstruction or paid video tool.

Evidence identifies the flow, tested commit, fixture role, cases/outcomes, HTML report and video
paths, and Google OAuth coverage separately. QA checks that the video exists, is playable and
shows the intended start-to-finish journey. Missing required video means the flow review is
incomplete even if the ticket tests pass. Do not quietly fall back to screenshots.

## 5. Human review and durable evidence

Before reusing/deleting the review worktree, the lead copies the report and its referenced
videos/traces to `<main-repo>/.squad-artifacts/<run-id>/<commit>/` (Git-ignored), or the project's
declared persistent artifact directory. Preserve the report's relative asset paths. Auth state
and secrets are excluded. Confirm the copied report/video opens; return a clickable report link
and display the video to the human where the host supports it. Tracker upload does not replace
a persistent local copy. With Trello configured, follow the upload procedure below.

BOARD records `Flow review: pending | passed | blocked | n/a`, tested commit, artifact paths,
and `PM review: pending | approved | changes-requested | n/a` with the human's decision and
reviewed commit. Show the human the real result/video and let them accept the product before
merge. A new idea updates the flow and HTML; a failure to meet the approved flow goes back to
the developer. Preserve the existing max-three-fix-iterations rule for automatic flow fixes;
after that, leave the run blocked and recoverable.

Implementation tickets being `done` does not close a requested WF review. The final WF ticket
must also reach `done`, with flow QA, PM review and required delivery complete.
If code/tests change or the branch is rebased, invalidate affected evidence and review, verify
the new version and show the updated result. A commit that only records status/evidence may
retain approval if the lead verifies it changes neither app/config/tests nor approved behavior
or HTML. Resume reads these
fields and continues the unfinished review instead of rebuilding or requesting credentials.

### Trello attachments — reuse the existing integration

Use `Trello: board <id>` from `squad.md §Paths`, the final WF ticket's slug in BOARD, and the
existing `TRELLO_KEY`/`TRELLO_TOKEN` configuration. Do not add a second tracker or ask for a new
account. The lead syncs BOARD first so the cards exist, then uses the existing uploader:

```bash
node <plugin-root>/scripts/trello-attach.mjs <board-id> <final-wf-ticket-slug> <flow-video.webm> <approved-flow.html> <report.zip>
```

Attach the evidence to the **final WF card**; implementation cards may link to that card, without
duplicating recordings. Put the journey's `Example:` and short QA summary (flow, tested commit,
role, verdict, logic findings, Google coverage) in that row's BOARD Notes; `trello-sync.mjs`
already carries them to the card. The video and approved standalone HTML are separate files;
zip only the HTML report directory and its relative assets, never the repo or auth state.
Inspect the artifacts for credentials; exclude setup auth traces, `.env` and saved sessions.

The uploader deduplicates by **filename**. Before uploading, create immutable evidence copies
named with flow/run/commit/case/attempt, preserving the extension. A new result gets a new name;
a retry uses the same files and names. Never send every recording as `video.webm`. Preserve the
HTML report's internal asset paths inside the archive. Keep failed and successful attempts.

Track `Trello evidence: pending | uploaded | blocked | n/a` in BOARD with card links and filenames.
Mark uploaded only after checking the attachments on the final WF card for the reviewed version;
use the existing connector/API to read back attachment metadata. `--dry-run` only skips uploads:
the existing helper still reads Trello and needs its normal credentials.

A new result resets delivery to pending. Failed uploads, missing cards/access or oversized
files retain local evidence and leave delivery pending/blocked for retry, without rerunning
passing tests. Development may continue, but do not claim delivery or close a run requiring
these attachments until they are uploaded or the human explicitly waives delivery. Use `n/a`
only when no Trello board/delivery is configured; an upload failure is never `n/a`. Do not delete
older attachments or silently substitute a local path for the requested video.

## References

- [Supabase local development](https://supabase.com/docs/guides/local-development)
- [Supabase admin links](https://supabase.com/docs/reference/javascript/auth-admin-generatelink)
- [Playwright authenticated state](https://playwright.dev/docs/auth)
- [Playwright videos](https://playwright.dev/docs/videos)
- [Playwright HTML reports](https://playwright.dev/docs/test-reporters#html-reporter)
