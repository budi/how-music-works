/**
 * Intervals, written as degrees of a major scale with any sharps or flats:
 * `1`, `b3`, `5`, `bb7`, `9`, `11`.
 *
 * @module music/intervals
 */
import { LETTERS, LETTER_PC, alteration, mod, mod12, parseNote, parsePitch, pitchClass, spell } from './pitch.js';

/**
 * The intervals from a unison to an octave, by size: INTERVALS[4] is the
 * major 3rd, 4 half steps. Each is written as a degree of the major scale; the
 * tritone either way, as an augmented 4th or a diminished 5th.
 */
export const INTERVALS = [
  { short: 'P1', name: 'unison', quality: 'perfect', degrees: ['1'] },
  { short: 'm2', name: 'minor 2nd', quality: 'minor', degrees: ['b2'] },
  { short: 'M2', name: 'major 2nd', quality: 'major', degrees: ['2'] },
  { short: 'm3', name: 'minor 3rd', quality: 'minor', degrees: ['b3'] },
  { short: 'M3', name: 'major 3rd', quality: 'major', degrees: ['3'] },
  { short: 'P4', name: 'perfect 4th', quality: 'perfect', degrees: ['4'] },
  { short: 'TT', name: 'tritone', quality: 'tritone', degrees: ['#4', 'b5'] },
  { short: 'P5', name: 'perfect 5th', quality: 'perfect', degrees: ['5'] },
  { short: 'm6', name: 'minor 6th', quality: 'minor', degrees: ['b6'] },
  { short: 'M6', name: 'major 6th', quality: 'major', degrees: ['6'] },
  { short: 'm7', name: 'minor 7th', quality: 'minor', degrees: ['b7'] },
  { short: 'M7', name: 'major 7th', quality: 'major', degrees: ['7'] },
  { short: 'P8', name: 'octave', quality: 'perfect', degrees: ['8'] },
];

/** What an interval is called, by its size in semitones: INTERVAL_NAMES[4] → 'major 3rd' */
export const INTERVAL_NAMES = INTERVALS.map((iv) => iv.name);

/** parseInterval('b3') → { steps: 2, semitones: 3 }: how many letters, and how many semitones, it spans */
export function parseInterval(interval) {
  const m = /^(#{1,2}|b{1,2})?(\d+)$/.exec(interval);
  if (!m) throw new Error('Not an interval: ' + interval);
  const degree = Number(m[2]) - 1;
  return { steps: degree, semitones: LETTER_PC[degree % 7] + 12 * Math.floor(degree / 7) + alteration(m[1]) };
}

/** semitones('b7') → 10 */
export function semitones(interval) {
  return parseInterval(interval).semitones;
}

/** The note an interval above a root, spelled by letter: transpose('D', '3') → 'F#', transpose('C', 'bb7') → 'Bbb' */
export function transpose(root, interval) {
  const r = parseNote(root);
  const iv = parseInterval(interval);
  const letter = mod(r.letter + iv.steps, 7);
  let accidental = mod12(r.pc + iv.semitones) - LETTER_PC[letter];
  if (accidental > 6) accidental -= 12;
  if (accidental < -6) accidental += 12;
  return spell(letter, accidental);
}

/**
 * The ways to write an interval of `size` half steps above a root, as degrees,
 * that need no double sharp or flat: wellSpelled('C', 6) → ['#4', 'b5'],
 * wellSpelled('C#', 6) → ['b5'], wellSpelled('Ab', 1) → []
 */
export function wellSpelled(root, size) {
  return INTERVALS[size].degrees.filter((d) => transpose(root, d).length <= 2);
}

/**
 * How to write an interval of `size` half steps above a root, as a degree:
 * the tritone as whichever of #4 and b5 needs no double sharp or flat.
 * intervalDegree('C', 6) → '#4', intervalDegree('C#', 6) → 'b5'
 */
export function intervalDegree(root, size) {
  return wellSpelled(root, size)[0] ?? INTERVALS[size].degrees[0];
}

/** The root from ROOTS for a key of the octave, by MIDI number or pitch class: rootFor(61) → 'C#'; undefined for G♯ / A♭ */
export function rootFor(pitch) {
  return ROOTS.find((r) => pitchClass(r) === mod12(pitch));
}

/** An interval above a pitch, its octave included: pitchAbove('F#4', '7') → 'E#5' */
export function pitchAbove(pitch, interval) {
  const p = parsePitch(pitch);
  const root = p.letter + (p.accidental === 'n' ? '' : p.accidental);
  const letters = LETTERS.indexOf(p.letter) + parseInterval(interval).steps;
  return transpose(root, interval) + (p.octave + Math.floor(letters / 7));
}

/**
 * A note to measure intervals from, for each key of the octave but one: its
 * first spelling from which every interval up to the octave needs no double
 * sharp or flat. G♯ / A♭ has none (from A♭, a minor 2nd is B♭♭), so it's left out.
 */
export const ROOTS = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'Bb', 'B']
  .filter((root) => INTERVALS.every((_, size) => wellSpelled(root, size).length))
  .filter((root, i, all) => all.findIndex((r) => pitchClass(r) === pitchClass(root)) === i);
