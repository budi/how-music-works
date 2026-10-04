/**
 * Beats 101 (beats-101.html): every rhythm exercise becomes notation that
 * plays, and the "hear each one" buttons play a single drum.
 *
 * @module pages/beats-101
 */
import { sharedPlayer } from '../../audio/player.js';
import { setupEach } from '../../lib/dom.js';
import { setupExercise } from './exercise.js';
import { setupSightReading } from './sight-reading.js';

document.addEventListener('DOMContentLoaded', () => {
  setupEach(document, 'figure.rhythm', (fig) => ('random' in fig.dataset ? setupSightReading(fig) : setupExercise(fig)), '.rhythm-score');

  // "What does it sound like?" buttons: <button data-hit="sn">
  document.addEventListener('click', (e) => {
    const btn = e.target.closest?.('[data-hit]');
    if (btn) sharedPlayer().hit(btn.dataset.hit);
  });
});
