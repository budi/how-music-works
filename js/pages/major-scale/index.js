/**
 * The major scale (major-scale.html): every key's scale, on the staff, the
 * keys and the neck, and the find-the-missing-note quiz.
 *
 * @module pages/major-scale
 */
import { mount } from '../../lib/dom.js';
import { setupExplorer } from './explorer.js';
import { setupQuiz } from './quiz.js';

document.addEventListener('DOMContentLoaded', () => {
  mount(document, { 'scale-explorer': setupExplorer, 'scale-quiz': setupQuiz });
});
