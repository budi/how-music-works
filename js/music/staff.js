/**
 * Notes on the five-line staff: which line or space each one sits on.
 *
 * A position counts lines and spaces up from the clef's bottom line: 0 is the
 * bottom line, 1 the space above it, 2 the second line … 8 the top line. Past
 * the staff the count carries on: −2 is the first ledger line below it, 10
 * the first above.
 *
 * On a grand staff a note can say which staff it's written on: `C4@t`
 * (treble) or `C4@b` (bass). Otherwise middle C and up go on the treble.
 *
 * @module music/staff
 */
import { parsePitch, stepName } from './pitch.js';

/** Each clef: the note on its bottom line, and the line it marks, as a position. */
export const CLEFS = {
  treble: { bottom: 'E4', line: 2, name: 'treble clef' }, // its curl marks G4
  bass: { bottom: 'G2', line: 6, name: 'bass clef' }, // its dots sit either side of F3
};

/**
 * @typedef {Pitch} StaffNote  a pitch, and the staff of a grand staff it's written on
 * @property {string|null} staff  'treble', 'bass', or null if it doesn't say
 */

/**
 * A pitch (see parsePitch) that may say its staff: parseStaffNote('C4@b').staff → 'bass'
 * @returns {StaffNote}
 */
export function parseStaffNote(text) {
  const [, pitch, staff] = /^(.*?)(?:@([tb]))?$/.exec(String(text).trim());
  return { ...parsePitch(pitch), staff: staff ? (staff === 't' ? 'treble' : 'bass') : null };
}

/** position('G4', 'treble') → 2 (the second line) */
export function position(note, clef) {
  const n = typeof note === 'string' ? parseStaffNote(note) : note;
  if (!CLEFS[clef]) throw new Error('No such clef: ' + clef);
  return n.step - parsePitch(CLEFS[clef].bottom).step;
}

/** The natural note at a position: noteAt(-5, 'treble') → 'G3' */
export function noteAt(pos, clef) {
  return stepName(parsePitch(CLEFS[clef].bottom).step + pos);
}

/** The ledger lines a note at `pos` needs, as positions: ledgers(-4) → [-2, -4] */
export function ledgers(pos) {
  const out = [];
  for (let p = -2; p >= pos; p -= 2) out.push(p);
  for (let p = 10; p <= pos; p += 2) out.push(p);
  return out;
}

/** The staff of a grand staff a note goes on: as written, or else middle C and up on the treble. */
export function staffFor(note) {
  return note.staff || (note.midi >= 60 ? 'treble' : 'bass');
}

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth'];
const LINES = ['bottom', 'second', 'middle', 'fourth', 'top'];

/**
 * Where a note sits, in words:
 * 'G4, on the second line of the treble staff',
 * 'C4, middle C, on the first ledger line below the treble staff'
 */
export function describePosition(note, clef) {
  const n = typeof note === 'string' ? parseStaffNote(note) : note;
  const pos = position(n, clef);
  const staff = `the ${clef} staff`;
  const side = pos < 0 ? 'below' : 'above';
  const count = ledgers(pos).length;
  let where;
  if (pos >= 0 && pos <= 8) {
    where = pos % 2 === 0 ? `on the ${LINES[pos / 2]} line of ${staff}` : `in the ${ORDINALS[(pos - 1) / 2]} space of ${staff}`;
  } else if (count === 0) {
    where = `just ${side} ${staff}`;
  } else if (pos % 2 === 0) {
    where = `on the ${ORDINALS[count - 1]} ledger line ${side} ${staff}`;
  } else {
    where = `just ${side} the ${ORDINALS[count - 1]} ledger line ${pos < 0 ? 'under' : 'over'} ${staff}`;
  }
  return n.name + (n.midi === 60 ? ', middle C' : '') + ', ' + where;
}
