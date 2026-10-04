import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { naturals } from '../../js/music/pitch.js';
import { CLEFS, describePosition, ledgers, noteAt, parseStaffNote, position, staffFor } from '../../js/music/staff.js';

describe('notes on a grand staff', () => {
  it('go on the staff written, or else middle C and up on the treble', () => {
    assert.deepEqual(['C4', 'B3', 'G5', 'C4@b', 'A3@t'].map((n) => staffFor(parseStaffNote(n))), ['treble', 'bass', 'treble', 'bass', 'treble']);
    assert.equal(parseStaffNote('F#4@b').midi, 66);
  });
});

describe('positions on the staff', () => {
  const pos = (notes, clef) => notes.split(' ').map((n) => position(n, clef));

  it('puts each clef’s lines and spaces on their notes, and each clef on its own note', () => {
    assert.deepEqual(pos('E4 G4 B4 D5 F5', 'treble'), [0, 2, 4, 6, 8]);
    assert.deepEqual(pos('F4 A4 C5 E5', 'treble'), [1, 3, 5, 7]);
    assert.deepEqual(pos('G2 B2 D3 F3 A3', 'bass'), [0, 2, 4, 6, 8]);
    assert.deepEqual(pos('A2 C3 E3 G3', 'bass'), [1, 3, 5, 7]);
    assert.equal(position('G4', 'treble'), CLEFS.treble.line); // the treble curl on G4
    assert.equal(position('F3', 'bass'), CLEFS.bass.line); // the bass dots round F3
  });

  it('finds the note at a position', () => {
    assert.deepEqual([-5, 0, 13].map((p) => noteAt(p, 'treble')), ['G3', 'E4', 'D6']);
    assert.deepEqual([-5, 0, 13].map((p) => noteAt(p, 'bass')), ['B1', 'G2', 'F4']);
    for (const n of naturals('B1', 'D6')) assert.equal(noteAt(position(n, 'treble'), 'treble'), n);
  });

  it('adds ledger lines on the way out, none for the space just outside', () => {
    assert.deepEqual(ledgers(position('C4', 'treble')), [-2], 'middle C: one below the treble');
    assert.deepEqual(ledgers(position('C4', 'bass')), [10], 'and one above the bass');
    assert.deepEqual(['D4', 'B3', 'A3', 'C6', 'G5'].map((n) => ledgers(position(n, 'treble'))), [[], [-2], [-2, -4], [10, 12], []]);
  });
});

describe('positions in words', () => {
  it('says where a note sits', () => {
    const say = (note, clef) => describePosition(parseStaffNote(note), clef);
    assert.equal(say('G4', 'treble'), 'G4, on the second line of the treble staff');
    assert.equal(say('C5', 'treble'), 'C5, in the third space of the treble staff');
    assert.equal(say('C4', 'treble'), 'C4, middle C, on the first ledger line below the treble staff');
    assert.equal(say('B3', 'treble'), 'B3, just below the first ledger line under the treble staff');
    assert.equal(say('C4', 'bass'), 'C4, middle C, on the first ledger line above the bass staff');
    assert.equal(say('B3', 'bass'), 'B3, just above the bass staff');
  });
});
