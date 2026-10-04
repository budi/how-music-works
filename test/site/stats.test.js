import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const file = new URL('../../js/site/stats.js', import.meta.url);
const source = readFileSync(file, 'utf8');
const TRACKER = 'https://stats.example.org/script.js';
const RECORDER = 'https://stats.example.org/recorder.js';

// the loader's tag, as the layout writes it for a deployment with statistics (example.org: never a real server)
const loader = ({ domains = 'music.example.org', recorder = true } = {}) =>
  `<script data-tracker="${TRACKER}"${recorder ? ` data-recorder="${RECORDER}"` : ''}` +
  ` data-website-id="00000000-0000-4000-8000-000000000000" data-domains="${domains}"></script>`;

// js/site/stats.js run in a page at `url`; returns the tracker scripts it added
function visit(url, head = loader()) {
  const dom = new JSDOM(`<!doctype html><head>${head}</head><body></body>`, { url, runScripts: 'outside-only' });
  new vm.Script(source, { filename: fileURLToPath(file) }).runInContext(dom.getInternalVMContext());
  const added = [...dom.window.document.querySelectorAll('script[src]')];
  dom.window.close();
  return added;
}

describe('visitor statistics', () => {
  it('loads the tracker, and the recorder if there is one, on the deployment’s domains', () => {
    const added = visit('https://music.example.org/beats-101.html');
    assert.deepEqual(added.map((s) => s.src), [TRACKER, RECORDER]);
    for (const s of added) {
      assert.equal(s.getAttribute('data-website-id'), '00000000-0000-4000-8000-000000000000');
      assert.equal(s.getAttribute('data-domains'), 'music.example.org');
      assert.ok(s.defer);
    }
    assert.equal(visit('https://www.example.org/', loader({ domains: 'music.example.org,www.example.org' })).length, 2);
    assert.deepEqual(visit('https://music.example.org/', loader({ recorder: false })).map((s) => s.src), [TRACKER]);
  });

  it('loads nothing anywhere else, or without settings: npm run dev, a copy on disk, another host', () => {
    for (const url of ['http://localhost:8000/', 'file:///Users/me/music/dist/index.html', 'https://music.example.org.example.com/', 'https://example.org/']) {
      assert.deepEqual(visit(url), [], url);
    }
    assert.deepEqual(visit('https://music.example.org/', ''), [], 'no settings');
    assert.deepEqual(visit('file:///Users/me/music/dist/index.html', loader({ domains: '' })), [], 'no domains, opened from disk');
  });
});
