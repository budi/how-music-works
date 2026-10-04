/**
 * The progression builder's chords, apart from the page: what each slot holds
 * and which shape it shows.
 *
 * A slot holds a chord number (a degree of the key), a flavour, and a shape
 * picked by hand for each instrument — or none, to follow the slot before:
 * then it takes the shape nearest the last pick, on the neck (guitar) or the
 * keyboard (piano).
 *
 * @module pages/number-system/progression
 */
import { FLAVOURS } from '../../music/chords.js';
import { DEGREES, diatonicChords } from '../../music/keys.js';
import { guitarNotes, guitarShapes } from '../../music/guitar.js';
import { pianoInversions, pianoNotes } from '../../music/piano.js';

export const MAX_SLOTS = 6;
const START = [0, 5, 3, 4, 1, 4]; // 1 - 6m - 4 - 5 - 2m - 5

/**
 * A new progression: 1 - 6m - 4 - 5 in C, open shapes. Six slots are kept
 * (`count` are in use), so a chord taken off and put back keeps its settings.
 */
export function createProgression() {
  return {
    key: 'C',
    count: 4,
    // picks are neck / keyboard positions; null: follow the slot before
    slots: START.map((degree, i) => ({ degree, flavour: 0, guitar: i === 0 ? 0 : null, piano: i === 0 ? 0 : null })),
  };
}

/**
 * What slot `i` shows: its chord, flavour and name, every shape it can take on
 * each instrument, and which of them is picked (indexes into `guitar` and `piano`).
 */
export function slotInfo(state, i) {
  const slot = state.slots[i];
  const chord = diatonicChords(state.key)[slot.degree];
  const flavour = FLAVOURS[chord.quality][slot.flavour];
  const guitar = guitarShapes(chord.root, flavour.id);
  const piano = pianoInversions(chord.root, flavour);
  return {
    chord,
    flavour,
    name: chord.root + flavour.suffix,
    guitar,
    piano,
    guitarPick: nearest(guitar, followedPick(state, i, 'guitar')),
    pianoPick: nearest(piano, followedPick(state, i, 'piano')),
  };
}

// the pick this slot goes by: its own, or the latest one before it
function followedPick(state, i, instrument) {
  for (; i >= 0; i--) {
    if (state.slots[i][instrument] !== null) return state.slots[i][instrument];
  }
  return 0;
}

// the shape closest to a position; on a tie, the lower one
function nearest(shapes, target) {
  let best = 0;
  shapes.forEach((s, i) => {
    if (Math.abs(s.position - target) < Math.abs(shapes[best].position - target)) best = i;
  });
  return best;
}

/** Every chord in use, as the MIDI notes of its picked shape on `instrument`. */
export function progressionNotes(state, instrument) {
  const chords = [];
  for (let i = 0; i < state.count; i++) {
    const info = slotInfo(state, i);
    chords.push(instrument === 'piano'
      ? pianoNotes(info.piano[info.pianoPick].notes)
      : guitarNotes(info.guitar[info.guitarPick].frets));
  }
  return chords;
}

/**
 * Makes one change, as the builder's buttons ask:
 *   key C · degree slot:degree · flavour slot:flavour · pick slot:instrument:position ·
 *   follow slot:instrument · add · remove
 * @param {object} state
 * @param {string} action
 * @param {string[]} [values]  the button's data-value, split on ':'
 */
export function update(state, action, values = []) {
  const [a, b, c] = values;
  const slot = state.slots[Number(a)];
  switch (action) {
    case 'key':
      state.key = a;
      break;
    case 'degree':
      // flavours differ between major, minor and diminished
      if (DEGREES[Number(b)].quality !== DEGREES[slot.degree].quality) slot.flavour = 0;
      slot.degree = Number(b);
      break;
    case 'flavour':
      slot.flavour = Number(b);
      break;
    case 'pick':
      slot[b] = Number(c);
      break;
    case 'follow':
      slot[b] = null;
      break;
    case 'add':
      state.count = Math.min(MAX_SLOTS, state.count + 1);
      break;
    case 'remove':
      state.count = Math.max(1, state.count - 1);
      break;
  }
}
