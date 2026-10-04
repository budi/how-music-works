import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SEMITONES, SYLLABLES, degreeLabel, degreeMidis, degreeName, describeMove, distance, earQuestion } from '../../js/music/solfege.js';

describe('the octave', () => {
  it('puts the major scale on its semitones, W W H W W W H, sung do re mi fa sol la ti do', () => {
    const steps = [];
    for (let d = 2; d <= 8; d++) steps.push(SEMITONES[d] - SEMITONES[d - 1] === 2 ? 'W' : 'H');
    assert.equal(steps.join(' '), 'W W H W W W H');
    assert.deepEqual(SYLLABLES.slice(1), ['do', 're', 'mi', 'fa', 'sol', 'la', 'ti', 'do']);
  });

  it('writes the high do with a dot, and calls it high do', () => {
    assert.deepEqual([degreeLabel(1), degreeLabel(8), degreeName(8), degreeName(5)], ['1', '1̇', 'high do', 'sol']);
  });

  it('sings the degrees from any do', () => {
    assert.deepEqual(degreeMidis([1, 3, 5, 8], 60), [60, 64, 67, 72]);
    assert.deepEqual(degreeMidis([1, 7], 57), [57, 68]);
  });
});

describe('distances', () => {
  it('counts semitones, whole and half steps, and names them', () => {
    assert.deepEqual(distance(1, 3), { semitones: 4, up: true, same: false, steps: '2 whole steps', name: 'major 3rd' });
    assert.deepEqual(distance(8, 7), { semitones: 1, up: false, same: false, steps: '1 half step', name: 'minor 2nd' });
    assert.equal(distance(1, 5).steps, '3 whole steps + 1 half step');
    assert.equal(distance(4, 7).name, 'tritone');
  });

  it('describes a move in words', () => {
    assert.equal(describeMove(1, 3), 'up 4 semitones · 2 whole steps · major 3rd');
    assert.equal(describeMove(8, 7), 'down 1 semitone · 1 half step · minor 2nd');
    assert.equal(describeMove(3, 3), 'the same note');
  });
});

describe('ear-check questions', () => {
  it('go up from do, or down from high do, to every other note', () => {
    const all = (direction) => [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.99].map((x) => earQuestion(direction, { random: () => x }));
    assert.ok(all('up').every((q) => q.from === 1));
    assert.deepEqual(all('up').map((q) => q.to), [2, 3, 4, 5, 6, 7, 8]);
    assert.ok(all('down').every((q) => q.from === 8));
    assert.deepEqual(all('down').map((q) => q.to), [1, 2, 3, 4, 5, 6, 7]);
  });

  it('never ask the same thing twice in a row, but come back to it later', () => {
    let seed = 7;
    const random = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
    for (const direction of ['up', 'down']) {
      let previous;
      const seen = new Set();
      for (let i = 0; i < 300; i++) {
        const q = earQuestion(direction, { random, previous });
        assert.notEqual(q.to, previous, `${direction} #${i}`);
        seen.add(q.to);
        previous = q.to;
      }
      assert.equal(seen.size, 7, 'every note still comes up');
    }
  });
});
