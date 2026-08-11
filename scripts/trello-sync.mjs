#!/usr/bin/env node
// ONE-WAY mirror BOARD.md → Trello. BOARD.md is the truth: the sync creates/moves/updates/archives
// cards until Trello matches the `## Tickets` table. Editing Trello by hand does NOT persist (the
// next sync overwrites it) — so there is never a second source of truth, and never drift.
// Usage: node trello-sync.mjs <BOARD.md> <trello-board-id> [--dry-run]
//        --dry-run: prints what was parsed and the actions, without calling the API (a free check).
// Credentials: TRELLO_KEY + TRELLO_TOKEN in ~/.claude/squad.env (copy .env.example) or exported in
// the shell (the shell wins). CAREFUL: it is API key + TOKEN — the "Secret" on the Trello page is
// NOT used (that one is for OAuth).
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

// Credentials without deps: TRELLO_* keys only, never overriding the shell. `~/.claude/squad.env`
// first because, installed as a plugin, this repo lives in a cache that is replaced on every
// update; the repo's .env stays as a fallback for the clone-and-run-by-hand case.
for (const src of [`${homedir()}/.claude/squad.env`, new URL("../.env", import.meta.url)]) {
  try {
    for (const line of readFileSync(src, "utf8").split("\n")) {
      const m = line.match(/^\s*(TRELLO_[A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    break;
  } catch {} // missing → try the next one; with neither, the shell's values apply
}

const LISTS = { ready: "Ready", in_progress: "In progress", qa: "QA", done: "Done", blocked: "Blocked" };

// Header-driven: tolerates new columns (Iter) and older BOARDs without them. Only reads
// `## Tickets`; the rest of the BOARD (Active run, extra sections) is none of its business.
// Returns { tickets, ignored, duplicates }: rows with an unknown status are reported (never
// archived silently) and repeated slugs are deduplicated (last row wins).
// The description is read BY A HUMAN — and that human is the product operator, not a dev.
// v1 dumped the columns; v2 made one bullet per `·`. Both failed the same way: a wall of technical
// bullets where you had to hunt for the single sentence saying what changed. v3 splits it into
// three levels, which is how a card is actually read at a glance:
//   1. HEADLINE — the 1st note, on its own at the top: what changed for you, in plain language.
//   2. EXAMPLE — any note starting with "Example:" is promoted here, highlighted. The operator
//      asked for this so a ticket can be understood without opening it.
//   3. DETAIL — the rest, as bullets, bounded: the full technical story lives in the repo ticket.
// Hard cap of 40 lines (MAX_LINES): a card that doesn't fit on one screen doesn't get read.
const MAX_LINES = 40;
const MAX_BULLETS = 8;

export function describe(header, cells) {
  const val = (n) => {
    const i = header.findIndex((h) => h.startsWith(n));
    return i >= 0 ? (cells[i] ?? "").trim() : "";
  };
  const notes = val("note").split(" · ").map((n) => n.trim()).filter(Boolean);
  if (!notes.length) return "_No notes yet._";
  const [headline, ...rest] = notes;
  const isExample = (n) => /^\*{0,2}example\b/i.test(n);
  const examples = rest.filter(isExample);
  let detail = rest.filter((n) => !isExample(n));
  let omitted = Math.max(0, detail.length - MAX_BULLETS);
  detail = detail.slice(0, MAX_BULLETS);

  const build = () => {
    const parts = [headline];
    for (const e of examples) parts.push(`> ${e.replace(/^\*{0,2}example:?\*{0,2}\s*/i, "**Example:** ")}`);
    if (detail.length) {
      parts.push(
        "**Detail**\n" +
          detail.map((n) => `- ${n}`).join("\n") +
          (omitted ? `\n- _…and ${omitted} more note${omitted > 1 ? "s" : ""} in the repo ticket._` : "")
      );
    }
    const footer = [
      val("commit") && val("commit") !== "—" ? `commit \`${val("commit")}\`` : "",
      val("iter") ? `iteration ${val("iter")}` : "",
      val("prio") ? `priority ${val("prio")}` : "",
    ].filter(Boolean);
    if (footer.length) parts.push(`---\n${footer.join(" · ")}`);
    return parts.join("\n\n");
  };

  // Trim one bullet at a time until it fits the cap. The headline and the example are NEVER
  // trimmed: they are precisely what the operator came to read.
  let desc = build();
  while (desc.split("\n").length > MAX_LINES && detail.length) {
    detail.pop();
    omitted++;
    desc = build();
  }
  return desc;
}

export function parseTickets(md) {
  // Project label: comes from the "# Board — <project>" title the lead already writes.
  const project = md.match(/^# Board — (.+?)\s*$/m)?.[1] ?? null;
  const empty = { tickets: [], ignored: [], duplicates: 0, project };
  const section = md.split(/^## Tickets\s*$/m)[1];
  if (!section) return empty;
  const rows = section.split("\n").filter((l) => l.trim().startsWith("|"));
  if (rows.length < 3) return empty;
  const cells = (l) => l.split("|").slice(1, -1).map((c) => c.trim());
  const header = cells(rows[0]).map((h) => h.toLowerCase());
  const col = (n) => header.findIndex((h) => h.startsWith(n));
  const iTicket = col("ticket");
  const iTitle = col("title");
  const iStatus = col("status");
  const iTheme = col("theme");
  if (iTicket < 0 || iStatus < 0) return empty;
  const raw = rows
    .slice(2) // header + separator |---|
    .map(cells)
    .filter((c) => c[iTicket])
    .map((c) => ({
      slug: c[iTicket].replace(/`/g, ""),
      title: iTitle >= 0 ? (c[iTitle] ?? "") : "",
      status: (c[iStatus] ?? "").toLowerCase().replace(/`/g, ""),
      // `Theme` column (optional): what the ticket is about in the operator's own words —
      // "security", "project screen", "publishing". It becomes a colored label in Trello, which is
      // what lets you scan the board at a glance. Several themes per ticket, comma-separated.
      // BOARDs without the column still work (header-driven): they just get the project label.
      themes: iTheme >= 0 ? (c[iTheme] ?? "").split(",").map((s) => s.trim().replace(/`/g, "")).filter(Boolean) : [],
      desc: describe(header, c),
    }));
  const ignored = raw.filter((t) => !LISTS[t.status]).map((t) => `${t.slug} (status: ${t.status || "empty"})`);
  const bySlug = new Map(); // dedup: last row wins
  for (const t of raw) if (LISTS[t.status]) bySlug.set(t.slug, t);
  const duplicates = raw.filter((t) => LISTS[t.status]).length - bySlug.size;
  return { tickets: [...bySlug.values()], ignored, duplicates, project };
}

// Deterministic color per project (same name = same color, on any board).
const COLORS = ["green", "yellow", "orange", "red", "purple", "blue", "sky", "lime", "pink", "black"];
export const colorForProject = (s) => COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

async function api(method, path, params = {}) {
  const url = new URL("https://api.trello.com/1" + path);
  const auth = { key: process.env.TRELLO_KEY, token: process.env.TRELLO_TOKEN };
  for (const [k, v] of Object.entries({ ...auth, ...params })) url.searchParams.set(k, v);
  const res = await fetch(url, { method });
  if (!res.ok) throw new Error(`Trello ${method} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function sync(boardFile, boardId, dry) {
  const { tickets, ignored, duplicates, project } = parseTickets(readFileSync(boardFile, "utf8"));
  const warnings = [
    ...(ignored.length ? [`${ignored.length} rows ignored, unknown status: ${ignored.join(", ")}`] : []),
    ...(duplicates ? [`${duplicates} duplicate slugs in the table (last row wins)`] : []),
    ...(project ? [] : ['no "# Board — <project>" title → cards get no project label']),
  ];
  if (dry) {
    console.log(JSON.stringify(tickets, null, 2));
    for (const w of warnings) console.warn(`warning: ${w}`);
    const lbl = project ? ` · label: ${project} (${colorForProject(project)})` : "";
    console.log(`dry-run: ${tickets.length} tickets parsed${lbl} (no calls to Trello)`);
    return;
  }
  // The shortlink (the one in the URL, 8 chars) works for GET but NOT as `idBoard` when creating
  // lists or labels ("400 invalid value for idBoard"). Resolve the long id once and be done.
  boardId = (await api("GET", `/boards/${boardId}`, { fields: "id" })).id;
  const cards = await api("GET", `/boards/${boardId}/cards`, { filter: "open" });
  if (tickets.length === 0 && cards.length > 0) {
    // A parse failure (renamed section, broken table) is indistinguishable from an empty board:
    // DO NOT archive.
    throw new Error(
      `0 tickets parsed and ${cards.length} open cards — was the "## Tickets" section renamed or the table broken? Inspect with --dry-run; nothing was archived.`
    );
  }
  const openLists = await api("GET", `/boards/${boardId}/lists`, { filter: "open" });
  const listId = {};
  for (const name of Object.values(LISTS)) {
    const l =
      openLists.find((x) => x.name === name) ??
      (await api("POST", "/lists", { name, idBoard: boardId, pos: "bottom" }));
    listId[name] = l.id;
  }
  // Labels. The PROJECT one (which is what lets ONE board be shared across projects and still be
  // told apart by color) governs archiving; the THEME ones ("security", "publishing"…) are what let
  // you scan the board at a glance. Created on demand and cached here: one label per name, not one
  // per card. `labels` is fetched only once.
  const labels = project || tickets.some((t) => t.themes.length) ? await api("GET", `/boards/${boardId}/labels`) : [];
  const idByLabel = new Map(labels.map((l) => [l.name, l.id]));
  const labelId = async (name) => {
    if (!idByLabel.has(name)) {
      const l = await api("POST", "/labels", { name, color: colorForProject(name), idBoard: boardId });
      idByLabel.set(name, l.id);
    }
    return idByLabel.get(name);
  };
  const projectLabelId = project ? await labelId(project) : null;
  const bySlug = new Map(cards.map((c) => [c.name.split(" — ")[0], c]));
  let created = 0, updated = 0, archived = 0;
  for (const t of tickets) {
    const name = t.title ? `${t.slug} — ${t.title}` : t.slug;
    const idList = listId[LISTS[t.status]];
    const card = bySlug.get(t.slug);
    const ids = [];
    for (const n of [...(project ? [project] : []), ...t.themes]) ids.push(await labelId(n));
    if (!card) {
      await api("POST", "/cards", { name, desc: t.desc, idList, ...(ids.length && { idLabels: ids.join(",") }) });
      created++;
    } else {
      if (card.idList !== idList || card.name !== name || card.desc !== t.desc) {
        await api("PUT", `/cards/${card.id}`, { name, desc: t.desc, idList });
        updated++;
      }
      // Only ADDS the missing ones: a label the operator applied by hand is never removed.
      for (const id of ids) {
        if (!card.idLabels?.includes(id)) await api("POST", `/cards/${card.id}/idLabels`, { value: id });
      }
    }
    bySlug.delete(t.slug);
  }
  for (const card of bySlug.values()) {
    // Board shared across projects: only archive cards carrying OUR label — cards belonging to
    // other projects (another label, or none) are left alone.
    if (projectLabelId && !card.idLabels?.includes(projectLabelId)) continue;
    await api("PUT", `/cards/${card.id}`, { closed: "true" }); // off the BOARD = off the mirror
    archived++;
  }
  for (const w of warnings) console.warn(`warning: ${w}`);
  const lbl = project ? ` · label: ${project}` : "";
  console.log(
    `sync ok: ${tickets.length} tickets · ${created} created · ${updated} updated · ${archived} archived${lbl}`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry-run");
  const [file, boardId] = args.filter((a) => a !== "--dry-run");
  if (!file || (!boardId && !dry)) {
    console.error("usage: node trello-sync.mjs <BOARD.md> <trello-board-id> [--dry-run]");
    process.exit(2);
  }
  if (!dry && (!process.env.TRELLO_KEY || !process.env.TRELLO_TOKEN)) {
    console.error(
      "missing TRELLO_KEY / TRELLO_TOKEN — copy .env.example to ~/.claude/squad.env and fill it in " +
        "(API key + Token from https://trello.com/power-ups/admin; the 'Secret' is NOT used)"
    );
    process.exit(2);
  }
  await sync(file, boardId, dry);
}
