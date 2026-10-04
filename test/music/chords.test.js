import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FLAVOURS, chordName, chordNotes } from '../../js/music/chords.js';

describe('chords', () => {
  const flavour = (q, id) => FLAVOURS[q].find((f) => f.id === id);

  it('names chords', () => {
    assert.equal(chordName('C', 'maj'), 'C');
    assert.equal(chordName('A', 'min'), 'Am');
    assert.equal(chordName('B', 'dim'), 'B°');
  });

  it('spells chord notes', () => {
    assert.deepEqual(chordNotes('C', flavour('maj', 'maj')), ['C', 'E', 'G']);
    assert.deepEqual(chordNotes('D', flavour('maj', 'M7')), ['D', 'F#', 'A', 'C#']);
    assert.deepEqual(chordNotes('E', flavour('min', 'm9')), ['E', 'G', 'B', 'D', 'F#']);
    assert.deepEqual(chordNotes('B', flavour('dim', 'dim7')), ['B', 'D', 'F', 'Ab']);
    // diminished sevenths avoid double flats: Bbb is written A
    assert.deepEqual(chordNotes('C', flavour('dim', 'dim7')), ['C', 'Eb', 'Gb', 'A']);
  });

  it('gives every flavour a unique id and a root', () => {
    const all = Object.values(FLAVOURS).flat();
    assert.equal(new Set(all.map((f) => f.id)).size, all.length);
    for (const f of all) assert.equal(f.tones[0], '1', f.id);
  });
});
