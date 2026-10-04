import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseRhythm } from '../../js/music/rhythm.js';
import { randomBars, shortestNotes } from '../../js/music/random-rhythm.js';

// the same "random" numbers every run
function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

// many rhythms for one setting, parsed
function many(time, level, { swing = false } = {}, n = 200) {
  const random = seeded(level * 1000 + time.length);
  return Array.from({ length: n }, () => {
    const text = randomBars(time, 4, level, { swing, random });
    return { text, parsed: parseRhythm(text, time) };
  });
}

const bars = (parsed) => [...Array(parsed.bars).keys()].map((b) => parsed.events.filter((e) => e.bar === b));
const triplets = (rhythms) => new Set(rhythms.flatMap(({ text }) => text.match(/\[[^\]]*\]/g) || []));

describe('random rhythms', () => {
  it('always makes the bars asked for, each adding up, straight or swung', () => {
    for (const time of ['4/4', '3/4', '6/8']) {
      for (const level of [1, 2, 3]) {
        for (const swing of [false, true]) {
          for (const { parsed } of many(time, level, { swing })) assert.equal(parsed.bars, 4); // parsing checks every bar's length
        }
      }
    }
  });

  it('starts on a note, triplets too, and never leaves a bar silent', () => {
    for (const time of ['4/4', '3/4', '6/8']) {
      for (const level of [1, 2, 3]) {
        for (const swing of [false, true]) {
          for (const { text, parsed } of many(time, level, { swing })) {
            assert.equal(parsed.events[0].rest, false, text);
            for (const bar of bars(parsed)) assert.ok(bar.some((e) => !e.rest), text);
          }
        }
      }
    }
  });

  it('keeps to what each level teaches', () => {
    const tokens = (level) => new Set(many('4/4', level).flatMap(({ text }) => text.split(/\s+/)));
    const easy = tokens(1);
    assert.deepEqual([...easy].sort(), ['e', 'h', 'q', 'qr', '|']);
    const medium = tokens(2);
    for (const t of ['[e', 'er', 'q.']) assert.ok(medium.has(t), t);
    assert.ok(![...medium].some((t) => t.startsWith('s')), 'no sixteenths before level 3');
    assert.ok(tokens(3).has('s'));
  });

  it('starts two-beat notes on a strong beat', () => {
    for (const swing of [false, true]) {
      for (const { text, parsed } of many('4/4', 3, { swing })) {
        for (const e of parsed.events) {
          if (e.value === 'h' || (e.value === 'q' && e.dotted)) assert.equal(e.start % 48, 0, text);
        }
      }
    }
  });

  it('knows the shortest notes each level can give, so lines can share one spacing', () => {
    assert.deepEqual(shortestNotes('4/4', 1), { plain: 12, triplet: Infinity });
    assert.deepEqual(shortestNotes('4/4', 3), { plain: 6, triplet: 8 });
    assert.deepEqual(shortestNotes('4/4', 3, { swing: true }), { plain: 12, triplet: 8 });
  });
});

describe('swung random rhythms', () => {
  const swung = (level, time = '4/4') => many(time, level, { swing: true });

  it('puts every note where swing can play it: on a beat, its "&" or a triplet, never a sixteenth', () => {
    for (const time of ['4/4', '3/4']) {
      for (const level of [1, 2, 3]) {
        for (const { text, parsed } of swung(level, time)) {
          assert.ok(parsed.events.every((e) => [0, 8, 12, 16].includes(e.start % 24)), text);
        }
      }
    }
  });

  it('start as easy as straight ones, leave out triplets that sound like a swung pair, and add ties and syncopation at level 3', () => {
    assert.deepEqual([...new Set(swung(1).flatMap(({ text }) => text.split(/\s+/)))].sort(), ['e', 'h', 'q', 'qr', '|']);
    assert.deepEqual([...triplets(swung(2))], ['[e e e]']);
    assert.deepEqual([...triplets(swung(3))].sort(), ['[e e e]', '[er e e]', '[q q q]']);
    const hard = swung(3);
    assert.ok(hard.some(({ text }) => text.includes('e e~ q')), 'a tie into the beat');
    assert.ok(hard.some(({ parsed }) => parsed.events.some((e) => e.value === 'q' && !e.rest && e.start % 24 === 12)), 'a quarter on an "&"');
    assert.ok(!swung(2).some(({ text }) => text.includes('~')), 'no ties before level 3');
  });
});
