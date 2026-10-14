/**
 * Reading notes' diagrams:
 *
 *     <figure class="staff-fig" data-clef data-notes data-labels>   notes on a staff
 *                         (templates/partials/staff.hbs); tap a note to hear it,
 *                         or Play to hear them all, each lit as it sounds
 *     <figure class="keys-fig" data-from data-to data-marks data-highlight>
 *                         piano keys, the marked ones labelled; tap one to hear it
 *
 * @module pages/reading-notes/figures
 */
import { drawStaff } from '../../draw/staff.js';
import { drawKeyboard } from '../../draw/keyboard.js';
import { melodyTimeline } from '../../audio/timeline.js';
import { wireNoteTaps } from '../../ui/tap-notes.js';
import { transport } from '../../ui/transport.js';
import { sizeToDrawing } from '../../lib/dom.js';

export function setupStaffFigure(fig) {
  const d = fig.dataset;
  const art = fig.querySelector('.staff-art');
  art.innerHTML = drawStaff({ clef: d.clef, notes: d.notes, labels: d.labels || 'letters' });
  sizeToDrawing(art);
  const notes = [...art.querySelectorAll('.sn')];
  const light = (index) => notes.forEach((n) => n.classList.toggle('is-now', Number(n.dataset.i) === index));

  wireNoteTaps(art);
  const controls = fig.querySelector('.staff-controls');
  if (controls) {
    transport(controls, {
      settings: {},
      playOnly: true,
      loop: false,
      timeline: () => melodyTimeline(notes.map((n) => Number(n.dataset.midi)), { bpm: 100 }),
      onStep: (step) => light(step.index),
      onStopped: () => light(null),
    });
  }
}

export function setupKeysFigure(fig) {
  const { from, to, marks, highlight } = fig.dataset;
  const art = fig.querySelector('.keys-art');
  art.innerHTML = drawKeyboard({ from, to, marks, highlight });
  sizeToDrawing(art);
  wireNoteTaps(fig);
}
