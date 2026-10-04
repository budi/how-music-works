/**
 * Rhythms (music/rhythm.js) drawn as notation: on a single line, or as a
 * drum part on a five-line staff.
 *
 * Every note or rest is a `<g class="ev" data-voice data-i>`, and every count
 * a `<text class="count" data-voice data-i>`, so a player can light up what's
 * sounding. Colours come from CSS. Sizes are in staff spaces.
 *
 * @module draw/notation
 */
import { NAMES, QUARTER, beamGroups, counts, onBeat } from '../music/rhythm.js';
import { ANCHORS, ENGRAVING as E, GLYPHS } from './glyphs.js';
import { SCALE, barline, glyph, glyphWidth, staffLines } from './engraving.js';
import { el, escape, num, rect, svg } from '../lib/svg.js';

const STEM = 3.5; // stem length
const PAD = 0.8; // space between a bar line and the first note
const BAR_GAP = 1.6; // extra room around a bar line between two bars
const HEAD_W = GLYPHS.noteheadBlack.bbox[2] * SCALE;

/** Where each drum sits on the five-line staff (y: 0 is the middle line, + is down), and its note head. */
export const DRUMS = {
  hh: { y: -2.5, head: 'noteheadXBlack', name: 'hi-hat' },
  ride: { y: -2, head: 'noteheadXBlack', name: 'ride' },
  sn: { y: -0.5, head: 'noteheadBlack', name: 'snare' },
  bd: { y: 1.5, head: 'noteheadBlack', name: 'bass drum' },
  rim: { y: -0.5, head: 'noteheadXBlack', name: 'cross-stick' }, // the snare's space, with an ×
};

const HEADS = { w: 'noteheadWhole', h: 'noteheadHalf', q: 'noteheadBlack', e: 'noteheadBlack', s: 'noteheadBlack' };
const RESTS = { w: 'restWhole', h: 'restHalf', q: 'restQuarter', e: 'rest8th', s: 'rest16th' };
const FLAGS = { e: '8th', s: '16th' };

/**
 * @typedef {object} ScoreOptions
 * @property {boolean} [count]  write the counting ("1 e & a") under the notes
 * @property {{plain: number, triplet: number}} [space]  leave room for notes
 *   this short (in ticks), even if there are none, so scores side by side line up
 * @property {boolean} [timeSignature=true]  false for a score that carries on
 *   from the one before
 * @property {string} [voice='main']  drawRhythm only: the data-voice of its notes
 */

/**
 * A rhythm on a single line.
 * @param {Rhythm} rhythm
 * @param {ScoreOptions} [options]
 * @returns {string} SVG
 */
export function drawRhythm(rhythm, options = {}) {
  const voice = options.voice || 'main';
  return draw({ [voice]: rhythm }, { lines: 1, dirs: { [voice]: 'up' } }, options);
}

/**
 * A drum part on a five-line staff.
 * @param {object} voices
 * @param {Rhythm} voices.up  the hands: hi-hat and snare, stems up
 * @param {Rhythm} [voices.down]  the feet: bass drum, stems down
 * @param {ScoreOptions} [options]
 * @returns {string} SVG
 */
export function drawDrums(voices, options = {}) {
  const dirs = {};
  if (voices.up) dirs.up = 'up';
  if (voices.down) dirs.down = 'down';
  return draw(voices, { lines: 5, dirs, clef: true }, options);
}

/* ---------- layout ---------- */

function draw(voices, staff, options) {
  const names = Object.keys(voices);
  const first = voices[names[0]];
  const time = first.time;
  const single = staff.lines === 1;

  // horizontal: time is space, but notes are never closer than about 2.2
  // (2.8 in triplets, whose counts — "trip", "let" — are wider)
  let plain = options.space?.plain || Infinity;
  let triplet = options.space?.triplet || Infinity;
  for (const name of names) {
    for (const e of voices[name].events) {
      if (e.tuplet === null) plain = Math.min(plain, e.length);
      else triplet = Math.min(triplet, e.length);
    }
  }
  const perTick = Math.max(4 / QUARTER, 2.2 / plain, 2.8 / triplet);

  const showTime = options.timeSignature !== false;
  const left = (staff.clef ? 2.4 : 0.6) + (showTime ? timeSigWidth(time) + 1 : 0);
  const x = (tick) => {
    const barsBefore = Math.min(Math.floor(tick / time.barTicks), first.bars - 1);
    return left + PAD + tick * perTick + barsBefore * BAR_GAP;
  };
  const right = x(first.totalTicks) + 0.6; // room for a flag on the last note

  const half = single ? 0 : 2;
  const top = single ? -6 : -8;
  const countY = single ? 3 : 7;
  const bottom = options.count ? countY + 0.8 : countY - 1.2;

  const out = [];
  const lines = [];
  for (let l = -half; l <= half; l++) lines.push(l);
  out.push(staffLines(0.2, right, lines));
  const barTop = single ? -2 : -half;
  const barBottom = single ? 2 : half;
  for (let b = 1; b <= first.bars; b++) {
    const bx = b === first.bars ? right : x(b * time.barTicks) - BAR_GAP * 0.55;
    out.push(barline(bx - E.thinBarlineThickness, barTop, barBottom));
  }

  if (staff.clef) out.push(glyph('unpitchedPercussionClef1', 0.6, 0));
  if (showTime) out.push(timeSignature(time, staff.clef ? 2.4 : 0.6));

  for (const name of names) out.push(drawVoice(voices[name], name, staff.dirs[name] === 'up', single, x));

  if (options.count) {
    const countVoice = voices[names[0]];
    const labels = counts(countVoice);
    // a count is silent only if no voice plays then (hands rest, foot plays: not silent)
    const sounding = new Set();
    for (const name of names) {
      for (const e of voices[name].events) if (!e.rest) sounding.add(e.start);
    }
    for (const ev of countVoice.events) {
      const label = labels[ev.index];
      if (!label) continue;
      const cls = 'count' + (sounding.has(ev.start) ? '' : ' is-rest') + (onBeat(ev.start, time) ? ' is-beat' : '');
      out.push(el('text', { class: cls, 'data-voice': names[0], 'data-i': ev.index, x: x(ev.start) + HEAD_W / 2, y: countY }, escape(label)));
    }
  }

  const label = 'Rhythm in ' + time.text + ': ' + names.map((n) => describe(voices[n])).join('; ');
  return svg({ cls: 'score', viewBox: [0, top, right + 0.4, bottom - top], label }, out.join(''));
}

// 'quarter, triplet eighth, dotted half rest, …' for screen readers
function describe(rhythm) {
  return rhythm.events.filter((e) => !e.hidden).map((e) =>
    (e.tuplet !== null ? 'triplet ' : '') + (e.dotted ? 'dotted ' : '') + NAMES[e.value] + (e.rest ? ' rest' : '')).join(', ');
}

/* ---------- one voice: notes, rests, stems, flags, beams, dots, ties, triplets ---------- */

function drawVoice(rhythm, name, up, single, x) {
  const events = rhythm.events;
  const groups = beamGroups(events, rhythm.time);
  const groupOf = {};
  for (const g of groups) {
    if (g.length > 1) for (const i of g) groupOf[i] = g;
  }

  // note positions
  const info = events.map((ev) => {
    const ys = single ? [0] : ev.sounds.map((s) => {
      if (!DRUMS[s]) throw new Error('No place on the drum staff for "' + s + '"');
      return DRUMS[s].y;
    });
    return { ev, x: x(ev.start), ys, hi: Math.min(...ys), lo: Math.max(...ys) };
  });

  // each beam level, clear of every note under it
  const beamY = {};
  for (const g of groups) {
    if (g.length < 2) continue;
    const ys = g.map((i) => (up ? info[i].hi - STEM : info[i].lo + STEM));
    const y = up ? Math.min(...ys) : Math.max(...ys);
    for (const i of g) beamY[i] = y;
  }

  const out = [];
  const stems = {};

  for (const n of info) {
    const ev = n.ev;
    if (ev.hidden) continue; // a gap, not a rest: nothing to draw
    const parts = [];
    if (ev.rest) {
      const ry = single ? 0 : up ? -1 : 2; // on a line, clear of the snare
      parts.push(glyph(RESTS[ev.value], n.x, ry));
      if (ev.dotted) parts.push(glyph('augmentationDot', n.x + glyphWidth(RESTS[ev.value]) + 0.3, ry - 0.5));
    } else {
      const headOf = (sound) => (single || ev.value === 'w' || ev.value === 'h' ? HEADS[ev.value] : DRUMS[sound].head);
      const sounds = single ? ['clap'] : ev.sounds;
      sounds.forEach((sound, k) => {
        const hy = n.ys[k];
        parts.push(glyph(headOf(sound), n.x, hy));
        if (ev.dotted) {
          const dy = Math.abs(hy % 1) < 0.01 ? hy - 0.5 : hy; // a dot never sits on a line
          parts.push(glyph('augmentationDot', n.x + glyphWidth(headOf(sound)) + 0.3, dy));
        }
      });

      if (ev.value !== 'w') {
        const head = headOf(sounds[0]);
        const a = up ? ANCHORS[head].stemUpSE : ANCHORS[head].stemDownNW;
        const sx = up ? n.x + a[0] - E.stemThickness : n.x + a[0];
        const from = up ? n.lo - a[1] : n.hi - a[1];
        const to = beamY[ev.index] !== undefined ? beamY[ev.index] : up ? n.hi - STEM : n.lo + STEM;
        stems[ev.index] = { x: sx, end: to };
        parts.push(rect(sx, Math.min(from, to), E.stemThickness, Math.abs(to - from), 'stem'));

        if (FLAGS[ev.value] && !groupOf[ev.index]) {
          const flag = 'flag' + FLAGS[ev.value] + (up ? 'Up' : 'Down');
          const fa = up ? ANCHORS[flag].stemUpNW : ANCHORS[flag].stemDownSW;
          parts.push(glyph(flag, sx - fa[0], to + fa[1]));
        }
      }
    }
    out.push(el('g', { class: 'ev', 'data-voice': name, 'data-i': ev.index }, parts.join('')));
  }

  // beams
  for (const g of groups) {
    if (g.length < 2) continue;
    const y = beamY[g[0]];
    const thick = E.beamThickness;
    const x1 = stems[g[0]].x;
    const x2 = stems[g[g.length - 1]].x + E.stemThickness;
    out.push(rect(x1, up ? y : y - thick, x2 - x1, thick, 'beam'));

    // a second beam over each run of sixteenths, or a stub for a lone one
    const y2 = up ? y + thick + E.beamSpacing : y - 2 * thick - E.beamSpacing;
    const runs = [];
    g.forEach((i, k) => {
      if (events[i].value !== 's') return;
      const run = runs[runs.length - 1];
      if (run && run.end === k - 1) run.end = k;
      else runs.push({ start: k, end: k });
    });
    for (const run of runs) {
      const a = stems[g[run.start]];
      const b = stems[g[run.end]];
      if (run.end > run.start) {
        out.push(rect(a.x, y2, b.x + E.stemThickness - a.x, thick, 'beam'));
        continue;
      }
      const stub = 1.1; // points into the beat: left from the last note, right otherwise
      out.push(rect(run.start === g.length - 1 ? a.x + E.stemThickness - stub : a.x, y2, stub, thick, 'beam'));
    }
  }

  // ties, on the far side from the stems
  info.forEach((n, i) => {
    if (!n.ev.tieStart) return;
    const next = info[i + 1];
    const x1 = n.x + glyphWidth(HEADS[n.ev.value]) * 0.75;
    const x2 = next.x + HEAD_W * 0.25;
    const y = up ? n.lo + 0.55 : n.hi - 0.55;
    const bend = up ? 1 : -1;
    const mid = num((x1 + x2) / 2);
    out.push(el('path', {
      class: 'tie',
      d: `M${num(x1)} ${num(y)} Q${mid} ${num(y + bend * 1.1)} ${num(x2)} ${num(y)} Q${mid} ${num(y + bend * 0.85)} ${num(x1)} ${num(y)}Z`,
    }));
  });

  // triplet numbers, and a bracket when the notes aren't beamed together
  const tuplets = {};
  for (const ev of events) {
    if (ev.tuplet !== null) (tuplets[ev.tuplet] = tuplets[ev.tuplet] || []).push(ev.index);
  }
  for (const list of Object.values(tuplets)) {
    const beamed = groupOf[list[0]] && groupOf[list[0]].length === list.length;
    const x1 = info[list[0]].x;
    const lastStem = stems[list[list.length - 1]];
    const x2 = lastStem ? lastStem.x + E.stemThickness : info[list[list.length - 1]].x + HEAD_W;
    const ends = list.map((i) => (stems[i] ? stems[i].end : up ? -STEM : STEM));
    const edge = up ? Math.min(...ends) - 0.6 : Math.max(...ends) + 0.6;
    const mid = (x1 + x2) / 2;
    let numberY = up ? edge : edge + 1.2;
    if (!beamed) {
      const hook = up ? 0.5 : -0.5;
      out.push(el('path', {
        class: 'bracket',
        d: `M${num(x1)} ${num(edge + hook)}V${num(edge)}H${num(mid - 0.8)}M${num(mid + 0.8)} ${num(edge)}H${num(x2)}V${num(edge + hook)}`,
        'stroke-width': E.tupletBracketThickness,
      }));
      numberY = edge + 0.6;
    }
    out.push(glyph('tuplet3', mid - 0.6, numberY, { scale: 0.8 }));
  }

  return out.join('');
}

/* ---------- time signature ---------- */

function timeSigWidth(time) {
  return Math.max(digitsWidth(time.beats), digitsWidth(time.unit));
}

function digitsWidth(n) {
  return String(n).split('').reduce((w, d) => w + glyphWidth('timeSig' + d), 0);
}

function timeSignature(time, x) {
  const width = timeSigWidth(time);
  const row = (n, y) => {
    let cx = x + (width - digitsWidth(n)) / 2;
    return String(n).split('').map((d) => {
      const g = glyph('timeSig' + d, cx, y);
      cx += glyphWidth('timeSig' + d);
      return g;
    }).join('');
  };
  return el('g', { class: 'timesig' }, row(time.beats, -1) + row(time.unit, 1));
}
