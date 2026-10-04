/*
 * build.js — makes the optimized site in dist/.
 *
 *   npm run build            # -> dist/, with the settings in .env (config.js)
 *   node scripts/build.js out  # -> out/, with the settings in the environment
 *
 * For every page in pages/ (rendered from Handlebars by render.js):
 *   - each local stylesheet it links is minified, and each local script —
 *     an ES module — is bundled with everything it imports into one classic
 *     script and minified; each is saved as assets/<name>.<content hash>.<ext>
 *     and the page pointed at it (the hash changes whenever the file does, so
 *     browsers can cache assets forever and still never see a stale one);
 *   - the page itself is minified.
 * Licence files in licenses/ are copied as they are, and legal comments
 * (the ones opening with a "!") in scripts and stylesheets survive bundling and
 * minifying: js/draw/glyphs.js carries Bravura's notice into every page that draws music.
 * favicon.svg is copied and also rendered as favicon.ico (16, 32, 48 px) and
 * apple-touch-icon.png (180 px, square corners: iOS rounds them itself).
 * Then every file gets .br and .gz twins, which a server can send as they are
 * instead of compressing on each request (docs/deploying.md).
 *
 * The output still works when opened straight from disk (except 404.html,
 * which resolves everything from the site root).
 */
import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import zlib from 'node:zlib';
import { Resvg } from '@resvg/resvg-js';
import { build as esbuild, transform } from 'esbuild';
import { minify as minifyHtml } from 'html-minifier-terser';
import { JSDOM } from 'jsdom';
import { listPages, renderPage, PAGES_DIR } from './render.js';
import { siteConfig } from './config.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ASSET_DIR = 'assets';
const ICON = 'favicon.svg';
const LICENSES = 'licenses';
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.svg', '.json', '.txt']);

const brotli = promisify(zlib.brotliCompress);
const gzip = promisify(zlib.gzip);

// Builds into <outDir>.partial and only replaces outDir once everything has
// worked, so a broken template never leaves a half-built (or empty) site.
// `site`: the deployment's settings, from siteConfig(); none by default.
export async function build({ outDir = join(ROOT, 'dist'), site = {} } = {}) {
  outDir = resolve(outDir);
  const partial = outDir + '.partial';
  await rm(partial, { recursive: true, force: true });
  try {
    const result = await buildInto(partial, site);
    await rm(outDir, { recursive: true, force: true });
    await rename(partial, outDir);
    return { ...result, outDir };
  } catch (err) {
    await rm(partial, { recursive: true, force: true });
    throw err;
  }
}

async function buildInto(outDir, site) {
  await mkdir(join(outDir, ASSET_DIR), { recursive: true });

  const assets = new Map(); // source path -> built path, so shared files are built once
  const pages = listPages();
  if (pages.length === 0) throw new Error('No pages found in ' + PAGES_DIR);

  for (const page of pages) {
    const dom = new JSDOM(renderPage(page, site));
    const doc = dom.window.document;

    const refs = [
      ...[...doc.querySelectorAll('link[rel="stylesheet"][href]')].map((el) => [el, 'href']),
      ...[...doc.querySelectorAll('script[src]')].map((el) => [el, 'src']),
    ];
    for (const [el, attr] of refs) {
      const src = el.getAttribute(attr);
      if (/^([a-z]+:)?\/\//i.test(src)) continue; // leave CDN links alone
      if (!assets.has(src)) assets.set(src, await buildAsset(src, outDir));
      el.setAttribute(attr, assets.get(src));
    }

    const html = await minifyHtml(dom.serialize(), {
      collapseWhitespace: true,
      conservativeCollapse: true, // keep one space where there was some: text between tags matters
      removeComments: true,
      collapseBooleanAttributes: true, // defer="" -> defer
      removeRedundantAttributes: true,
      useShortDoctype: true,
    });
    await writeFile(join(outDir, page), html);
  }

  await cp(join(ROOT, LICENSES), join(outDir, LICENSES), { recursive: true });
  const icons = await buildIcons(outDir);
  const files = await compressAll(outDir);
  return { outDir, pages, assets: [...assets.values()], icons, files };
}

// A page's script — an ES module — with everything it imports, as one classic
// script: <script defer> runs it, even in a page opened straight from disk
// (where browsers refuse modules).
export async function bundleScript(src, { minify = true } = {}) {
  const { outputFiles } = await esbuild({
    entryPoints: [join(ROOT, src)],
    bundle: true,
    format: 'iife',
    minify,
    target: 'es2019',
    legalComments: 'inline',
    write: false,
  });
  return outputFiles[0].text;
}

// Build one CSS/JS file into assets/, named by a hash of its contents.
async function buildAsset(src, outDir) {
  const ext = extname(src);
  let code;
  if (ext === '.js') {
    code = await bundleScript(src);
  } else if (ext === '.css') {
    const source = await readFile(join(ROOT, src), 'utf8');
    ({ code } = await transform(source, { loader: 'css', minify: true, target: 'es2019', legalComments: 'inline' }));
  } else {
    throw new Error(`Don't know how to build ${src}`);
  }
  const hash = createHash('sha256').update(code).digest('hex').slice(0, 10);
  const name = `${ASSET_DIR}/${assetName(src)}.${hash}${ext}`;
  await writeFile(join(outDir, name), code);
  return name;
}

// css/base.css -> base; js/pages/beats-101/index.js -> beats-101
function assetName(src) {
  const name = basename(src, extname(src));
  return name === 'index' ? basename(dirname(src)) : name;
}

// The site icon in every format browsers and phones ask for.
async function buildIcons(outDir) {
  const svg = await readFile(join(ROOT, ICON), 'utf8');
  const png = (source, size) => new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng();

  // iOS wants an opaque square and rounds the corners itself
  const square = svg.replace(/(<rect class="bg"[^>]*?) rx="[\d.]+"/, '$1');
  if (square === svg) throw new Error(`${ICON}: expected a <rect class="bg" rx="..."> background`);

  await writeFile(join(outDir, ICON), svg.replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><').trim());
  await writeFile(join(outDir, 'favicon.ico'), ico([16, 32, 48].map((size) => png(svg, size))));
  await writeFile(join(outDir, 'apple-touch-icon.png'), png(square, 180));
  return [ICON, 'favicon.ico', 'apple-touch-icon.png'];
}

// An .ico file holding PNG images (understood by every current browser).
// Layout: 6-byte header, a 16-byte entry per image, then the images.
function ico(pngs) {
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(1, 2); // type: icon
  head.writeUInt16LE(pngs.length, 4);
  let offset = head.length;
  pngs.forEach((png, i) => {
    const size = png.readUInt32BE(16); // width, from the PNG header
    const at = 6 + 16 * i;
    head.writeUInt8(size % 256, at); // width (0 means 256)
    head.writeUInt8(size % 256, at + 1); // height
    head.writeUInt16LE(1, at + 4); // colour planes
    head.writeUInt16LE(32, at + 6); // bits per pixel
    head.writeUInt32LE(png.length, at + 8);
    head.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });
  return Buffer.concat([head, ...pngs]);
}

// Write .br and .gz next to every text file; returns [{ path, bytes, br, gz }].
async function compressAll(dir) {
  const out = [];
  for (const entry of await readdir(dir, { recursive: true, withFileTypes: true })) {
    const path = join(entry.parentPath, entry.name);
    if (!entry.isFile() || !COMPRESSIBLE.has(extname(path))) continue;
    const data = await readFile(path);
    const br = await brotli(data, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } });
    const gz = await gzip(data, { level: 9 });
    await writeFile(path + '.br', br);
    await writeFile(path + '.gz', gz);
    out.push({ path: relative(dir, path), bytes: data.length, br: br.length, gz: gz.length });
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

// Run from the command line: print what was built.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { outDir, files } = await build({ outDir: process.argv[2], site: siteConfig() });
  const kb = (n) => (n / 1024).toFixed(1).padStart(7) + ' kB';
  console.log(`Built ${relative(process.cwd(), outDir) || '.'}/\n`);
  console.log('file'.padEnd(36) + '    raw'.padStart(10) + '   brotli'.padStart(10));
  for (const f of files) console.log(f.path.padEnd(36) + kb(f.bytes) + kb(f.br));
}
