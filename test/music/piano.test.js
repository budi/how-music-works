import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FLAVOURS } from '../../js/music/chords.js';
import { pianoInversions, pianoNotes, pianoVoicing } from '../../js/music/piano.js';

const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

describe('piano voicings', () => {
  const maj = FLAVOURS.maj[0];
  const names = (v) => v.notes.map((n) => n.name).join(' ');

  it('stacks root position from the root', () => {
    const v = pianoVoicing('C', maj);
    assert.equal(v.name, 'root position');
    assert.deepEqual(v.notes.map((n) => n.pitch), [0, 4, 7]);
    assert.equal(v.position, 0);
    assert.deepEqual(v.notes.map((n) => n.root), [true, false, false]);
  });

  it('rotates for inversions, each note just above the last', () => {
    const [root, first, second] = pianoInversions('B', maj);
    assert.equal(names(root), 'B D# F#');
    assert.equal(first.name, '1st inversion');
    assert.deepEqual(first.notes.map((n) => n.pitch), [15, 18, 23]);
    assert.equal(second.name, '2nd inversion');
    assert.equal(names(second), 'F# B D#');
    assert.equal(second.position, 18);
  });

  it('keeps added tones above the triad', () => {
    const add9 = FLAVOURS.maj.find((f) => f.id === 'add9');
    assert.deepEqual(pianoVoicing('C', add9, 1).notes.map((n) => [n.name, n.pitch]), [
      ['E', 4], ['G', 7], ['D', 14], ['C', 24],
    ]);
  });

  it('fades the optional seventh of a diminished seventh', () => {
    const v = pianoVoicing('C', FLAVOURS.dim[0]);
    assert.equal(names(v), 'C Eb Gb A');
    assert.deepEqual(v.notes.map((n) => n.faded), [false, false, false, true]);
  });

  it('always rises', () => {
    for (const f of Object.values(FLAVOURS).flat()) {
      for (const root of ROOTS) {
        for (const v of pianoInversions(root, f)) {
          v.notes.slice(1).forEach((n, i) => assert.ok(n.pitch > v.notes[i].pitch, root + f.id));
          assert.equal(v.notes.length, f.tones.length);
        }
      }
    }
  });
});

describe('as notes', () => {
  const piano = (root, quality = 'maj', inversion = 0) => pianoNotes(pianoVoicing(root, FLAVOURS[quality][0], inversion).notes);

  it('puts a chord around the middle of the keyboard, lowest note F3 to E4', () => {
    assert.deepEqual(piano('C'), [60, 64, 67]);
    assert.deepEqual(piano('F'), [53, 57, 60]);
    assert.deepEqual(piano('B', 'min'), [59, 62, 66]);
    assert.deepEqual(piano('C', 'maj', 1), [64, 67, 72]); // E G C
    for (const root of ROOTS) {
      for (const inv of [0, 1, 2]) {
        const notes = piano(root, 'maj', inv);
        assert.ok(notes[0] >= 53 && notes[0] <= 64, `${root} inversion ${inv}: ${notes}`);
      }
    }
  });
});
