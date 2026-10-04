/**
 * SVG markup as strings: what every drawing on the site is made of.
 *
 * Numbers are written to at most three decimals and text is escaped, so a
 * drawing is small and safe to put into innerHTML. Inline styles and event
 * handlers are refused: the site runs under a Content-Security-Policy that
 * blocks them, so set those through the DOM once the drawing is in the page.
 *
 * @module lib/svg
 */

/**
 * A number, rounded for an attribute: num(1.23456) → '1.235'.
 * @param {number} n
 * @param {number} [digits=3]
 * @returns {string}
 */
export function num(n, digits = 3) {
  const f = 10 ** digits;
  return String(Math.round(n * f) / f);
}

/** Text made safe for markup and attribute values. */
export function escape(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

/**
 * One element: el('rect', { class: 'dot', x: 1.5 }) → '<rect class="dot" x="1.5"/>'.
 * Attributes keep their order; null, undefined and false ones are left out.
 * @param {string} tag
 * @param {object} [attrs]
 * @param {string} [content]  markup inside it; without any, the element closes itself
 * @returns {string}
 */
export function el(tag, attrs = {}, content) {
  let out = '<' + tag;
  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'style' || name.startsWith('on')) throw new Error(`No inline ${name} in drawings: set it through the DOM`);
    if (value == null || value === false) continue;
    out += ` ${name}="${typeof value === 'number' ? num(value) : escape(value)}"`;
  }
  return content === undefined ? out + '/>' : `${out}>${content}</${tag}>`;
}

/** A rectangle; `rx` rounds its corners. */
export function rect(x, y, width, height, cls, rx) {
  return el('rect', { class: cls, x, y, width, height, rx });
}

/** A horizontal line from x1 to x2, drawn as a rectangle `thickness` tall, centred on y. */
export function hline(x1, x2, y, thickness, cls) {
  return rect(x1, y - thickness / 2, x2 - x1, thickness, cls);
}

export function circle(cx, cy, r, cls) {
  return el('circle', { class: cls, cx, cy, r });
}

/** Text with its anchor at (x, y); the stylesheet decides how it's aligned. */
export function text(x, y, content, cls) {
  return el('text', { x, y, class: cls }, escape(content));
}

/**
 * The <svg> around a drawing.
 * @param {object} frame
 * @param {string} frame.cls  its class
 * @param {number[]} frame.viewBox  [x, y, width, height]
 * @param {string} [frame.label]  what it shows, for screen readers (aria-label)
 * @param {string} [frame.title]  the same as a <title>, which also shows as a tooltip
 * @param {object} [frame.data]  data attributes: { whites: 15 } → data-whites="15"
 * @param {string} body  the drawing
 * @returns {string}
 */
export function svg({ cls, viewBox, label, title, data = {} }, body) {
  const head = title ? el('title', {}, escape(title)) : '';
  const dataset = Object.fromEntries(Object.entries(data).map(([name, value]) => ['data-' + name, value]));
  return el('svg', {
    class: cls,
    viewBox: viewBox.map((n) => num(n)).join(' '),
    role: 'img',
    'aria-label': label,
    ...dataset,
    xmlns: 'http://www.w3.org/2000/svg',
  }, head + body);
}
