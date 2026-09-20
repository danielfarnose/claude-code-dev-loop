---
description: Go-live checklist runner — copies the launch checklist into the project, audits the live URL (headers, https/www, robots/sitemap, 404, meta/OG, favicon, weight, third parties, links) and lists what only the operator can close.
argument-hint: "<https://domain> | checklist"
---

Run the go-live process on:

$ARGUMENTS

Caveman mode. This is the standardized launch process written after the first production launch
(LOVEEXE, 2026-09-20) so the next project does not rediscover the order. The long explanation is
`${CLAUDE_PLUGIN_ROOT}/templates/launch-playbook.md` — read it once per project, not per run.

1. **Checklist in the repo.** If `docs/launch/checklist.md` does not exist, copy
   `${CLAUDE_PLUGIN_ROOT}/templates/launch-checklist.md` there and fill in `<PROJECT>` and the
   domain. If the argument is `checklist`, stop here and show it.
2. **Audit.** Run `bash ${CLAUDE_PLUGIN_ROOT}/scripts/launch-audit.sh <url>` and paste its output
   in the report. It never fails the run — it is a report.
3. **Tick.** For every ✅ that maps to a row of section C/E of the checklist, mark it with today's
   date. For every ❌/⚠️: if the fix lives in the repo (headers file, `<head>` tags, robots,
   sitemap, 404 page, favicon, image weight), fix it in the repo through the normal loop
   (`/squad:run` for anything beyond a copy/config change) and re-run the audit; if it is a
   dashboard action, leave it unticked and put it in the operator list.
4. **Operator list.** End with the rows marked **operator** that are still open, each with the
   exact place to click (Cloudflare Rules → Redirect Rules → «Redirect from WWW to root»; Search
   Console → Sitemaps; Google Auth Platform → Audience; provider dashboards for DPAs) and where
   the result gets recorded (`docs/legal/data-map.md`, the checklist).
5. **Legal rows (section A)** are never ticked by the audit: read the project's
   `docs/legal/compliance-backlog.md` (or say it is missing) and report their state from it.

Rules: never invent a ✅ the script did not print; never tick an **operator** row yourself; the
checklist file is the truth for the launch, the playbook is the why.
