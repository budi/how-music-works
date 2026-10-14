/**
 * Find the missing note (#scale-quiz): given a key, find one note of its major
 * scale — "the 4 of C major" — on the piano or the guitar neck, whichever the
 * page shows. Any octave and any string count: it's the note that's asked.
 *
 * @module pages/major-scale/quiz
 */
import { CIRCLE_OF_FIFTHS, majorScale } from '../../music/keys.js';
import { fretPositions } from '../../music/guitar.js';
import { keySpellings, mod12, parsePitch, pitchClass, printed } from '../../music/pitch.js';
import { semitones } from '../../music/intervals.js';
import { drawKeyboard } from '../../draw/keyboard.js';
import { drawFretboard } from '../../draw/fretboard.js';
import { melodyTimeline } from '../../audio/timeline.js';
import { sharedPlayer } from '../../audio/player.js';
import { quizScore } from '../../ui/score.js';
import { sizeToDrawing } from '../../lib/dom.js';
import { pick } from '../../lib/random.js';
import { plural } from '../../lib/text.js';
import { scaleMidis, scaleRow } from './scale.js';

// the keys each setting asks about
const KEY_SETS = { few: ['C', 'G', 'D', 'F'], all: CIRCLE_OF_FIFTHS };

// the keyboard to answer on: two octaves up from middle C
const KEYS = { from: 'C4', to: 'B5' };

/**
 * A note to find, never the same as the last one: a key, and a degree from 2 to 7.
 * @param {object} [options]
 * @param {string[]} [options.keys]  every key by default
 * @param {{key: string, degree: number}} [options.previous]
 * @param {function} [options.random]  () → [0, 1)
 * @returns {{key: string, degree: number, note: string}}  note: its name in the scale, 'F#'
 */
export function scaleQuestion({ keys = KEY_SETS.all, previous, random } = {}) {
  const choices = keys.flatMap((key) => [2, 3, 4, 5, 6, 7].map((degree) => ({ key, degree })))
    .filter((q) => !previous || q.key !== previous.key || q.degree !== previous.degree);
  const q = pick(choices, random);
  return { ...q, note: majorScale(q.key)[q.degree - 1] };
}

/**
 * Why a note is spelled as it is, when its key usually goes by another name:
 * spellingNote('F#', 7) → 'E♯, not F: every letter comes once, and F♯ is already the 1.'
 * Null for a white key called by its own letter.
 */
export function spellingNote(key, degree) {
  const scale = majorScale(key);
  const note = scale[degree - 1];
  const other = keySpellings(pitchClass(note)).find((n) => n[0] !== note[0]);
  if (!other) return null;
  const taken = scale.findIndex((n) => n[0] === other[0]);
  return `${printed(note)}, not ${other}: every letter comes once, and ${printed(scale[taken])} is already the ${taken + 1}.`;
}

// what was pressed, named as the scale names it if it's in the scale
function describePress(key, pc) {
  const scale = majorScale(key);
  const i = scale.findIndex((n) => pitchClass(n) === pc);
  return i >= 0
    ? `That’s ${printed(scale[i])}, the ${i + 1} of ${printed(key)} major.`
    : `${keySpellings(pc).join(' / ')} isn’t in ${printed(key)} major.`;
}

export function setupQuiz(el) {
  const state = { keys: 'few', level: 'easy', names: true, sound: true, question: null, answered: false };
  const score = quizScore();

  el.innerHTML =
    '<div class="rhythm-controls">' +
      '<label class="rhythm-select">Keys <select data-setting="keys">' +
        '<option value="few">C, G, D and F</option><option value="all">all twelve</option></select></label>' +
      '<label class="rhythm-select">Show <select data-setting="level">' +
        '<option value="easy">the other notes</option><option value="hard">only the root</option></select></label>' +
      '<label class="rhythm-check"><input type="checkbox" data-setting="names" checked> Note names</label>' +
      '<label class="rhythm-check"><input type="checkbox" data-setting="sound" checked> Sound</label>' +
    '</div>' +
    '<p class="ms-ask" aria-live="polite"></p>' +
    '<div class="ms-given"></div>' +
    '<div class="quiz-pad ms-keys only-p show-names"></div>' +
    '<div class="quiz-pad neck-art ms-neck only-g show-names"></div>' +
    '<p class="quiz-result" aria-live="polite"></p>' +
    '<p class="ms-next-row"><button type="button" class="rhythm-play ms-next" hidden>Next note</button></p>' +
    '<p class="quiz-score">Find the note <span class="only-p">on the keys, in any octave</span><span class="only-g">on the neck, on any string</span>.</p>';
  const $ = (selector) => el.querySelector(selector);

  // the keys and the neck, the root marked everywhere it is; once it's found, the answer too
  function pads() {
    const q = state.question;
    const notes = [{ name: q.key, cls: 'is-root' }, ...(state.answered ? [{ name: q.note, cls: 'is-right' }] : [])];
    const at = (midi) => notes.find((n) => pitchClass(n.name) === mod12(midi));

    const tags = {};
    for (let midi = parsePitch(KEYS.from).midi; midi <= parsePitch(KEYS.to).midi; midi++) {
      const n = at(midi);
      if (n) tags[midi] = printed(n.name);
    }
    const keys = $('.ms-keys');
    keys.innerHTML = drawKeyboard({ from: KEYS.from, to: KEYS.to, names: false, keyNames: true, tags });
    sizeToDrawing(keys);
    for (const k of keys.querySelectorAll('.key')) {
      const n = at(Number(k.dataset.midi));
      if (n) k.classList.add(n.cls);
    }

    const neck = $('.ms-neck');
    neck.innerHTML = drawFretboard({
      names: true,
      marks: notes.flatMap((n) => fretPositions(n.name).map((p) => ({ ...p, label: printed(n.name), cls: n.cls }))),
    });
    sizeToDrawing(neck);
  }

  function ask() {
    const q = state.question = scaleQuestion({ keys: KEY_SETS[state.keys], previous: state.question });
    state.answered = false;
    score.ask();
    const easy = state.level === 'easy';
    $('.ms-ask').innerHTML = `What’s the <b>${q.degree}</b> in <b>${printed(q.key)} major</b>?`;
    $('.ms-given').innerHTML = scaleRow(q.key, {
      ask: q.degree,
      steps: easy,
      shown: (degree, name) => (degree === q.degree ? '?' : easy || degree % 7 === 1 ? name : ''),
    });
    $('.quiz-result').textContent = '';
    $('.ms-next').hidden = true;
    pads();
  }

  function answer(pressed) {
    const q = state.question;
    if (state.answered) return;
    const midi = Number(pressed.dataset.midi);
    const instrument = pressed.classList.contains('spot') ? 'guitar' : 'piano';
    if (state.sound) sharedPlayer().strum(instrument, [midi]);
    if (mod12(midi) === pitchClass(q.note)) {
      state.answered = true;
      score.hit();
      const why = spellingNote(q.key, q.degree);
      $('.quiz-result').textContent = `Yes: the ${q.degree} of ${printed(q.key)} major is ${printed(q.note)}.` + (why ? ' ' + why : '');
      const cell = $('.ms-given .is-ask');
      cell.querySelector('span').textContent = printed(q.note);
      cell.classList.add('is-right');
      pads();
      $('.ms-next').hidden = false;
      // the scale from the root up to it, to hear where it sits
      if (state.sound) sharedPlayer().play(melodyTimeline(scaleMidis(q.key, instrument).slice(0, q.degree), { bpm: 200, instrument }));
    } else {
      score.miss();
      pressed.classList.add('is-wrong');
      $('.quiz-result').textContent = describePress(q.key, mod12(midi)) +
        ` The ${q.degree} is ${plural(semitones(String(q.degree)), 'half step')} above ${printed(q.key)}.`;
    }
    $('.quiz-score').textContent = score.text;
  }

  el.addEventListener('click', (e) => {
    if (e.target.closest('.ms-next')) {
      ask();
      return;
    }
    const pressed = e.target.closest('.quiz-pad .key, .quiz-pad .spot');
    if (pressed) answer(pressed);
  });
  el.addEventListener('change', (e) => {
    const setting = e.target.dataset.setting;
    if (!setting) return;
    state[setting] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (setting === 'names') {
      // just show or hide them: the question and what's been pressed stay
      el.querySelectorAll('.quiz-pad').forEach((p) => p.classList.toggle('show-names', state.names));
    } else if (setting !== 'sound') {
      ask();
    }
  });

  ask();
}
