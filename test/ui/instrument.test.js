import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadPage, click } from '../helpers.js';

const pressed = (window) =>
  [...window.document.querySelectorAll('[data-instrument-choice]')].map((b) => b.dataset.instrumentChoice + ':' + b.getAttribute('aria-pressed'));

describe('guitar / piano switch', () => {
  it('starts on guitar, switches, and remembers the choice', async () => {
    const window = await loadPage('number-system.html');
    assert.deepEqual(pressed(window), ['guitar:true', 'piano:false']);
    click(window, '[data-instrument-choice="piano"]');
    assert.equal(window.document.documentElement.dataset.instrument, 'piano');
    assert.deepEqual(pressed(window), ['guitar:false', 'piano:true']);
    assert.equal(window.localStorage.getItem('music.instrument'), 'piano');
  });

  it('restores the remembered choice on the next page', async () => {
    const window = await loadPage('number-system.html', { storage: { 'music.instrument': 'piano' } });
    assert.equal(window.document.documentElement.dataset.instrument, 'piano');
    assert.deepEqual(pressed(window), ['guitar:false', 'piano:true']);
  });

});
