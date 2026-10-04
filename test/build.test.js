import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import zlib from 'node:zlib';
import { build } from '../scripts/build.js';
import { renderPage } from '../scripts/render.js';
import { siteConfig } from '../scripts/config.js';
import { loadPage, click, texts } from './helpers.js';

let outDir;
let result;
const read = (path) => readFileSync(join(outDir, path), 'utf8');
const refs = (html) => [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
const ICONS = ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'];
const pngSize = (png) => [png.readUInt32BE(16), png.readUInt32BE(20)];

// built as a deployment would be, with every setting (example.org: never a real server)
const SITE = siteConfig({
  UMAMI_SCRIPT_URL: 'https://stats.example.org/script.js',
  UMAMI_RECORDER_URL: 'https://stats.example.org/recorder.js',
  UMAMI_WEBSITE_ID: '00000000-0000-4000-8000-000000000000',
  UMAMI_DOMAINS: 'music.example.org',
  SOURCE_URL: 'https://example.org/music',
});

before(async () => {
  outDir = mkdtempSync(join(tmpdir(), 'music-build-'));
  result = await build({ outDir, site: SITE });
});
after(() => rmSync(outDir, { recursive: true, force: true }));

describe('build', () => {
  it('builds every page, and ships nothing but pages, assets, icons and licences', () => {
    const shipped = readdirSync(outDir).filter((f) => !/\.(br|gz)$/.test(f));
    assert.deepEqual(shipped.filter((f) => f.endsWith('.html')).sort(), [...result.pages].sort());
    assert.deepEqual(shipped.filter((f) => !f.endsWith('.html')).sort(), ['apple-touch-icon.png', 'assets', 'favicon.ico', 'favicon.svg', 'licenses']);
  });

  it('bundles each page’s scripts into classic scripts, and points pages at hashed assets that exist', () => {
    for (const page of result.pages) {
      for (const ref of refs(read(page)).filter((r) => /\.(css|js)$/.test(r) && !/^https?:/.test(r))) {
        assert.match(ref, /^assets\/[\w-]+\.[0-9a-f]{10}\.(css|js)$/, `${page}: ${ref}`);
        assert.ok(existsSync(join(outDir, ref)), `${page}: ${ref} missing`);
      }
    }
    for (const script of result.assets.filter((a) => a.endsWith('.js'))) {
      assert.doesNotMatch(read(script), /(^|[;}])\s*(import|export)[\s{*]/, script + ' needs no module loader');
    }
  });

  it('ships Bravura’s licence, and keeps its notice in every script drawing its symbols', () => {
    assert.match(readFileSync(join(outDir, 'licenses/bravura-OFL.txt'), 'utf8'), /SIL Open Font License/);
    for (const page of ['beats-101', 'reading-notes']) {
      const script = result.assets.find((a) => a.startsWith(`assets/${page}.`) && a.endsWith('.js'));
      assert.match(read(script), /\/\*![\s\S]*Bravura[\s\S]*licenses\/bravura-OFL\.txt/, page);
    }
  });

  it('ships the statistics loader with the deployment’s settings on its tag, and no tracker in the page', () => {
    const loader = result.assets.find((a) => a.includes('/stats.'));
    for (const page of result.pages) {
      const html = read(page);
      assert.ok(refs(html).includes(loader), page);
      assert.match(html, /data-tracker="https:\/\/stats\.example\.org\/script\.js"[^>]*data-domains="music\.example\.org"/, page);
      assert.doesNotMatch(html, /<script[^>]*src="https:/, page + ': no tracker script in the page');
    }
  });

  it('minifies every page, leaving no comments', () => {
    for (const page of result.pages) {
      assert.ok(read(page).length < renderPage(page, SITE).length, page);
      assert.doesNotMatch(read(page), /<!--/, page);
    }
  });

  it('pre-compresses every file with brotli and gzip', () => {
    assert.ok(result.files.length >= result.pages.length + result.assets.length);
    for (const { path } of result.files) {
      const raw = readFileSync(join(outDir, path));
      assert.deepEqual(zlib.brotliDecompressSync(readFileSync(join(outDir, path + '.br'))), raw, path);
      assert.deepEqual(zlib.gunzipSync(readFileSync(join(outDir, path + '.gz'))), raw, path);
    }
  });
});

describe('a build without settings, as a contributor makes', () => {
  let plain;
  let plainResult;
  before(async () => {
    plain = mkdtempSync(join(tmpdir(), 'music-build-'));
    plainResult = await build({ outDir: plain });
  });
  after(() => rmSync(plain, { recursive: true, force: true }));

  it('has no statistics and no source link, and says it collects nothing', () => {
    const page = (name) => readFileSync(join(plain, name), 'utf8');
    assert.ok(!plainResult.assets.some((a) => a.includes('/stats.')));
    for (const name of plainResult.pages) assert.doesNotMatch(page(name), /data-tracker|example\.org|umami|Source code/i, name);
    assert.match(page('disclaimer.html'), /doesn’t collect visitor statistics/);
  });
});

describe('content security policy', () => {
  it('needs no inline scripts, styles or event handlers in the pages', () => {
    for (const name of result.pages) {
      const html = read(name);
      assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>/, name + ': inline script');
      assert.doesNotMatch(html, /<style[\s>]|\sstyle=/, name + ': inline style');
      assert.doesNotMatch(html, /\son[a-z]+=/, name + ': inline event handler');
    }
  });

  it('writes no inline styles or event handlers into the page from its scripts', () => {
    const js = new URL('../js/', import.meta.url);
    for (const file of readdirSync(js, { recursive: true }).filter((f) => f.endsWith('.js'))) {
      assert.doesNotMatch(readFileSync(new URL(file, js), 'utf8'), /\s(style|on[a-z]+)=["'`]/, file + ': set it through the DOM instead');
    }
  });
});

describe('icons', () => {
  it('links them from every page, and makes a 180 px Apple icon and a favicon.ico of 16, 32 and 48 px', () => {
    for (const page of result.pages) {
      for (const icon of ICONS) assert.ok(refs(read(page)).includes(icon), `${page} links ${icon}`);
    }
    assert.deepEqual(pngSize(readFileSync(join(outDir, 'apple-touch-icon.png'))), [180, 180]);
    const ico = readFileSync(join(outDir, 'favicon.ico'));
    const sizes = [];
    for (let i = 0; i < ico.readUInt16LE(4); i++) {
      const at = 6 + 16 * i;
      const png = ico.subarray(ico.readUInt32LE(at + 12), ico.readUInt32LE(at + 12) + ico.readUInt32LE(at + 8));
      assert.deepEqual(pngSize(png), [ico.readUInt8(at), ico.readUInt8(at + 1)]);
      sizes.push(ico.readUInt8(at));
    }
    assert.deepEqual(sizes, [16, 32, 48]);
  });
});

describe('the built site', () => {
  const root = () => pathToFileURL(outDir + '/');

  it('still works: table, diagrams, builder and the instrument switch', async () => {
    const window = await loadPage('number-system.html', { root: root() });
    assert.equal(window.document.querySelectorAll('#key-table td .art svg').length, 84 * 2);
    click(window, '.xkeys [data-value="A"]');
    assert.equal(texts(window, '.xchart .xnum')[0], '1 · I');
    assert.deepEqual([...window.document.querySelectorAll('.xchart h4')].map((h) => h.lastChild.textContent), ['A', 'F#m', 'D', 'E']);
    click(window, '[data-instrument-choice="piano"]');
    assert.equal(window.document.documentElement.dataset.instrument, 'piano');
  });

  it('shows the error page at any address, with links from the site root', async () => {
    const window = await loadPage('404.html', { root: root() });
    const link = window.document.querySelector('.topics a');
    assert.equal(link.href, 'http://localhost/'); // ./ against <base href="/">
    assert.match(window.document.title, /not found/i);
  });
});
