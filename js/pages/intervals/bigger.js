/**
 * Which is bigger? (#which-bigger): two intervals play, each from a note of
 * its own, so the top notes alone don't give it away; say which spans more.
 * The closer they are in size, the harder it is.
 *
 * @module pages/intervals/bigger
 */
import { INTERVALS, intervalDegree, pitchAbove, rootFor } from '../../music/intervals.js';
import { parsePitch } from '../../music/pitch.js';
import { chordTimeline, melodyTimeline } from '../../audio/timeline.js';
import { sharedPlayer } from '../../audio/player.js';
import { currentInstrument } from '../../ui/instrument.js';
import { playButton } from '../../ui/play-buttons.js';
import { quizScore } from '../../ui/score.js';
import { pick } from '../../lib/random.js';
import { plural } from '../../lib/text.js';

/** How far apart in size the two intervals are, in half steps, at each level. */
export const LEVELS = { easy: [5, 11], medium: [3, 4], hard: [1, 2] };

// the notes the intervals start from: C3 up to C4, all but G♯3 (no root spells it well: see ROOTS)
const LOWS = Array.from({ length: 13 }, (_, i) => 48 + i).filter(rootFor);

// an interval's two notes, spelled up from its low note: spelledNotes(48, 4) → ['C3', 'E3']
function spelledNotes(low, size) {
  const root = rootFor(low);
  const from = root + (Math.floor(low / 12) - 1);
  return [from, pitchAbove(from, intervalDegree(root, size))];
}

/**
 * Two intervals, a minor 2nd to an octave, `level` apart in size, each from a
 * different note.
 * @param {'easy'|'medium'|'hard'} level
 * @param {function} [random]  () → [0, 1)
 * @returns {{intervals: Array<{low: number, size: number, notes: string[]}>, bigger: number}}
 *   low: MIDI; size: half steps; notes: both, spelled ('C3', 'E3');
 *   bigger: 0 for the first, 1 for the second
 */
export function biggerQuestion(level, random = Math.random) {
  const [near, far] = LEVELS[level];
  const pairs = [];
  for (let a = 1; a <= 12; a++) {
    for (let b = 1; b <= 12; b++) {
      if (Math.abs(a - b) >= near && Math.abs(a - b) <= far) pairs.push([a, b]);
    }
  }
  const sizes = pick(pairs, random);
  const first = pick(LOWS, random);
  const lows = [first, pick(LOWS.filter((m) => m !== first), random)];
  return {
    intervals: sizes.map((size, i) => ({ low: lows[i], size, notes: spelledNotes(lows[i], size) })),
    bigger: sizes[0] > sizes[1] ? 0 : 1,
  };
}

const ORDER = ['first', 'second'];

export function setupBigger(el) {
  const state = { level: 'easy', how: 'apart', question: null, answered: false };
  const score = quizScore();
  el.innerHTML =
    '<div class="rhythm-controls">' +
      '<button type="button" class="rhythm-play ib-new">New pair</button>' +
      '<button type="button" class="ib-again" disabled>Hear again</button>' +
      '<label class="rhythm-select">Level <select data-setting="level">' +
        '<option value="easy">easy: far apart</option><option value="medium">medium</option>' +
        '<option value="hard">hard: a half step or two apart</option></select></label>' +
      '<label class="rhythm-select">Play <select data-setting="how">' +
        '<option value="apart">one note, then the other</option><option value="together">both notes together</option></select></label>' +
    '</div>' +
    '<p class="ib-ask">Press <b>New pair</b>: two intervals play, each from a note of its own. Which spans more?</p>' +
    '<div class="ib-answers">' +
      ORDER.map((word, i) => `<button type="button" class="ib-answer" data-which="${i}" disabled>The ${word}</button>`).join('') +
    '</div>' +
    '<div class="ib-reveal" hidden></div>' +
    '<p class="quiz-result" aria-live="polite"></p>' +
    '<p class="quiz-score"></p>';
  const $ = (selector) => el.querySelector(selector);
  const answers = () => el.querySelectorAll('.ib-answer');

  // the intervals asked for (both by default), each lit while it sounds: its answer, and its row once answered
  function play(which = [0, 1]) {
    const instrument = currentInstrument();
    const pairs = which.map((i) => state.question.intervals[i]).map((iv) => [iv.low, iv.low + iv.size]);
    const together = state.how === 'together';
    const timeline = together
      ? chordTimeline(pairs, { instrument, bpm: 160 })
      : melodyTimeline(pairs.flat(), { bpm: 140, group: 2, echo: true, instrument });
    const light = (i) => el.querySelectorAll('[data-which]').forEach((b) => b.classList.toggle('is-now', Number(b.dataset.which) === i));
    sharedPlayer().play(timeline, {
      onStep: (step) => light(which[together ? step.index : Math.floor(step.index / 2)]),
      onStop: () => light(null),
    });
  }

  // each interval named, with a bar as long as it is: the bigger one's extra length marked
  function reveal() {
    const { intervals } = state.question;
    const smaller = Math.min(...intervals.map((iv) => iv.size));
    const box = $('.ib-reveal');
    box.innerHTML = intervals.map(({ size, notes }, i) => {
      const [from, to] = notes.map((n) => parsePitch(n).name);
      const iv = INTERVALS[size];
      return `<div class="ib-row" data-which="${i}">` +
        playButton(`Hear the ${ORDER[i]} again: ${from} up to ${to}`, 'iv-hear') +
        `<span class="ib-what"><b>The ${ORDER[i]}</b> ${from} up to ${to}</span>` +
        `<span class="ib-size"><b>${iv.short}</b> ${iv.name} · ${plural(size, 'half step')}</span>` +
        '<span class="ib-bar"><i></i><em></em></span></div>';
    }).join('');
    box.querySelectorAll('.ib-bar').forEach((bar, i) => {
      bar.style.setProperty('--base', smaller);
      bar.style.setProperty('--extra', intervals[i].size - smaller);
    });
    box.hidden = false;
  }

  function ask() {
    state.question = biggerQuestion(state.level);
    state.answered = false;
    score.ask();
    $('.ib-again').disabled = false;
    for (const b of answers()) {
      b.disabled = false;
      b.classList.remove('is-right', 'is-wrong');
    }
    $('.ib-reveal').hidden = true;
    $('.ib-reveal').replaceChildren(); // the last pair's answers go with it
    $('.quiz-result').textContent = '';
    play();
  }

  function answer(btn) {
    const q = state.question;
    if (state.answered) return;
    state.answered = true;
    const right = Number(btn.dataset.which) === q.bigger;
    if (right) score.hit(); else score.miss();
    btn.classList.add(right ? 'is-right' : 'is-wrong');
    answers().forEach((b) => { b.disabled = true; });
    reveal();
    const gap = Math.abs(q.intervals[0].size - q.intervals[1].size);
    $('.quiz-result').textContent = `${right ? 'Yes' : 'No'}: the ${ORDER[q.bigger]} was bigger, by ${plural(gap, 'half step')}.`;
    $('.quiz-score').textContent = score.text;
  }

  el.addEventListener('click', (e) => {
    if (e.target.closest('.ib-new')) ask();
    else if (e.target.closest('.ib-again')) play();
    else if (e.target.closest('.ib-row .iv-hear')) play([Number(e.target.closest('.ib-row').dataset.which)]);
    else if (e.target.closest('.ib-answer')) answer(e.target.closest('.ib-answer'));
  });
  el.addEventListener('change', (e) => {
    if (e.target.dataset.setting) state[e.target.dataset.setting] = e.target.value;
  });
}
