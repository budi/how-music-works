/**
 * One octave of a major scale, sung: do re mi fa sol la ti do.
 *
 * Notes are scale degrees 1–8: 1 is do and 8 the do an octave up (written
 * with a dot over it, 1̇, as in numbered notation). Distances are counted in
 * semitones, or half steps; two make a whole step.
 *
 * @module music/solfege
 */
import { INTERVAL_NAMES } from './intervals.js';
import { naturals, parsePitch } from './pitch.js';
import { pick } from '../lib/random.js';
import { plural, words } from '../lib/text.js';

/** Semitones above do, for degrees 1–8. */
export const SEMITONES = [null, 0, 2, 4, 5, 7, 9, 11, 12];
export const SYLLABLES = [null, 'do', 're', 'mi', 'fa', 'sol', 'la', 'ti', 'do'];

/** Where do can sit: the white keys from C3 up to middle C. */
export const DOS = naturals('C3', 'C4').map((name) => ({ midi: parsePitch(name).midi, name }));

/** A degree in words: degreeName(3) → 'mi', degreeName(8) → 'high do' */
export function degreeName(degree) {
  return degree === 8 ? 'high do' : SYLLABLES[degree];
}

/** How a degree is written: 1–7, and 1̇ for the high do. */
export function degreeLabel(degree) {
  return degree === 8 ? '1̇' : String(degree);
}

/** parseDegrees('1 2 1 3') → [1, 2, 1, 3]; only degrees 1–8 */
export function parseDegrees(text) {
  const degrees = words(text).map((t) => {
    const n = Number(t);
    if (!(n >= 1 && n <= 8 && n === Math.floor(n))) throw new Error('Not a note of the scale (1-8): "' + t + '"');
    return n;
  });
  if (degrees.length === 0) throw new Error('Empty pattern');
  return degrees;
}

/** Degrees as MIDI notes, sung from a do: degreeMidis([1, 3], 60) → [60, 64] */
export function degreeMidis(degrees, doMidi) {
  return degrees.map((d) => doMidi + SEMITONES[d]);
}

/** stepsText(5) → '2 whole steps + 1 half step' */
export function stepsText(semitones) {
  const whole = Math.floor(semitones / 2);
  const parts = [];
  if (whole) parts.push(plural(whole, 'whole step'));
  if (semitones % 2) parts.push('1 half step');
  return parts.join(' + ') || 'no step';
}

/** distance(1, 3) → { semitones: 4, up: true, same: false, steps: '2 whole steps', name: 'major 3rd' } */
export function distance(from, to) {
  const semitones = SEMITONES[to] - SEMITONES[from];
  const size = Math.abs(semitones);
  return { semitones: size, up: semitones > 0, same: semitones === 0, steps: stepsText(size), name: INTERVAL_NAMES[size] };
}

/** describeMove(1, 3) → 'up 4 semitones · 2 whole steps · major 3rd' */
export function describeMove(from, to) {
  const d = distance(from, to);
  if (d.same) return 'the same note';
  return `${d.up ? 'up' : 'down'} ${plural(d.semitones, 'semitone')} · ${d.steps} · ${d.name}`;
}

/**
 * A question for the ear check: two notes, the first do going up, or high do
 * going down. Its second note is never `previous` — the last question's — so
 * it never asks the same thing twice in a row.
 * @param {'up'|'down'} direction
 * @param {object} [options]
 * @param {number} [options.previous]
 * @param {function} [options.random]  () → [0, 1)
 * @returns {{from: number, to: number}}
 */
export function earQuestion(direction, { previous, random } = {}) {
  const down = direction === 'down';
  const choices = (down ? [1, 2, 3, 4, 5, 6, 7] : [2, 3, 4, 5, 6, 7, 8]).filter((d) => d !== previous);
  return { from: down ? 8 : 1, to: pick(choices, random) };
}
