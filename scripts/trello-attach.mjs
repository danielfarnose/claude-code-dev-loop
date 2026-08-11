#!/usr/bin/env node
// Uploads @qa evidence (screenshots) to the ticket's Trello card. Companion to trello-sync.mjs:
// that one mirrors the BOARD's TEXT, this one uploads the FILES the BOARD cannot carry. The LEAD
// runs it when closing a verdict, with the paths @qa reported.
// Usage: node trello-attach.mjs <trello-board-id> <ticket-slug> <file...> [--dry-run]
// Idempotent: if the card already has an attachment with that name it is skipped (re-running is free).
// Credentials: TRELLO_KEY + TRELLO_TOKEN in ~/.claude/squad.env, same as trello-sync.mjs.
import { readFileSync, openAsBlob } from "node:fs";
import { homedir } from "node:os";
import { basename } from "node:path";

for (const src of [`${homedir()}/.claude/squad.env`, new URL("../.env", import.meta.url)]) {
  try {
    for (const line of readFileSync(src, "utf8").split("\n")) {
      const m = line.match(/^\s*(TRELLO_[A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    break;
  } catch {}
}

const auth = () => ({ key: process.env.TRELLO_KEY, token: process.env.TRELLO_TOKEN });

async function api(method, path, params = {}) {
  const url = new URL("https://api.trello.com/1" + path);
  for (const [k, v] of Object.entries({ ...auth(), ...params })) url.searchParams.set(k, v);
  const res = await fetch(url, { method });
  if (!res.ok) throw new Error(`Trello ${method} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

// The attachment goes as multipart, not query string: the attachments API does not accept the file
// as a URL parameter. Auth does still travel in the query (same scheme as everything else).
async function upload(cardId, file) {
  const url = new URL(`https://api.trello.com/1/cards/${cardId}/attachments`);
  for (const [k, v] of Object.entries(auth())) url.searchParams.set(k, v);
  const form = new FormData();
  form.append("file", await openAsBlob(file), basename(file));
  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Trello POST attachment ${basename(file)}: ${res.status} ${await res.text()}`);
  return res.json();
}

const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const [boardId, slug, ...files] = args.filter((a) => a !== "--dry-run");
if (!boardId || !slug || !files.length) {
  console.error("usage: trello-attach.mjs <board-id> <ticket-slug> <file...> [--dry-run]");
  process.exit(2);
}

const id = (await api("GET", `/boards/${boardId}`, { fields: "id" })).id;
const cards = await api("GET", `/boards/${id}/cards`, { filter: "open", fields: "name" });
// Same naming convention as trello-sync.mjs: "<slug> — <title>".
const card = cards.find((c) => c.name.split(" — ")[0] === slug);
if (!card) {
  console.error(`no card for "${slug}" — did you run trello-sync.mjs first?`);
  process.exit(1);
}

const alreadyThere = new Set(
  (await api("GET", `/cards/${card.id}/attachments`, { fields: "name" })).map((a) => a.name),
);
const fresh = files.filter((f) => !alreadyThere.has(basename(f)));

if (dry) {
  console.log(`dry-run: card "${card.name}" · would upload ${fresh.length} of ${files.length}` +
    (fresh.length < files.length ? ` (${files.length - fresh.length} already attached)` : ""));
  for (const f of fresh) console.log(`  + ${basename(f)}`);
  process.exit(0);
}

for (const f of fresh) await upload(card.id, f);
console.log(`attachments ok: ${fresh.length} uploaded · ${files.length - fresh.length} already there · card "${card.name}"`);
