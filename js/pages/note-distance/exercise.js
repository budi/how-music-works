/**
 * A sung exercise: a `<figure class="interval-ex">` (templates/partials/interval-exercise.hbs)
 * plays a pattern of degrees on a loop from your do, lighting each note and
 * drawing each jump on a ladder.
 *
 *     data-pattern  degrees 1–8: '1 2 1 3 1 4'
 *     data-group    notes a group (default 2): a jump is shown within a group,
 *                   and "Gap to sing it back" leaves room after each one
 *     data-tempo    starting tempo, in beats per minute
 *
 * @module pages/note-distance/exercise
 */
import { SYLLABLES, degreeName, describeMove, parseDegrees } from '../../music/solfege.js';
import { transport } from '../../ui/transport.js';
import { degreeHtml, ladder, showJump } from './drawings.js';
import { sung } from './your-do.js';

export function setupExercise(fig) {
  const d = fig.dataset;
  const degrees = parseDegrees(d.pattern);
  const group = Number(d.group) || 2;

  // the notes in their groups, each with its number and syllable
  const chips = degrees.map((degree, i) =>
    (i % group === 0 ? (i === 0 ? '<span class="group">' : '</span><span class="group">') : '') +
    `<span class="chip" data-i="${i}" aria-label="${degreeName(degree)}"><b>${degreeHtml(degree)}</b>${SYLLABLES[degree]}</span>`);
  fig.querySelector('.iv-ladder').innerHTML = ladder();
  fig.querySelector('.iv-seq').innerHTML = chips.join('') + '</span>';
  const now = fig.querySelector('.iv-now');

  // note i is sounding: light its chip, and the jump to it from the note before it in its group
  function light(i) {
    fig.querySelectorAll('.chip').forEach((c) => c.classList.toggle('is-now', Number(c.dataset.i) === i));
    if (i === null) {
      showJump(fig, null, null);
      now.textContent = '';
      return;
    }
    const to = degrees[i];
    const from = i % group === 0 ? null : degrees[i - 1];
    showJump(fig, from, to);
    now.textContent = from === null ? degreeName(to) : `${degreeName(from)} → ${degreeName(to)}: ${describeMove(from, to)}`;
  }

  return transport(fig.querySelector('.rhythm-controls'), {
    settings: { tempo: Number(d.tempo) || 72, countIn: true, echo: false },
    max: 160,
    checks: [['countIn', 'Count-in'], ['echo', 'Gap to sing it back']],
    timeline: (s) => sung(degrees, { bpm: s.tempo, echo: s.echo, group }),
    onStep: (step) => light(step.index),
    onStopped: () => light(null),
  });
}
