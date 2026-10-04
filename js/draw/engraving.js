/**
 * Music symbols on a staff, measured in staff spaces (glyphs.js has the
 * shapes). Shared by the rhythm notation and the staves.
 *
 * @module draw/engraving
 */
import { ENGRAVING, GLYPHS, UNITS_PER_SPACE } from './glyphs.js';
import { el, hline, num, rect } from '../lib/svg.js';

/** Font units to staff spaces. */
export const SCALE = 1 / UNITS_PER_SPACE;

/**
 * A symbol from glyphs.js, its origin at (x, y).
 * @param {string} name  SMuFL name: 'noteheadBlack'
 * @param {number} x
 * @param {number} y
 * @param {object} [options]
 * @param {string} [options.cls]  classes besides "glyph"
 * @param {number} [options.scale=1]
 */
export function glyph(name, x, y, { cls, scale = 1 } = {}) {
  const s = SCALE * scale;
  return el('path', {
    class: cls ? 'glyph ' + cls : 'glyph',
    transform: `translate(${num(x)} ${num(y)}) scale(${num(s, 5)} ${num(-s, 5)})`,
    d: GLYPHS[name].d,
  });
}

/** How wide a symbol is, in staff spaces. */
export function glyphWidth(name) {
  return GLYPHS[name].bbox[2] * SCALE;
}

/** Staff lines from x1 to x2, one at each y. */
export function staffLines(x1, x2, ys) {
  return ys.map((y) => hline(x1, x2, y, ENGRAVING.staffLineThickness, 'staff-line')).join('');
}

/** A thin bar line from top to bottom, its left edge at x. */
export function barline(x, top, bottom) {
  return rect(x, top, ENGRAVING.thinBarlineThickness, bottom - top, 'barline');
}
