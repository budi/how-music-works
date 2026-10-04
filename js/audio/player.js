/**
 * Plays timelines (audio/timeline.js) with the sounds and instruments made here.
 *
 * Sounds are scheduled a little ahead on the audio clock rather than with
 * timers, so the beat stays steady even when the page is busy. The visual
 * callbacks (onStep, onCount, onPass) fire when their moment actually comes.
 *
 * @example
 * const player = createPlayer();
 * player.play(timeline, { loop: true, countIn: true, metronome: true, onStep(step) { … } });
 * player.stop();
 *
 * @module audio/player
 */
import { SOUNDS } from './sounds.js';
import { INSTRUMENTS, strum } from './instruments.js';

const LOOKAHEAD = 0.15; // seconds of sound scheduled in advance
const INTERVAL = 25; // ms between scheduling passes
const LEAD_IN = 0.08; // seconds between pressing play and the first sound

function defaultContext() {
  const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Context) throw new Error('This browser can\'t play sound (no Web Audio).');
  return new Context();
}

const byTime = (a, b) => a.at - b.at;

/**
 * @typedef {object} PlayOptions
 * @property {boolean} [loop]
 * @property {boolean} [countIn]  a bar of clicks first
 * @property {boolean} [metronome]  click along
 * @property {function(number): Timeline} [next]  the timeline for pass n (1, 2, …) of
 *   a loop, asked for just before it's scheduled — so a loop can change as it goes
 * @property {function(number)} [onPass]  pass n starts to sound (0 is the first)
 * @property {function(object)} [onStep]  a step of the timeline is sounding
 * @property {function(?number)} [onCount]  count-in beat n; null once it's over
 * @property {function()} [onStop]  stopped: at the end, by stop(), or by playing something else
 */

/**
 * A player. Nothing touches audio until the first sound, as browsers want a
 * click first; after that it keeps one audio context.
 * @param {object} [options]  for tests: { createContext, setTimer, clearTimer, frame }
 *   to swap in a fake audio context and clock
 */
export function createPlayer(options = {}) {
  const createContext = options.createContext || defaultContext;
  const setTimer = options.setTimer || ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = options.clearTimer || ((id) => clearTimeout(id));
  const frame = options.frame || ((fn) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : setTimeout(fn, 16)));

  let ctx = null;
  let out = null;
  let session = null; // what's playing right now

  function context() {
    if (!ctx) {
      ctx = createContext();
      out = ctx.createGain();
      out.gain.value = 0.8;
      out.connect(ctx.destination);
    }
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    return ctx;
  }

  function check(timeline) {
    for (const note of timeline.notes) {
      for (const name of note.sounds) {
        if (!SOUNDS[name]) throw new Error('No sound called "' + name + '"');
      }
      if (note.chord && !INSTRUMENTS[note.chord.instrument]) {
        throw new Error('No instrument called "' + note.chord.instrument + '"');
      }
    }
  }

  /**
   * Plays a timeline, stopping whatever was playing.
   * @param {Timeline} timeline
   * @param {PlayOptions} [opts]
   */
  function play(timeline, opts) {
    check(timeline);
    stop();
    opts = opts || {};
    const c = context();
    const start = c.currentTime + LEAD_IN;
    const s = session = {
      timeline,
      opts,
      queue: [], // sounds still to schedule: { at, run }
      visuals: [], // callbacks still to fire: { at, run }
      pass: 0,
      nextStart: start + (opts.countIn ? timeline.barLength : 0), // when the next pass to schedule begins
      timer: null,
      ended: false,
    };

    if (opts.countIn) {
      let beats = 0;
      for (const click of timeline.countIn) {
        const at = start + click.at;
        s.queue.push({ at, run: () => SOUNDS.click(c, out, at, click.accent) });
        if (click.beat) {
          const n = ++beats;
          s.visuals.push({ at, run: () => { if (opts.onCount) opts.onCount(n); } });
        }
      }
    }
    addPass(s);
    schedule(s);
    draw(s);
  }

  // queue one more pass of the timeline
  function addPass(s) {
    const n = s.pass;
    const first = n === 0;
    if (!first && s.opts.next) s.timeline = s.opts.next(n);
    const t = s.timeline;
    const base = s.nextStart;
    for (const note of t.notes) {
      const at = base + note.at;
      s.queue.push({ at, run: () => {
        for (const name of note.sounds) SOUNDS[name](ctx, out, at, note.accent);
        if (note.chord) strum(ctx, out, at, note.chord, note.accent);
      } });
    }
    if (s.opts.metronome) {
      for (const click of t.clicks) {
        const at = base + click.at;
        s.queue.push({ at, run: () => SOUNDS.click(ctx, out, at, click.accent) });
      }
    }
    for (const step of t.steps) {
      s.visuals.push({ at: base + step.at, run: () => { if (s.opts.onStep) s.opts.onStep(step); } });
    }
    if (s.opts.onPass) s.visuals.push({ at: base, run: () => s.opts.onPass(n) });
    if (first && s.opts.onCount) s.visuals.push({ at: base, run: () => s.opts.onCount(null) }); // count-in over
    s.queue.sort(byTime);
    s.visuals.sort(byTime);
    s.pass++;
    s.nextStart = base + t.length;
  }

  function schedule(s) {
    if (session !== s) return;
    const horizon = ctx.currentTime + LOOKAHEAD;
    if (s.opts.loop && s.nextStart < horizon + LOOKAHEAD) addPass(s);
    while (s.queue.length && s.queue[0].at < horizon) s.queue.shift().run();
    if (!s.opts.loop && !s.queue.length && ctx.currentTime >= s.nextStart) {
      finish(s);
      return;
    }
    s.timer = setTimer(() => schedule(s), INTERVAL);
  }

  function draw(s) {
    if (session !== s) return;
    const now = ctx.currentTime;
    while (s.visuals.length && s.visuals[0].at <= now) s.visuals.shift().run();
    frame(() => draw(s));
  }

  function finish(s) {
    if (s.ended) return;
    s.ended = true;
    if (s.timer !== null) clearTimer(s.timer);
    if (session === s) session = null;
    if (s.opts.onStop) s.opts.onStop();
  }

  function stop() {
    if (session) finish(session);
  }

  return {
    play,
    stop,
    get playing() {
      return session !== null;
    },
    /** One sound, now: hit('sn') — for "what does a snare sound like?" buttons. */
    hit(name) {
      const c = context();
      SOUNDS[name](c, out, c.currentTime + 0.01, true);
    },
    /** One chord, now: strum('guitar', [40, 47, 52, 56, 59, 64]) (MIDI notes). */
    strum(instrument, notes) {
      if (!INSTRUMENTS[instrument]) throw new Error('No instrument called "' + instrument + '"');
      const c = context();
      strum(c, out, c.currentTime + 0.01, { instrument, notes }, true);
    },
  };
}

let shared = null;

/**
 * The page's one player, made on first use. Everything on a page plays
 * through it, so starting one thing stops whatever else was playing.
 */
export function sharedPlayer() {
  if (!shared) shared = createPlayer();
  return shared;
}
