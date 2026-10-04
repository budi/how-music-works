/**
 * Notes on staves: treble, bass, or both joined as a grand staff.
 *
 * Notes are drawn as whole notes, with no stems: only the pitch matters
 * here. Every note is a `<g class="sn" data-i data-midi data-name>`, so a page
 * can make it playable and light it up. Sizes are in staff spaces.
 *
 * @module draw/staff
 */
import { CLEFS, ledgers, parseStaffNote, position, staffFor } from '../music/staff.js';
import { SIGNS } from '../music/pitch.js';
import { ENGRAVING as E, GLYPHS } from './glyphs.js';
import { SCALE, barline, glyph, staffLines } from './engraving.js';
import { el, hline, rect, svg, text } from '../lib/svg.js';
import { words } from '../lib/text.js';

const CLEF_GLYPHS = { treble: 'gClef', bass: 'fClef' };
const ACCIDENTAL_GLYPHS = { '#': 'accidentalSharp', b: 'accidentalFlat', n: 'accidentalNatural' };
const NOTE_W = GLYPHS.noteheadWhole.bbox[2] * SCALE;
const GAP = 1.9; // between one note and the next
const GRAND_GAP = 9; // from the treble staff's middle line to the bass staff's

/**
 * @param {object} options
 * @param {'treble'|'bass'|'grand'} [options.clef='treble']
 * @param {string|Array} [options.notes]  'E4 G4 B4' — see music/staff.js
 * @param {'letters'|'names'|'none'} [options.labels='none']  under each note: 'E', or 'E4'
 * @param {string} [options.title]  what it shows, for screen readers
 * @param {number} [options.width]  at least this wide; a lone note is centred
 * @param {number[]} [options.room]  [low, high] positions to leave room for on
 *   every staff, so the drawing keeps one height whichever notes it shows: [-5, 13]
 * @returns {string} SVG
 */
export function drawStaff(options) {
  const clef = options.clef || 'treble';
  const grand = clef === 'grand';
  const notes = noteList(options.notes);
  const labels = options.labels || 'none';

  // vertically, y is in staff spaces with the treble (or only) staff's middle line at 0
  const staves = grand ? [{ clef: 'treble', dy: 0 }, { clef: 'bass', dy: GRAND_GAP }] : [{ clef, dy: 0 }];
  const staffOf = (n) => (grand ? staves[staffFor(n) === 'treble' ? 0 : 1] : staves[0]);
  const yOf = (pos, s) => s.dy + 2 - pos / 2;

  const left = grand ? 1.6 : 0.5; // room for the brace
  let x = left + 0.4 + 2.7 + 1.6; // after the clef
  if (options.width && notes.length === 1) x = Math.max(x, left + options.width / 2); // a lone note, centred
  const placed = notes.map((note) => {
    const staff = staffOf(note);
    const pos = position(note, staff.clef);
    const acc = note.accidental ? ACCIDENTAL_GLYPHS[note.accidental] : null;
    if (acc) x += GLYPHS[acc].bbox[2] * SCALE + 0.35;
    const at = { note, staff, pos, x, y: yOf(pos, staff), acc };
    x += NOTE_W + GAP;
    return at;
  });
  const right = Math.max(x - GAP + 1.4, left + (options.width || 6));

  const out = [];
  for (const s of staves) {
    out.push(staffLines(left, right, [-2, -1, 0, 1, 2].map((l) => s.dy + l)));
    out.push(glyph(CLEF_GLYPHS[s.clef], left + 0.4, yOf(CLEFS[s.clef].line, s), { cls: 'clef' }));
  }
  const top = -2;
  const bottom = grand ? GRAND_GAP + 2 : 2;
  if (grand) {
    // the brace and the line that join the two staves into one instrument
    out.push(glyph('brace', 0, bottom, { cls: 'brace', scale: (bottom - top) / (GLYPHS.brace.bbox[3] * SCALE) }));
    out.push(barline(left - 0.1, top, bottom));
  }
  out.push(barline(right - E.thinBarlineThickness, top, bottom));

  let lowest = bottom;
  let highest = top;
  if (options.room) {
    for (const s of staves) {
      lowest = Math.max(lowest, yOf(options.room[0], s) + 0.6);
      highest = Math.min(highest, yOf(options.room[1], s) - 0.6);
    }
  }
  for (const p of placed) {
    lowest = Math.max(lowest, p.y + 0.6);
    highest = Math.min(highest, p.y - 0.6);
  }
  const labelY = Math.max(lowest, grand ? bottom : 2) + 2.2;

  placed.forEach((p, i) => {
    const parts = [rect(p.x - 1.2, highest - 1, NOTE_W + 2.4, labelY + 1 - highest, 'sn-hit')];
    for (const lp of ledgers(p.pos)) {
      parts.push(hline(p.x - 0.45, p.x + NOTE_W + 0.45, p.staff.dy + 2 - lp / 2, E.legerLineThickness, 'ledger'));
    }
    if (p.acc) parts.push(glyph(p.acc, p.x - GLYPHS[p.acc].bbox[2] * SCALE - 0.3, p.y, { cls: 'acc' }));
    parts.push(glyph('noteheadWhole', p.x, p.y, { cls: 'head' }));
    if (labels !== 'none') parts.push(text(p.x + NOTE_W / 2, labelY, label(p.note, labels), 'sn-label'));
    out.push(el('g', { class: 'sn', 'data-i': i, 'data-midi': p.note.midi, 'data-name': p.note.name }, parts.join('')));
  });

  const vTop = Math.min(highest, top) - 2.8; // the treble clef reaches well above the staff
  let vBottom = labels !== 'none' ? labelY + 0.8 : Math.max(lowest, bottom) + 2;
  if (!grand && clef === 'treble') vBottom = Math.max(vBottom, 4.2);
  const name = grand ? 'Grand staff' : CLEFS[clef].name[0].toUpperCase() + CLEFS[clef].name.slice(1);
  const title = options.title || name + (notes.length ? ': ' + notes.map((n) => n.name).join(', ') : '');
  return svg({ cls: 'score staff', viewBox: [0, vTop, right + 0.3, vBottom - vTop], label: title }, out.join(''));
}

function noteList(notes) {
  const items = typeof notes === 'string' || notes == null ? words(notes) : notes;
  return items.map((n) => (typeof n === 'string' ? parseStaffNote(n) : n));
}

// 'F♯' for letters, 'F♯4' for names; a natural is named for the moment it's drawn
function label(note, labels) {
  const natural = note.accidental === 'n' ? SIGNS.n : '';
  return labels === 'names'
    ? note.letter + natural + note.name.slice(1)
    : note.name.replace(/-?\d+$/, '') + natural;
}
