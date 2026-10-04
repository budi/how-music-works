/*
 * dev.js — work on the site locally:
 *
 *   npm run dev                 # http://localhost:8000
 *   PORT=3000 npm run dev
 *   HOST=0.0.0.0 npm run dev    # also to other devices on your network, e.g. a phone
 *
 * Builds dist/ (with the settings in .env, see config.js), rebuilds whenever a
 * source file changes, and serves dist/ the way the live site's server should
 * (/page finds page.html; anything missing gets 404.html; docs/deploying.md).
 * Reload the browser after a change.
 */
import { watch } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.js';
import { siteConfig } from './config.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || '127.0.0.1'; // this machine only, unless asked
const SITE = siteConfig(); // read once, so a wrong setting is reported once, not on every rebuild
const WATCH = ['pages', 'templates', 'css', 'js', 'licenses', 'favicon.svg'];

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

/* ---------- build, and rebuild on change ---------- */

let timer = null;
let building = Promise.resolve();

async function rebuild(reason) {
  const started = Date.now();
  try {
    await build({ outDir: DIST, site: SITE });
    console.log(`built in ${Date.now() - started} ms${reason ? ` (${reason})` : ''}`);
  } catch (err) {
    console.error(`build failed: ${err.message}`); // dist/ still holds the last good build
  }
}

for (const path of WATCH) {
  watch(join(ROOT, path), { recursive: true }, (_event, file) => {
    clearTimeout(timer); // editors save in bursts; build once they're done
    timer = setTimeout(() => {
      building = building.then(() => rebuild(file ? join(path, file) : path));
    }, 100);
  });
}

/* ---------- serve dist/ ---------- */

async function find(urlPath) {
  const path = normalize(join(DIST, decodeURIComponent(urlPath)));
  if (path !== DIST && !path.startsWith(DIST + sep)) return null; // no ../ out of dist
  for (const candidate of [path, join(path, 'index.html'), path + '.html']) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      /* try the next one */
    }
  }
  return null;
}

const server = createServer(async (req, res) => {
  await building; // don't serve a half-written build
  let file;
  try {
    file = await find(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('Bad request'); // e.g. /%E0%A4%A, which can't be decoded
    return;
  }
  const path = file || join(DIST, '404.html');
  res.writeHead(file ? 200 : 404, {
    'Content-Type': TYPES[extname(path)] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  res.end(await readFile(path));
});

building = rebuild();
await building;
server.listen(PORT, HOST, () => console.log(`serving dist/ at http://localhost:${PORT} — watching ${WATCH.join(', ')}`));
