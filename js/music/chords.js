/**
 * Chords: the three qualities a major key gives, and the "flavours" each can
 * be dressed in (sus2, M7, m9, …).
 *
 * @module music/chords
 */
import { simplify } from './pitch.js';
import { transpose } from './intervals.js';

/** The three triad qualities a major key produces. */
export const QUALITIES = {
  maj: { label: 'major', suffix: '' },
  min: { label: 'minor', suffix: 'm' },
  dim: { label: 'diminished', suffix: '°' },
};

/**
 * @typedef {object} Flavour
 * @property {string} id
 * @property {string|null} chip  its button's label; null: the chord's name
 * @property {string} suffix  added to the root to name it: 'm7'
 * @property {string[]} tones  intervals, stacked low to high on piano in root
 *   position; inversions rotate the list
 * @property {string[]} [faded]  tones drawn lighter: optional extras
 */

/**
 * Chord flavours: the same number in a progression, dressed differently.
 * The first of each quality is the plain chord the tables show.
 * @type {Object<string, Flavour[]>}
 */
export const FLAVOURS = {
  maj: [
    { id: 'maj',  chip: null,   suffix: '',     tones: ['1', '3', '5'] },
    { id: 'sus2', chip: 'sus2', suffix: 'sus2', tones: ['1', '2', '5'] },
    { id: 'sus4', chip: 'sus4', suffix: 'sus4', tones: ['1', '4', '5'] },
    { id: 'add9', chip: 'add9', suffix: 'add9', tones: ['1', '3', '5', '9'] },
    { id: 'M7',   chip: 'M7',   suffix: 'M7',   tones: ['1', '3', '5', '7'] },
    { id: 'M9',   chip: 'M9',   suffix: 'M9',   tones: ['1', '3', '5', '7', '9'] },
  ],
  min: [
    { id: 'min', chip: null,  suffix: 'm',   tones: ['1', 'b3', '5'] },
    { id: 'm7',  chip: 'm7',  suffix: 'm7',  tones: ['1', 'b3', '5', 'b7'] },
    { id: 'm9',  chip: 'm9',  suffix: 'm9',  tones: ['1', 'b3', '5', 'b7', '9'] },
    { id: 'm11', chip: 'm11', suffix: 'm11', tones: ['1', 'b3', '5', 'b7', '11'] },
  ],
  // The 7° is played as a diminished seventh by default: it's what guitarists
  // reach for, and it works anywhere a 7° is called.
  dim: [
    { id: 'dim7', chip: 'dim7',  suffix: '°7',  tones: ['1', 'b3', 'b5', 'bb7'], faded: ['bb7'] },
    { id: 'dim',  chip: 'dim',   suffix: '°',   tones: ['1', 'b3', 'b5'] },
    { id: 'm7b5', chip: 'm7♭5', suffix: 'm7♭5', tones: ['1', 'b3', 'b5', 'b7'] },
  ],
};

/** chordName('A', 'min') → 'Am' */
export function chordName(root, quality) {
  return root + QUALITIES[quality].suffix;
}

/** A chord's notes, spelled: chordNotes('B', dim7) → ['B', 'D', 'F', 'Ab'] */
export function chordNotes(root, flavour) {
  return flavour.tones.map((interval) => simplify(transpose(root, interval)));
}
