/**
 * Rhythms as data. A rhythm is written as a line of tokens, one per note or rest:
 *
 *     w h q e s     whole, half, quarter, eighth, sixteenth note
 *     q.            dotted (half as long again)
 *     qr  e.r       rests: add r
 *     q_  h_        silence that isn't drawn: a gap in one voice of a drum
 *                   part, where a rest would only clutter the staff
 *     [e e e]       triplet: three in the time of two
 *     ~             tie: the note before is held into the next one
 *     |             bar line (each bar must add up)
 *     e:hh+sn       which sounds play (drums: hh hi-hat, sn snare, bd bass drum)
 *
 * Time is counted in ticks: a quarter note is 24, so triplets and sixteenths
 * are whole numbers.
 *
 * @example
 * parseRhythm('q q e e q', '4/4')       // one bar of 4/4
 * parseRhythm('h q | q. e h', '3/4')    // throws: the second bar lasts 4 beats
 *
 * @module music/rhythm
 */
import { words } from '../lib/text.js';

export const QUARTER = 24;
export const LENGTHS = { w: 96, h: 48, q: 24, e: 12, s: 6 };
export const NAMES = { w: 'whole', h: 'half', q: 'quarter', e: 'eighth', s: 'sixteenth' };

/* ---------- time signatures ---------- */

/**
 * @typedef {object} Time
 * @property {string} text  '6/8'
 * @property {number} beats  6
 * @property {number} unit  8
 * @property {number} unitTicks  ticks in one `unit` note
 * @property {number} barTicks
 * @property {boolean} compound  eighths grouped in threes (6/8, 9/8, 12/8)
 * @property {number} beatTicks  the beat you count and tap: a quarter in 4/4, a dotted quarter in 6/8
 * @property {number} pulses  beats a bar: 4 in 4/4, 2 in 6/8
 */

/** parseTime('6/8') → { beats: 6, unit: 8, compound: true, pulses: 2, … } */
export function parseTime(text) {
  const m = /^(\d+)\/(1|2|4|8|16)$/.exec(String(text).trim());
  if (!m) throw new Error('Not a time signature: ' + text);
  const beats = Number(m[1]);
  const unit = Number(m[2]);
  if (beats < 1) throw new Error('Not a time signature: ' + text);
  const unitTicks = (QUARTER * 4) / unit;
  const compound = unit === 8 && beats % 3 === 0 && beats > 3;
  const beatTicks = compound ? unitTicks * 3 : unitTicks;
  return {
    text: beats + '/' + unit,
    beats,
    unit,
    unitTicks,
    barTicks: beats * unitTicks,
    compound,
    beatTicks,
    pulses: (beats * unitTicks) / beatTicks,
  };
}

/** The note the tempo counts, printed: ♩ in 4/4, ♩. in 6/8, 𝅗𝅥 in 2/2, ♪ in 3/8 */
export function beatNote(time) {
  return time.compound ? '♩.' : time.unit === 2 ? '𝅗𝅥' : time.unit === 8 ? '♪' : '♩';
}

/* ---------- reading rhythms ---------- */

/**
 * @typedef {object} RhythmEvent  one note or rest
 * @property {number} index
 * @property {number} start  ticks from the beginning
 * @property {number} length  ticks
 * @property {string} value  'w', 'h', 'q', 'e' or 's'
 * @property {boolean} dotted
 * @property {boolean} rest
 * @property {boolean} hidden  a rest that isn't drawn (q_)
 * @property {number|null} tuplet  which triplet it's in, if any
 * @property {boolean} tieStart  held into the next note
 * @property {boolean} tieEnd  held from the note before: not struck again
 * @property {string[]} sounds
 * @property {number} bar
 */

/**
 * @typedef {object} Rhythm
 * @property {Time} time
 * @property {RhythmEvent[]} events
 * @property {number} bars
 * @property {number} totalTicks
 */

const TOKEN = /^([whqes])(\.?)([r_]?)(?::([a-z]+(?:\+[a-z]+)*))?$/;

/**
 * Reads a rhythm, checking that every bar adds up.
 * @param {string} text
 * @param {Time|string} time
 * @param {string[]} [defaultSounds=['clap']]  for notes that don't say
 * @returns {Rhythm}
 */
export function parseRhythm(text, time, defaultSounds = ['clap']) {
  return read(text, typeof time === 'string' ? parseTime(time) : time, defaultSounds);
}

/** The notes and rests of a fragment, its bars unchecked: readNotes('[e er e]') */
export function readNotes(text) {
  return read(text, null, []).events;
}

// With a `time`, each bar is checked as soon as it ends.
function read(text, time, defaultSounds) {
  const events = [];
  let tick = 0;
  let bar = 0;
  let barStart = 0;
  let tuplet = null; // { id, start } while inside [ ]
  let tuplets = 0;
  let tieNext = false;

  function closeBar() {
    const length = tick - barStart;
    if (time && length !== time.barTicks) {
      throw new Error(`Bar ${bar + 1} of "${text}" lasts ${beatsText(length, time)}, but ${time.text} needs ${beatsText(time.barTicks, time)}`);
    }
    bar++;
    barStart = tick;
  }

  for (const token of words(String(text).replace(/([[\]|~])/g, ' $1 '))) {
    if (token === '[') {
      if (tuplet) throw new Error('Triplets can\'t be nested: ' + text);
      tuplet = { id: tuplets++, start: events.length };
    } else if (token === ']') {
      if (!tuplet) throw new Error('"]" without "[" in: ' + text);
      const inside = events.slice(tuplet.start);
      if (inside.length === 0) throw new Error('Empty triplet in: ' + text);
      // it has to fill a whole number of half beats: [e e e], [q q q], [e q]
      const total = inside.reduce((sum, ev) => sum + ev.length, 0);
      if (total % (QUARTER / 2) !== 0) throw new Error('A triplet must add up to a whole beat or half beat: ' + text);
      tuplet = null;
    } else if (token === '~') {
      const last = events[events.length - 1];
      if (!last || last.rest) throw new Error('A tie needs a note before it: ' + text);
      last.tieStart = true;
      tieNext = true;
    } else if (token === '|') {
      if (tuplet) throw new Error('Bar line inside a triplet: ' + text);
      closeBar();
    } else {
      const m = TOKEN.exec(token);
      if (!m) throw new Error('Don\'t understand "' + token + '" in: ' + text);
      const [, value, dot, restMark, sounds] = m;
      const rest = restMark !== '';
      const length = LENGTHS[value] * (dot ? 1.5 : 1) * (tuplet ? 2 / 3 : 1);
      if (tieNext && rest) throw new Error('A tie can\'t end on a rest: ' + text);
      events.push({
        index: events.length,
        start: tick,
        length,
        value,
        dotted: dot === '.',
        rest,
        hidden: restMark === '_',
        tuplet: tuplet ? tuplet.id : null,
        tieStart: false,
        tieEnd: tieNext,
        sounds: rest ? [] : sounds ? sounds.split('+') : defaultSounds.slice(),
        bar,
      });
      tieNext = false;
      tick += length;
    }
  }

  if (tuplet) throw new Error('"[" without "]" in: ' + text);
  if (tieNext) throw new Error('A tie needs a note after it: ' + text);
  if (events.length === 0) throw new Error('Empty rhythm');
  if (tick > barStart) closeBar();
  return { time, events, bars: bar, totalTicks: tick };
}

function beatsText(ticks, time) {
  const beats = ticks / time.unitTicks;
  const unit = { 1: 'whole', 2: 'half', 4: 'quarter', 8: 'eighth', 16: 'sixteenth' }[time.unit];
  return (Math.round(beats * 100) / 100) + ' ' + unit + (beats === 1 ? '' : 's');
}

/* ---------- counting ---------- */

/**
 * How a tick is counted out loud: '1', 'e', '&', 'a', 'trip', 'let'.
 * Compound time counts '1 & a 2 & a' (each beat split in three).
 */
export function countAt(tick, time) {
  const inBar = tick % time.barTicks;
  const beat = Math.floor(inBar / time.beatTicks);
  const offset = inBar % time.beatTicks;
  if (offset === 0) return String(beat + 1);
  const fraction = offset / time.beatTicks;
  const names = time.compound
    ? { '0.333': '&', '0.667': 'a', '0.167': 'e', '0.5': 'e', '0.833': 'e' }
    : { '0.25': 'e', '0.5': '&', '0.75': 'a', '0.333': 'trip', '0.667': 'let' };
  return names[fraction.toFixed(3).replace(/0+$/, '')] || '';
}

/**
 * What to say for each event of a rhythm. A triplet is counted against its own
 * group ('1 trip let', or '3 trip let' for quarter-note triplets starting on 3),
 * by where each note falls in it — so the eighth in [q e] is 'let'; everything
 * else by where it falls in the beat.
 * @param {Rhythm} rhythm
 * @returns {string[]}
 */
export function counts(rhythm) {
  const groups = {}; // tuplet id -> { start, ticks, slot }
  for (const ev of rhythm.events) {
    if (ev.tuplet === null) continue;
    const g = groups[ev.tuplet] = groups[ev.tuplet] || { start: ev.start, ticks: 0 };
    g.ticks += ev.length;
  }
  for (const [id, g] of Object.entries(groups)) {
    // the group's three slots, or eighth-triplet slots for a longer group
    const third = g.ticks / 3;
    const fits = rhythm.events.every((ev) => String(ev.tuplet) !== id || (ev.start - g.start) % third === 0);
    g.slot = fits ? third : QUARTER / 3;
  }
  return rhythm.events.map((ev) => {
    if (ev.tuplet === null) return countAt(ev.start, rhythm.time);
    const g = groups[ev.tuplet];
    const k = Math.round((ev.start - g.start) / g.slot) % 3;
    if (k === 0) return countAt(ev.start, rhythm.time);
    return k === 1 ? 'trip' : 'let';
  });
}

/** Is this tick on a beat (rather than between beats)? */
export function onBeat(tick, time) {
  return (tick % time.barTicks) % time.beatTicks === 0;
}

/* ---------- engraving ---------- */

/**
 * Which notes share a beam: eighths and shorter in a row, within one beat (or
 * one triplet), not broken by rests. A group of one gets a flag instead.
 * @returns {number[][]} event indexes, group by group
 */
export function beamGroups(events, time) {
  const groups = [];
  let current = [];
  let currentKey = null;
  const flush = () => {
    if (current.length) groups.push(current);
    current = [];
    currentKey = null;
  };
  for (const ev of events) {
    const beamable = !ev.rest && (ev.value === 'e' || ev.value === 's');
    if (!beamable) {
      flush();
      continue;
    }
    const key = ev.tuplet !== null ? 't' + ev.tuplet : 'b' + ev.bar + ':' + Math.floor((ev.start % time.barTicks) / time.beatTicks);
    if (key !== currentKey) flush();
    currentKey = key;
    current.push(ev.index);
  }
  flush();
  return groups;
}
