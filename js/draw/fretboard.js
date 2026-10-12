/**
 * A guitar neck seen from the player's side, as tab is written: string 1
 * (high E) at the top, the nut at the left, open strings just left of it.
 *
 * Every place a note can be played is a `<g class="spot" data-midi
 * data-string data-fret>`, so a page can make it playable and light it up.
 *
 * @module draw/fretboard
 */
import { LETTERS, LETTER_PC, mod12 } from '../music/pitch.js';
import { STRINGS } from '../music/guitar.js';
import { circle, el, hline, rect, svg, text } from '../lib/svg.js';

const N = {
  open: 26, // width of the open-string column, left of the nut
  fret: 40, // from one fret wire to the next
  gap: 17, // between strings
  top: 12, // y of string 1
  dot: 8, // a marked spot's radius
};
const stringY = (string) => N.top + (string - 1) * N.gap;
const spotX = (fret) => (fret === 0 ? N.open / 2 : N.open + (fret - 0.5) * N.fret);
// the frets with a dot inlaid (two at 12), numbered underneath
const MARKED = [3, 5, 7, 9, 12, 15, 17, 19, 21];

/**
 * @param {object} [options]
 * @param {number} [options.frets=12]  the highest fret shown
 * @param {Array<{string: number, fret: number, label?: string, cls?: string}>} [options.marks]
 *   spots to dot, with a label in the dot ('1', 'G') and a class of their own
 * @param {boolean} [options.names]  write the natural notes' letters on their spots,
 *   hidden until CSS shows them (.show-names)
 * @param {string} [options.label]  what it shows, for screen readers
 * @returns {string} SVG
 */
export function drawFretboard({ frets = 12, marks = [], names = false, label } = {}) {
  const right = N.open + frets * N.fret;
  const bottom = stringY(6);
  const [boardTop, boardHeight] = [N.top - 7, bottom - N.top + 14];
  const out = [];

  out.push(rect(N.open, boardTop, right - N.open, boardHeight, 'board'));
  for (const f of MARKED.filter((f) => f <= frets)) {
    for (const s of f === 12 ? [2, 4] : [3]) out.push(circle(spotX(f), stringY(s) + N.gap / 2, 4, 'inlay'));
  }
  out.push(rect(N.open - 3, boardTop, 4, boardHeight, 'nut'));
  for (let f = 1; f <= frets; f++) out.push(rect(N.open + f * N.fret - 1, boardTop, 2, boardHeight, 'fretwire'));
  for (let s = 1; s <= 6; s++) out.push(hline(0, right, stringY(s), 0.5 + s * 0.2, 'string')); // thicker as they go down
  for (const f of [0, ...MARKED].filter((f) => f <= frets)) out.push(text(spotX(f), bottom + 22, String(f), 'fretno'));

  const marked = new Map(marks.map((m) => [m.string + ':' + m.fret, m]));
  for (let s = 1; s <= 6; s++) {
    for (let f = 0; f <= frets; f++) {
      const midi = STRINGS[6 - s] + f;
      const mark = marked.get(s + ':' + f);
      const letter = LETTER_PC.indexOf(mod12(midi));
      const x = spotX(f);
      const y = stringY(s);
      const width = f === 0 ? N.open : N.fret;
      const parts = rect(x - width / 2, y - N.gap / 2, width, N.gap, 'spot-hit') +
        circle(x, y, N.dot, 'sdot') +
        (mark?.label ? text(x, y + 3.5, mark.label, 'slabel') : '') +
        (names && !mark && letter >= 0 ? text(x, y + 3.5, LETTERS[letter], 'sname') : '');
      out.push(el('g', {
        class: 'spot' + (mark ? ' is-marked' + (mark.cls ? ' ' + mark.cls : '') : ''),
        'data-midi': midi,
        'data-string': s,
        'data-fret': f,
      }, parts));
    }
  }

  return svg({
    cls: 'fretboard',
    viewBox: [0, 0, right + 2, bottom + 28],
    label: label || `Guitar neck, open strings to fret ${frets}`,
  }, out.join(''));
}
