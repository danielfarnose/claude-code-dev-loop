<!--
EXAMPLE. The ticket behind row `02-download-endpoint` of examples/BOARD.md — the one @qa rejected
on the first pass. Produced by @architect from templates/ticket.md.
-->

# [Portal] Download your own invoice from the portal

## Problem
Today a customer asks for their invoice by email and someone on the team sends it by
hand. That is about 40 requests a week, and an answer can take a full day.

## Expected result
As a customer, I want to download my own invoices from the portal so that I don't
have to ask for them and wait.

## Acceptance criteria
- [ ] An issued invoice downloads as a PDF from the portal.
- [ ] A customer can only reach invoices belonging to their own account.
- [ ] Requesting someone else's invoice returns 404, without revealing whether it exists.
- [ ] A regression test fails if the ownership check is removed.

## Technical notes
- Files: `src/portal/routes/invoices.ts`, `src/billing/pdf.ts`
- Verification: `npm run verify`
- QA: screenshots
- Risk: high
- Assumption: issued invoices only; drafts are out of scope because they still change.
- Requires 01 (the PDF rendering has to exist first).

<!--
@qa verdict, iteration 1 — REJECTED:
  The endpoint resolves the invoice by id without checking it belongs to the
  authenticated customer. With a valid session, changing the id returns another
  customer's invoice (tested: account A requested an invoice from account B and
  downloaded the PDF). There is also no test covering the case.

Iteration 2 — APPROVED: ownership check before resolving + 404 instead of 403 (a 403 would
confirm the invoice exists) + regression test. Full gate, 142 tests.

`Risk: high` is why the lead ran this @qa on a stronger model and passed @security over the
run before closing it.
-->
