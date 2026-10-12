/**
 * What the explorer and the quiz share: a major scale's notes, to print and
 * to play, and the scale written out as a row.
 *
 * @module pages/major-scale/scale
 */
import { MAJOR_STEPS, majorScale, scalePitches } from '../../music/keys.js';
import { majorShape } from '../../music/guitar.js';
import { parsePitch, printed } from '../../music/pitch.js';
import { escape } from '../../lib/svg.js';

/** The eight notes, root to root, as printed: scaleNames('D') → ['D', 'E', 'F♯', 'G', 'A', 'B', 'C♯', 'D'] */
export function scaleNames(key) {
  return [...majorScale(key), key].map(printed);
}

/**
 * The eight notes, root to root, as MIDI numbers: on the piano up from octave 4,
 * on the guitar where `shape` puts them.
 * @param {string} key
 * @param {'piano'|'guitar'} instrument
 * @param {object} [shape]  from majorShape; its own key's usual one if not given
 * @returns {number[]}
 */
export function scaleMidis(key, instrument, shape = majorShape(key)) {
  return instrument === 'guitar' ? shape.notes.map((n) => n.midi) : scalePitches(key).map((p) => parsePitch(p).midi);
}

/**
 * The scale as a row: each note's number and name, and the whole (W) or half
 * (H) step between each pair.
 * @param {string} key
 * @param {object} [options]
 * @param {function(number, string): string} [options.shown]  what to write for
 *   degree 1–8, given its name: the name itself by default
 * @param {number} [options.ask]  the degree being asked, marked
 * @param {boolean} [options.steps=true]  the W and H between the notes
 * @returns {string} HTML
 */
export function scaleRow(key, { shown = (degree, name) => name, ask, steps = true } = {}) {
  let html = '';
  scaleNames(key).forEach((name, i) => {
    const degree = i + 1;
    const cls = 'ms-cell' + (degree === 1 || degree === 8 ? ' is-root' : '') + (degree === ask ? ' is-ask' : '');
    html += `<span class="${cls}" data-degree="${degree}"><b>${degree === 8 ? 1 : degree}</b><span>${escape(shown(degree, name))}</span></span>`;
    if (i < 7 && steps) {
      const half = MAJOR_STEPS[i] === 1;
      html += `<span class="ms-step${half ? ' is-half' : ''}" title="${half ? 'half step' : 'whole step'}">${half ? 'H' : 'W'}</span>`;
    }
  });
  return `<div class="ms-row${steps ? '' : ' no-steps'}">${html}</div>`;
}
