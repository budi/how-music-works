import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { INTERVALS, intervalDegree, parseInterval, pitchAbove, semitones, transpose } from '../../js/music/intervals.js';

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

  it('lists every interval to the octave by size, each degree as big as its place', () => {
    assert.equal(INTERVALS.length, 13);
    INTERVALS.forEach((iv, size) => {
      for (const degree of iv.degrees) assert.equal(semitones(degree), size, iv.name);
      const number = parseInterval(iv.degrees[0]).steps + 1;
      if (iv.quality !== 'tritone' && size % 12) assert.ok(iv.name.startsWith(`${iv.quality} ${number}`), iv.name);
    });
  });

  it('spells the tritone as whichever of #4 and b5 needs no double sharp or flat', () => {
    assert.equal(intervalDegree('C', 6), '#4');
    assert.equal(intervalDegree('C#', 6), 'b5');
    assert.equal(intervalDegree('C', 4), '3');
  });

  it('puts an interval above a pitch in the right octave', () => {
    assert.equal(pitchAbove('C4', '8'), 'C5');
    assert.equal(pitchAbove('F#4', '7'), 'E#5');
    assert.equal(pitchAbove('B3', 'b2'), 'C4');
    assert.equal(pitchAbove('Bn4', '3'), 'D#5');
  });
});
