/**
 * Timelines: what to play and when, in seconds — what the player
 * (audio/player.js) plays. One for rhythms, one for chords, one for tunes.
 *
 * @module audio/timeline
 */
import { QUARTER } from '../music/rhythm.js';

/**
 * @typedef {object} Timeline  one pass of something to play
 * @property {Array<object>} notes  { at, sounds, accent, chord? }: `sounds` are
 *   names from SOUNDS (audio/sounds.js); a `chord` is { instrument, notes, length }
 *   with notes as MIDI numbers and length in seconds
 * @property {Array<object>} clicks  the metronome: { at, accent, beat }
 * @property {Array<object>} steps  { at, voice, index }: what's sounding when, to light it up
 * @property {number} length  seconds a pass lasts
 * @property {number} barLength  seconds a bar lasts, which is how long the count-in is
 * @property {Array<object>} countIn  the clicks that count it in
 */

const byTime = (a, b) => a.at - b.at;

/**
 * A rhythm, or several played together (a drum part's hands and feet).
 * @param {Object<string, Rhythm>} voices  { name: rhythm }, all the same length
 * @param {object} [options]
 * @param {number} [options.bpm=80]  counts the beat: ♩ in 4/4, ♩. in 6/8
 * @param {boolean} [options.swing]  play pairs of eighths long-short, like triplets
 * @returns {Timeline}  notes skip rests and tied notes; the metronome clicks every
 *   beat (every eighth in compound time); every event, rests too, is a step
 */
export function rhythmTimeline(voices, options = {}) {
  const names = Object.keys(voices);
  const first = voices[names[0]];
  const time = first.time;
  const secondsPerTick = 60 / (options.bpm || 80) / time.beatTicks;
  const swing = options.swing && !time.compound;
  // swung, every "&" lands on the third triplet of its beat
  const at = (tick) => (swing && tick % QUARTER === 12 ? tick + 4 : tick) * secondsPerTick;

  const notes = [];
  const steps = [];
  for (const name of names) {
    const rhythm = voices[name];
    if (rhythm.totalTicks !== first.totalTicks) throw new Error('Voices have different lengths');
    for (const ev of rhythm.events) {
      steps.push({ at: at(ev.start), voice: name, index: ev.index });
      if (ev.rest || ev.tieEnd) continue;
      notes.push({ at: at(ev.start), voice: name, index: ev.index, sounds: ev.sounds, accent: ev.start % time.barTicks === 0 });
    }
  }

  const clickTicks = time.compound ? time.unitTicks : time.beatTicks;
  const clicks = [];
  for (let tick = 0; tick < first.totalTicks; tick += clickTicks) {
    clicks.push({ at: tick * secondsPerTick, accent: tick % time.barTicks === 0, beat: tick % time.beatTicks === 0 });
  }
  const barLength = time.barTicks * secondsPerTick;
  return {
    notes: notes.sort(byTime),
    clicks,
    steps: steps.sort(byTime),
    length: first.totalTicks * secondsPerTick,
    barLength,
    countIn: clicks.filter((c) => c.at < barLength),
  };
}

/**
 * A chord progression, a bar of 4/4 per chord.
 * @param {number[][]} chords  each chord's MIDI notes
 * @param {object} options
 * @param {string} options.instrument  'guitar' or 'piano'
 * @param {number} [options.bpm=80]
 * @param {string} [options.strum='bar']  'bar': once a bar, left to ring; 'beats': on every beat
 * @returns {Timeline}  a step per chord ({ voice: 'chords', index })
 */
export function chordTimeline(chords, { instrument, bpm = 80, strum = 'bar' }) {
  const beat = 60 / bpm;
  const bar = beat * 4;
  const notes = [];
  const clicks = [];
  const steps = [];
  chords.forEach((chord, i) => {
    const start = i * bar;
    steps.push({ at: start, voice: 'chords', index: i });
    for (let b = 0; b < 4; b++) {
      clicks.push({ at: start + b * beat, accent: b === 0, beat: true });
      if (strum === 'beats' || b === 0) {
        const length = strum === 'beats' ? beat * 0.95 : bar; // on every beat, damped before the next
        notes.push({ at: start + b * beat, sounds: [], accent: b === 0, chord: { instrument, notes: chord, length } });
      }
    }
  });
  return { notes, clicks, steps, length: chords.length * bar, barLength: bar, countIn: clicks.slice(0, 4) };
}

/**
 * A tune on piano, one note a beat: a staff played back, or a pattern to sing.
 * There's no metronome (clicks over singing only get in the way), but there
 * is a bar of four to count in with.
 * @param {number[]} midis
 * @param {object} [options]
 * @param {number} [options.bpm=80]
 * @param {number} [options.group=1]  notes in a group; each group starts with an accent
 * @param {boolean} [options.echo]  after each group, as many beats of silence, to sing it back
 * @param {number} [options.gate=0.95]  how much of its beat a note lasts
 * @returns {Timeline}  a step per note ({ voice: 'notes', index })
 */
export function melodyTimeline(midis, { bpm = 80, group = 1, echo = false, gate = 0.95 } = {}) {
  const beat = 60 / bpm;
  const notes = [];
  const steps = [];
  let t = 0;
  midis.forEach((midi, i) => {
    notes.push({ at: t, sounds: [], accent: i % group === 0, chord: { instrument: 'piano', notes: [midi], length: beat * gate } });
    steps.push({ at: t, voice: 'notes', index: i });
    t += beat;
    const groupEnds = i % group === group - 1 || i === midis.length - 1;
    if (echo && groupEnds) t += (i % group + 1) * beat;
  });
  const countIn = [0, 1, 2, 3].map((b) => ({ at: b * beat, accent: b === 0, beat: true }));
  return { notes, clicks: [], steps, length: t, barLength: 4 * beat, countIn };
}
