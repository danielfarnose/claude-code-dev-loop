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

### Part 2 — for each new project

Below, change `love-app` to your project's folder name (the one under `~/projects/`).
In the **first** line only, also write it with underscores instead of hyphens (`love_app`).

**Step 1 — tell the scripts which Supabase project it is**
```bash
echo 'SBQ_REF_love_app=PASTE_THE_PROJECT_REF_HERE' >> ~/.config/supabase/sbq.env
```

**Step 2 — check**
```bash
sbauth love-app doctor
```
You should see `ok`, `ok`, `activo`, and `usuario QA: ninguno`.
If `proveedor Email` says `APAGADO`: dashboard → Authentication → Sign In / Providers → Email → Enable, then run Step 2 again.

**Step 3 — create the robot account**
```bash
sbauth love-app setup
```
You should see `ok: usuario QA de love-app = … login verificado`.

**Step 4 — only if the app has a "door" after login** (accept terms, beta list, onboarding).
Ask Engineering/Squad for the exact line; for love-app it is:
```bash
sbauth love-app rpc accept_terms '{"version":"2026-09-19"}'
```
(No output = fine.)

**Step 5 — test**
```bash
sbauth love-app token
```
A long string starting with `eyJ` = **done**. Agents now log in by themselves with
`QA_ACCESS_TOKEN=$(sbauth love-app token)`.

That's all. Part 1 once; Part 2 once per project. Everything else below is reference.

---

Two small bash scripts for apps backed by Supabase. Both read one config file that lives
**outside** the plugin and outside the project (`~/.config/supabase/sbq.env`, `chmod 600`):

```bash
SUPABASE_ACCESS_TOKEN=sbp_...        # Personal Access Token; a token scoped to "database query" is enough
SBQ_REF_love_app=nrmcoyiqnjsagxflacub  # one SBQ_REF_<project> per project (hyphens → underscores)
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
sbauth <project> doctor                 # sbq works? public key found? Email provider on? QA user exists?
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
  the app's own path, e.g. `sbauth love-app rpc accept_terms '{"version":"2026-09-19"}'`, and
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
