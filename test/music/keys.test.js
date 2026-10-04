import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ALSO_SPELLED, CIRCLE_OF_FIFTHS, DEGREES, diatonicChords, keySignature, majorScale, relativeMinor } from '../../js/music/keys.js';
import { mod12, pitchClass } from '../../js/music/pitch.js';

describe('keys', () => {
  it('lists twelve keys round the circle of fifths', () => {
    assert.equal(CIRCLE_OF_FIFTHS.length, 12);
    CIRCLE_OF_FIFTHS.forEach((key, i) => {
      const next = CIRCLE_OF_FIFTHS[(i + 1) % 12];
      assert.equal(mod12(pitchClass(next) - pitchClass(key)), 7, key + ' -> ' + next);
    });
    for (const [key, other] of Object.entries(ALSO_SPELLED)) assert.equal(pitchClass(key), pitchClass(other));
  });

  it('spells major scales with each letter once', () => {
    assert.deepEqual(majorScale('C'), ['C', 'D', 'E', 'F', 'G', 'A', 'B']);
    assert.deepEqual(majorScale('F#'), ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#']);
    assert.deepEqual(majorScale('Db'), ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C']);
    for (const key of CIRCLE_OF_FIFTHS) {
      const letters = majorScale(key).map((n) => n[0]);
      assert.equal(new Set(letters).size, 7, key);
    }
  });

  it('builds the seven chords of a key', () => {
    assert.deepEqual(
      diatonicChords('G').map((c) => c.name),
      ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#°'],
    );
    assert.deepEqual(
      diatonicChords('F#').map((c) => c.name),
      ['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m', 'E#°'],
    );
    assert.deepEqual(DEGREES.map((d) => d.quality), ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim']);
  });

  it('finds the relative minor', () => {
    assert.equal(relativeMinor('C'), 'A');
    assert.equal(relativeMinor('Eb'), 'C');
    assert.equal(relativeMinor('F#'), 'D#');
  });

  it('reads key signatures', () => {
    assert.deepEqual(keySignature('C'), { count: 0, accidental: null, notes: [] });
    assert.deepEqual(keySignature('D'), { count: 2, accidental: 'sharp', notes: ['F#', 'C#'] });
    assert.deepEqual(keySignature('Ab'), { count: 4, accidental: 'flat', notes: ['Bb', 'Eb', 'Ab', 'Db'] });
    // one more sharp each step clockwise, one more flat each step anticlockwise
    assert.deepEqual(
      CIRCLE_OF_FIFTHS.map((k) => keySignature(k).count),
      [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1],
    );
  });
});
