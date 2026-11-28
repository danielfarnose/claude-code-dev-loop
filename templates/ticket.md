# Ticket template — squad

EVERY role that writes a ticket copies this structure as-is — @architect, @security, patrol
findings: no exceptions. Product first (understandable without reading code), then the test
contract, technical at the end. Readable in <60 seconds — if it doesn't fit on one screen, the ticket is a candidate for
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
to verify). If the ticket comes from a @pm spec, keep its IDs: `- [ ] AC-02 <criterion>` — the
@qa reports the verdict by those IDs. -->
- [ ]
- [ ]
- [ ]

## Test contract
<!-- Written by @architect, who owns the test budget: this list is the floor AND the ceiling.
Names, behaviour and location — never test code. Budget: look-only change 0 tests · UI behaviour
1–2 · logic 2–5 (same-shape cases share one table-driven test) · bug fix 1 regression · money /
deletion / auth: what the defense table needs. A test asserts what the user gets, never CSS
classes, source text, DOM structure or exact copy.
`- [ ] T-NN <plain sentence> · <test_name> — <how it is mounted> · <unit|integration|e2e|regression> · <test path> [· AC-NN]`
The plain sentence comes first and a non-developer understands it: what the user sees or can do,
or which bug does not come back (no code names, no `·`). Rewriting an old test so it passes is a
line too: `T-NN (rewrites <old test> — <why>)`. Only the @architect or the lead adds a T-NN.
@developer writes exactly these tests first (same names), adds none, and flips `[x]` when green.
A test outside this list is REJECTED by the @qa even when green.
@qa runs them by name, reports `T-NN PASS|FAIL — <plain sentence>` and `Tests: +N −M`.
The Trello sync mirrors this list as the card's "Tests" checklist: the item is the text up to the
first ` · `, i.e. the plain sentence (checked = green). -->
- Verify: AC-01 test T-01 · AC-02 screenshot · AC-03 run
- [ ] T-01 <what the user sees or can do, in plain words> · `<test_name>` — <how it is mounted> · unit · <path/to/test> · AC-01
- Remove: <tests that die with the behaviour this ticket removes or redesigns, or "none">
- Run: <one command that runs ONLY these tests, in isolation>
- Blocking: any T-NN red <· plus what else blocks, if anything>

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
- Flow: <ID + flow doc/HTML path; entry-point decisions and tests live there>
- Mock: <approved mockup path · rev <hash> · author: <architect|lead> · run <RUN-…> · critique: <score> · inventory rows this ticket covers, removals included>
- Kind: flow-review
- Depends on: <implementation/setup/repair ticket slugs>
<!-- Kind: flow-review ONLY for the single final ticket explicitly requested with "prueba con WF"
or --wf. Type: logic, QA: video; no Chain field. Explain the journey and logic checks above;
require its own Trello card to carry the video, approved HTML and report. @qa owns this ticket. -->
- Assumption: <what you assumed in the face of ambiguity, and why>
- Risk: high
- Chain: <name> · N/M · gate: deferred|closing|full
<!-- If the ticket is a bug: -->
- Reproduce: 1) … 2) … 3) …
- Actual: <what happens> · Expected: <what should happen>
