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

## Test contract
- [x] T-01 issued_invoice_downloads_pdf — an issued invoice comes down as a PDF with the right headers · integration · src/portal/routes/invoices.test.ts
- [x] T-02 draft_invoice_not_downloadable — a draft is refused (it still changes) · unit · src/portal/routes/invoices.test.ts
- [x] T-03 unknown_invoice_404 — an id that does not exist returns 404 · unit · src/portal/routes/invoices.test.ts
- [x] T-04 other_tenant_invoice_404 — a valid session asking for another account's invoice gets 404, same body as unknown · regression · src/portal/routes/invoices.test.ts
- Run: `npx vitest run src/portal/routes/invoices.test.ts`
- Blocking: any T-NN red

## Technical notes
- Files: `src/portal/routes/invoices.ts`, `src/billing/pdf.ts`
- Verification: `npm run verify`
- QA: screenshots
- Risk: high
- Assumption: issued invoices only; drafts are out of scope because they still change.
- Requires 01 (the PDF rendering has to exist first).

<!--
The architect's contract had T-01..T-03. The @developer wrote them first, ticked them green and
delivered. The Trello card showed "Tests 3/3" — and the @qa still rejected it.

@qa verdict, iteration 1 — REJECTED:
  T-01 PASS · T-02 PASS · T-03 PASS
  (beyond contract) The endpoint resolves the invoice by id without checking it belongs to the
  authenticated customer. With a valid session, changing the id returns another
  customer's invoice (tested: account A requested an invoice from account B and
  downloaded the PDF). The contract never listed the case, so no test covers it.

Iteration 2 — APPROVED: ownership check before resolving + 404 instead of 403 (a 403 would
confirm the invoice exists) + T-04 added to the contract as the regression test. Full gate,
142 tests. The learning recorded: "tenant isolation needs its own T-NN on every endpoint that
takes an id" — the next contract on this project lists it up front.

`Risk: high` is why the lead ran this @qa on a stronger model and passed @security over the
run before closing it.
-->
