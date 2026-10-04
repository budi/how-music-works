/*
 * Test helpers.
 *
 * The modules in js/ that don't touch the page (music/, draw/, audio/, lib/)
 * are imported by tests directly. Pages are tested as a browser would run them:
 *
 *   await loadPage('x.html') — the page in jsdom, rendered from pages/x.hbs,
 *                              each of its scripts loaded as the ES module it
 *                              is, fresh for this page (so nothing is shared
 *                              between tests, and coverage sees every file);
 *                              pass `root` to load an already-built page and
 *                              its bundled scripts instead.
 *
 * Loading modules into jsdom needs `node --experimental-vm-modules`, which
 * `npm test` passes.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { renderPage } from '../scripts/render.js';

const projectRoot = new URL('../', import.meta.url);
const isExternal = (src) => /^([a-z]+:)?\/\//i.test(src);
const read = (path, root = projectRoot) => readFileSync(new URL(path, root), 'utf8');
const sources = new Map(); // file URL -> source, read once

// An ES module and everything it imports, run in the page's window.
async function runModule(url, context) {
  if (!vm.SourceTextModule) throw new Error('Run the tests with `npm test`: pages need node --experimental-vm-modules');
  const modules = new Map(); // fresh for each script, as each is bundled on its own
  const load = (href) => {
    if (!modules.has(href)) {
      if (!sources.has(href)) sources.set(href, readFileSync(new URL(href), 'utf8'));
      modules.set(href, new vm.SourceTextModule(sources.get(href), { identifier: href, context }));
    }
    return modules.get(href);
  };
  const entry = load(url);
  await entry.link((specifier, from) => load(new URL(specifier, from.identifier).href));
  await entry.evaluate();
}

// Options:
//   storage — localStorage entries to set before the scripts run
//   setup   — function(window) run before the scripts, e.g. to stub APIs or add markup
//   root    — folder (file: URL) holding built pages to load instead, e.g. dist/
export async function loadPage(file, { storage = {}, setup, root = projectRoot } = {}) {
  const built = root !== projectRoot;
  const dom = new JSDOM(built ? read(file, root) : renderPage(file), {
    url: 'http://localhost/' + file,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  for (const [key, value] of Object.entries(storage)) window.localStorage.setItem(key, value);
  if (setup) setup(window);

  // jsdom has parsed the page and will fire DOMContentLoaded by itself; hold
  // that back, and fire it once every script has run
  const loaded = new window.Event('DOMContentLoaded');
  window.addEventListener('DOMContentLoaded', (e) => { if (e !== loaded) e.stopImmediatePropagation(); }, { capture: true });

  // Scripts from other sites (the visitor stats) are skipped, as the build does.
  const context = dom.getInternalVMContext();
  for (const script of window.document.querySelectorAll('script[src]')) {
    const src = script.getAttribute('src');
    if (isExternal(src)) continue;
    const url = new URL(src, root);
    if (built) new vm.Script(read(src, root), { filename: fileURLToPath(url) }).runInContext(context);
    else await runModule(url.href, context);
  }
  window.document.dispatchEvent(loaded);
  return window;
}

// Waits until check() is true, looking every 10 ms, for up to `ms`. For the
// players: their timers and animation frames run on the real clock, which a
// busy CI machine can make slow. Returns whether it got there; assert after.
export async function until(check, ms = 3000) {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) return false;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return true;
}

export function click(window, selector) {
  const el = window.document.querySelector(selector);
  if (!el) throw new Error('Nothing matches ' + selector);
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

export const texts = (window, selector) =>
  [...window.document.querySelectorAll(selector)].map((el) => el.textContent.trim());
