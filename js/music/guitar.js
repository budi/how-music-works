/**
 * Guitar voicings: where the fingers go.
 *
 * A voicing is written the way chord books print it: six frets from string 6
 * (low E) to string 1 (high E), `x` for a muted string and `0` for an open one,
 * then optionally the strings a barre covers, drawn across the lowest fretted
 * fret:
 *
 *     'x 3 2 0 1 0'               C, open
 *     'x 1 3 3 3 1 (barre 5-1)'   Bb, A-shape barre at fret 1
 *
 * @module music/guitar
 */
import { mod12, pitchClass } from './pitch.js';

/** The open strings as MIDI notes, string 6 to string 1: E2 A2 D3 G3 B3 E4. */
export const STRINGS = [40, 45, 50, 55, 59, 64];

/**
 * One common voicing per chord: what the chord tables show. Keyed by the
 * usual name; enharmonic spellings (C# / Db) share an entry.
 */
export const COMMON = {
  maj: {
    'C':  'x 3 2 0 1 0',
    'Db': 'x 4 6 6 6 4 (barre 5-1)',
    'D':  'x x 0 2 3 2',
    'Eb': 'x 6 8 8 8 6 (barre 5-1)',
    'E':  '0 2 2 1 0 0',
    'F':  '1 3 3 2 1 1 (barre 6-1)',
    'F#': '2 4 4 3 2 2 (barre 6-1)',
    'G':  '3 2 0 0 0 3',
    'Ab': '4 6 6 5 4 4 (barre 6-1)',
    'A':  'x 0 2 2 2 0',
    'Bb': 'x 1 3 3 3 1 (barre 5-1)',
    'B':  'x 2 4 4 4 2 (barre 5-1)',
  },
  min: {
    'C':  'x 3 5 5 4 3 (barre 5-1)',
    'C#': 'x 4 6 6 5 4 (barre 5-1)',
    'D':  'x x 0 2 3 1',
    'D#': 'x 6 8 8 7 6 (barre 5-1)',
    'E':  '0 2 2 0 0 0',
    'F':  '1 3 3 1 1 1 (barre 6-1)',
    'F#': '2 4 4 2 2 2 (barre 6-1)',
    'G':  '3 5 5 3 3 3 (barre 6-1)',
    'G#': '4 6 6 4 4 4 (barre 6-1)',
    'A':  'x 0 2 2 1 0',
    'Bb': 'x 1 3 3 2 1 (barre 5-1)',
    'B':  'x 2 4 4 3 2 (barre 5-1)',
  },
  // diminished sevenths (see FLAVOURS.dim in chords.js)
  dim: {
    'C':  'x 3 4 2 4 x',
    'C#': 'x 4 5 3 5 x',
    'D':  'x x 0 1 0 1',
    'D#': 'x x 1 2 1 2 (barre 4-2)',
    'E':  'x x 2 3 2 3 (barre 4-2)',
    'F':  'x x 3 4 3 4 (barre 4-2)',
    'F#': '2 x 1 2 1 x (barre 4-2)',
    'G':  '3 x 2 3 2 x (barre 4-2)',
    'G#': '4 x 3 4 3 x (barre 4-2)',
    'A':  '5 x 4 5 4 x (barre 4-2)',
    'A#': 'x 1 2 0 2 x',
    'B':  'x 2 3 1 3 x',
  },
};

/**
 * Movable forms for every flavour (see FLAVOURS in chords.js), used by the
 * progression builder. Each form is written for one root; for any other chord
 * it slides up the neck by the distance between the two roots, then drops an
 * octave if it can. `open` replaces the form when it lands on its own root
 * (the full open G instead of the movable G-shape triad).
 */
export const FORMS = {
  maj: [
    { name: 'C shape', root: 'C', frets: 'x 3 2 0 1 x' },
    { name: 'A shape', root: 'A', frets: 'x 0 2 2 2 0 (barre 5-1)' },
    { name: 'G shape', root: 'G', frets: 'x x 0 0 0 3', open: '3 2 0 0 0 3' },
    { name: 'E shape', root: 'E', frets: '0 2 2 1 0 0 (barre 6-1)' },
    { name: 'D shape', root: 'D', frets: 'x x 0 2 3 2' },
  ],
  sus2: [
    { name: 'A form', root: 'A', frets: 'x 0 2 2 0 0 (barre 5-1)' },
    { name: 'E form', root: 'E', frets: '0 2 4 4 0 0 (barre 6-1)' },
    { name: 'D form', root: 'D', frets: 'x x 0 2 3 0 (barre 4-1)' },
  ],
  sus4: [
    { name: 'A form', root: 'A', frets: 'x 0 2 2 3 0 (barre 5-1)' },
    { name: 'E form', root: 'E', frets: '0 2 2 2 0 0 (barre 6-1)' },
    { name: 'D form', root: 'D', frets: 'x x 0 2 3 3' },
  ],
  add9: [
    { name: 'C form', root: 'C', frets: 'x 3 2 0 3 x' },
    { name: 'A form', root: 'A', frets: 'x 0 2 4 2 0 (barre 5-1)' },
    { name: 'E form', root: 'E', frets: '0 2 2 1 0 2' },
  ],
  M7: [
    { name: 'A form', root: 'A', frets: 'x 0 2 1 2 0 (barre 5-1)' },
    { name: 'E form', root: 'E', frets: '0 2 1 1 0 0 (barre 6-1)' },
    { name: 'D form', root: 'D', frets: 'x x 0 2 2 2' },
  ],
  M9: [
    { name: 'C form', root: 'C', frets: 'x 3 2 4 3 x' },
    { name: 'E form', root: 'E', frets: '0 2 1 1 0 2' },
  ],
  min: [
    { name: 'Dm shape', root: 'D', frets: 'x x 0 2 3 1' },
    { name: 'Cm shape', root: 'C', frets: 'x 3 1 0 1 x' },
    { name: 'Am shape', root: 'A', frets: 'x 0 2 2 1 0 (barre 5-1)' },
    { name: 'Em shape', root: 'E', frets: '0 2 2 0 0 0 (barre 6-1)' },
  ],
  m7: [
    { name: 'Dm form', root: 'D', frets: 'x x 0 2 1 1' },
    { name: 'Am form', root: 'A', frets: 'x 0 2 0 1 0 (barre 5-1)' },
    { name: 'Em form', root: 'E', frets: '0 2 0 0 0 0 (barre 6-1)' },
  ],
  m9: [
    { name: 'Cm form', root: 'C', frets: 'x 3 1 3 3 x' },
    { name: 'Em form', root: 'E', frets: '0 2 0 0 0 2' },
  ],
  m11: [
    { name: 'Am form', root: 'A', frets: 'x 0 0 0 1 0 (barre 5-1)' },
    { name: 'Em form', root: 'E', frets: '0 0 0 0 0 0 (barre 6-1)' },
  ],
  dim7: [
    { name: 'root on 5th', root: 'Bb', frets: 'x 1 2 0 2 x' },
    { name: 'root on 6th', root: 'F',  frets: '1 x 0 1 0 x (barre 4-2)' },
    { name: 'root on 4th', root: 'D',  frets: 'x x 0 1 0 1 (barre 4-2)' },
  ],
  dim: [
    { name: 'root on 5th', root: 'A', frets: 'x 0 1 2 1 x' },
    { name: 'root on 6th', root: 'E', frets: '0 1 2 0 x x' },
    { name: 'root on 4th', root: 'D', frets: 'x x 0 1 3 1 (barre 4-2)' },
  ],
  m7b5: [
    { name: 'root on 5th', root: 'A', frets: 'x 0 1 0 1 x' },
    { name: 'root on 6th', root: 'E', frets: '0 1 0 0 3 x' },
    { name: 'root on 4th', root: 'D', frets: 'x x 0 1 1 1 (barre 4-2)' },
  ],
};

/**
 * @typedef {object} GuitarVoicing
 * @property {Array<number|null>} frets  string 6 to string 1; null: muted
 * @property {number[]|null} barre  [from, to], as indexes into `frets`
 */

/**
 * parseGuitar('x 3 5 5 5 3 (barre 5-1)') → { frets: [null, 3, 5, 5, 5, 3], barre: [1, 5] }
 * @returns {GuitarVoicing}
 */
export function parseGuitar(text) {
  const m = /^\s*([x\d\s]+?)\s*(?:\(barre ([1-6])-([1-6])\))?\s*$/.exec(text);
  if (!m) throw new Error('Bad guitar voicing: ' + text);
  const frets = m[1].trim().split(/\s+/).map((f) => (f === 'x' ? null : Number(f)));
  if (frets.length !== 6) throw new Error('Need six strings: ' + text);
  const barre = m[2] ? [6 - Number(m[2]), 6 - Number(m[3])] : null;
  return { frets, barre };
}

/** formatFrets([null, 3, 2, 0, 1, 0]) → 'x 3 2 0 1 0', spaced with thin spaces to stay compact */
export function formatFrets(frets) {
  return frets.map((f) => (f === null ? 'x' : f)).join('\u2009');
}

function fretted(frets) {
  return frets.filter((f) => f !== null);
}

/** Where a voicing sits on the neck: 0 if it uses open strings, else its lowest fret. */
export function neckPosition(frets) {
  const played = fretted(frets);
  return played.includes(0) ? 0 : Math.min(...played);
}

/** The fret a voicing's barre is drawn at, or null (no barre, or one at the nut). */
export function barreFret(voicing) {
  if (!voicing.barre) return null;
  const fret = Math.min(...fretted(voicing.frets.slice(voicing.barre[0], voicing.barre[1] + 1)));
  return fret > 0 ? fret : null;
}

/** The voicing the chord tables show: commonVoicing('Bb', 'maj') */
export function commonVoicing(root, quality) {
  const table = COMMON[quality];
  const pc = pitchClass(root);
  for (const name in table) {
    if (pitchClass(name) === pc) return parseGuitar(table[name]);
  }
  throw new Error('No voicing for ' + root);
}

/**
 * @typedef {object} GuitarShape  a movable form (see FORMS), placed for one chord
 * @property {string} name  'A shape'
 * @property {Array<number|null>} frets
 * @property {number[]|null} barre
 * @property {number} position  where it sits on the neck: 0 if open, else its lowest fret
 * @property {string} label  'open' or 'fret 5'
 */

/**
 * Every movable form of a flavour on a root, lowest on the neck first.
 * @returns {GuitarShape[]}
 */
export function guitarShapes(root, flavourId) {
  const forms = FORMS[flavourId];
  if (!forms) throw new Error('No guitar forms for ' + flavourId);
  return forms.map((form) => {
    const shift = mod12(pitchClass(root) - pitchClass(form.root));
    const voicing = parseGuitar(shift === 0 && form.open ? form.open : form.frets);
    let frets = voicing.frets.map((f) => (f === null ? null : f + shift));
    while (Math.min(...fretted(frets)) >= 12) frets = frets.map((f) => (f === null ? null : f - 12));
    const position = neckPosition(frets);
    return { name: form.name, frets, barre: voicing.barre, position, label: position === 0 ? 'open' : 'fret ' + position };
  }).sort((a, b) => a.position - b.position);
}

/** The notes a voicing sounds, as MIDI numbers, low to high: guitarNotes([null, 3, 2, 0, 1, 0]) → [48, 52, 55, 60, 64] */
export function guitarNotes(frets) {
  const notes = [];
  frets.forEach((f, i) => {
    if (f !== null) notes.push(STRINGS[i] + f);
  });
  return notes;
}
