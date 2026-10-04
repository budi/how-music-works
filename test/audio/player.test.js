import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FakeAudioContext, manualClock } from '../fake-audio.js';
import { parseRhythm } from '../../js/music/rhythm.js';
import { rhythmTimeline } from '../../js/audio/timeline.js';
import { SOUNDS } from '../../js/audio/sounds.js';
import { INSTRUMENTS } from '../../js/audio/instruments.js';
import { createPlayer } from '../../js/audio/player.js';

let ctx;
let clock;
let player;

beforeEach(() => {
  ctx = null;
  clock = manualClock();
  player = createPlayer({
    createContext: () => (ctx = new FakeAudioContext()),
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    frame: clock.frame,
  });
});

// move the audio clock forward, letting the scheduler and frames run
function advance(seconds, step = 0.02) {
  const end = ctx.currentTime + seconds;
  while (ctx.currentTime < end - 1e-9) {
    ctx.currentTime = Math.min(end, ctx.currentTime + step);
    clock.tick();
  }
}

const timeline = (text, time = '4/4', bpm = 60, sounds) =>
  rhythmTimeline({ main: parseRhythm(text, time, sounds) }, { bpm });
const oscillators = () => ctx.started.filter((s) => s.kind === 'oscillator');

describe('sounds', () => {
  it('makes each one on time, from oscillators and noise; an accented click is higher', () => {
    const c = new FakeAudioContext();
    const out = c.createGain();
    for (const [name, sound] of Object.entries(SOUNDS)) {
      const before = c.started.length;
      sound(c, out, 1, true);
      assert.ok(c.started.length > before, name);
      assert.ok(c.started.slice(before).every((s) => s.at === 1), name + ' starts on time');
    }
    const clicks = new FakeAudioContext();
    SOUNDS.click(clicks, clicks.createGain(), 0, true);
    SOUNDS.click(clicks, clicks.createGain(), 0, false);
    assert.ok(clicks.started[0].frequency > clicks.started[1].frequency);
  });
});

describe('instruments', () => {
  const notes = (c) => c.started.filter((s) => s.kind === 'noise');

  it('strums a guitar chord low to high, a moment between strings, and strikes a piano chord all but together', () => {
    const ctx = new FakeAudioContext();
    createPlayer({ createContext: () => ctx }).strum('guitar', [64, 40, 52]);
    const played = notes(ctx);
    assert.equal(played.length, 3);
    const gaps = played.slice(1).map((n, i) => n.at - played[i].at);
    assert.ok(gaps.every((g) => g > 0.01 && g < 0.04), String(gaps));
    const piano = new FakeAudioContext();
    createPlayer({ createContext: () => piano }).strum('piano', [60, 64, 67]);
    const ats = notes(piano).map((n) => n.at);
    assert.ok(ats.at(-1) - ats[0] < 0.01);
  });

  it('makes sounds that start loud and die away, never past full scale', () => {
    for (const [name, inst] of Object.entries(INSTRUMENTS)) {
      for (const midi of [40, 60, 84]) {
        const data = inst.samples(8000, midi);
        const peak = (from, to) => Math.max(...data.slice(from, to).map(Math.abs));
        assert.ok(peak(0, data.length) <= 1, name);
        assert.ok(peak(0, 2000) > 4 * peak(data.length - 2000, data.length), `${name} ${midi} fades`);
      }
    }
  });

  it('cuts a note short when the chord has a length, with a quick fade', () => {
    player.play({
      notes: [{ at: 0, sounds: [], chord: { instrument: 'piano', notes: [60], length: 0.5 } }],
      clicks: [], steps: [], length: 1, barLength: 1, countIn: [],
    }, {});
    const [note] = notes(ctx);
    const last = note.gain.events.at(-1);
    assert.equal(last[0], 'exp');
    assert.ok(Math.abs(last[2] - (note.at + 0.5)) < 1e-9);
  });
});

describe('player', () => {
  it('waits for play before touching audio (browsers need a click first)', () => {
    assert.equal(ctx, null);
    assert.equal(player.playing, false);
  });

  it('plays each note at its time, slightly after pressing play', () => {
    player.play(timeline('q q h', '4/4', 60, ['bd']), {});
    advance(4.5);
    const starts = oscillators().map((s) => +(s.at.toFixed(2)));
    assert.deepEqual(starts, [0.08, 1.08, 2.08]);
  });

  it('adds the metronome on every beat', () => {
    player.play(timeline('h h', '4/4', 60, ['bd']), { metronome: true });
    advance(4.2);
    const clicks = oscillators().filter((s) => s.type === 'sine' && s.frequency > 1000);
    assert.equal(clicks.length, 4);
  });

  it('counts in for a bar, reporting each beat, then starts', () => {
    const counts = [];
    player.play(timeline('w', '4/4', 60, ['bd']), { countIn: true, onCount: (n) => counts.push(n) });
    advance(4.5);
    assert.deepEqual(counts, [1, 2, 3, 4, null]);
    const drum = oscillators().filter((s) => s.frequency === 140);
    assert.deepEqual(drum.map((s) => +(s.at.toFixed(2))), [4.08]);
  });

  it('reports each step as it sounds, for highlighting', () => {
    const steps = [];
    player.play(timeline('q qr h'), { onStep: (s) => steps.push([s.index, +ctx.currentTime.toFixed(2)]) });
    advance(0.5);
    assert.deepEqual(steps.map((s) => s[0]), [0]);
    advance(2);
    assert.deepEqual(steps.map((s) => s[0]), [0, 1, 2]);
    assert.ok(steps[1][1] >= 1.08 && steps[1][1] < 1.12, 'step 2 shows when it sounds, not when scheduled');
  });

  it('asks for each pass of a loop as it comes, and says when each one starts', () => {
    const asked = [];
    const started = [];
    player.play(timeline('w', '4/4', 60, ['clap']), {
      loop: true,
      next: (n) => { asked.push(n); return timeline('h h', '4/4', 60, n % 2 ? ['bd'] : ['sn']); },
      onPass: (n) => started.push([n, +ctx.currentTime.toFixed(2)]),
    });
    advance(12.5);
    assert.deepEqual(asked, [1, 2, 3]);
    assert.deepEqual(started.map(([n]) => n), [0, 1, 2, 3]);
    // each starts on its downbeat (passes are 4 s; the visual waits for its frame)
    started.forEach(([n, at]) => assert.ok(at >= 0.08 + 4 * n && at < 0.08 + 4 * n + 0.03, `pass ${n} at ${at}`));
    // odd passes are half notes on the bass drum: 4.08, 6.08, then 12.08 after pass 2's snare
    const bass = oscillators().filter((s) => s.type === 'sine' && s.frequency === 140).map((s) => +s.at.toFixed(2));
    assert.deepEqual(bass.slice(0, 3), [4.08, 6.08, 12.08]);
  });

  it('stops by itself at the end when not looping', () => {
    let stopped = 0;
    player.play(timeline('h h'), { onStop: () => stopped++ });
    advance(5);
    assert.equal(player.playing, false);
    assert.equal(stopped, 1);
  });

  it('stops on request: nothing more is scheduled', () => {
    let stopped = 0;
    player.play(timeline('q q q q'), { loop: true, onStop: () => stopped++ });
    advance(1.5);
    player.stop();
    const count = ctx.started.length;
    advance(5);
    assert.equal(ctx.started.length, count);
    assert.equal(stopped, 1);
    assert.equal(player.playing, false);
  });

  it('playing something new stops what was playing, in the same audio context', () => {
    const stops = [];
    player.play(timeline('q q q q'), { loop: true, onStop: () => stops.push('first') });
    const first = ctx;
    advance(0.5);
    player.play(timeline('h h'), { loop: true, onStop: () => stops.push('second') });
    assert.deepEqual(stops, ['first']);
    assert.equal(player.playing, true);
    assert.equal(ctx, first, 'browsers allow only a few');
  });
});
