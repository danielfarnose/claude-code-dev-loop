# Ticket template — squad

EVERY role that writes a ticket copies this structure as-is — @architect, @security, patrol
findings: no exceptions. Product first (understandable without reading code), technical at the
end. Readable in <60 seconds — if it doesn't fit on one screen, the ticket is a candidate for
splitting.

---

# [Area] Expected result
<!-- Title = what changes, not "fix X" / "improve Y". Must be understandable without opening the ticket.
E.g. "[Backups] Prevent a backup from being overwritten without warning" -->

## Problem
<!-- What happens today and why it matters. Max 3 sentences. No code jargon. -->

## Expected result
<!-- What changes for whoever uses the product. Max 2 sentences.
Feature: "As a <user>, I want <capability> so that <benefit>." -->

## Acceptance criteria
<!-- 3 to 5, each answerable yes/no. No more (nobody reads them all) and no fewer (not enough
to verify). -->
- [ ]
- [ ]
- [ ]

## Technical notes
<!-- Everything the developer needs to execute, and the qa to verify. Only the
essentials — long research or extensive design goes in a separate doc, linked. -->
- Files: <real paths to touch>
- Verification: <exact command from `squad.md §Verification`>
- QA: screenshots | video
- Type: security | logic | bug | feature | cleanup | copy
<!-- Type: exactly ONE — the lead copies it to the BOARD's Theme column and it becomes the card's
colored tag in Trello, next to the project tag. -->
<!-- Only if applicable, one line each: -->
- Assumption: <what you assumed in the face of ambiguity, and why>
- Risk: high
- Chain: <name> · N/M · gate: deferred|closing|full
<!-- If the ticket is a bug: -->
- Reproduce: 1) … 2) … 3) …
- Actual: <what happens> · Expected: <what should happen>
