# Board — acme-billing

<!--
EXAMPLE. Illustrative run against a fictional project, written in the exact format the lead
produces, so the artifact can be read without installing anything. A real BOARD lives inside the
run's worktree at <tickets-path>/BOARD.md and is rewritten by the lead on every transition —
that is what makes `/squad:run resume` possible.
-->

## Active run
- Task: let customers download their invoice as a PDF from the portal
- Route: R3_ARCHITECTURE · agents: architect → developer → qa · reason: new dependency (PDF rendering)
- Worktree: ~/.squad-worktrees/acme-billing/RUN-20260810-01 · Base: main
- Phase: idle
- Current ticket: — · Iteration: —
- Next step: run closed and merged; nothing pending
- engine: or/gpt-5.6-sol (developer and qa) · fallback not used

## Tickets

| Ticket | Title | Theme | Prio | Status | Iter | Commit | Notes |
|--------|-------|-------|------|--------|------|--------|-------|
| `01-render-pdf` | [Invoices] Render an issued invoice as a PDF | invoices | P1 | done | 1/3 | `a3f91c2` | An issued invoice can now be turned into a PDF · Example: you open a March invoice and the system builds the same document you send by hand today · APPROVED, full gate (142 tests) · engine: or/gpt-5.6-sol |
| `02-download-endpoint` | [Portal] Download your own invoice from the portal | portal, invoices | P1 | done | 2/3 | `7b2e5d0` | Customers download their invoice themselves, no email needed · Example: you open the portal, hit «Download» on an invoice and the PDF comes down · REJECTED on the 1st round: the endpoint returned any customer's invoice by changing the id (tenant isolation) · APPROVED on the 2nd with an ownership check plus a regression test · engine: or/gpt-5.6-sol |
| `03-portal-button` | [Portal] Download button on the invoice detail screen | portal | P2 | done | 1/3 | `c81a447` | The button is visible on the invoice detail screen · APPROVED, full gate · QA: screenshots attached |

## How to read this board

- **`Route:`** is written down, so `resume` never re-routes after an interruption.
- **`Iter`** is a free rejection metric: `02` cost 2 rounds and the reason stayed in Notes.
- **The 1st note is the headline** — what changed for the person using the product, no jargon. The
  full technical story lives in the repo ticket, not here.
- The rejection on `02` is the case that justifies the whole design: the `@developer` had the gate
  green, and the `@qa` — which runs the SAME gate but has no tools to edit code — still found that
  the endpoint never checked who the invoice belonged to. The author never approves.
