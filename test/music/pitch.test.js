import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parsePitch, pitchClass, simplify } from '../../js/music/pitch.js';

describe('notes', () => {
  it('reads note names as pitch classes', () => {
    assert.deepEqual(['C', 'F#', 'Bb', 'B#', 'Cb', 'Bbb', 'F##'].map(pitchClass), [0, 6, 10, 0, 11, 9, 7]);
  });

  it('simplifies awkward spellings only', () => {
    assert.deepEqual(['Bbb', 'Fb', 'Cb', 'F##'].map(simplify), ['A', 'E', 'B', 'G']);
    // kept: ordinary accidentals, including E# in the key of F#
    for (const n of ['C', 'F#', 'Bb', 'E#', 'B#']) assert.equal(simplify(n), n);
  });

  it('reads a letter, an accidental and an octave, middle C being C4', () => {
    assert.deepEqual(['C4', 'A4', 'F#4', 'Bb3', 'Bn4', 'C-1'].map((n) => parsePitch(n).midi), [60, 69, 66, 58, 71, 0]);
    assert.deepEqual(['f#4', 'Bn4'].map((n) => parsePitch(n).name), ['F♯4', 'B4']);
  });
});
