import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseRhythm } from '../../js/music/rhythm.js';
import { chordTimeline, melodyTimeline, rhythmTimeline } from '../../js/audio/timeline.js';

describe('rhythms', () => {
  const tl = (text, time, opts) => rhythmTimeline({ main: parseRhythm(text, time) }, opts);

  it('times notes from the tempo', () => {
    const t = tl('q q h', '4/4', { bpm: 120 });
    assert.deepEqual(t.notes.map((n) => n.at), [0, 0.5, 1]);
    assert.deepEqual([t.length, t.barLength], [2, 2]);
  });

  it('skips rests and tied continuations, accents the start of each bar', () => {
    const t = tl('h ~ q qr | q q h', '4/4', { bpm: 60 });
    assert.deepEqual(t.notes.map((n) => [n.at, n.accent]), [[0, true], [4, true], [5, false], [6, false]]);
  });

  it('clicks every beat, or every eighth in compound time, and counts in for a bar', () => {
    assert.deepEqual(tl('q q q q', '4/4', { bpm: 60 }).clicks.map((c) => c.at), [0, 1, 2, 3]);
    const six = tl('e e e e e e', '6/8', { bpm: 60 });
    assert.deepEqual(six.clicks.map((c) => Math.round(c.at * 1000)), [0, 333, 667, 1000, 1333, 1667]);
    assert.deepEqual(six.clicks.map((c) => c.beat), [true, false, false, true, false, false]);
    assert.equal(tl('q q q | q q q', '3/4', { bpm: 60 }).countIn.length, 3);
  });

  it('swings: every "&" moves to the last third of its beat', () => {
    const t = tl('e e e e q q', '4/4', { bpm: 60, swing: true });
    assert.deepEqual(t.notes.map((n) => Math.round(n.at * 1000)), [0, 667, 1000, 1667, 2000, 3000]);
  });

  it('lines up several voices and lists every step for highlighting', () => {
    const voices = { up: parseRhythm('e e e e e e e e', '4/4', ['hh']), down: parseRhythm('q qr q qr', '4/4', ['bd']) };
    const t = rhythmTimeline(voices, { bpm: 60 });
    assert.equal(t.notes.length, 10);
    assert.equal(t.steps.length, 12); // rests are steps too
  });
});

describe('chord progressions', () => {
  const chords = [[48, 52, 55], [45, 52, 57]];

  it('gives each chord a bar of 4/4, struck once and left to ring, with a click on every beat', () => {
    const t = chordTimeline(chords, { instrument: 'guitar', bpm: 60 });
    assert.deepEqual([t.length, t.barLength], [8, 4]);
    assert.deepEqual(t.notes.map((n) => [n.at, n.chord.notes, n.chord.length]), [[0, chords[0], 4], [4, chords[1], 4]]);
    assert.deepEqual(t.steps.map((s) => [s.at, s.index]), [[0, 0], [4, 1]]);
    assert.equal(t.clicks.length, 8);
    assert.deepEqual(t.countIn.map((c) => c.at), [0, 1, 2, 3]);
  });

  it('can strike every beat, the first of each bar harder', () => {
    const t = chordTimeline(chords, { instrument: 'piano', bpm: 120, strum: 'beats' });
    assert.equal(t.notes.length, 8);
    assert.deepEqual(t.notes.slice(0, 4).map((n) => [n.at, n.accent]), [[0, true], [0.5, false], [1, false], [1.5, false]]);
    assert.ok(t.notes[0].chord.length < 0.5, 'damped before the next one');
  });
});

describe('tunes', () => {
  it('plays a note a beat on piano, counting in for a bar with no metronome over the singing', () => {
    const t = melodyTimeline([60, 64, 67, 60], { bpm: 60 });
    assert.deepEqual(t.notes.map((n) => [n.at, n.chord.notes[0], n.chord.instrument]), [[0, 60, 'piano'], [1, 64, 'piano'], [2, 67, 'piano'], [3, 60, 'piano']]);
    assert.ok(t.notes.every((n) => n.chord.length < 1), 'each note ends before the next');
    assert.deepEqual(t.steps.map((s) => s.index), [0, 1, 2, 3]);
    assert.equal(t.countIn.length, 4);
    assert.deepEqual(t.clicks, []);
  });

  it('accents the start of each group, and leaves a gap as long as it to sing it back', () => {
    assert.deepEqual(melodyTimeline([60, 64, 60, 67], { group: 2 }).notes.map((n) => n.accent), [true, false, true, false]);
    const pairs = melodyTimeline([60, 64, 60, 67], { bpm: 60, echo: true, group: 2 });
    assert.deepEqual(pairs.notes.map((n) => n.at), [0, 1, 4, 5]);
    assert.equal(pairs.length, 8);
    assert.equal(melodyTimeline([60, 62, 64], { bpm: 60, echo: true, group: 2 }).length, 3 + 2 + 1, 'a last group of one gets one beat');
  });
});
