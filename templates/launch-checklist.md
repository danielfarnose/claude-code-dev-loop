# Go-live checklist — <PROJECT> · <https://domain>

Copied by `/squad:launch` into `docs/launch/checklist.md`. Tick with a date; `/squad:launch <url>`
re-runs the automatic rows. The why of every row: `templates/launch-playbook.md` in the squad
plugin (written after the first launch, LOVEEXE 2026-09-20). Rows marked **operator** cannot be
done by an agent.

## A · Legal (before the first real user — login = personal data)
- [ ] Decisions taken and written down: who is the controller (name, tax id, address, contact email), country, free or paid, 18+ or not, sensitive content rules, providers + where their servers are, what becomes public (allowlist) — **operator**
- [ ] Legal Notice · Privacy Policy · Terms (versioned) · Community Guidelines — public pages, dated
- [ ] Records: data map (art. 30) · requests procedure · moderation procedure · breach procedure (72 h) · AI-literacy note
- [ ] Consent (18+ + Terms version) stored and enforced server-side at the first social action
- [ ] Delete account deletes everything (auth + tables + quoted texts); retention promised = a cron that runs
- [ ] Report button + email without account; first report hides; moderation queue with notify + appeal path
- [ ] AI output marked (meta + badge + warning) and a warning before any text that goes to an AI provider
- [ ] No own cookies / no analytics → no banner (verified in DevTools) — or a CMP if you add them
- [ ] Assisted lawyer-style review done, blockers fixed; a real lawyer before charging money
- [ ] Provider paperwork: DPA date/link per provider, or the accepted risk in the data map — **operator**

## B · Backend (Supabase or equivalent)
- [ ] Migrations applied in order on the real project (pasted, never a blind push); SQL tests run in BEGIN/ROLLBACK
- [ ] Functions deployed from main; secrets in the dashboard, none in the repo
- [ ] Crons listed and active; retention/purge run once by hand
- [ ] Auth provider in production: Site URL + Redirect URLs = final domain; publishable key only in the client
- [ ] RLS on every table: structural test in CI + a two-account live audit

## C · Hosting (Cloudflare Pages or equivalent)
- [ ] Project built from main: preset None, real build command/output, NODE_VERSION, env vars set BEFORE the first deploy
- [ ] Custom domain attached; http → https 301; HSTS header
- [ ] Zone features that inject scripts OFF (Rocket Loader, email obfuscation, auto-minify, analytics)
- [ ] Security headers served (CSP, X-Frame-Options/frame-ancestors, nosniff, Referrer-Policy)
- [ ] www → root Redirect Rule — **operator**
- [ ] Real 404 page (no soft 404)

## D · Login (Google)
- [ ] Branding: name, logo, authorized domain = final domain, privacy/terms links on the final domain
- [ ] Domain verified (Search Console TXT) and brand published — **operator**
- [ ] Audience = Production (not Testing) — **operator**
- [ ] Scopes minimal and documented in the Privacy Policy

## E · Web basics / SEO (automatic rows: `scripts/launch-audit.sh <url>`)
- [ ] `<title>` + meta description + canonical
- [ ] Open Graph + Twitter card with a reachable 1200×630 image
- [ ] Structured data (JSON-LD)
- [ ] robots.txt with a Sitemap line + sitemap.xml served as XML; sitemap submitted in Search Console — **operator (1 click)**
- [ ] Favicon served as a file (not only a data: URI)
- [ ] Alt text on real images; decorative ones aria-hidden
- [ ] Images compressed; a size budget in the test gate
- [ ] Load: no third-party requests; TTFB and bundle sizes noted; PageSpeed mobile run — **operator (1 min)**
- [ ] Colour contrast audited (e.g. `/impeccable audit`)
- [ ] Mobile checked at 375-390 px on every main screen
- [ ] External links respond 200
- [ ] Forms: none public without auth, or spam-protected (limits, blocklist, captcha only if needed)

## F · Before announcing
- [ ] Smoke test on the real domain, phone + desktop, with a real account — **operator**
- [ ] Report email arrives at the contact inbox; moderator access confirmed — **operator**
- [ ] Live bundle scanned: no secrets, no service keys, no env names
- [ ] Feedback log started (`docs/product/beta-feedback.md`): every finding in the operator's words, same commit as the fix
