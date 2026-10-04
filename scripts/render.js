/*
 * render.js — turns pages/*.hbs into HTML with Handlebars.
 *
 *   pages/<name>.hbs            one per page; becomes <name>.html
 *   templates/layout.hbs        the HTML skeleton pages wrap themselves in
 *   templates/partials/*.hbs    pieces any template can use: {{> footer}}
 *
 * The HTML that comes out still links css/ and js/ source files; build.js
 * then minifies and fingerprints those.
 *
 * Templates see the deployment's settings (config.js) as `@root.site`: none
 * unless they're given, so no statistics and no source link.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const PAGES_DIR = join(ROOT, 'pages');
export const TEMPLATES_DIR = join(ROOT, 'templates');

const read = (path) => readFileSync(path, 'utf8');
const hbsFiles = (dir) => readdirSync(dir).filter((f) => f.endsWith('.hbs')).sort();

// A fresh Handlebars with this site's layout, partials and helpers.
// Templates are re-read every time, so `npm run dev` always sees the latest.
function createHandlebars() {
  const hbs = Handlebars.create();

  // (list "a" "b") -> ["a", "b"], for options like styles=(list "index")
  hbs.registerHelper('list', (...args) => args.slice(0, -1));

  hbs.registerPartial('layout', read(join(TEMPLATES_DIR, 'layout.hbs')));
  const partials = join(TEMPLATES_DIR, 'partials');
  for (const file of hbsFiles(partials)) {
    hbs.registerPartial(basename(file, '.hbs'), read(join(partials, file)));
  }
  return hbs;
}

// The pages the site has, as output file names: ['404.html', 'index.html', …]
export function listPages() {
  return hbsFiles(PAGES_DIR).map((f) => basename(f, '.hbs') + '.html');
}

// renderPage('index.html', site) -> the page's HTML; `site` as from siteConfig()
export function renderPage(page, site = {}) {
  const name = basename(page, '.html');
  return renderTemplate(read(join(PAGES_DIR, name + '.hbs')), { page: name, site });
}

// Any template string, with the site's layout, partials and helpers available.
export function renderTemplate(source, data = {}) {
  return createHandlebars().compile(source)(data);
}
