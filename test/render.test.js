import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { listPages, renderPage, renderTemplate } from '../scripts/render.js';
import { siteConfig } from '../scripts/config.js';

const dom = (html) => new JSDOM(html).window.document;
const page = (name, site) => dom(renderPage(name, site));
const attrs = (doc, selector, attr) => [...doc.querySelectorAll(selector)].map((el) => el.getAttribute(attr));
const STATS = 'js/site/stats.js';
const own = (srcs) => srcs.filter((src) => src !== STATS); // the page's own scripts
// a deployment's settings (example.org: never a real server)
const UMAMI = {
  UMAMI_SCRIPT_URL: 'https://stats.example.org/script.js',
  UMAMI_WEBSITE_ID: '00000000-0000-4000-8000-000000000000',
  UMAMI_DOMAINS: 'music.example.org',
};
const RECORDING = siteConfig({ ...UMAMI, UMAMI_RECORDER_URL: 'https://stats.example.org/recorder.js' });

describe('pages', () => {
  it('renders every page as a whole document: one top bar, one footer, the icons and the base stylesheet', () => {
    for (const name of listPages()) {
      const html = renderPage(name);
      assert.match(html, /^<!doctype html>/, name);
      const doc = dom(html);
      assert.ok(doc.title, name + ' has a title');
      assert.deepEqual(['nav.topbar', 'footer'].map((s) => doc.querySelectorAll(s).length), [1, 1], name);
      assert.deepEqual(attrs(doc, 'link[rel~="icon"], link[rel="apple-touch-icon"]', 'href'),
        ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'], name);
      assert.equal(attrs(doc, 'link[rel="stylesheet"]', 'href')[0], 'css/base.css', name);
    }
  });

  it('links every topic from the home page', () => {
    const topics = listPages().filter((name) => !['index.html', '404.html', 'disclaimer.html'].includes(name));
    assert.deepEqual(attrs(page('index.html'), '.topics a', 'href').sort(), topics.sort());
  });
});

describe('layout options', () => {
  it('adds stylesheets in the order given, and the page’s own script, deferred', () => {
    const doc = page('number-system.html');
    assert.deepEqual(attrs(doc, 'link[rel="stylesheet"]', 'href'),
      ['css/base.css', 'css/diagrams.css', 'css/player.css', 'css/number-system.css']);
    assert.deepEqual(own(attrs(doc, 'script[defer]', 'src')), ['js/pages/number-system/index.js']);
  });

  it('adds the instrument switch and its script only when asked', () => {
    const ns = page('number-system.html');
    assert.equal(ns.querySelectorAll('[data-instrument-choice]').length, 2);
    // not deferred, and first: it must run before the page paints
    assert.equal(ns.querySelector('script').getAttribute('src'), 'js/site/instrument.js');
    assert.equal(ns.querySelector('script').hasAttribute('defer'), false);
    assert.equal(page('index.html').querySelectorAll('[data-instrument-choice], script').length, 0);
  });

  it('marks the home page: plain site name, no "All topics" link', () => {
    const index = page('index.html');
    assert.equal(index.querySelector('.topbar a.home'), null);
    assert.deepEqual(attrs(index, 'footer a', 'href'), ['disclaimer.html']);
    const other = page('number-system.html');
    assert.equal(other.querySelector('.topbar a.home').getAttribute('href'), 'index.html');
    assert.deepEqual(attrs(other, 'footer a', 'href'), ['index.html', 'disclaimer.html']);
  });

  it('sets <base> and noindex for the error page only', () => {
    const missing = page('404.html');
    assert.equal(missing.querySelector('base').getAttribute('href'), '/');
    assert.equal(missing.querySelector('meta[name="robots"]').content, 'noindex');
    assert.equal(page('index.html').querySelector('base, meta[name="robots"]'), null);
  });
});

describe('deployment settings', () => {
  it('count visitors on every page, after its own scripts, through the loader only', () => {
    for (const name of listPages()) {
      const doc = page(name, RECORDING);
      const srcs = attrs(doc, 'script', 'src');
      assert.equal(srcs.at(-1), STATS, name);
      assert.ok(!srcs.some((src) => /^https:/.test(src)), name + ' never loads the tracker itself');
      assert.deepEqual({ ...doc.querySelector(`script[src="${STATS}"]`).dataset }, {
        tracker: 'https://stats.example.org/script.js',
        recorder: 'https://stats.example.org/recorder.js',
        websiteId: '00000000-0000-4000-8000-000000000000',
        domains: 'music.example.org',
      }, name);
    }
  });

  it('count nothing by default', () => {
    for (const name of listPages()) assert.equal(page(name).querySelector(`script[src="${STATS}"]`), null, name);
  });

  it('link to the source from every page, if there is one', () => {
    const site = siteConfig({ SOURCE_URL: 'https://example.org/music' });
    for (const name of listPages()) {
      assert.equal(page(name, site).querySelector('footer a:last-child').getAttribute('href'), 'https://example.org/music', name);
      assert.equal(page(name).querySelector('footer a[href^="https:"]'), null, name);
    }
  });

  it('decide what the disclaimer says is collected, and where', () => {
    const statistics = (site) => {
      const doc = page('disclaimer.html', site);
      const heading = [...doc.querySelectorAll('h2')].find((h) => h.textContent === 'Visitor statistics');
      let text = '';
      for (let el = heading.nextElementSibling; el && el.tagName !== 'H2'; el = el.nextElementSibling) text += el.textContent + ' ';
      return text;
    };
    const recording = statistics(RECORDING);
    assert.match(recording, /Umami, an open-source statistics tool, at\s+stats\.example\.org/);
    assert.match(recording, /as a replay/);
    assert.doesNotMatch(statistics(siteConfig(UMAMI)), /replay/, 'no recorder, no replays');
    assert.match(statistics(), /^This site doesn’t collect visitor statistics/);
  });
});

describe('chord-shape partial', () => {
  const shape = (args) => dom(renderTemplate(`{{> chord-shape ${args}}}`)).querySelector('figure.shape');

  it('renders a guitar or piano diagram to draw, captioned with its note or else its frets', () => {
    const g = shape('guitar="x 1 3 3 3 1 (barre 5-1)" root="Bb" quality="maj" movable=true name="Major" note="root on string 5"');
    assert.deepEqual({ ...g.querySelector('.shapeart').dataset }, { guitar: 'x 1 3 3 3 1 (barre 5-1)', root: 'Bb', quality: 'maj', movable: '' });
    assert.deepEqual([g.querySelector('figcaption b').textContent, g.querySelector('figcaption span').textContent], ['Major', 'root on string 5']);
    assert.equal(shape('guitar="x 3 2 0 1 0" root="C" quality="maj" name="C"').querySelector('figcaption span').textContent, 'x 3 2 0 1 0');
    const p = shape('piano="C Eb Gb A" faded="A" root="C" quality="dim" name="Diminished 7th"');
    assert.deepEqual({ ...p.querySelector('.shapeart').dataset }, { piano: 'C Eb Gb A', faded: 'A', root: 'C', quality: 'dim' });
  });
});
