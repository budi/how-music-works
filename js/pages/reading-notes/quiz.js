/**
 * Name the note (#note-quiz): a note appears on the staff; press its key on
 * the keyboard below — the right key, in the right octave.
 *
 * @module pages/reading-notes/quiz
 */
import { isBlackKey, keyName, naturals, parsePitch } from '../../music/pitch.js';
import { describePosition, noteAt } from '../../music/staff.js';
import { drawStaff } from '../../draw/staff.js';
import { drawKeyboard } from '../../draw/keyboard.js';
import { sharedPlayer } from '../../audio/player.js';
import { sizeToDrawing } from '../../lib/dom.js';
import { pick } from '../../lib/random.js';
import { plural } from '../../lib/text.js';

// the notes it asks: the staff, and up to three ledger lines beyond it either way
const ROOM = [-5, 13];

/** The lowest and highest note asked on each clef: the keyboard under the quiz covers the same. */
export const RANGE = {
  treble: ROOM.map((pos) => noteAt(pos, 'treble')),
  bass: ROOM.map((pos) => noteAt(pos, 'bass')),
};
RANGE.both = [RANGE.bass[0], RANGE.treble[1]];

/**
 * A note to read, never the same as the last one.
 * @param {'treble'|'bass'|'both'} clef
 * @param {object} [options]
 * @param {{note: string, clef: string}} [options.previous]  the last question
 * @param {boolean} [options.accidentals]  sharps and flats too: the black keys,
 *   spelled both ways, as long as they're on the keyboard
 * @param {function} [options.random]  () → [0, 1)
 * @returns {{note: string, clef: string}}  e.g. { note: 'G4', clef: 'treble' }
 */
export function noteQuestion(clef, { previous, accidentals = false, random } = {}) {
  const choices = [];
  for (const c of ['treble', 'bass']) {
    if (clef !== 'both' && clef !== c) continue;
    const [low, high] = RANGE[c].map((n) => parsePitch(n).midi);
    for (const note of naturals(...RANGE[c])) {
      choices.push({ note, clef: c });
      if (!accidentals) continue;
      const midi = parsePitch(note).midi;
      const [letter, octave] = [note[0], note.slice(1)];
      if (isBlackKey(midi + 1) && midi + 1 <= high) choices.push({ note: letter + '#' + octave, clef: c });
      if (isBlackKey(midi - 1) && midi - 1 >= low) choices.push({ note: letter + 'b' + octave, clef: c });
    }
  }
  return pick(choices.filter((q) => !previous || q.note !== previous.note || q.clef !== previous.clef), random);
}

export function setupQuiz(el) {
  const state = { clef: 'treble', accidentals: false, names: true, sound: true, question: null, missed: false, answered: false,
    right: 0, asked: 0, streak: 0, next: null };

  el.innerHTML =
    '<div class="rhythm-controls nq-settings">' +
      '<label class="rhythm-select">Clef <select data-setting="clef">' +
        '<option value="treble">treble</option><option value="bass">bass</option><option value="both">both</option></select></label>' +
      '<label class="rhythm-check"><input type="checkbox" data-setting="accidentals"> Sharps and flats</label>' +
      '<label class="rhythm-check"><input type="checkbox" data-setting="names" checked> Key names</label>' +
      '<label class="rhythm-check"><input type="checkbox" data-setting="sound" checked> Sound</label>' +
    '</div>' +
    '<div class="nq-staff staff-art" aria-live="polite"></div>' +
    '<div class="nq-keys show-names"></div>' +
    '<p class="nq-result" aria-live="polite"></p>' +
    '<p class="nq-score">Read the note, then press its key — the right one, in the right octave.</p>';
  const $ = (selector) => el.querySelector(selector);

  // the keyboard for the clef: the quiz's range, middle C marked
  function keys() {
    const [from, to] = RANGE[state.clef];
    const box = $('.nq-keys');
    box.innerHTML = drawKeyboard({ from, to, marks: 'C4', highlight: 'C4', names: false, keyNames: true });
    sizeToDrawing(box);
    // where the keyboard is wider than the screen, start with middle C in view
    const c = box.querySelector('.key[data-midi="60"] rect');
    if (box.scrollWidth > box.clientWidth && c && c.getBoundingClientRect) {
      box.scrollLeft = Math.max(0, c.getBoundingClientRect().left - box.getBoundingClientRect().left - box.clientWidth / 2);
    }
  }

  function ask() {
    clearTimeout(state.next);
    const q = state.question = noteQuestion(state.clef, { previous: state.question, accidentals: state.accidentals });
    state.missed = false;
    state.answered = false;
    state.asked++;
    const staff = $('.nq-staff');
    staff.innerHTML = drawStaff({
      ...(state.clef === 'both' ? { clef: 'grand', notes: q.note + (q.clef === 'treble' ? '@t' : '@b') } : { clef: q.clef, notes: q.note }),
      labels: 'none',
      width: 14,
      room: ROOM, // the same height, on the staff or three ledger lines out
      title: 'Which note is this?',
    });
    sizeToDrawing(staff);
    el.querySelectorAll('.nq-keys .key').forEach((k) => k.classList.remove('is-right', 'is-wrong'));
    $('.nq-result').textContent = '';
  }

  function answer(midi) {
    const q = state.question;
    if (!q || state.answered) return;
    const key = $(`.nq-keys .key[data-midi="${midi}"]`);
    const n = parsePitch(q.note);
    if (state.sound) sharedPlayer().strum('piano', [midi]);
    if (midi === n.midi) {
      state.answered = true;
      if (state.missed) state.streak = 0;
      else { state.right++; state.streak++; }
      key.classList.add('is-right');
      $('.nq-staff .sn').classList.add('is-right');
      $('.nq-result').textContent = 'Yes: ' + describePosition(n, q.clef) + '.';
      state.next = setTimeout(ask, 1300);
    } else {
      state.missed = true;
      key.classList.add('is-wrong');
      const octaves = (n.midi - midi) / 12;
      $('.nq-result').textContent = octaves === Math.round(octaves)
        ? `Right note, wrong octave: that’s ${keyName(midi)}. Go ${octaves > 0 ? 'up' : 'down'} ${plural(Math.abs(octaves), 'octave')}.`
        : `Not that one — you pressed ${keyName(midi)}. Go ${n.midi > midi ? 'higher' : 'lower'}.`;
    }
    $('.nq-score').textContent = `${state.right} of ${state.asked} right first time` + (state.streak > 1 ? ` · ${state.streak} in a row` : '') + '.';
  }

  el.addEventListener('click', (e) => {
    const key = e.target.closest('.nq-keys .key');
    if (key) answer(Number(key.dataset.midi));
    const note = e.target.closest('.sn');
    if (note && state.answered) sharedPlayer().strum('piano', [Number(note.dataset.midi)]);
  });
  el.addEventListener('change', (e) => {
    const setting = e.target.dataset.setting;
    if (!setting) return;
    state[setting] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (setting === 'names') {
      // just show or hide them: the question and what's been pressed stay
      $('.nq-keys').classList.toggle('show-names', state.names);
      return;
    }
    if (setting === 'clef') keys();
    if (setting !== 'sound') ask();
  });

  keys();
  ask();
}
