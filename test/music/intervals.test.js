import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { semitones, transpose } from '../../js/music/intervals.js';

describe('intervals', () => {
  it('counts semitones', () => {
    const cases = { 1: 0, b3: 3, 3: 4, 4: 5, b5: 6, 5: 7, bb7: 9, b7: 10, 7: 11, 9: 14, 11: 17 };
    for (const [iv, semis] of Object.entries(cases)) assert.equal(semitones(iv), semis, iv);
  });

  it('spells by letter', () => {
    assert.equal(transpose('D', '3'), 'F#');
    assert.equal(transpose('C#', '7'), 'B#');
    assert.equal(transpose('Eb', '5'), 'Bb');
    assert.equal(transpose('C', 'bb7'), 'Bbb');
    assert.equal(transpose('E', '9'), 'F#');
  });
});
