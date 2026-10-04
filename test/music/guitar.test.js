import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FLAVOURS } from '../../js/music/chords.js';
import { STRINGS, barreFret, commonVoicing, formatFrets, guitarNotes, guitarShapes, parseGuitar } from '../../js/music/guitar.js';
import { mod12, pitchClass } from '../../js/music/pitch.js';
import { semitones } from '../../js/music/intervals.js';

const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// Fails unless the voicing is really the chord: every note belongs to it,
// and every tone is played except (optionally) the 5th.
function assertPlaysChord(frets, root, flavour, label) {
  const tones = flavour.tones.map((iv) => mod12(pitchClass(root) + semitones(iv)));
  const played = new Set(frets.map((f, i) => (f === null ? null : mod12(STRINGS[i] + f))).filter((pc) => pc !== null));
  for (const pc of played) assert.ok(tones.includes(pc), `${label}: stray note (pc ${pc})`);
  flavour.tones.forEach((iv, i) => {
    if (iv !== '5') assert.ok(played.has(tones[i]), `${label}: missing the ${iv}`);
  });
}

describe('guitar voicings', () => {
  it('reads frets from string 6 to string 1, and a barre as array indexes', () => {
    assert.deepEqual(parseGuitar('x 3 2 0 1 0'), { frets: [null, 3, 2, 0, 1, 0], barre: null });
    assert.deepEqual(parseGuitar('x 1 3 3 3 1 (barre 5-1)').barre, [1, 5]);
    assert.deepEqual(parseGuitar('x x 10 12 13 12').frets, [null, null, 10, 12, 13, 12]);
  });

  it('puts the barre on the lowest fret under it, and none at the nut', () => {
    assert.equal(barreFret(parseGuitar('x 3 5 5 5 3 (barre 5-1)')), 3);
    assert.equal(barreFret(parseGuitar('x 0 2 2 2 0 (barre 5-1)')), null);
  });

  it('sounds the fretted strings low to high: x 3 2 0 1 0 is C E G C E', () => {
    assert.deepEqual(guitarNotes(parseGuitar('x 3 2 0 1 0').frets), [48, 52, 55, 60, 64]);
  });
});

describe('the chord tables', () => {
  it('have a voicing for every root and quality, and each plays the right chord', () => {
    for (const quality of ['maj', 'min', 'dim']) {
      for (const root of ROOTS) assertPlaysChord(commonVoicing(root, quality).frets, root, FLAVOURS[quality][0], root + ' ' + quality);
    }
  });

  it('use the open shapes players learn first', () => {
    const open = { C: 'x32010', G: '320003', D: 'xx0232', A: 'x02220', E: '022100' };
    for (const [root, frets] of Object.entries(open)) {
      assert.equal(formatFrets(commonVoicing(root, 'maj').frets).replace(/\u2009/g, ''), frets);
    }
  });
});

describe('the progression builder’s shapes', () => {
  const allFlavours = Object.values(FLAVOURS).flat();

  it('play the right chord, in every form, on every root', () => {
    for (const f of allFlavours) {
      for (const root of ROOTS) {
        for (const s of guitarShapes(root, f.id)) assertPlaysChord(s.frets, root, f, `${root}${f.suffix} ${s.name}`);
      }
    }
  });

  it('sit in the lowest playable spot, lowest first, labelled by where they sit', () => {
    for (const f of allFlavours) {
      for (const root of ROOTS) {
        const positions = guitarShapes(root, f.id).map((s) => s.position);
        assert.deepEqual(positions, [...positions].sort((a, b) => a - b), root + f.id);
        assert.ok(positions.every((p) => p >= 0 && p < 12), root + f.id);
      }
    }
    assert.deepEqual(guitarShapes('C', 'maj').map((s) => `${s.name} · ${s.label}`),
      ['C shape · open', 'A shape · fret 3', 'G shape · fret 5', 'E shape · fret 8', 'D shape · fret 10']);
  });

  it('swap in the full open G when the G shape lands on G', () => {
    assert.deepEqual(guitarShapes('G', 'maj').find((s) => s.name === 'G shape').frets, [3, 2, 0, 0, 0, 3]);
    assert.deepEqual(guitarShapes('A', 'maj').find((s) => s.name === 'G shape').frets, [null, null, 2, 2, 2, 5]);
  });
});
