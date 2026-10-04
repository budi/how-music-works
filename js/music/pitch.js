/**
 * Notes: their names, pitch classes and MIDI numbers.
 *
 * - A note name is written the way players type it: `C`, `F#`, `Bb`, `Bbb`.
 * - A pitch class (pc) is 0–11, C being 0.
 * - A pitch is a note in an octave, middle C being `C4`: `C4`, `F#4`, `Bb3`,
 *   and `Bn4` for B natural. Its MIDI number counts semitones: C4 is 60.
 *
 * @module music/pitch
 */

/** The seven letters, from C. */
export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/** The pitch class of each letter, in the order of LETTERS. */
export const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];

/** How sharps, flats and naturals are printed. */
export const SIGNS = { '#': '♯', b: '♭', n: '♮' };

/** `n` wrapped into 0…m−1, negative numbers too: mod(-1, 7) → 6 */
export function mod(n, m) {
  return ((n % m) + m) % m;
}

/** `n` wrapped into a pitch class: mod12(-1) → 11, mod12(25) → 1 */
export function mod12(n) {
  return mod(n, 12);
}

/** Sharps as a positive number, flats as a negative one: alteration('##') → 2, alteration('b') → -1 */
export function alteration(signs) {
  return signs ? (signs[0] === '#' ? 1 : -1) * signs.length : 0;
}

/* ---------- note names: C, F#, Bb ---------- */

/**
 * parseNote('F#') → { letter: 3, accidental: 1, pc: 6 }
 * (letter: its index in LETTERS; accidental: sharps, or flats if negative)
 */
export function parseNote(name) {
  const m = /^([A-G])(#{1,2}|b{1,2})?$/.exec(name);
  if (!m) throw new Error('Not a note name: ' + name);
  const letter = LETTERS.indexOf(m[1]);
  const accidental = alteration(m[2]);
  return { letter, accidental, pc: mod12(LETTER_PC[letter] + accidental) };
}

/** pitchClass('Bb') → 10 */
export function pitchClass(name) {
  return parseNote(name).pc;
}

/** A name from a letter (its index, wrapping round) and sharps (+) or flats (−): spell(3, 1) → 'F#' */
export function spell(letter, accidental) {
  return LETTERS[mod(letter, 7)] + (accidental > 0 ? '#'.repeat(accidental) : 'b'.repeat(-accidental));
}

/**
 * The name players read fastest: 'A' rather than 'Bbb', 'E' rather than 'Fb'.
 * Single sharps and flats, E# and B# included, stay as they are.
 */
export function simplify(name) {
  const n = parseNote(name);
  const awkward = Math.abs(n.accidental) > 1 || name === 'Fb' || name === 'Cb';
  if (!awkward) return name;
  const natural = LETTER_PC.indexOf(n.pc);
  return natural >= 0 ? LETTERS[natural] : name;
}

/* ---------- pitches: C4, F#4, Bb3 ---------- */

const SHIFTS = { '#': 1, b: -1, n: 0 };

/**
 * @typedef {object} Pitch
 * @property {string} name  as printed: 'F♯4'
 * @property {string} letter  'F'
 * @property {string} accidental  '#', 'b', 'n' or ''
 * @property {number} octave
 * @property {number} midi  C4 = 60
 * @property {number} step  letters up from C0 (C4 is 28): what a staff counts
 */

/**
 * parsePitch('F#4') → { name: 'F♯4', letter: 'F', accidental: '#', octave: 4, midi: 66, step: 31 }
 * @returns {Pitch}
 */
export function parsePitch(text) {
  const m = /^([A-Ga-g])(#|b|n)?(-?\d)$/.exec(String(text).trim());
  if (!m) throw new Error(`Not a note: "${text}" (write it like C4, F#4 or Bb3)`);
  const letter = m[1].toUpperCase();
  const accidental = m[2] || '';
  const octave = Number(m[3]);
  const index = LETTERS.indexOf(letter);
  return {
    name: letter + (accidental === 'n' ? '' : SIGNS[accidental] || '') + octave,
    letter,
    accidental,
    octave,
    midi: 12 * (octave + 1) + LETTER_PC[index] + (SHIFTS[accidental] || 0),
    step: octave * 7 + index,
  };
}

/** The natural note `step` letters up from C0: stepName(28) → 'C4' */
export function stepName(step) {
  return LETTERS[mod(step, 7)] + Math.floor(step / 7);
}

/** Every natural note from `low` to `high`, both included: naturals('A3', 'D4') → ['A3', 'B3', 'C4', 'D4'] */
export function naturals(low, high) {
  const out = [];
  for (let step = parsePitch(low).step; step <= parsePitch(high).step; step++) out.push(stepName(step));
  return out;
}

/* ---------- piano keys ---------- */

/** Is this pitch a black key? Works for MIDI numbers and pitch classes alike. */
export function isBlackKey(pitch) {
  return !LETTER_PC.includes(mod12(pitch));
}

/** The names of a key, without its octave: 'G', or both names of a black key: ['F♯', 'G♭'] */
export function keySpellings(pitch) {
  const pc = mod12(pitch);
  if (!isBlackKey(pc)) return [LETTERS[LETTER_PC.indexOf(pc)]];
  return [LETTERS[LETTER_PC.indexOf(pc - 1)] + SIGNS['#'], LETTERS[LETTER_PC.indexOf(pc + 1)] + SIGNS.b];
}

/** The name of a piano key: keyName(67) → 'G4', keyName(66) → 'F♯4 / G♭4' */
export function keyName(midi) {
  const octave = Math.floor(midi / 12) - 1;
  return keySpellings(midi).map((name) => name + octave).join(' / ');
}

/* ---------- stacking notes upward ---------- */

/** The nearest pitch above `pitch` whose pitch class is `pc`: nextAbove(4, 0) → 12 */
export function nextAbove(pitch, pc) {
  return pitch + 1 + mod12(pc - pitch - 1);
}

/** Pitch classes stacked upward, each just above the one before: stackUp([7, 11, 2]) → [7, 11, 14] */
export function stackUp(pcs) {
  const pitches = [];
  pcs.forEach((pc, i) => pitches.push(i === 0 ? pc : nextAbove(pitches[i - 1], pc)));
  return pitches;
}
