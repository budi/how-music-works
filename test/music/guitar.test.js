import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FLAVOURS } from '../../js/music/chords.js';
import { STRINGS, barreFret, commonVoicing, formatFrets, fretPositions, guitarNotes, guitarShapes, intervalPosition, majorShape, parseGuitar, rootPosition } from '../../js/music/guitar.js';
import { MAJOR_STEPS } from '../../js/music/keys.js';
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

describe('scales on the neck', () => {
  const where = (notes) => notes.map((p) => `${p.string}:${p.fret}`).join(' ');

  it('finds every place a note is played, open strings to fret 12', () => {
    assert.equal(where(fretPositions('E')), '6:0 6:12 5:7 4:2 3:9 2:5 1:0 1:12');
    assert.ok(fretPositions('Bb').every((p) => mod12(p.midi) === 10 && p.midi === STRINGS[6 - p.string] + p.fret));
  });

  it('puts every key’s root on string 6 or 5, away from the nut and not too high', () => {
    assert.deepEqual(rootPosition('G'), { string: 6, fret: 3, midi: 43 });
    assert.deepEqual(rootPosition('C'), { string: 5, fret: 3, midi: 48 });
    assert.deepEqual(rootPosition('G', 4), { string: 4, fret: 5, midi: 55 });
    for (const key of ROOTS) {
      const { fret, midi } = rootPosition(key);
      assert.ok(fret >= 2 && fret <= 8 && mod12(midi) === pitchClass(key), key);
    }
  });

  it('finds each interval above a root close by, as the shapes players learn', () => {
    const shapes = (key) => Array.from({ length: 13 }, (_, size) => {
      const root = rootPosition(key);
      const p = intervalPosition(root, size);
      assert.equal(p.midi, root.midi + size, `${key} + ${size}`);
      assert.equal(p.midi, STRINGS[6 - p.string] + p.fret);
      return `${root.string - p.string}:${p.fret - root.fret}`;
    }).join(' ');
    // a 5th one string over and two frets up, an octave two over and two up
    const usual = '0:0 0:1 0:2 1:-2 1:-1 1:0 1:1 1:2 2:-2 2:-1 2:0 2:1 2:2';
    for (const key of ROOTS) assert.equal(shapes(key), usual, key);
  });

  it('plays every major scale as one shape per string, off the nut, the hand covering four frets', () => {
    assert.equal(where(majorShape('G').notes), '6:3 6:5 5:2 5:3 5:5 4:2 4:4 4:5');
    assert.equal(majorShape('C').string, 5, 'string 6 would put C at fret 8');
    // from string 4, string 2 reaches one fret further; from 3, the first finger takes the root
    assert.equal(where(majorShape('E', 4).notes), '4:2 4:4 3:1 3:2 3:4 2:2 2:4 2:5');
    assert.equal(where(majorShape('C', 3).notes), '3:5 3:7 2:5 2:6 2:8 1:5 1:7 1:8');
    for (const string of [6, 5, 4, 3]) {
      const shapes = new Set();
      for (const key of ROOTS) {
        const shape = majorShape(key, string);
        const root = shape.notes[0];
        assert.equal(root.string, string);
        assert.equal(mod12(root.midi), pitchClass(key), key);
        assert.deepEqual(shape.notes.slice(1).map((p, i) => p.midi - shape.notes[i].midi), MAJOR_STEPS, key);
        assert.ok(shape.from >= 1 && shape.to - shape.from <= (string === 4 ? 4 : 3), `${string}/${key}: frets ${shape.from}-${shape.to}`);
        for (const p of shape.notes) {
          assert.equal(p.midi, STRINGS[6 - p.string] + p.fret, key);
          assert.ok(p.fret >= shape.from && p.fret <= shape.to, `${string}/${key}: ${p.string}:${p.fret} out of reach`);
        }
        shapes.add(shape.notes.map((p) => `${root.string - p.string}:${p.fret - root.fret}`).join(' '));
      }
      assert.equal(shapes.size, 1, `the same shape in every key from string ${string}`);
    }
  });

  it('adds the octave below at the nut, open strings and all, when the shape goes past fret 12', () => {
    assert.equal(majorShape('G').open, null);
    const e = majorShape('E', 6);
    assert.deepEqual([e.from, e.to], [11, 14]);
    assert.equal(where(e.open.notes), '6:0 6:2 6:4 5:0 5:2 5:4 4:1 4:2');
    assert.equal(where(majorShape('G', 3).open.notes), '3:0 3:2 2:0 2:1 2:3 1:0 1:2 1:3');
    for (const string of [6, 5, 4, 3]) {
      for (const key of ROOTS) {
        const { notes, open } = majorShape(key, string);
        if (!open) continue;
        assert.ok(notes[0].fret >= 12, `${string}/${key}: only past fret 12`);
        assert.deepEqual(open.notes.map((p) => p.midi + 12), notes.map((p) => p.midi), `${string}/${key}: the same notes, an octave down`);
        assert.ok(open.notes.every((p) => p.fret >= 0 && p.fret <= 4 && p.midi === STRINGS[6 - p.string] + p.fret), `${string}/${key}`);
        assert.ok(open.notes.some((p) => p.fret === 0), `${string}/${key}: uses an open string`);
      }
    }
  });
});
