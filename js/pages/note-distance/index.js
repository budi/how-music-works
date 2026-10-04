/**
 * Note distance (note-distance.html): your do, the octave on the keys and as a
 * staircase, how far each note is from do, sung exercises and an ear check.
 *
 * @module pages/note-distance
 */
import { mount, setupEach } from '../../lib/dom.js';
import { loadDo, setupYourDo } from './your-do.js';
import { octaveKeys, staircase } from './drawings.js';
import { renderFromDo } from './from-do.js';
import { setupEarCheck } from './ear-check.js';
import { setupExercise } from './exercise.js';

document.addEventListener('DOMContentLoaded', () => {
  loadDo();
  mount(document, {
    'your-do': setupYourDo,
    'staircase': (el) => { el.innerHTML = staircase(); },
    'from-do': renderFromDo,
    'ear-check': setupEarCheck,
  });
  // <div class="keys" data-do="D">: one octave of keys from D (C if not given)
  document.querySelectorAll('.keys').forEach((el) => { el.innerHTML = octaveKeys(el.dataset.do); });
  setupEach(document, 'figure.interval-ex', setupExercise, '.iv-seq');
});
