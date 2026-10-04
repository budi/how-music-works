/**
 * Reading notes (reading-notes.html): staves and keyboards that play when
 * tapped, and the note quiz.
 *
 * @module pages/reading-notes
 */
import { mount, setupEach } from '../../lib/dom.js';
import { setupKeysFigure, setupStaffFigure } from './figures.js';
import { setupQuiz } from './quiz.js';

document.addEventListener('DOMContentLoaded', () => {
  setupEach(document, 'figure.staff-fig', setupStaffFigure, '.staff-art');
  document.querySelectorAll('figure.keys-fig').forEach(setupKeysFigure);
  mount(document, { 'note-quiz': setupQuiz });
});
