# Supabase helpers — SQL and a QA login without a human

## Quick start — copy, paste, done

**What this is:** your apps use Google login. Robots can't log in with Google. So each project gets
one robot account (email + password) that only the agents use. You set it up once; after that
nobody asks you to log in ever again.

**Before you start** you need two things from the Supabase dashboard:
- **Your token**: Account (top-right avatar) → Access Tokens → *Generate new token* → copy it. It starts with `sbp_`.
- **The project ref**: open the project; the URL is `supabase.com/dashboard/project/XXXXXXXX` → copy that `XXXXXXXX`.

Paste each block into the server terminal (or type it after `!` inside Claude Code).

### Part 1 — first time only (do this once, never again)

```bash
mkdir -p ~/.local/bin ~/.config/supabase
ln -sf ~/projects/claude-code-dev-loop/scripts/supabase/sbq ~/projects/claude-code-dev-loop/scripts/supabase/sbauth ~/.local/bin/
touch ~/.config/supabase/sbq.env && chmod 600 ~/.config/supabase/sbq.env
```

```bash
echo 'SUPABASE_ACCESS_TOKEN=sbp_PASTE_YOUR_TOKEN_HERE' >> ~/.config/supabase/sbq.env
```

The QA user is only half of it: a token opens no app by itself. Install the browser once too —
without it an eval dies on its first line and looks exactly like a product bug.

```bash
npm i -g playwright && npx playwright install chromium
```

A global install alone is **not** enough: `import('playwright')` is ESM and ignores `NODE_PATH`, so
an eval launched from a project (or a worktree) dies with `ERR_MODULE_NOT_FOUND` even though
`npm ls -g` swears the package is there. Point evals at the bundled shim, which resolves the module
wherever it lives and drops `channel: 'chrome'` (these hosts have no Google Chrome):

```bash
PLAYWRIGHT_MODULE=~/projects/claude-code-dev-loop/scripts/qa/pw-shim.mjs
```

`sbauth <project> doctor` checks this by actually opening a browser, not by asking whether the
package resolves — that shortcut reports a false green.

### Part 2 — for each new project

Below, replace `project-1` with your project's folder name (the one under `~/projects/`).
In **Step 1 only**, write it with underscores instead of hyphens (`project_1`).

**Step 1 — tell the scripts which Supabase project it is**
```bash
echo 'SBQ_REF_project_1=PASTE_THE_PROJECT_REF_HERE' >> ~/.config/supabase/sbq.env
```

**Step 2 — check**
```bash
sbauth project-1 doctor
```
You should see `ok`, `ok`, `activo`, `usuario QA: ninguno` and `navegador (Playwright): ok`.
The browser line prints the `PLAYWRIGHT_MODULE` path to use. If it says `FALLA`, run the
`npm i -g playwright` block above and repeat.
If `proveedor Email` says `APAGADO`: dashboard → Authentication → Sign In / Providers → Email → Enable, then run Step 2 again.

**Step 3 — create the robot account**
```bash
sbauth project-1 setup
```
You should see `ok: usuario QA de project-1 = … login verificado`.

**Step 4 — only if the app has a "door" after login** (accept terms, beta list, onboarding).
Ask Engineering/Squad for the exact line. It looks like this:
```bash
sbauth project-1 rpc accept_terms '{"version":"2026-01-01"}'
```
(No output = fine.)

**Step 5 — test**
```bash
sbauth project-1 token
```
A long string starting with `eyJ` = **done**. Agents now log in by themselves with
`QA_ACCESS_TOKEN=$(sbauth project-1 token)`.

That's all. Part 1 once; Part 2 once per project. Everything else below is reference.

---

Two small bash scripts for apps backed by Supabase. Both read one config file that lives
**outside** the plugin and outside the project (`~/.config/supabase/sbq.env`, `chmod 600`):

```bash
SUPABASE_ACCESS_TOKEN=sbp_...        # Personal Access Token; a token scoped to "database query" is enough
SBQ_REF_project_1=abcdefghijklmnopqrst  # one SBQ_REF_<project> per project (hyphens → underscores)
```

Install once so they are on `PATH` (agents call them by name):

```bash
ln -sf "$(pwd)/scripts/supabase/sbq" "$(pwd)/scripts/supabase/sbauth" ~/.local/bin/
```

## `sbq` — run SQL as the operator

```bash
sbq <project> "select count(*) from public.users"
sbq <project> -f supabase/migrations/0030_sign.sql     # apply a migration (the agent does it; nobody pastes SQL)
sbq <project> --tables
```

Same endpoint as the dashboard's SQL editor (Management API `database/query`). Every statement is
appended to `~/.config/supabase/log/<project>.log`.

## `sbauth` — a QA user per project, so tests can log in without Google

Almost every app here uses **Google login**, and no agent can complete a Google OAuth flow, nor
should it borrow a human session. `sbauth` gives each project **one QA user with email+password**
(the Email provider is enabled by default in Supabase and coexists with Google; humans keep using
Google) and hands out fresh JWTs on demand:

```bash
sbauth <project> doctor                 # sbq works? public key found? Email provider on? QA user exists? browser installed?
sbauth <project> setup [email]          # ONCE per project: creates the user via SQL (confirmed, random password)
sbauth <project> token                  # prints a fresh access token (JWT) — call it every time, never cache
sbauth <project> rpc <fn> ['<json>']    # call a PostgREST RPC as the QA user (accept terms, seed, …)
sbauth <project> whoami
```

- The user is created with plain SQL through `sbq` (`auth.users` + `auth.identities`), so a
  SQL-scoped PAT is enough — the Management API is never used.
- Login uses the project's **public** key (`anon` / `sb_publishable_…`), read from
  `~/projects/<project>/.env.local` or `SBAUTH_<project>_ANON_KEY` in `~/.config/supabase/qa-users.env`.
- Credentials land in `~/.config/supabase/qa-users.env` (`chmod 600`):
  `SBAUTH_<project>_EMAIL / _PASSWORD / _USER_ID`. **Never** in the repo, tickets, BOARD or Trello.
- If the app has extra gating (beta allowlist, terms of use, onboarding row), do it once through
  the app's own path, e.g. `sbauth project-1 rpc accept_terms '{"version":"2026-01-01"}'`, and
  record that command in the project's `squad.md §Flows` so the next run knows.

### How agents use it

Anything that talks to the app as a logged-in user — Playwright flows, hosted edge functions,
evals — reads one env var:

```bash
QA_ACCESS_TOKEN=$(sbauth <project> token) node scripts/my-eval.mjs
```

Rules for `@developer` / `@qa`:

1. A `401`/`not_authenticated` from the app is an **environment** blocker, not a product defect,
   and it has a standard fix: make the script accept `QA_ACCESS_TOKEN` (fall back to anonymous
   when absent) and run it with `sbauth <project> token`.
2. Never ask the human for a session, cookie or Google login. If `sbauth <project> doctor`
   reports no QA user, stop at a checkpoint asking the operator to run `sbauth <project> setup`
   (it creates a user in production auth; that is the operator's call) — then continue.
3. Google OAuth itself is still not verified by this path; report that coverage separately
   (see README §"Local WF tests").

### Quotas, rate limits and the browser — the three things that actually break these runs

A logged-in eval runs against **production**: real auth, real money, real limits. None of these
are product defects, and all three have burned a full day before. Treat them as setup, not as
findings.

**1. Read the remaining budget, don't discover it by crashing.** If the backend returns how much
quota is left (a header like `X-Dates-Left`, a field in the body), log it on every call and print
it per case. A run that knows it has 1 unit left can stop cleanly instead of dying half-way and
looking like a regression.

**2. Never retry a quota or rate-limit error, and never lift the limit for everyone.** On
`rate_limited` / `quota_exhausted`, stop and report the literal error. When a daily cap per
identity is what blocks the run, the fix is a **quota tier for the QA identity only** — a
per-identity allowlist the operator sets (e.g. `QA_IDENTITIES` + a QA cap), keyed off the
**verified** user id so no client can claim it. Raising the normal users' cap to unblock a test
hands every real player that cap too, and someone has to remember to put it back.

**3. Use the bundled chromium, never `channel: 'chrome'`.** These hosts have no Google Chrome
installed, only Playwright's own browser. Asking for the channel fails with a message about a
missing executable that reads like a broken test. `scripts/qa/pw-shim.mjs` strips the channel and
resolves the module from anywhere; run evals with `PLAYWRIGHT_MODULE` pointing at it, and let
`sbauth <project> doctor` confirm it opens a browser before blaming the app.

Pace requests below the documented per-minute limit (a fixed sleep between cases is enough) and
make the run **resumable** — record each case as it finishes and support starting from an index,
so a run that stops at case 3 of 5 never re-pays for cases 1 and 2.
