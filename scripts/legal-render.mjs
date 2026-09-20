#!/usr/bin/env node
// Renders a legal template from templates/legal/: resolves `<!-- IF flag --> … <!-- /IF flag -->`
// blocks (`!flag` negates; nesting allowed, a flag never nested inside itself), substitutes
// `{{VARS}}` and leaves every `[[WRITE: …]]` for @legal to write by hand.
//   node scripts/legal-render.mjs <template.md> <answers.json> > out.md
//   node scripts/legal-render.mjs --check      # every template × example/all-true/all-false flags
// answers.json = { "flags": { name: bool }, "vars": { NAME: "text" } } — shape in
// templates/legal/answers.example.json. Unknown flag or unbalanced block → exit 1.
import { readFileSync, readdirSync } from 'node:fs';

export function render(template, flags, vars) {
  // A marker alone on its line owns that line: no stray blank lines when a block goes.
  let text = template.replace(/^[ \t]*(<!-- \/?IF !?\w+ -->)[ \t]*\n/gm, '$1');
  const block = /<!-- IF (!?)(\w+) -->([\s\S]*?)<!-- \/IF \1\2 -->/;
  const unknown = new Set();
  for (let m; (m = block.exec(text)); ) {
    const [all, neg, flag, body] = m;
    if (!(flag in flags)) unknown.add(flag);
    const keep = Boolean(flags[flag]) !== Boolean(neg);
    text = text.slice(0, m.index) + (keep ? body : '') + text.slice(m.index + all.length);
  }
  if (unknown.size) throw new Error(`unknown flags: ${[...unknown].join(', ')}`);
  if (/<!-- \/?IF /.test(text)) throw new Error('unbalanced IF markers');
  return text
    .replace(/\{\{(\w+)\}\}/g, (all, k) => (k in vars ? vars[k] : all))
    .replace(/[ \t]+$/gm, '')
    .replace(/ {2,}/g, ' ')
    .replace(/ ([.,;:])/g, '$1')
    .replace(/\n{3,}/g, '\n\n');
}

const [a, b] = process.argv.slice(2);
if (a === '--check') {
  const dir = new URL('../templates/legal/', import.meta.url);
  const { flags, vars } = JSON.parse(readFileSync(new URL('answers.example.json', dir), 'utf8'));
  const names = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md');
  const every = (v) => Object.fromEntries(Object.keys(flags).map((k) => [k, v]));
  const sets = { example: flags, all_true: every(true), all_false: every(false) };
  for (const n of names) {
    for (const [label, f] of Object.entries(sets)) {
      const out = render(readFileSync(new URL(n, dir), 'utf8'), f, vars);
      const left = out.match(/<!-- .*?-->|\{\{\w+\}\}/);
      if (left) { console.error(`${n} (${label}): leftover ${left[0]}`); process.exit(1); }
    }
  }
  console.log(`ok: ${names.length} templates × ${Object.keys(sets).length} flag sets`);
} else if (a && b) {
  const { flags = {}, vars = {} } = JSON.parse(readFileSync(b, 'utf8'));
  try { process.stdout.write(render(readFileSync(a, 'utf8'), flags, vars)); }
  catch (e) { console.error(e.message); process.exit(1); }
} else {
  console.error('usage: legal-render.mjs <template.md> <answers.json> | --check');
  process.exit(2);
}
