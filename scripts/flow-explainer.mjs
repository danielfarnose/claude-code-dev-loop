#!/usr/bin/env node
// A small, offline renderer; the architect supplies the verified flow, not a repository indexer.
import { closeSync, constants, fstatSync, openSync, readFileSync, readSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const MAX_FILE = 1024 * 1024;
const LANGUAGES = Object.fromEntries([
  ['Go', '.go'], ['JavaScript', '.js .jsx .mjs .cjs'], ['TypeScript', '.ts .tsx'],
  ['Python', '.py'], ['Rust', '.rs'], ['Java', '.java'], ['Kotlin', '.kt'],
  ['C#', '.cs'], ['Ruby', '.rb'], ['PHP', '.php'], ['C / C++', '.c .cpp .h .hpp'],
  ['SQL', '.sql'], ['Shell', '.sh .bash'], ['HTML', '.html'], ['CSS', '.css .scss'],
  ['Swift', '.swift'], ['Elixir', '.ex .exs'], ['Vue', '.vue'], ['Svelte', '.svelte'],
  ['Markdown', '.md .mdx'],
].flatMap(([language, extensions]) => extensions.split(' ').map((extension) => [extension, language])));
const blockedPart = /^(?:\.env.*|\.git|node_modules|logs?|secrets?|credentials?)(?:$)|(?:^|[-_.])(?:private[-_]?key|credentials?|secrets?)(?:$|[-_.])/i;
const fail = (message) => { throw new Error(message); };
const text = (value, label, max = 4000) => typeof value === 'string' && value.length <= max ? value : fail(`${label}: expected text, at most ${max} characters`);
const integer = (value, min, max, label) => Number.isInteger(value) && value >= min && value <= max ? value : fail(`${label}: expected integer ${min}–${max}`);
const list = (value, max, label) => Array.isArray(value) && value.length <= max ? value : fail(`${label}: expected list, at most ${max} items`);
const inside = (root, path) => { const rel = relative(root, path); return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel); };

function readBounded(path) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NONBLOCK);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > MAX_FILE) fail('Expected a regular file no larger than 1 MiB');
    // Read at most the ceiling plus one byte even if the source grows after stat.
    const buffer = Buffer.alloc(MAX_FILE + 1);
    let count = 0, read;
    while (count < buffer.length && (read = readSync(fd, buffer, count, buffer.length - count, null)) > 0) count += read;
    if (count > MAX_FILE) fail('File exceeds 1 MiB');
    return buffer.toString('utf8', 0, count);
  } finally { closeSync(fd); }
}

export function prepareFlow(data) {
  const root = realpathSync(text(data.repoRoot, 'repoRoot'));
  if (!statSync(root).isDirectory()) fail('repoRoot must be a directory');
  const sources = new Map();
  let snippetBytes = 0, sourceBytes = 0;
  const ids = new Set();
  const steps = list(data.steps, 40, 'steps').map((step) => {
    const id = text(step.id, 'step.id', 100);
    if (!id || ids.has(id)) fail('Step IDs must be nonempty and unique');
    ids.add(id);
    const code = list(step.code ?? [], 8, 'step.code').map((ref) => {
      const path = text(ref.path, 'code.path', 500);
      if (!path || isAbsolute(path) || path.includes('\\') || path.split('/').some((part) => part === '..' || blockedPart.test(part))) fail('Code path must be a relative source path without secrets');
      const source = realpathSync(resolve(root, path));
      const actual = relative(root, source);
      const language = LANGUAGES[extname(source).toLowerCase()];
      if (!inside(root, source) || actual.split(sep).some((part) => blockedPart.test(part)) || !language) fail('Code reference is outside the repository or is not an allowed source file');
      if (!sources.has(source)) {
        sourceBytes += statSync(source).size;
        if (sourceBytes > 4 * MAX_FILE) fail('Combined source files exceed 4 MiB');
        sources.set(source, readBounded(source).split(/\r?\n/));
      }
      const lines = sources.get(source);
      const line = integer(ref.line, 1, lines.length, 'code.line');
      const count = integer(ref.lines ?? 12, 1, 40, 'code.lines');
      if (line + count - 1 > lines.length) fail('Code range extends beyond the source file');
      const snippet = lines.slice(line - 1, line + count - 1).map((content, offset) => `${line + offset}  ${content}`).join('\n');
      snippetBytes += Buffer.byteLength(snippet);
      if (snippetBytes > 256 * 1024) fail('Combined snippets exceed 256 KiB');
      const annotations = list(ref.annotations ?? [], 8, 'code.annotations').map((annotation) => ({
        line: integer(annotation.line, line, line + count - 1, 'annotation.line'),
        text: text(annotation.text, 'annotation.text', 1000),
      }));
      return { path, symbol: text(ref.symbol, 'code.symbol', 300), language, line, lines: count, snippet, annotations };
    });
    let tutor = null;
    if (step.tutor != null) {
      tutor = {
        explanation: text(step.tutor.explanation, 'tutor.explanation'),
        example: text(step.tutor.example, 'tutor.example'),
        concepts: list(step.tutor.concepts ?? [], 3, 'tutor.concepts').map((concept) => ({ term: text(concept.term, 'concept.term', 100), meaning: text(concept.meaning, 'concept.meaning', 1000) })),
      };
    }
    return {
      id, title: text(step.title, 'step.title', 200), actor: text(step.actor, 'step.actor', 200),
      agent: step.agent == null ? null : text(step.agent, 'step.agent', 200),
      summary: text(step.summary, 'step.summary'), input: text(step.input, 'step.input'),
      output: text(step.output, 'step.output'), note: text(step.note ?? '', 'step.note'), code, tutor,
    };
  });
  if (!steps.length) fail('At least one step is required');
  return { title: text(data.title, 'title', 200), project: basename(root), repoRoot: root, revision: text(data.revision, 'revision', 200), steps };
}

export function renderFlow(data, { standalone = false, tutor = false } = {}) {
  const flow = prepareFlow(data);
  const id = `squad-flow-${createHash('sha256').update(JSON.stringify(flow)).digest('hex').slice(0, 12)}`;
  // No input can terminate the JSON script or create HTML. The UI uses textContent only.
  const json = JSON.stringify({ ...flow, initialMode: tutor ? 'tutor' : 'summary' }).replace(/[<>&\u2028\u2029]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
  const fragment = readFileSync(new URL('../templates/flow-explainer.html', import.meta.url), 'utf8').replaceAll('__ROOT_ID__', id).replace('__FLOW_DATA__', () => json);
  const output = standalone ? `<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Squad · flujo</title><style>
    :root{color-scheme:light dark;--font-size-base:14px;--background:light-dark(#fff,#181818);--foreground:light-dark(#202020,#eee);--primary:light-dark(#252525,#eee);--primary-foreground:light-dark(#fff,#202020);--muted:light-dark(#eee,#292929);--muted-foreground:light-dark(#555,#bbb);--border:light-dark(#ddd,#444)}
    body{margin:0;padding:24px;background:var(--background);color:var(--foreground);font:var(--font-size-base) system-ui,sans-serif}main{max-width:1000px;margin:auto}h1,h2,h3,strong{font-weight:500}.text-small{font-size:.86em}.text-muted{color:var(--muted-foreground)}.viz-row,.viz-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.btn{font:inherit;min-height:44px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:transparent;color:var(--foreground)}.btn[aria-pressed=true]{background:var(--primary);color:var(--primary-foreground)}.btn:disabled{opacity:.5}button,summary{cursor:pointer}code{font-family:ui-monospace,monospace}hr{border:0;border-top:1px solid var(--border)}
    </style></head><body><main>${fragment}</main></body></html>\n` : fragment;
  if (Buffer.byteLength(output) > MAX_FILE) fail('Rendered flow exceeds 1 MiB');
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [input, output, ...flags] = process.argv.slice(2);
  if (!input || !output || flags.some((flag) => !['--standalone', '--tutor'].includes(flag))) {
    console.error('usage: flow-explainer.mjs <data.json> <output.html> [--standalone] [--tutor]');
    process.exitCode = 2;
  } else {
    try {
      const data = JSON.parse(readBounded(input));
      // Relative repoRoot is resolved from the data file, not whichever directory invoked the CLI.
      data.repoRoot = resolve(dirname(resolve(input)), data.repoRoot);
      writeFileSync(output, renderFlow(data, { standalone: flags.includes('--standalone'), tutor: flags.includes('--tutor') }));
      console.log(`Flow written: ${resolve(output)}`);
    } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
