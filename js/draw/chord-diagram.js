/**
 * Chord diagrams: guitar chord boxes and piano key strips.
 *
 * Their colour comes from CSS: the SVG gets a `q-maj` / `q-min` / `q-dim`
 * class, which diagrams.css maps to the chord colour.
 *
 * @module draw/chord-diagram
 */
import { mod12, pitchClass } from '../music/pitch.js';
import { STRINGS, barreFret } from '../music/guitar.js';
import { keyLayout, whiteIndex } from './keyboard.js';
import { circle, el, rect, svg, text } from '../lib/svg.js';

const frame = (width, height, { quality, title }, body) =>
  svg({ cls: 'diagram' + (quality ? ' q-' + quality : ''), viewBox: [0, 0, width, height], title }, body);

/* ---------- guitar: 6 strings × 5 frets ---------- */

const G = {
  width: 124,
  height: 150,
  left: 32, // x of string 6
  stringGap: 14,
  top: 34, // y of the nut, or the top fret line
  fretGap: 20,
  frets: 5,
  markY: 22, // y of the open and muted markers above the nut
};

const stringX = (i) => G.left + i * G.stringGap;
const fretY = (fret, base) => G.top + (fret - base + 0.5) * G.fretGap;

/**
 * A guitar chord box.
 * @param {GuitarVoicing} voicing
 * @param {object} [options]
 * @param {string} [options.root]  strings sounding it get an R
 * @param {string} [options.quality]  'maj', 'min' or 'dim': the colour
 * @param {boolean} [options.movable]  drawn as a shape to slide along the neck:
 *   the fret number always shows, the nut never does
 * @param {string} [options.title]  what it shows, for screen readers and as a tooltip
 * @returns {string} SVG
 */
export function drawGuitarChord(voicing, options = {}) {
  const frets = voicing.frets;
  const rootPc = options.root != null ? pitchClass(options.root) : null;
  const played = frets.filter((f) => f !== null && f > 0);
  const highest = played.length ? Math.max(...played) : 0;
  const lowest = played.length ? Math.min(...played) : 1;
  const base = options.movable || highest > G.frets ? lowest : 1;
  const bf = barreFret(voicing);
  const right = stringX(5);
  const bottom = G.top + G.frets * G.fretGap;
  const out = [];

  // the nut, or the number of the first fret shown
  if (base === 1 && !options.movable) out.push(rect(G.left - 1.5, G.top - 4.5, right - G.left + 3, 4.5, 'nut', 1));
  else out.push(text(G.left - 7, G.top + 13, base + 'fr', 'fretno'));

  let grid = '';
  for (let f = 0; f <= G.frets; f++) grid += 'M' + G.left + ' ' + (G.top + f * G.fretGap) + 'H' + right;
  for (let s = 0; s < 6; s++) grid += 'M' + stringX(s) + ' ' + G.top + 'V' + bottom;
  out.push(el('path', { d: grid, class: 'grid' }));

  const isRoot = frets.map((f, i) => f !== null && rootPc !== null && mod12(STRINGS[i] + f) === rootPc);

  // muted and open strings
  frets.forEach((f, i) => {
    const x = stringX(i);
    if (f === null) {
      out.push(text(x, G.markY + 3, '×', 'mark'));
    } else if (f === 0 && isRoot[i]) {
      out.push(circle(x, G.markY, 6, 'open-root'));
      out.push(text(x, G.markY + 3.2, 'R', 'rootlab on-open'));
    } else if (f === 0) {
      out.push(circle(x, G.markY, 4, 'open'));
    }
  });

  if (bf !== null) {
    const y = fretY(bf, base);
    const x0 = stringX(voicing.barre[0]) - 6;
    out.push(rect(x0, y - 6, stringX(voicing.barre[1]) + 6 - x0, 12, 'dot', 6));
  }

  // fingers: anything the barre doesn't already cover
  frets.forEach((f, i) => {
    if (f === null || f === 0) return;
    const underBarre = bf !== null && f === bf && i >= voicing.barre[0] && i <= voicing.barre[1];
    if (!underBarre) out.push(circle(stringX(i), fretY(f, base), 6, 'dot'));
  });

  // root rings
  frets.forEach((f, i) => {
    if (!isRoot[i] || f === 0) return;
    const y = fretY(f, base);
    out.push(circle(stringX(i), y, 6.5, 'root-ring'));
    out.push(text(stringX(i), y + 3.4, 'R', 'rootlab'));
  });

  return frame(G.width, G.height, options, out.join(''));
}

/* ---------- piano: a strip of keys, at least 8 white keys wide ---------- */

const P = { whiteW: 15, whiteH: 64, blackW: 10, blackH: 40, top: 4, minWhites: 8, height: 72 };

/**
 * A strip of piano keys with a chord's notes lit and named.
 * @param {PianoNote[]} notes  low to high (see music/piano.js)
 * @param {object} [options]
 * @param {string} [options.quality]  'maj', 'min' or 'dim': the colour
 * @param {string} [options.title]  what it shows, for screen readers and as a tooltip
 * @returns {string} SVG
 */
export function drawPianoChord(notes, options = {}) {
  // start on the lowest note's letter: C# starts at C, and E# at E
  const start = notes[0].pitch - (/#$/.test(notes[0].name) ? 1 : 0);
  const count = Math.max(P.minWhites, whiteIndex(notes[notes.length - 1].pitch) - whiteIndex(start) + 1);
  const { whites, blacks } = keyLayout(start, count, { white: P.whiteW, black: P.blackW }, true);
  const byPitch = new Map(notes.map((n) => [n.pitch, n]));
  const keyClass = (colour, n) => (n ? colour + ' on' + (n.faded ? ' faded' : '') : colour);

  const keys = [];
  const labels = [];
  for (const k of whites) {
    const n = byPitch.get(k.pitch);
    keys.push(rect(k.x, P.top, P.whiteW, P.whiteH, keyClass('white', n), 1.5));
    if (n) {
      labels.push(text(k.x + 7.5, 62, n.name, 'pk'));
      if (n.root) labels.push(text(k.x + 7.5, 51, 'R', 'pkr'));
    }
  }
  for (const k of blacks) {
    const n = byPitch.get(k.pitch);
    keys.push(rect(k.x, P.top, P.blackW, P.blackH, keyClass('black', n), 1.5));
    if (n) {
      labels.push(text(k.x + 5, 37, n.name, 'pk pkb'));
      if (n.root) labels.push(text(k.x + 5, 27, 'R', 'pkr pkb'));
    }
  }
  return frame(count * P.whiteW + 2, P.height, options, keys.join('') + labels.join(''));
}
