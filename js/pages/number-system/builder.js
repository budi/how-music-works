/**
 * The progression builder (#builder): pick a key and up to six chord numbers,
 * dress each chord in a flavour and pick its shape — then hear it, a bar per
 * chord, on a loop. The chords themselves are worked out in progression.js.
 *
 * @module pages/number-system/builder
 */
import { FLAVOURS } from '../../music/chords.js';
import { CIRCLE_OF_FIFTHS as KEYS, DEGREES } from '../../music/keys.js';
import { guitarNotes } from '../../music/guitar.js';
import { pianoNotes } from '../../music/piano.js';
import { drawGuitarChord, drawPianoChord } from '../../draw/chord-diagram.js';
import { chordTimeline } from '../../audio/timeline.js';
import { currentInstrument } from '../../ui/instrument.js';
import { playAttrs, playButton } from '../../ui/play-buttons.js';
import { transport } from '../../ui/transport.js';
import { MAX_SLOTS, createProgression, progressionNotes, slotInfo, update } from './progression.js';
import { noteList, numberLabel } from './plain-chord.js';

export function renderBuilder(el) {
  const state = createProgression();
  let now = null; // the chord sounding, lit in the chart

  // the controls on one side; the result on the other: the chart, then every chord's choices
  el.innerHTML =
    '<div class="xgrid">' +
      '<div class="xcontrols"></div>' +
      '<div class="xmain">' +
        '<p class="xhint">Your progression — the shape chosen for each chord, in order</p>' +
        '<div class="xplay rhythm-controls"></div>' +
        '<div class="xchart"></div>' +
        '<div class="xstages"></div>' +
      '</div>' +
    '</div>';
  const parts = {
    play: el.querySelector('.xplay'),
    chart: el.querySelector('.xchart'),
    controls: el.querySelector('.xcontrols'),
    stages: el.querySelector('.xstages'),
  };

  // the chords as they stand, for the instrument showing: edits made while it
  // plays are heard from the next time round
  const timeline = (s) => {
    const instrument = currentInstrument();
    return chordTimeline(progressionNotes(state, instrument), { instrument, bpm: s.tempo, strum: s.strum });
  };
  const player = transport(parts.play, {
    settings: { tempo: 120, metronome: true, countIn: true, strum: 'bar' },
    checks: [['metronome', 'Metronome'], ['countIn', 'Count-in']],
    select: { setting: 'strum', label: 'Play', choices: [['bar', 'once a bar'], ['beats', 'on every beat']] },
    timeline,
    next: (n, s) => timeline(s),
    onStep: (step) => light(step.index),
    onStopped: () => light(null),
  });

  function light(index) {
    now = index;
    parts.chart.querySelectorAll('.xcell').forEach((cell, i) => cell.classList.toggle('is-now', i === index));
  }

  function render() {
    // keep the keyboard focus and the scroll of each row of shapes
    const focus = el.contains(document.activeElement) ? document.activeElement.dataset.id : null;
    const scrolls = {};
    el.querySelectorAll('.vrow').forEach((r) => { scrolls[r.dataset.id] = r.scrollLeft; });

    const infos = [];
    for (let i = 0; i < state.count; i++) infos.push(slotInfo(state, i));
    parts.chart.innerHTML = infos.map(chartCell).join('');
    parts.controls.innerHTML = controls();
    parts.stages.innerHTML = infos.map(stage).join('');
    light(now);

    el.querySelectorAll('.vrow').forEach((r) => {
      if (scrolls[r.dataset.id]) r.scrollLeft = scrolls[r.dataset.id];
    });
    if (focus) el.querySelector(`[data-id="${focus}"]`)?.focus();
  }

  function chartCell(info) {
    const g = info.guitar[info.guitarPick];
    const p = info.piano[info.pianoPick];
    const q = info.chord.quality;
    return `<div class="xcell"><div class="xc q-${q}"${playAttrs(guitarNotes(g.frets), pianoNotes(p.notes))}>` +
      playButton('Play ' + info.name) +
      heading(info) +
      `<figure class="cf only-g">${drawGuitarChord(g, { root: info.chord.root, quality: q })}` +
        `<figcaption><b>${info.name}</b>${g.name} · ${g.label}</figcaption></figure>` +
      `<figure class="cf only-p">${drawPianoChord(p.notes, { quality: q })}` +
        `<figcaption><b>${info.name}</b>${noteList(p.notes)}</figcaption></figure>` +
    '</div></div>';
  }

  function controls() {
    const keys = KEYS.map((k) => button('key', k, k, state.key === k)).join('');
    let rows = '';
    for (let i = 0; i < state.count; i++) {
      rows += `<div class="xslot"><span>${i + 1}</span>` +
        DEGREES.map((d, di) => button('degree', i + ':' + di, d.number, state.slots[i].degree === di)).join('') + '</div>';
    }
    let lines = '';
    if (state.count < MAX_SLOTS) lines += '<button type="button" class="xadd" data-action="add" data-id="add">+ add a chord</button>';
    if (state.count > 1) lines += '<button type="button" class="xrem" data-action="remove" data-id="remove">− remove last</button>';
    return `<p class="xsub">Key</p><div class="xkeys">${keys}</div><p class="xsub">Progression</p>${rows}<div class="xlines">${lines}</div>`;
  }

  // one chord's choices: its flavours, and every shape for each instrument
  function stage(info, i) {
    const slot = state.slots[i];
    const q = info.chord.quality;
    const chips = FLAVOURS[q].map((f, fi) => chip('flavour', i + ':' + fi, f.chip || info.chord.name, slot.flavour === fi)).join('');
    const follow = (instrument) => (i === 0 ? '' :
      `<button type="button" class="vauto" data-action="follow" data-value="${i}:${instrument}"` +
      ` data-id="follow-${i}-${instrument}" aria-pressed="${slot[instrument] === null}">follow<br>previous</button>`);
    const guitar = info.guitar.map((s, si) =>
      choice(i, 'guitar', s.position, si === info.guitarPick, drawGuitarChord(s, { root: info.chord.root, quality: q }), s.name, s.label)).join('');
    const piano = info.piano.map((p, pi) =>
      choice(i, 'piano', p.position, pi === info.pianoPick, drawPianoChord(p.notes, { quality: q }), p.name, noteList(p.notes))).join('');
    return `<div class="xstage"><div class="xc q-${q}">` +
      heading(info) +
      `<div class="trow">${chips}</div>` +
      `<div class="vrow only-g" data-id="vrow-${i}-g">${follow('guitar')}${guitar}</div>` +
      `<div class="vrow only-p" data-id="vrow-${i}-p">${follow('piano')}${piano}</div>` +
    '</div></div>';
  }

  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    update(state, btn.dataset.action, (btn.dataset.value || '').split(':'));
    render();
  });
  // switching instrument switches the sound straight away
  document.addEventListener('click', (e) => {
    if (player.playing && e.target.closest?.('[data-instrument-choice]')) setTimeout(player.start, 0);
  });

  render();
}

function heading(info) {
  return `<h4><span class="xnum">${numberLabel(info.chord.degree)}</span>${info.chord.name}</h4>`;
}

function button(action, value, text, pressed, cls) {
  return `<button type="button"${cls ? ` class="${cls}"` : ''} data-action="${action}" data-value="${value}"` +
    ` data-id="${action}-${value}" aria-pressed="${pressed}">${text}</button>`;
}

function chip(action, value, text, pressed) {
  return button(action, value, text, pressed, 'tchip');
}

function choice(slot, instrument, position, selected, art, title, sub) {
  return `<button type="button" class="vc${selected ? ' is-selected' : ''}" data-action="pick"` +
    ` data-value="${slot}:${instrument}:${position}" data-id="pick-${slot}-${instrument}-${position}" aria-pressed="${selected}">` +
    `${art}<b>${title}</b><span>${sub}</span></button>`;
}
