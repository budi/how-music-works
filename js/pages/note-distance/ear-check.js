/**
 * Ear check (#ear-check): two notes play, from do going up or from high do
 * going down; name the second one. The score counts answers right the first time.
 *
 * @module pages/note-distance/ear-check
 */
import { SYLLABLES, degreeName, describeMove, earQuestion } from '../../music/solfege.js';
import { degreeHtml, ladder, showJump } from './drawings.js';
import { hear } from './your-do.js';

export function setupEarCheck(el) {
  // right: questions answered right on the first try
  const state = { direction: 'up', question: null, right: 0, asked: 0, answered: false, missed: false };
  el.innerHTML =
    '<div class="ec-body">' +
      `<div class="ec-ladder">${ladder()}</div>` +
      '<div class="ec-main">' +
        '<div class="rhythm-controls">' +
          '<button type="button" class="rhythm-play ec-new">New question</button>' +
          '<button type="button" class="ec-again" disabled>Hear it again</button>' +
          '<label class="rhythm-select">From <select class="ec-direction">' +
            '<option value="up">do, going up</option><option value="down">high do, going down</option></select></label>' +
        '</div>' +
        '<p class="ec-ask">Press <b>New question</b>, listen to the two notes, and pick the second one.</p>' +
        '<div class="ec-answers"></div>' +
        '<p class="ec-result" aria-live="polite"></p>' +
        '<p class="ec-score"></p>' +
      '</div>' +
    '</div>';
  const $ = (selector) => el.querySelector(selector);

  // the answers are notes, in numbers and syllables; the result says how far it was
  function answers() {
    const list = state.direction === 'down' ? [7, 6, 5, 4, 3, 2, 1] : [2, 3, 4, 5, 6, 7, 8];
    $('.ec-answers').innerHTML = list.map((d) =>
      `<button type="button" class="ec-answer" data-degree="${d}" aria-label="${degreeName(d)}"${state.question ? '' : ' disabled'}>` +
      `<b>${degreeHtml(d)}</b><span>${SYLLABLES[d]}</span></button>`).join('');
  }

  const play = () => hear([state.question.from, state.question.to]);

  function ask() {
    // never the same question twice in a row (in the same direction)
    const last = state.question && state.question.from === (state.direction === 'down' ? 8 : 1) ? state.question.to : undefined;
    state.question = earQuestion(state.direction, { previous: last });
    state.answered = false;
    state.missed = false;
    state.asked++;
    showJump(el, null, null);
    $('.ec-result').textContent = '';
    $('.ec-again').disabled = false;
    answers();
    play();
  }

  function answer(btn) {
    const q = state.question;
    if (!q || state.answered) return;
    if (Number(btn.dataset.degree) === q.to) {
      state.answered = true;
      if (!state.missed) state.right++;
      btn.classList.add('is-right');
      el.querySelectorAll('.ec-answer').forEach((b) => { b.disabled = b !== btn; });
      $('.ec-result').textContent = `Yes: ${degreeName(q.from)} → ${degreeName(q.to)} is ${describeMove(q.from, q.to)}.`;
      $('.ec-score').textContent = `${state.right} of ${state.asked} right first time.`;
      showJump(el, q.from, q.to);
    } else {
      state.missed = true;
      btn.classList.add('is-wrong');
      btn.disabled = true;
      $('.ec-result').textContent = 'Not that one. Listen again, and try another.';
      play();
    }
  }

  el.addEventListener('click', (e) => {
    if (e.target.closest('.ec-new')) ask();
    else if (e.target.closest('.ec-again')) play();
    else if (e.target.closest('.ec-answer')) answer(e.target.closest('.ec-answer'));
  });
  el.addEventListener('change', (e) => {
    if (!e.target.classList.contains('ec-direction')) return;
    state.direction = e.target.value;
    state.question = null;
    $('.ec-again').disabled = true;
    $('.ec-result').textContent = '';
    showJump(el, null, null);
    answers();
  });
  answers();
}
