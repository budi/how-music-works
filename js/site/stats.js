/**
 * Visitor statistics with Umami, when they're set up (.env.example). The
 * layout adds this script with the settings on its tag, and it loads the
 * tracker on the deployment's own domains only: never from `npm run dev`, a
 * copy opened from disk, or the tests. (Umami's session recorder can't be
 * limited to a domain by itself.) disclaimer.html says what's collected.
 *
 * @module site/stats
 */
const settings = document.querySelector('script[data-tracker]')?.dataset;
const domains = (settings?.domains || '').split(',').filter(Boolean);

if (domains.includes(location.hostname)) {
  for (const src of [settings.tracker, settings.recorder]) {
    if (!src) continue;
    const script = document.createElement('script');
    script.defer = true;
    script.src = src;
    script.setAttribute('data-website-id', settings.websiteId);
    script.setAttribute('data-domains', settings.domains);
    document.head.appendChild(script);
  }
}
