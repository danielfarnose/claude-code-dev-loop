# Privacy Policy

_Last updated: {{LAST_UPDATED}}_

## In short

[[WRITE: three or four plain sentences — what we receive when you sign in, what you create and which of it is public, how you delete your account, whether there are ads, trackers or analytics.]]

## Who is responsible

{{OPERATOR_NAME}} is the operator of {{PRODUCT}} ({{DOMAIN}}) and the controller responsible for its processing of personal data, established in {{COUNTRY}}. Contact: {{CONTACT_EMAIL}}.

## Accounts and technical data

<!-- IF accounts -->
- Signing in with {{AUTH_METHOD}} through {{DB_PROVIDER}} Auth gives us {{AUTH_DATA}}. [[WRITE: which of those fields are used for what, which are shown to others, which are never published or sent to third parties.]] We do not ask for your contacts or files.
- An account is required to {{ACCOUNT_REQUIRED_ACTIONS}}.<!-- IF consent_record --> We record the Terms version and the acceptance time<!-- IF adults_only --> and your declaration that you are 18 or older. We do not collect your date of birth or an identity document for this declaration; it is not independent age verification<!-- /IF adults_only -->.<!-- /IF consent_record -->
<!-- /IF accounts -->
<!-- IF device_id -->
- A random browser device identifier supports [[WRITE: what it is for — local state, ownership of content created before signing in, per-device limits — and say it is not used for advertising or cross-site tracking]].
<!-- /IF device_id -->
- Hosting<!-- IF accounts --> and authentication<!-- /IF accounts --> providers process connection and security data, such as IP addresses and request logs.
- We store [[WRITE: the server-side data kept about a user, from the data map — profile, content, reactions, reports, moderation records, consent record, usage counters — or "no account data" when there are no accounts]].

<!-- IF byok -->
## Your own API key

A key you provide is stored in sessionStorage ({{STORAGE_KEY_BYOK}}), not in the persisted app state, and is cleared by our sign-out and account-deletion flows. Browser session restoration may preserve sessionStorage: on a shared device, sign out and clear site data when finished.

Your key never reaches us: the browser sends it directly to the AI provider you selected ({{BYOK_PROVIDERS}}). Prompts go to that provider under its terms; it may charge your account.<!-- IF public_content --> The result can still be published to {{DB_PROVIDER}} like any other content.<!-- /IF public_content -->
<!-- /IF byok -->

<!-- IF public_content -->
## What becomes public

What may be public: {{PUBLIC_CONTENT_NOUNS}}. [[WRITE: when publication happens (automatically on submit, after a preview, after approval), under which name (real name, alias, chosen nickname), and that public links can be shared and copied by anyone.]]

[[WRITE: anything kept private but still used — a field the AI reads that public pages do not show, a share link that carries more than the page — or delete this paragraph.]] Never put private or sensitive information about yourself or anyone else into {{USER_CONTENT_NOUNS}}.

We do not ask for, and do not want, information about your health, sexual orientation, beliefs, ethnicity or similar. Everything you type into {{USER_CONTENT_NOUNS}} is treated as content, not as a statement about you; we do not use it to infer anything about you. If you have entered such information about yourself or someone else, write to {{CONTACT_EMAIL}} and we will remove it.
<!-- /IF public_content -->

<!-- IF ai -->
## Artificial intelligence

AI models generate {{AI_OUTPUTS}} from {{AI_INPUTS}}. [[WRITE: what is prewritten, and what the output is — fiction, a game result, a draft — never an assessment of a real person.]]

The AI may invent facts or reproduce information you put into a prompt. {{PRODUCT}} never analyses your face, voice or any biometric data and does not try to infer your emotions; it only reads the text you type. Contact {{CONTACT_EMAIL}} to report misleading content or request human review of a moderation decision.
<!-- /IF ai -->

<!-- IF public_content -->
## Moderation

<!-- IF auto_filter -->Before {{PUBLIC_CONTENT_NOUNS}} are published, an automated filter checks them for [[WRITE: exactly what it matches — e.g. sexual content involving minors, contact details, direct threats — and whether it is a word-pattern list or a classifier]]. A match hides the item and opens a review item for us. <!-- /IF auto_filter --><!-- IF reports -->[[WRITE: what a report from another user does — hidden on the first report, hidden after N reports, or reviewed without hiding — as the code really does it.]] <!-- /IF reports --><!-- IF !auto_filter --><!-- IF !reports -->[[WRITE: how content is moderated today — for example by email report only, reviewed by hand.]] <!-- /IF !reports --><!-- /IF !auto_filter -->Any hide is provisional: a person reviews every hidden item and decides whether to restore, keep hidden, delete or restrict the account. No decision that restricts your account is taken automatically. To contest any moderation outcome, write to {{CONTACT_EMAIL}} with the URL and your reasons.
<!-- /IF public_content -->

## Purposes and legal bases

- Providing the features you request<!-- IF accounts -->, account access<!-- /IF accounts --><!-- IF public_content --> and publication<!-- /IF public_content -->: performance of the service contract, to the extent the processing is necessary for those features.
<!-- IF consent_record -->
- Keeping the record of the Terms version you accepted<!-- IF adults_only --> and of your 18+ declaration<!-- /IF adults_only -->: our legitimate interest in evidencing the contract<!-- IF adults_only --> and the age gate<!-- /IF adults_only -->, and compliance with applicable law.
<!-- /IF consent_record -->
- Security, spending limits, abuse prevention<!-- IF reports --> and handling reports<!-- /IF reports -->: our legitimate interests in operating a safe, sustainable service, subject to your rights and a balancing of interests. We use usage counters rather than advertising profiles for these purposes.
- [[WRITE: one bullet per additional purpose the product has (a feed built from public sources, recommendations, newsletters, payments) with its legal basis — or delete this bullet.]]
- Handling emails you send us (reports, rights requests, questions): performance of the service or legal obligation, as applicable. We keep the correspondence and a log of rights requests for {{CORRESPONDENCE_RETENTION}} to evidence how they were handled.
- Responding to data protection requests and other applicable legal requirements: compliance with legal obligations. Accepting the Terms is not blanket consent to unrelated uses of your information.

## Providers and international processing

- {{DB_PROVIDER}} provides <!-- IF accounts -->authentication, <!-- /IF accounts -->database and server functions; the database region is {{PROVIDER_COUNTRY}}. {{HOSTING_PROVIDER}} provides web hosting and network delivery and processes visitor IP addresses and request metadata for delivery and security.
<!-- IF ai -->
- Hosted AI requests pass through {{AI_PROVIDER}} to a model provider. [[WRITE: the training/retention setting actually enabled with the provider (e.g. routes that disallow data collection for training) and its limit — security logs and other provider processing may still apply.]] We do not add your email or name to the AI prompt as account metadata.
<!-- /IF ai -->
<!-- IF byok -->
- In bring-your-own-key mode, {{BYOK_PROVIDERS}} receive the request directly from your browser. Their account settings, terms and retention rules apply; our hosted restrictions are not automatically applied to your own key.
<!-- /IF byok -->
- [[WRITE: one bullet per additional processor (email delivery, error tracking, payments, analytics) from the data map — or delete this bullet.]]
<!-- IF eu -->
- Some of these providers process data in {{PROVIDER_COUNTRY}}. [[WRITE: the transfer mechanism per provider as recorded in the data map — a data processing agreement with the EU Standard Contractual Clauses (Decision 2021/914), the EU-US Data Privacy Framework, or both.]]<!-- IF byok --> In bring-your-own-key mode the transfer is made by you, directly from your browser, under your own contract with the provider.<!-- /IF byok --> Email {{CONTACT_EMAIL}} for a copy of the safeguards we rely on.
<!-- /IF eu -->

## Cookies, local storage and advertising

<!-- IF !tracking -->
We set no cookies ourselves<!-- IF local_state -->: everything listed below is browser storage (localStorage and sessionStorage) on {{DOMAIN}}, all of it needed to use {{PRODUCT}}<!-- /IF local_state -->. There are no advertising or analytics trackers<!-- IF !paid --> and no ads<!-- /IF !paid -->, and we do not sell your data for advertising. [[WRITE: any cookie a provider sets on our domain — e.g. a short-lived bot-protection cookie from the hosting provider — with its name, lifetime and purpose; or say none.]]
<!-- /IF !tracking -->
<!-- IF tracking -->
[[WRITE: every cookie and tracker — name, purpose, provider, lifetime — the consent banner that blocks the optional ones until accepted, and how to withdraw. A lawyer reviews this section.]]
<!-- /IF tracking -->

You can inspect, block or remove this storage through your browser's site-data settings (usually under Privacy or Site data, where you can also block storage for {{DOMAIN}} altogether<!-- IF local_state -->; {{PRODUCT}} will then not save progress between visits<!-- /IF local_state -->). Removing it can sign you out and erase local settings; it does not by itself delete your server account or public content.<!-- IF accounts --> Use {{DELETE_ACCOUNT_PATH}} for account deletion<!-- IF public_content -->, or contact us about specific public URLs<!-- /IF public_content -->.<!-- /IF accounts -->

<!-- IF accounts -->[[WRITE: if sign-in redirects to a third party (Google, GitHub, an email magic link…), say so — their own cookies and privacy information apply on their site, and we do not embed their script — or delete this sentence.]] <!-- /IF accounts --><!-- IF share_links -->Share buttons open {{SHARE_TARGETS}} as plain links; we do not embed their buttons or scripts, and their own cookies apply only once you are on their site. <!-- /IF share_links -->Before adding storage or tracking for a purpose that requires consent, we will provide information and a way to accept or reject it before activation. Accepting the Terms does not authorise optional tracking.

[[WRITE: one bullet per real browser storage key, from the code — name, what it holds, how long it lasts, how it is removed (sign-out, account deletion, clearing site data). Include the auth session keys ({{DB_PROVIDER}} Auth keeps the session in localStorage), the app state key ({{STORAGE_KEY}}) and the bring-your-own-key entry ({{STORAGE_KEY_BYOK}}) when they exist.]]

## How long we keep it

<!-- IF accounts -->
- Account data<!-- IF public_content --> and associated public content<!-- /IF public_content --> are kept while the account exists, until deletion<!-- IF public_content --> or moderation<!-- /IF public_content --> removes them.<!-- IF dormant_purge --> Accounts with no sign-in for {{DORMANT_ACCOUNT_MONTHS}} months are deleted, with the same effects as deleting the account yourself; we check for them at least every {{DORMANT_CHECK_INTERVAL}}.<!-- /IF dormant_purge --><!-- IF local_state --> Local state remains until you clear it or use account deletion.<!-- /IF local_state -->
<!-- /IF accounts -->
- [[WRITE: one bullet per retention period the code actually enforces (a cron or purge job) — what is deleted, after how long, how often the job runs: usage counters, rate logs, unpublished drafts, reports after resolution. A period without a job is not a promise you can make.]]
- Provider logs: {{DB_PROVIDER}} keeps <!-- IF accounts -->authentication and <!-- /IF accounts -->function logs for {{DB_LOG_RETENTION}}; {{HOSTING_PROVIDER}} {{HOSTING_LOG_RETENTION}}. Backups made by providers expire under their own schedules. Deleting live application data does not instantly remove every backup or a copy independently made by another person.

<!-- IF accounts -->
## Deleting your account

You can delete your account from {{DELETE_ACCOUNT_PATH}}. This removes the account and [[WRITE: everything the delete-account cascade really removes — profile, content, reactions, comments — and what happens to your content that other users' content depends on]].

[[WRITE: what remains after deletion and why — usage counters until the next purge, reports without the account link, content created before signing in that is tied to a device — and how to ask for those by URL at {{CONTACT_EMAIL}}.]]
<!-- /IF accounts -->

## Your rights

You may request access, correction, erasure, restriction or, where applicable, portability and object to processing based on legitimate interests. Contact {{CONTACT_EMAIL}}; we will request only the information reasonably needed to verify and handle your request. Requests are free.<!-- IF accounts --> To verify identity we ask that you write from the email linked to your account<!-- IF public_content -->; for content published without an account, send the exact URL, and we can hide or delete it but cannot hand over data tied to it<!-- /IF public_content -->.<!-- /IF accounts --> We normally respond within one month; if a lawful extension is needed, we explain it within that period.

<!-- IF eu -->You can complain to the {{COUNTRY_ADJ}} data protection authority, {{DPA_AUTHORITY}} ({{DPA_AUTHORITY_URL}}), or another competent supervisory authority. <!-- /IF eu -->You do not have to accept new Terms to request deletion or exercise your rights.

<!-- IF adults_only -->
## Adults

{{PRODUCT}} is intended for people aged 18 or older; we rely on your declaration and do not verify age. If we learn that an account belongs to someone under 18, we delete the account and its content. If you believe a child has provided data, contact {{CONTACT_EMAIL}}.
<!-- /IF adults_only -->
<!-- IF !adults_only -->
## Minors

[[WRITE: the age threshold, the parental-consent mechanism and the data minimisation applied to minors — this section needs a lawyer; do not publish without one.]]
<!-- /IF !adults_only -->

## Changes

If we make material changes to this policy we will show a notice in {{PRODUCT}} and update the date above<!-- IF consent_record -->, and ask you to accept again before you next {{CONSENT_GATED_ACTION}}<!-- /IF consent_record -->.<!-- IF accounts --> Where a change affects how we use your data, we will also email the address on your account.<!-- /IF accounts -->
