// node --test scripts/trello-sync.test.mjs   (native runner, no deps)
// Covers what can break silently: how the description a human reads is assembled (the product
// operator, not a dev) and where the board labels come from.
import { test } from "node:test";
import assert from "node:assert/strict";
import { describe as buildDesc, parseTickets, colorForProject } from "./trello-sync.mjs";

const header = ["ticket", "title", "theme", "prio", "status", "iter", "commit", "notes"];
const row = (notes, theme = "") => ["t-1", "Title", theme, "P1", "done", "2/3", "abc1234", notes];

test("type tags get fixed semantic colors; project names keep the deterministic hash", () => {
  assert.equal(colorForProject("security"), "red");
  assert.equal(colorForProject("bug"), "orange");
  assert.equal(colorForProject("logic"), "yellow");
  assert.equal(colorForProject("feature"), "green");
  assert.equal(colorForProject("cleanup"), "sky");
  assert.equal(colorForProject("copy"), "purple");
  const valid = ["green", "yellow", "orange", "red", "purple", "blue", "sky", "lime", "pink", "black"];
  assert.ok(valid.includes(colorForProject("acme-billing")));
});

test("the 1st note is the headline and stands alone on top; the rest drops to Detail", () => {
  const d = buildDesc(header, row("You can now write the tagline · APPROVED · gate green"));
  assert.match(d, /^You can now write the tagline\n/); // headline, no bullet
  assert.match(d, /\*\*Detail\*\*\n- APPROVED\n- gate green/);
});

test("an 'Example:' note is promoted above the detail", () => {
  const d = buildDesc(header, row("Headline · Example: you hit Save and only then it changes · technical note"));
  const [iEx, iDet] = [d.indexOf("**Example:**"), d.indexOf("**Detail**")];
  assert.ok(iEx > 0 && iEx < iDet, "the example comes before the detail");
  assert.match(d, /> \*\*Example:\*\* you hit Save/);
});

test("hard cap of 40 lines: trims detail, never the headline or the example", () => {
  const many = ["THE HEADLINE", "Example: the concrete case", ...Array.from({ length: 30 }, (_, i) => `note ${i}`)];
  const d = buildDesc(header, row(many.join(" · ")));
  assert.ok(d.split("\n").length <= 40, `it is ${d.split("\n").length} lines`);
  assert.match(d, /^THE HEADLINE\n/);
  assert.match(d, /\*\*Example:\*\* the concrete case/);
  assert.match(d, /more notes in the repo ticket/); // says it trimmed, doesn't hide it
});

test("the footer carries traceability, and does NOT repeat name or status", () => {
  const d = buildDesc(header, row("note"));
  assert.match(d, /commit `abc1234` · iteration 2\/3 · priority P1$/);
  assert.doesNotMatch(d, /t-1|Title|done/); // already in the card name and in the list
});

test("a just-registered ticket: no commit and no notes, prints no junk", () => {
  const d = buildDesc(header, ["t-1", "Title", "", "P1", "ready", "1/3", "—", ""]);
  assert.match(d, /^_No notes yet\._/);
  assert.doesNotMatch(d, /commit/); // the BOARD's "—" is not a hash
});

test("the Theme column parses into labels (several, comma-separated)", () => {
  const { tickets } = parseTickets(`# Board — project

## Tickets
| Ticket | Title | Theme | Prio | Status | Iter | Commit | Notes |
|--------|-------|-------|------|--------|------|--------|-------|
| t-1 | Do something | security, project screen | P1 | done | 1/3 | abc1234 | Headline · no surprises |
`);
  assert.deepEqual(tickets[0].themes, ["security", "project screen"]);
  assert.match(tickets[0].desc, /^Headline\n/);
});

test("a BOARD with no Theme column still works (header-driven)", () => {
  const { tickets } = parseTickets(`# Board — project

## Tickets
| Ticket | Title | Prio | Status | Iter | Commit | Notes |
|--------|-------|------|--------|------|--------|-------|
| t-1 | Do something | P1 | done | 1/3 | abc1234 | Headline · no surprises |
`);
  assert.equal(tickets.length, 1);
  assert.deepEqual(tickets[0].themes, []);
});
