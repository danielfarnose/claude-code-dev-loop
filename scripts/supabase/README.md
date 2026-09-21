# Supabase helpers — SQL and a QA login without a human

## TL;DR — copy & paste, one project at a time

Replace `PROJECT` with the project folder name (e.g. `love-app`) in every step. Run them in a
terminal on the machine where Squad runs (or prefixed with `!` inside Claude Code).

1. **Install the two commands** (once per machine):
   ```bash
   mkdir -p ~/.local/bin && ln -sf ~/projects/claude-code-dev-loop/scripts/supabase/sbq ~/projects/claude-code-dev-loop/scripts/supabase/sbauth ~/.local/bin/
   ```
2. **Personal Access Token** (once per machine). Supabase → Account → Access Tokens → Generate
   new token (scope "database query" is enough). Then:
   ```bash
   mkdir -p ~/.config/supabase && touch ~/.config/supabase/sbq.env && chmod 600 ~/.config/supabase/sbq.env
   echo 'SUPABASE_ACCESS_TOKEN=sbp_PASTE_YOUR_TOKEN_HERE' >> ~/.config/supabase/sbq.env
   ```
3. **Register the project** (once per project). The ref is the 20-letter id in the project URL
   `https://supabase.com/dashboard/project/<ref>`. Hyphens in the project name become underscores:
   ```bash
   echo 'SBQ_REF_PROJECT=PASTE_THE_REF_HERE' >> ~/.config/supabase/sbq.env
   ```
4. **Check everything talks** (public key is read from `~/projects/PROJECT/.env.local`; if the
   doctor cannot find it, add `SBAUTH_PROJECT_ANON_KEY=sb_publishable_…` to `~/.config/supabase/qa-users.env`):
   ```bash
   sbauth PROJECT doctor
   ```
   All four lines must be `ok`/`activo`. If `proveedor Email` says APAGADO: Supabase dashboard →
   Authentication → Sign In / Providers → Email → Enable → run the doctor again.
5. **Create the QA user** (once per project — it creates a real user in that project's auth):
   ```bash
   sbauth PROJECT setup
   ```
6. **Open the app's extra gate, if it has one** (terms of use, beta allowlist, onboarding). Ask
   Squad/Engineering which RPC the app uses; love-app is:
   ```bash
   sbauth love-app rpc accept_terms '{"version":"2026-09-19"}'
   ```
7. **Test it**:
   ```bash
   sbauth PROJECT token
   ```
   A long `eyJ…` string means done. From now on agents log in with
   `QA_ACCESS_TOKEN=$(sbauth PROJECT token)` and never ask you again. Write the gate command from
   step 6 into the project's `.claude/squad.md §Flows`.

Done. Steps 1-2 never again; steps 3-7 once per new project.

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
