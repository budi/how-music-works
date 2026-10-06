/**
 * Made-up rhythms to sight-read.
 *
 * A bar is filled a beat at a time from small cells that the rhythms on the
 * page are made of (q, e e, [e e e], …), so what comes out is always something
 * already taught. Cells two beats long only start on a strong beat, which keeps
 * the notation easy to read.
 *
 * Levels: 1 quarters, halves, eighths · 2 adds off-beats, dots and triplets
 * (some with a rest or a quarter in them) · 3 adds sixteenths, syncopation and
 * triplets that start or end on a rest.
 *
 * Swung, eighths are played long–short (see audio/timeline.js), so the cells
 * change: no sixteenths, and no triplets that would sound just like a swung
 * pair; level 3 adds ties and quarter-note triplets instead. Only simple time
 * swings: 6/8 already splits its beat in three.
 *
 * @example
 * randomBars('4/4', 4, 2)                    // e.g. 'q e e [e e e] q | h q. e | …'
 * randomBars('4/4', 4, 3, { swing: true })   // e.g. 'e q e e e~ q | …'
 *
 * @module music/random-rhythm
 */
import { parseTime, readNotes } from './rhythm.js';
import { pickWeighted } from '../lib/random.js';

export const LEVELS = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

// text, beats it lasts, level it starts at, how often it comes up
const SIMPLE = [
  { text: 'q', beats: 1, level: 1, weight: 5 },
  { text: 'qr', beats: 1, level: 1, weight: 1 },
  { text: 'e e', beats: 1, level: 1, weight: 3 },
  { text: 'h', beats: 2, level: 1, weight: 2 },
  { text: 'er e', beats: 1, level: 2, weight: 2 },
  { text: 'e er', beats: 1, level: 2, weight: 1 },
  { text: '[e e e]', beats: 1, level: 2, weight: 2 },
  { text: '[e er e]', beats: 1, level: 2, weight: 1 },
  { text: '[q e]', beats: 1, level: 2, weight: 1 },
  { text: 'q. e', beats: 2, level: 2, weight: 2 },
  { text: 's s s s', beats: 1, level: 3, weight: 2 },
  { text: 'e s s', beats: 1, level: 3, weight: 2 },
  { text: 's s e', beats: 1, level: 3, weight: 2 },
  { text: 'e. s', beats: 1, level: 3, weight: 2 },
  { text: 'e q e', beats: 2, level: 3, weight: 2 },
  { text: '[er e e]', beats: 1, level: 3, weight: 1 },
  { text: '[e e er]', beats: 1, level: 3, weight: 1 },
  { text: '[er e er]', beats: 1, level: 3, weight: 1 },
  { text: '[e q]', beats: 1, level: 3, weight: 1 },
];

// simple time, swung
const SWING = [
  { text: 'q', beats: 1, level: 1, weight: 4 },
  { text: 'qr', beats: 1, level: 1, weight: 1 },
  { text: 'e e', beats: 1, level: 1, weight: 4 },
  { text: 'h', beats: 2, level: 1, weight: 2 },
  { text: 'er e', beats: 1, level: 2, weight: 3 },
  { text: 'e er', beats: 1, level: 2, weight: 1 },
  { text: 'q. e', beats: 2, level: 2, weight: 2 },
  { text: '[e e e]', beats: 1, level: 2, weight: 2 },
  { text: 'e q e', beats: 2, level: 3, weight: 5 },
  { text: 'er q e', beats: 2, level: 3, weight: 2 },
  { text: 'e e~ q', beats: 2, level: 3, weight: 4 },
  { text: '[q q q]', beats: 2, level: 3, weight: 2 },
  { text: '[er e e]', beats: 1, level: 3, weight: 3 },
];

// compound time: a beat is three eighths
const COMPOUND = [
  { text: 'q.', beats: 1, level: 1, weight: 4 },
  { text: 'e e e', beats: 1, level: 1, weight: 3 },
  { text: 'q e', beats: 1, level: 1, weight: 3 },
  { text: 'h.', beats: 2, level: 1, weight: 1 },
  { text: 'e q', beats: 1, level: 2, weight: 2 },
  { text: 'q.r', beats: 1, level: 2, weight: 1 },
  { text: 'er e e', beats: 1, level: 2, weight: 1 },
  { text: 'e er e', beats: 1, level: 2, weight: 1 },
  { text: 's s e e', beats: 1, level: 3, weight: 2 },
  { text: 'e s s e', beats: 1, level: 3, weight: 1 },
  { text: 'e e s s', beats: 1, level: 3, weight: 1 },
  { text: 'e. s e', beats: 1, level: 3, weight: 2 },
];

function cells(time, level, swing) {
  return (time.compound ? COMPOUND : swing ? SWING : SIMPLE).filter((c) => c.level <= level);
}

const startsWithRest = (cell) => /^\[?[whqes]\.?r/.test(cell.text);
const allRests = (bar) => bar.every((c) => readNotes(c.text).every((e) => e.rest));

// one bar; the first bar starts on a note, so the line has somewhere to begin
function bar(time, pool, first, random) {
  for (;;) {
    const chosen = [];
    let beat = 0;
    while (beat < time.pulses) {
      const left = time.pulses - beat;
      const fits = pool.filter((c) => {
        if (c.beats > left) return false;
        if (c.beats > 1 && beat % 2 !== 0) return false; // long cells start on a strong beat
        return !(first && beat === 0 && startsWithRest(c));
      });
      const cell = pickWeighted(fits, random);
      chosen.push(cell);
      beat += cell.beats;
    }
    if (!allRests(chosen)) return chosen.map((c) => c.text).join(' ');
  }
}

/**
 * `count` bars of `timeText` at `level` (1–3), as one rhythm line.
 * @param {string} timeText  '4/4', '3/4' or '6/8' (any x/4, or compound time)
 * @param {number} count
 * @param {number} level  out of range: the nearest level
 * @param {object} [options]
 * @param {boolean} [options.swing]  cells for swung eighths; compound time ignores it
 * @param {function} [options.random]  () → [0, 1); pass your own to get the same bars every time
 * @returns {string}
 */
export function randomBars(timeText, count, level, { swing = false, random = Math.random } = {}) {
  const time = parseTime(timeText);
  if (time.unit !== 4 && !time.compound) throw new Error('No random rhythms in ' + time.text + ' yet');
  const pool = cells(time, Math.min(3, Math.max(1, Number(level) || 1)), swing);
  const out = [];
  for (let i = 0; i < count; i++) out.push(bar(time, pool, i === 0, random));
  return out.join(' | ');
}

/**
 * The shortest notes a level can give, plain and in triplets (ticks), so
 * every rhythm at that level can be drawn with the same spacing. Takes the
 * same options as randomBars.
 * @returns {{plain: number, triplet: number}}
 */
export function shortestNotes(timeText, level, { swing = false } = {}) {
  const out = { plain: Infinity, triplet: Infinity };
  for (const cell of cells(parseTime(timeText), level, swing)) {
    for (const ev of readNotes(cell.text)) {
      if (ev.tuplet === null) out.plain = Math.min(out.plain, ev.length);
      else out.triplet = Math.min(out.triplet, ev.length);
    }
  }
  return out;
}
