import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { prepareFlow, renderFlow } from './flow-explainer.mjs';

function fixture(t) {
  const temp = mkdtempSync(join(tmpdir(), 'squad-explain-'));
  const repo = join(temp, 'invoice-project'); mkdirSync(repo);
  writeFileSync(join(repo, 'service.go'), 'package invoice\nfunc Save() string {\n  return "saved"\n}\n');
  writeFileSync(join(repo, 'service.py'), 'def save_invoice(draft):\n    validate(draft)\n    return store(draft)\n');
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const data = {
    title: 'Save an invoice', repoRoot: repo, revision: 'abc123',
    steps: [{ id: 'save', title: 'Save', actor: 'Service', agent: null, summary: 'Saves the draft.',
      input: 'Draft', output: 'Invoice ID', note: 'Returns validation errors.',
      code: [{ path: 'service.go', symbol: 'Save', line: 2, lines: 3, annotations: [{ line: 3, text: 'Returns the result.' }] }],
      tutor: { explanation: 'The function returns a result.', example: 'Save a valid draft.', concepts: [{ term: 'return', meaning: 'Sends a value to the caller.' }] },
    }],
  };
  return { temp, repo, data };
}

test('reads real snippets with line numbers and language; works for Go and Python', (t) => {
  const { data } = fixture(t);
  const go = prepareFlow(data);
  assert.equal(go.project, 'invoice-project');
  assert.equal(go.steps[0].code[0].language, 'Go');
  assert.equal(go.steps[0].code[0].snippet, '2  func Save() string {\n3    return "saved"\n4  }');
  data.steps[0].code = [{ path: 'service.py', symbol: 'save_invoice', line: 1, lines: 3 }];
  const python = prepareFlow(data);
  assert.equal(python.steps[0].code[0].language, 'Python');
  assert.match(python.steps[0].code[0].snippet, /2      validate\(draft\)/);
});

test('rejects absolute/traversal paths, symlink escapes and secret files including symlink aliases', (t) => {
  const { temp, repo, data } = fixture(t);
  writeFileSync(join(temp, 'outside.go'), 'secret');
  writeFileSync(join(repo, '.env.production'), 'API_KEY=secret');
  symlinkSync(join(temp, 'outside.go'), join(repo, 'escape.go'));
  symlinkSync(join(repo, '.env.production'), join(repo, 'alias.go'));
  mkdirSync(join(repo, 'secrets'));
  writeFileSync(join(repo, 'secrets', 'config.go'), 'secret');
  for (const path of [join(temp, 'outside.go'), '../outside.go', 'escape.go', '.env.production', 'alias.go', 'secrets/config.go']) {
    data.steps[0].code[0].path = path;
    assert.throws(() => prepareFlow(data), /relative source|outside the repository|allowed source/);
  }
});

test('rejects invalid source ranges, annotations outside the snippet and excessive lesson concepts', (t) => {
  const { data } = fixture(t);
  const ref = data.steps[0].code[0];
  ref.line = 0; assert.throws(() => prepareFlow(data), /code.line/);
  ref.line = 2; ref.lines = 40; assert.throws(() => prepareFlow(data), /beyond/);
  ref.lines = 3; ref.annotations[0].line = 1; assert.throws(() => prepareFlow(data), /annotation.line/);
  ref.annotations[0].line = 3;
  data.steps[0].tutor.concepts = Array.from({ length: 4 }, () => ({ term: 'x', meaning: 'x' }));
  assert.throws(() => prepareFlow(data), /tutor.concepts/);
});

test('bounds source allocation, total snippets and repeated flow steps', (t) => {
  const { repo, data } = fixture(t);
  writeFileSync(join(repo, 'large.go'), 'x'.repeat(1024 * 1024 + 1));
  data.steps[0].code[0].path = 'large.go';
  assert.throws(() => prepareFlow(data), /1 MiB/);
  writeFileSync(join(repo, 'large.go'), 'x'.repeat(140000));
  data.steps[0].code = Array.from({ length: 2 }, () => ({ path: 'large.go', symbol: 'large', line: 1, lines: 1 }));
  assert.throws(() => prepareFlow(data), /snippets exceed/);
  data.steps[0].code = [];
  data.steps.push({ ...data.steps[0] });
  assert.throws(() => prepareFlow(data), /IDs.*unique/);
});

test('bounds combined source reads even when only short snippets are requested', (t) => {
  const { repo, data } = fixture(t);
  data.steps[0].code = Array.from({ length: 5 }, (_, index) => {
    const path = `source-${index}.go`;
    writeFileSync(join(repo, path), `package invoice\n// ${'x'.repeat(900000)}`);
    return { path, symbol: 'invoice', line: 1, lines: 1 };
  });
  assert.throws(() => prepareFlow(data), /Combined source files/);
});

test('escapes HTML injection in text and source without changing the JSON payload', (t) => {
  const { repo, data } = fixture(t);
  const attack = '</script><img src=x onerror=alert(1)>&\u2028\u2029';
  data.title = attack;
  writeFileSync(join(repo, 'service.go'), `// ${attack}\n`);
  data.steps[0].code = [{ path: 'service.go', symbol: 'Save', line: 1, lines: 1 }];
  const html = renderFlow(data);
  assert.ok(!html.includes(attack));
  const json = html.match(/<script type="application\/json" data-flow>([\s\S]*?)<\/script>/)[1];
  assert.equal(JSON.parse(json).title, attack);
  assert.equal(JSON.parse(json).steps[0].code[0].snippet, `1  // ${attack}`);
  assert.match(html, /element.textContent = value/);
  assert.doesNotMatch(html, /innerHTML|fetch\(|XMLHttpRequest|WebSocket/);
});

test('fragment leaves theme to host, standalone supplies defaults, Tutor is opt-in', (t) => {
  const { data } = fixture(t);
  const fragment = renderFlow(data);
  assert.doesNotMatch(fragment, /<!doctype|<html|<head>|<body>|:root/);
  assert.match(fragment, /"initialMode":"summary"/);
  assert.match(fragment, /data-mode="tutor"/);
  const standalone = renderFlow(data, { standalone: true, tutor: true });
  assert.match(standalone, /^<!doctype html>/);
  assert.match(standalone, /"initialMode":"tutor"/);
  assert.match(standalone, /:root\{color-scheme/);
});

test('CLI resolves the repository relative to its JSON and reports invalid arguments', (t) => {
  const { temp, data } = fixture(t);
  const input = join(temp, 'flow.json'), output = join(temp, 'flow.html');
  data.repoRoot = 'invoice-project';
  writeFileSync(input, JSON.stringify(data));
  const script = new URL('./flow-explainer.mjs', import.meta.url);
  const run = spawnSync(process.execPath, [script.pathname, input, output, '--standalone', '--tutor'], { encoding: 'utf8', cwd: tmpdir() });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Flow written/);
  assert.equal(spawnSync(process.execPath, [script.pathname, input, output, '--bad']).status, 2);
});
