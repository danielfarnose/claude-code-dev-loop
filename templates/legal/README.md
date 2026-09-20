# Legal templates — Legal Notice · Privacy Policy · Terms of Use · Community Guidelines

Generic templates for the four public texts a product needs before it goes live. They carry **no
product and nobody's data**: everything specific to the project comes from its repo and from the
operator's answers, collected by `@legal` (agents/legal.md). The section order is the one an
assisted lawyer-style review demanded of a real product (2026-09): identity → what is public → legal
bases → providers/transfers → cookies/storage → retention → deletion → rights → age → changes. Written
for an operator established in the EU (GDPR, DSA, consumer law); outside the EU set `eu: false` and
have a lawyer rewrite the rights and transfer sections. **Not legal advice**: a licensed lawyer before
charging money, and before publishing anything aimed at minors.

## Three kinds of marker

| Marker | Meaning | Resolved by |
|---|---|---|
| `{{NAME}}` | a value or a short phrase | `scripts/legal-render.mjs`, from `vars` |
| `<!-- IF flag --> … <!-- /IF flag -->` (`!flag` negates; blocks nest) | keep the block when the flag holds, delete it otherwise | the script, from `flags` |
| `[[WRITE: instruction]]` | a sentence or paragraph written with the project's own nouns and what its code really does | `@legal`, by hand, after rendering |

```
node scripts/legal-render.mjs templates/legal/<name>.md docs/legal/legal-answers.json > docs/legal/<name>.md
node scripts/legal-render.mjs --check   # every template × example / all-true / all-false flags
```

`legal-answers.json` = `{ "flags": {…}, "vars": {…} }` — shape and neutral values in
`answers.example.json`; the real file lives in the project, never in this plugin. Before publishing,
`grep -rnE "\{\{|\[\[WRITE|<!-- /?IF" docs/legal/` must return nothing.

## Flags — decide every one (`true` / `false`)

| Flag | `true` when | Source |
|---|---|---|
| `company` | the operator is a company (`false` = natural person) | ask |
| `eu` | the operator is established in the EU/EEA — DSA contact point, GDPR rights, SCC/DPF transfers | ask |
| `paid` | there are paid features today (`false` = free, future payments announced) | ask |
| `beta` | the product presents itself as a beta | ask |
| `adults_only` | 18+ only (`false` = minors allowed → the Minors section needs a lawyer) | ask |
| `parody` | parody of public figures is allowed as content | ask |
| `translation` | a courtesy translation of the Terms is offered | ask |
| `accounts` | there is sign-in | repo |
| `consent_record` | acceptance (Terms version, time, age declaration) is stored server-side | repo |
| `user_content` | users submit content | repo |
| `public_content` | other people can see some of it | repo |
| `ai` | AI models generate content | repo |
| `ai_marker` | published data carries a machine-readable AI marker | repo |
| `byok` | users can bring their own AI key | repo |
| `device_id` | a random device identifier lives in browser storage | repo |
| `local_state` | app state is saved in browser storage | repo |
| `tracking` | ads, analytics or any tracker (`true` → consent banner, lawyer) | repo |
| `share_links` | share buttons as plain links to other sites | repo |
| `reports` | in-app report button | repo |
| `auto_filter` | an automated filter runs before publication | repo |
| `dormant_purge` | a job deletes dormant accounts | repo |

## Variables

«ask» = only the operator knows; «repo» = read it from the code and cite file:line in the report.
Identity values stay in the project's `legal-answers.json`, never in this plugin.

| Variable | What | Example | Source |
|---|---|---|---|
| `PRODUCT` | product name as shown to users | `ACME Notes` | repo |
| `PRODUCT_ONE_LINER` | lowercase noun phrase completing «{{PRODUCT}} is …» | `a free note-sharing app` | ask |
| `DOMAIN` | apex domain | `acme.app` | repo |
| `OPERATOR_NAME` | full legal name (person or company) | — | ask |
| `COMPANY_FORM` / `COMPANY_REGISTRY` | (company) legal form / registry and number | `a limited company` / `Companies House 12345678` | ask |
| `OPERATOR_TAX_ID` | tax id (NIF / VAT / EIN) | — | ask |
| `OPERATOR_ADDRESS` | address for legal notices | — | ask |
| `CONTACT_EMAIL` | the one inbox that is read — also the DSA contact point and the rights inbox | `hello@acme.app` | ask |
| `LANGUAGES` | languages you answer in | `English or Spanish` | ask |
| `CONTRACT_LANGUAGE` / `TRANSLATION_LANGUAGE` | language of the agreement / (translation) courtesy translation | `English` / `Spanish` | ask |
| `COUNTRY` / `COUNTRY_ADJ` | country of establishment / its adjective | `Spain` / `Spanish` | ask |
| `DPA_AUTHORITY` / `DPA_AUTHORITY_URL` | (eu) data-protection authority and its site | `AEPD` / `https://www.aepd.es` | ask |
| `DB_PROVIDER` | auth + database + functions provider (a processor) | `Supabase` | repo |
| `HOSTING_PROVIDER` | static hosting / CDN (a processor) | `Cloudflare` | repo |
| `PROVIDER_COUNTRY` | where those providers process data | `the United States` | repo |
| `AI_PROVIDER` | (ai) hosted inference provider; its model vendors are sub-processors | `OpenRouter` | repo |
| `BYOK_PROVIDERS` | (byok) providers a user's own key can point at | `OpenAI, Anthropic or Google Gemini` | repo |
| `AUTH_PROVIDER` / `AUTH_METHOD` | (accounts) sign-in provider / how users see it named | `Google` / `Google sign-in` | repo |
| `AUTH_DATA` | (accounts) what the sign-in hands over | `your account id, email, display name and profile picture` | repo |
| `STORAGE_KEY` / `STORAGE_KEY_BYOK` | (local_state / byok) the real localStorage / sessionStorage keys | `acme:v1` / `acme:key` | repo |
| `SHARE_TARGETS` | (share_links) sites the share buttons open | `X, Facebook or Reddit` | repo |
| `DB_LOG_RETENTION` / `HOSTING_LOG_RETENTION` | provider log retention on the current plan (the second is a clause) | `between one and seven days` / `keeps no access logs for this site on the current plan` | repo |
| `ACCOUNT_REQUIRED_ACTIONS` | (accounts) verbs, lowercase | `create, comment and vote` | ask |
| `USER_CONTENT_NOUNS` / `PUBLIC_CONTENT_NOUNS` | what users submit / what others can see, lowercase | `notes and comments` / `notes, comments and reactions` | ask |
| `PUBLIC_SURFACES` | (public_content) where it is shown | `the feed, profile pages and share images` | ask |
| `AI_INPUTS` / `AI_OUTPUTS` | (ai) what the model receives / produces | `the note you select and the prompt you type` / `summaries and suggested titles` | ask |
| `DELETE_ACCOUNT_PATH` | (accounts) where deletion lives in the UI | `Settings (Delete account)` | repo |
| `CONSENT_UI` / `CONSENT_GATED_ACTION` / `REMAINS_AVAILABLE_WITHOUT_ACCEPTING` | (consent_record) how acceptance happens / what needs re-acceptance / what still works without it | `ticking the two boxes on the consent screen and tapping CONTINUE` / `create or comment` / `browse public notes and manage or delete your account` | repo |
| `TERMS_URL` / `GUIDELINES_URL` | where the dated texts live | `https://acme.app/#terms` / `#guidelines` | repo |
| `MODERATOR` / `BLOCKED_ACTIONS` / `REMAINS_AVAILABLE_WHEN_BLOCKED` | (user_content) who reviews / what a block removes / what a blocked account can still do | `the operator` / `creating, commenting and reporting` / `read public notes and delete the account` | ask |
| `CORRESPONDENCE_RETENTION` | how long rights-request correspondence is kept | `3 years` | ask |
| `DORMANT_ACCOUNT_MONTHS` / `DORMANT_CHECK_INTERVAL` | (dormant_purge) months without sign-in / how often the job runs | `24` / `three months` | repo |
| `LAST_UPDATED` / `TERMS_VERSION` | date shown / the Terms version the consent record stores | `March 3, 2027` / `2027-03-03` | ask |

## What must be TRUE in the code for these texts to be honest

The texts promise things the app must do (the assisted review failed every text that promised
without doing): consent (age + Terms version) stored and enforced server-side · delete account
removes everything, including content of yours quoted elsewhere · every retention period runs on a
cron · a report button plus an email path without an account · AI output marked and a warning before
user text goes to an AI · no own cookies, or a consent banner · the listed storage keys are the real
ones · the provider list matches the project's `data-map.md`. `templates/launch-checklist.md` §A
carries the same list.
