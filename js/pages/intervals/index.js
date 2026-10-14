/**
 * Intervals (intervals.html): every interval at a glance, any interval from
 * any root, and the which-is-bigger ear trainer.
 *
 * @module pages/intervals
 */
import { mount } from '../../lib/dom.js';
import { renderIntervalTable } from './table.js';
import { setupExplorer } from './explorer.js';
import { setupBigger } from './bigger.js';

document.addEventListener('DOMContentLoaded', () => {
  mount(document, { 'interval-table': renderIntervalTable, 'interval-explorer': setupExplorer, 'which-bigger': setupBigger });
});
