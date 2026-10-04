/*
 * config.js — a deployment's settings, from the environment (`npm run build`
 * and `npm run dev` also read .env; see .env.example). All are optional, and
 * a setting that's missing or malformed is left out, with a warning:
 *
 *   UMAMI_SCRIPT_URL, UMAMI_WEBSITE_ID, UMAMI_DOMAINS
 *                        visitor statistics: off unless all three are right
 *   UMAMI_RECORDER_URL   also record visits as replays
 *   SOURCE_URL           a link to the source code on every page
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HOST_NAME = /^(?=.{1,253}$)[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;
const STATS = ['UMAMI_SCRIPT_URL', 'UMAMI_WEBSITE_ID', 'UMAMI_DOMAINS', 'UMAMI_RECORDER_URL'];

/**
 * The deployment's settings: { stats, sourceUrl }, each null when off.
 * `stats` is { tracker, recorder, websiteId, domains, host }: `domains`
 * comma-separated, `host` the statistics server's.
 * @param {object} [env=process.env]
 * @param {function(string)} [warn]  told why a setting is left out
 */
export function siteConfig(env = process.env, warn = (message) => console.warn('Warning: ' + message)) {
  const value = (name) => (env[name] || '').trim();
  const unless = (what, read) => {
    try {
      return read();
    } catch (err) {
      warn(`${what}: ${err.message}`);
      return null;
    }
  };
  return {
    stats: STATS.some(value) ? unless('visitor statistics are off', () => stats(value)) : null,
    sourceUrl: value('SOURCE_URL') ? unless('no link to the source', () => httpsUrl(value, 'SOURCE_URL')) : null,
  };
}

function stats(value) {
  for (const name of STATS.slice(0, 3)) {
    if (!value(name)) throw new Error(`${name} isn't set`);
  }
  const websiteId = value('UMAMI_WEBSITE_ID');
  if (!UUID.test(websiteId)) throw new Error(`UMAMI_WEBSITE_ID isn't a website ID from Umami: ${websiteId}`);
  const domains = value('UMAMI_DOMAINS').toLowerCase().split(',').map((d) => d.trim()).filter(Boolean);
  if (!domains.length) throw new Error('UMAMI_DOMAINS has no host names');
  for (const domain of domains) {
    if (!HOST_NAME.test(domain)) throw new Error(`UMAMI_DOMAINS: "${domain}" isn't a host name, like music.example.org`);
  }
  const tracker = httpsUrl(value, 'UMAMI_SCRIPT_URL');
  return {
    tracker,
    recorder: value('UMAMI_RECORDER_URL') ? httpsUrl(value, 'UMAMI_RECORDER_URL') : null,
    websiteId,
    domains: domains.join(','),
    host: new URL(tracker).host,
  };
}

// the setting `name`, if it's a full https:// address
function httpsUrl(value, name) {
  let url;
  try {
    url = new URL(value(name));
  } catch {
    throw new Error(`${name} isn't a web address: ${value(name)}`);
  }
  if (url.protocol !== 'https:') throw new Error(`${name} must start with https://, not ${url.protocol}//`);
  return value(name);
}
