---
name: qa-live-user
description: Drive a real logged-in session against a hosted app — Google-login apps backed by Supabase, evals and journeys against production or a preview — without ever asking a human to log in. Use when a test, eval or WF check needs to act as a signed-in user, when a run returns 401/not_authenticated, or when it dies on a daily quota, a per-minute rate limit or a missing browser. Covers the QA user (sbauth), the browser (Playwright shim) and the production limits.
---

# Test as a real logged-in user

Humans log in with Google. Agents can't, and must never borrow a human session. Each project has
one robot account instead, and a browser to drive it. Everything below is setup, not findings:
**none of these failures is a product defect, and none of them goes in a ticket as one.**

## Before anything, one command

```bash
sbauth <project> doctor
```

Five lines. All five must be green before a single request is sent:

| Line | If it fails |
|---|---|
| `sbq (SQL vía PAT)` | `~/.config/supabase/sbq.env` missing or the PAT lacks SQL scope. |
| `key pública` | The project's anon key isn't reachable. See `scripts/supabase/README.md`. |
| `proveedor Email` | Dashboard → Authentication → Sign In / Providers → Email → Enable. |
| `usuario QA` | **Stop at a checkpoint**: only the operator runs `sbauth <project> setup` (it creates a user in production auth). |
| `navegador (Playwright)` | `npm i -g playwright && npx playwright install chromium`. |

Running the checks after a failed run instead of before it is how a half-day disappears.

## The session

```bash
QA_ACCESS_TOKEN=$(sbauth <project> token) node scripts/<eval>.mjs
```

Ask for a fresh token every run; never cache one. If the app gates past login (terms, beta
allowlist, onboarding row), do it once through the app's own path —
`sbauth <project> rpc accept_terms '{"version":"…"}'` — and record that exact line in the
project's `squad.md §Flows` so the next run doesn't rediscover it.

A `401` / `not_authenticated` is an **environment** blocker with a standard fix: make the script
read `QA_ACCESS_TOKEN` (falling back to anonymous when absent) and pass it. It is never a product
defect, and it never justifies asking the human for a session.

## The browser

A global Playwright install is invisible to `import('playwright')` — ESM ignores `NODE_PATH`, so
an eval launched from a project or a worktree dies with `ERR_MODULE_NOT_FOUND` while `npm ls -g`
insists the package is there. Always go through the shim, which resolves the module wherever it
lives and drops `channel: 'chrome'` (these hosts have no Google Chrome, only the bundled chromium):

```bash
PLAYWRIGHT_MODULE=<PLUGIN_ROOT>/scripts/qa/pw-shim.mjs
```

`doctor` prints the exact path to use, and verifies it by opening a browser rather than by asking
whether the package resolves — that cheaper check reports a false green.

## Production limits

A hosted run spends real money against real caps. Three rules:

1. **Read the remaining budget from the response.** If the backend returns it (a header like
   `X-Dates-Left`, a field in the body), record it on every call and print it per case. A run that
   knows it has one unit left stops cleanly instead of dying half-way and looking like a
   regression.
2. **Never retry a `rate_limited` or `quota_exhausted`, and never raise the limit for everyone.**
   Report the literal error and stop. When a per-identity daily cap is the blocker, the fix is a
   **quota tier for the QA identity alone** — an operator-set allowlist keyed off the *verified*
   user id (e.g. `QA_IDENTITIES` + a QA cap), never a bump to the tier real players share. Raising
   the players' cap to unblock a test hands every one of them that cap, and depends on someone
   remembering to put it back.
3. **Pace and resume.** Sleep between cases to stay under the documented per-minute limit, write
   each case's result as it finishes, and support starting from an index, so a run that stops at
   case 3 of 5 never re-pays for 1 and 2.

## Capture the request, not just the response

When the thing under test is *what the model was told* — a prompt, a character sheet, an injected
field — record the **request body** alongside the reply (body only; the session token lives in the
headers and is never read or written to a report). Without it, an output that lacks the expected
element cannot be told apart from an input that never carried it, and the only way to find out is
to pay for another round. This distinction is usually the whole point of the eval.

## What to report

Separate the two, always:

- **Environment blocker** — anything above. Say which check failed and what fixes it. Do not open
  a product ticket.
- **Product finding** — the app did the wrong thing with a healthy session, a working browser and
  budget to spare. Quote the literal lines as evidence.

And say plainly what this path does **not** cover: Google OAuth itself is never exercised here.
A post-login journey must never claim to have verified Google login; report that coverage
separately.
