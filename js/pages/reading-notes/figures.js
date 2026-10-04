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
import { sharedPlayer } from '../../audio/player.js';
import { transport } from '../../ui/transport.js';
import { flash, sizeToDrawing } from '../../lib/dom.js';

// a note or key tapped: heard, and lit for a moment
function tapped(el) {
  sharedPlayer().strum('piano', [Number(el.dataset.midi)]);
  flash(el, 'is-now', 700);
}

export function setupStaffFigure(fig) {
  const d = fig.dataset;
  const art = fig.querySelector('.staff-art');
  art.innerHTML = drawStaff({ clef: d.clef, notes: d.notes, labels: d.labels || 'letters' });
  sizeToDrawing(art);
  const notes = [...art.querySelectorAll('.sn')];
  const light = (index) => notes.forEach((n) => n.classList.toggle('is-now', Number(n.dataset.i) === index));

  art.addEventListener('click', (e) => {
    const note = e.target.closest('.sn');
    if (note) tapped(note);
  });
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
  fig.addEventListener('click', (e) => {
    const key = e.target.closest('.key');
    if (key) tapped(key);
  });
}
