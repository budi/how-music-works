/**
 * Intervals, written as degrees of a major scale with any sharps or flats:
 * `1`, `b3`, `5`, `bb7`, `9`, `11`.
 *
 * @module music/intervals
 */
import { LETTER_PC, alteration, mod, mod12, parseNote, spell } from './pitch.js';

/** What an interval is called, by its size in semitones: INTERVAL_NAMES[4] → 'major 3rd' */
export const INTERVAL_NAMES = ['unison', 'minor 2nd', 'major 2nd', 'minor 3rd', 'major 3rd', 'perfect 4th', 'tritone',
  'perfect 5th', 'minor 6th', 'major 6th', 'minor 7th', 'major 7th', 'octave'];

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
