import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { siteConfig } from '../scripts/config.js';

// example settings: example.org is reserved for examples, so these never reach a real server
const UMAMI = {
  UMAMI_SCRIPT_URL: 'https://stats.example.org/script.js',
  UMAMI_WEBSITE_ID: '00000000-0000-4000-8000-000000000000',
  UMAMI_DOMAINS: 'music.example.org',
};

// the settings for `env`, and the warnings they gave
function read(env) {
  const warnings = [];
  return { ...siteConfig(env, (message) => warnings.push(message)), warnings };
}

describe('deployment settings', () => {
  it('has none by default: no statistics, no source link, nothing to warn about', () => {
    assert.deepEqual(read({}), { stats: null, sourceUrl: null, warnings: [] });
  });

  it('reads visitor statistics and the link to the source', () => {
    const { stats, sourceUrl } = read({
      ...UMAMI,
      UMAMI_RECORDER_URL: 'https://stats.example.org/recorder.js',
      UMAMI_DOMAINS: ' Music.Example.org, www.example.org ',
      SOURCE_URL: 'https://example.org/music',
    });
    assert.deepEqual(stats, {
      tracker: 'https://stats.example.org/script.js',
      recorder: 'https://stats.example.org/recorder.js',
      websiteId: '00000000-0000-4000-8000-000000000000',
      domains: 'music.example.org,www.example.org',
      host: 'stats.example.org',
    });
    assert.equal(sourceUrl, 'https://example.org/music');
  });

  it('leaves out what isn’t set up correctly, and says why', () => {
    const partly = read({ UMAMI_WEBSITE_ID: UMAMI.UMAMI_WEBSITE_ID });
    assert.equal(partly.stats, null);
    assert.deepEqual(partly.warnings, ['visitor statistics are off: UMAMI_SCRIPT_URL isn\'t set']);
    const wrong = read({ ...UMAMI, UMAMI_WEBSITE_ID: 'my-site', SOURCE_URL: 'javascript:alert(1)' });
    assert.deepEqual([wrong.stats, wrong.sourceUrl], [null, null]);
    assert.deepEqual(wrong.warnings, [
      'visitor statistics are off: UMAMI_WEBSITE_ID isn\'t a website ID from Umami: my-site',
      'no link to the source: SOURCE_URL must start with https://, not javascript://',
    ]);
  });
});
