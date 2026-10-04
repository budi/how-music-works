/**
 * Sight-reading: a `<figure class="rhythm" data-random>` plays eight made-up
 * bars on two lines of four. While bars 5–8 play, bars 1–4 are made up again,
 * and the other way round, so the loop never repeats. Each line is drawn as
 * two scores of two bars, one under the other. Each level also comes swung,
 * its eighths played long–short.
 *
 * @module pages/beats-101/sight-reading
 */
import { beatNote, parseRhythm, parseTime } from '../../music/rhythm.js';
import { LEVELS, randomBars, shortestNotes } from '../../music/random-rhythm.js';
import { drawRhythm } from '../../draw/notation.js';
import { rhythmTimeline } from '../../audio/timeline.js';
import { transport } from '../../ui/transport.js';
import { uid, viewBoxWidth } from '../../lib/dom.js';
import { lightStep, unlight } from './exercise.js';

const LINES = ['a', 'b']; // voice names of bars 1–4 and bars 5–8
const LINE_BARS = 4;
const TIMES = ['4/4', '3/4', '6/8'];

/** Sets up the sight-reading figure: its two lines, settings and controls. */
export function setupSightReading(fig) {
  const state = { time: parseTime(fig.dataset.time || '4/4'), level: 1, swing: false, lines: [] };
  fig.querySelector('.rhythm-score').innerHTML = '<div class="rhythm-line"></div><div class="rhythm-line"></div>';

  // line i as one pass of the loop
  const lineTimeline = (i, settings) => rhythmTimeline({ [LINES[i]]: state.lines[i] }, { bpm: settings.tempo, swing: state.swing });

  const player = transport(fig.querySelector('.rhythm-controls'), {
    settings: { tempo: Number(fig.dataset.tempo) || 72, metronome: true, countIn: true },
    beat: beatNote(state.time),
    checks: [['metronome', 'Metronome'], ['countIn', 'Count-in']],
    extra: options(state),
    timeline: (s) => lineTimeline(0, s),
    // a line per pass; the line not playing is made up again
    next: (n, s) => lineTimeline(n % 2, s),
    onPass: (n) => { if (n > 0) reroll((n + 1) % 2); },
    onStep: (step) => lightStep(fig, step),
    onStopped: () => unlight(fig),
  });

  // make up line i (0: bars 1–4, 1: bars 5–8) again, and draw it
  function reroll(i) {
    const text = randomBars(state.time.text, LINE_BARS, state.level, { swing: state.swing });
    state.lines[i] = parseRhythm(text, state.time, ['clap']);
    const bars = text.split(' | ');
    const opts = { count: true, voice: LINES[i], space: shortestNotes(state.time.text, state.level, { swing: state.swing }) };
    const first = parseRhythm(bars.slice(0, 2).join(' | '), state.time);
    const second = parseRhythm(bars.slice(2).join(' | '), state.time);
    const line = fig.querySelectorAll('.rhythm-line')[i];
    line.innerHTML = drawRhythm(first, opts) + drawRhythm(second, { ...opts, timeSignature: false });
    // number the second score's notes on from the first's, as the player counts them
    line.lastChild.querySelectorAll('[data-i]').forEach((el) => {
      el.setAttribute('data-i', Number(el.getAttribute('data-i')) + first.events.length);
    });
    line.dataset.pattern = text;
    fit();
  }

  // every score at one scale, set by the widest (--w, in staff spaces); the others in proportion
  function fit() {
    const svgs = [...fig.querySelectorAll('.rhythm-line svg')];
    const widest = Math.max(...svgs.map(viewBoxWidth));
    fig.querySelector('.rhythm-score').style.setProperty('--w', widest);
    for (const svg of svgs) svg.style.width = (viewBoxWidth(svg) / widest * 100) + '%';
  }

  // a new rhythm everywhere, played from bar 1 if it's playing
  function renew() {
    reroll(0);
    reroll(1);
    if (player.playing) player.start();
  }

  fig.addEventListener('click', (e) => {
    if (e.target.closest('.rhythm-new')) renew();
  });
  fig.addEventListener('change', (e) => {
    const setting = e.target.dataset.setting;
    if (setting === 'counts') {
      // the counting under the notes: read without it once you can
      fig.classList.toggle('hide-counts', !e.target.checked);
    } else if (setting === 'time') {
      setTime(e.target.value);
      renew();
    } else if (setting === 'level') {
      // '2', or 'swing-2' for the same level swung
      state.swing = e.target.value.startsWith('swing-');
      state.level = Number(e.target.value.replace('swing-', ''));
      // only simple time swings, so a swing level takes 6/8 off the menu
      const times = fig.querySelector('select[data-setting="time"]');
      for (const option of times.options) option.disabled = state.swing && parseTime(option.value).compound;
      if (state.swing && state.time.compound) {
        times.value = '4/4';
        setTime('4/4');
      }
      renew();
    }
  });

  function setTime(text) {
    state.time = parseTime(text);
    player.setBeat(beatNote(state.time));
  }

  reroll(0);
  reroll(1);
  return player;
}

// New rhythm, time, level (each straight, then swung) and counts
function options(state) {
  const id = uid('s');
  const times = TIMES.map((t) => `<option${t === state.time.text ? ' selected' : ''}>${t}</option>`).join('');
  const levels = ['', 'swing-'].map((swing) => Object.entries(LEVELS).map(([n, name]) =>
    `<option value="${swing + n}">${swing ? 'Swing ' + name.toLowerCase() : name}</option>`).join('')).join('');
  return '<span class="rhythm-random">' +
    '<button type="button" class="rhythm-new">New rhythm</button>' +
    `<label class="rhythm-select" for="${id}-ts">Time <select id="${id}-ts" data-setting="time">${times}</select></label>` +
    `<label class="rhythm-select" for="${id}-lv">Level <select id="${id}-lv" data-setting="level">${levels}</select></label>` +
    '<label class="rhythm-check"><input type="checkbox" data-setting="counts" checked> Counts</label>' +
    '</span>';
}
