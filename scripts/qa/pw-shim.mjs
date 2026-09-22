// Playwright para los evals, resuelto de forma portable.
//
// Dos problemas reales, los dos vistos en producción (love-app, 2026-09-22):
//
//  1. `import('playwright')` es ESM y **no mira NODE_PATH**, así que una
//     instalación global no se resuelve desde el cwd del proyecto. Un eval
//     lanzado desde un worktree muere con ERR_MODULE_NOT_FOUND aunque
//     `npm ls -g` diga que está. Aquí se resuelve primero como lo haría el
//     proyecto y, si no, contra la raíz global que diga `npm root -g`.
//
//  2. Estos hosts no tienen Google Chrome, solo el chromium que trae
//     Playwright. `channel: 'chrome'` falla con un error de ejecutable que
//     parece un test roto, así que se descarta el canal.
//
// Uso:  PLAYWRIGHT_MODULE=<ruta a este fichero> node scripts/mi-eval.mjs
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const localRequire = createRequire(`${process.cwd()}/`);

function loadPlaywright() {
  try {
    return localRequire('playwright');
  } catch {
    const globalRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    return createRequire(`${globalRoot}/`)('playwright');
  }
}

const pw = loadPlaywright();

export const chromium = {
  launch: (opts = {}) => {
    const { channel: _ignored, ...rest } = opts;
    return pw.chromium.launch(rest);
  },
};
export default { chromium };
