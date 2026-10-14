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

});
