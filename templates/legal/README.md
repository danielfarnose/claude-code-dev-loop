# Legal templates — Legal Notice · Privacy Policy · Terms of Use · Community Guidelines

Four public texts of a real product that went to production (a free beta with Google login, AI-generated
public content, no payments, no analytics, no own cookies), after an assisted lawyer-style review
(2026-09). Identity and stack are variables; the product's own mechanics are left as a **worked
example** to be rewritten. `@legal` (agents/legal.md) fills them from the project's `.claude/squad.md`
and from the operator's answers — it never invents identity data. **Not legal advice**: a licensed
lawyer before charging money.

## Variables (replace every `{{…}}`; grep for leftovers before publishing)

| Variable | What | Example |
|----------|------|---------|
| `{{PRODUCT}}` | product name as shown to users | `ACME Play` |
| `{{DOMAIN}}` | apex domain | `acme.app` |
| `{{OPERATOR_NAME}}` | full legal name of the controller (person or company + registry) | — |
| `{{OPERATOR_TAX_ID}}` | tax id (NIF/VAT/EIN) | — |
| `{{OPERATOR_ADDRESS}}` | address for legal notices | — |
| `{{CONTACT_EMAIL}}` | one inbox that is actually read (also the DSA point of contact and the privacy-rights inbox) | `hello@acme.app` |
| `{{COUNTRY}}` / `{{COUNTRY_ADJ}}` | country of establishment / its adjective (law and courts) | `Spain` / `Spanish` |
| `{{DPA_AUTHORITY}}` / `{{DPA_AUTHORITY_URL}}` | data-protection authority and its site | `AEPD` / `https://www.aepd.es` |
| `{{DB_PROVIDER}}` | auth + database + functions provider (a processor) | `Supabase` |
| `{{HOSTING_PROVIDER}}` | static hosting / CDN (a processor) | `Cloudflare` |
| `{{AI_PROVIDER}}` | hosted AI inference provider (a processor; its model vendors are sub-processors) | `OpenRouter` |
| `{{PROVIDER_COUNTRY}}` | where those providers process data (transfer mechanism follows) | `United States` |
| `{{STORAGE_KEY}}` / `{{STORAGE_KEY_BYOK}}` | the app's localStorage / sessionStorage keys named in the cookies section | `acme:v1` |
| `{{LAST_UPDATED}}` / `{{TERMS_VERSION}}` | the date shown / the Terms version the consent record stores | `March 3, 2027` / `2027-03-03` |

Legal form: the example operator is a **natural person** («a natural person acting in his own name», no company registration); a company rewrites that sentence with its registered name, registry and number — and the Terms/Privacy pronouns to match.

Names left as in the example and to be edited by hand: the sign-in provider (**Google**) and the
bring-your-own-key providers (**OpenAI, Anthropic, Gemini**) — delete those paragraphs if the
product has no BYOK.

## Product-specific wording (rewrite, do not search-replace)

The example is a game where AI characters go on public "dates"; players add "nudges"/"whispers",
vote, react, choose a nickname or keep a guest alias. Every sentence about that mechanic describes
**what becomes public, what the AI receives, what a report hides, what deletion removes**. Keep the
structure, replace the nouns with the project's own — that is exactly the list of questions in
`agents/legal.md`.

## What must be TRUE in the code for these texts to be honest

The texts promise things the app must do (the assisted review failed every text that promised
without doing): consent (18+ + Terms version) stored and enforced server-side · delete account
removes everything, including texts quoted elsewhere · the retention periods run on a cron · a
report button plus an email path without an account · AI output marked and a warning before text
goes to an AI · no own cookies or a consent banner · the listed storage keys are the real ones ·
the provider list matches `data-map.md`. `templates/launch-checklist.md` §A carries the same list.
