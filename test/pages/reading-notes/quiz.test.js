import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { naturals, parsePitch } from '../../../js/music/pitch.js';
import { RANGE, noteQuestion } from '../../../js/pages/reading-notes/quiz.js';

describe('quiz questions', () => {
  it('only adds sharps and flats when asked, and keeps them on the keyboard', () => {
    const all = (accidentals) => Array.from({ length: 200 }, (_, i) => noteQuestion('treble', { random: () => i / 200, accidentals }).note);
    assert.ok(all(false).every((n) => !/[#b]/.test(n)));
    const notes = new Set(all(true));
    assert.ok([...notes].some((n) => n.includes('#')) && [...notes].some((n) => /b\d/.test(n)));
    const [low, high] = RANGE.treble.map((n) => parsePitch(n).midi);
    assert.ok([...notes].every((n) => parsePitch(n).midi >= low && parsePitch(n).midi <= high), 'no G♭3 or D♯6');
    assert.ok(!notes.has('Cb4') && !notes.has('E#4'), 'only the black keys');
  });

  it('never repeats the note just asked, and covers the whole range', () => {
    let seed = 3;
    const random = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
    for (const clef of ['treble', 'bass', 'both']) {
      let previous;
      const seen = new Set();
      for (let i = 0; i < 400; i++) {
        const q = noteQuestion(clef, { random, previous });
        assert.ok(!previous || q.note !== previous.note || q.clef !== previous.clef);
        seen.add(q.clef + q.note);
        previous = q;
      }
      const expected = (clef === 'both' ? ['treble', 'bass'] : [clef])
        .reduce((sum, c) => sum + naturals(...RANGE[c]).length, 0);
      assert.equal(seen.size, expected, clef);
    }
  });
});
