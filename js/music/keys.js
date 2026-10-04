/**
 * Major keys: their scales, their seven chords and their key signatures.
 *
 * @module music/keys
 */
import { transpose } from './intervals.js';
import { chordName } from './chords.js';

/** The seven chords of every major key, in order. This row never changes. */
export const DEGREES = [
  { number: '1',  roman: 'I',    quality: 'maj', interval: '1' },
  { number: '2m', roman: 'ii',   quality: 'min', interval: '2' },
  { number: '3m', roman: 'iii',  quality: 'min', interval: '3' },
  { number: '4',  roman: 'IV',   quality: 'maj', interval: '4' },
  { number: '5',  roman: 'V',    quality: 'maj', interval: '5' },
  { number: '6m', roman: 'vi',   quality: 'min', interval: '6' },
  { number: '7°', roman: 'vii°', quality: 'dim', interval: '7' },
];

/** Major keys clockwise round the circle of fifths, spelled the usual way (F# rather than Gb, Db rather than C#). */
export const CIRCLE_OF_FIFTHS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

/** Keys on the circle that are as often written the other way. */
export const ALSO_SPELLED = { 'F#': 'Gb' };

/** majorScale('D') → ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'] */
export function majorScale(key) {
  return DEGREES.map((d) => transpose(key, d.interval));
}

/** The seven chords of a key, in order: [{ degree, root, quality, name }] */
export function diatonicChords(key) {
  const scale = majorScale(key);
  return DEGREES.map((d, i) => ({ degree: d, root: scale[i], quality: d.quality, name: chordName(scale[i], d.quality) }));
}

/** relativeMinor('C') → 'A' */
export function relativeMinor(key) {
  return transpose(key, '6');
}

/** keySignature('D') → { count: 2, accidental: 'sharp', notes: ['F#', 'C#'] } */
export function keySignature(key) {
  const altered = majorScale(key).filter((n) => n.length > 1);
  const accidental = altered.length ? (altered[0][1] === '#' ? 'sharp' : 'flat') : null;
  const order = accidental === 'sharp'
    ? ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#']
    : ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Fb'];
  return { count: altered.length, accidental, notes: order.filter((n) => altered.includes(n)) };
}
