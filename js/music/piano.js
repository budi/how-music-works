/**
 * Piano voicings: chords stacked on the keyboard.
 *
 * @module music/piano
 */
import { nextAbove, pitchClass, simplify, stackUp } from './pitch.js';
import { semitones, transpose } from './intervals.js';
import { words } from '../lib/text.js';

export const INVERSION_NAMES = ['root position', '1st inversion', '2nd inversion'];

/**
 * @typedef {object} PianoNote
 * @property {string} name
 * @property {number} pitch  semitones up from the C at the left of the drawing
 * @property {boolean} root  the chord's root
 * @property {boolean} faded  an optional extra, drawn lighter
 */

/**
 * A chord stacked on the keyboard, each note just above the one before;
 * inversions rotate the flavour's tones.
 * @param {string} root
 * @param {Flavour} flavour  from FLAVOURS (chords.js)
 * @param {number} [inversion=0]  0 root position, 1 first inversion, 2 second
 * @returns {{name: string, notes: PianoNote[], position: number}}  position: the lowest note's pitch
 */
export function pianoVoicing(root, flavour, inversion = 0) {
  const rootPc = pitchClass(root);
  const tones = [...flavour.tones.slice(inversion), ...flavour.tones.slice(0, inversion)];
  const faded = flavour.faded || [];
  const notes = [];
  tones.forEach((interval, i) => {
    const pitch = i === 0
      ? rootPc + semitones(interval) % 12
      : nextAbove(notes[i - 1].pitch, rootPc + semitones(interval));
    notes.push({ name: simplify(transpose(root, interval)), pitch, faded: faded.includes(interval), root: interval === '1' });
  });
  return { name: INVERSION_NAMES[inversion], notes, position: notes[0].pitch };
}

/** Root position, then the 1st and 2nd inversions. */
export function pianoInversions(root, flavour) {
  return INVERSION_NAMES.map((_, i) => pianoVoicing(root, flavour, i));
}

/**
 * Notes written by name, stacked upward from the first:
 * stackNotes('C Eb Gb A', { root: 'C', faded: 'A' })
 * @param {string} text
 * @param {object} [marks]
 * @param {string} [marks.root]  the chord's root, marked R
 * @param {string} [marks.faded]  notes to draw lighter: 'A'
 * @returns {PianoNote[]}
 */
export function stackNotes(text, { root, faded } = {}) {
  const names = words(text);
  const lighter = words(faded);
  const pitches = stackUp(names.map(pitchClass));
  return names.map((name, i) => ({
    name,
    pitch: pitches[i],
    root: root != null && pitchClass(root) === pitchClass(name),
    faded: lighter.includes(name),
  }));
}

/**
 * A voicing as MIDI notes around the middle of the keyboard: its lowest note
 * between F3 and E4.
 * @param {Array<{pitch: number}>} notes
 * @returns {number[]}
 */
export function pianoNotes(notes) {
  const low = notes[0].pitch % 12;
  const shift = 48 + low + (low < 5 ? 12 : 0) - notes[0].pitch;
  return notes.map((n) => shift + n.pitch);
}

/** namedNotes('C Eb Gb A') → [60, 63, 66, 69] */
export function namedNotes(text) {
  return pianoNotes(stackNotes(text));
}
