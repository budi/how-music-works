/**
 * The number system (number-system.html): the row of seven, every key chord by
 * chord, the circle of fifths and the progression builder — every chord with
 * a play button — plus the chord-shape galleries written into the page.
 *
 * @module pages/number-system
 */
import { mount } from '../../lib/dom.js';
import { renderDiagramTags } from '../../ui/diagram-tags.js';
import { wireChordButtons } from '../../ui/play-buttons.js';
import { renderKeyTable, renderSpine } from './tables.js';
import { renderCircle } from './circle.js';
import { renderBuilder } from './builder.js';

document.addEventListener('DOMContentLoaded', () => {
  renderDiagramTags(document);
  wireChordButtons(document);
  mount(document, {
    'spine': renderSpine,
    'key-table': renderKeyTable,
    'circle-of-fifths': renderCircle,
    'builder': renderBuilder,
  });
});
