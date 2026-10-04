import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { setupEach, sizeToDrawing } from '../../js/lib/dom.js';

describe('dom', () => {
  const page = (html) => new JSDOM(`<body>${html}</body>`).window.document;

  it('sets up each element, showing a failure where its drawing would be', () => {
    const doc = page('<figure><div class="art"></div></figure><figure data-bad><div class="art"></div></figure>');
    const error = console.error;
    console.error = () => {};
    let results;
    try {
      results = setupEach(doc, 'figure', (fig) => {
        if ('bad' in fig.dataset) throw new Error('Typo in the pattern');
        return 'ok';
      }, '.art');
    } finally {
      console.error = error;
    }
    assert.deepEqual(results, ['ok']);
    assert.equal(doc.querySelector('[data-bad] .rhythm-error').textContent, 'Typo in the pattern');
  });

  it('sizes a box by the drawing in it, and a keyboard by its white keys', () => {
    const box = page('<div><svg viewBox="0 -6 31.5 9"></svg></div>').querySelector('div');
    sizeToDrawing(box);
    assert.equal(box.style.getPropertyValue('--w'), '31.5');
    const keys = page('<div><svg viewBox="0 0 392 92" data-whites="15"></svg></div>').querySelector('div');
    sizeToDrawing(keys);
    assert.equal(keys.style.getPropertyValue('--whites'), '15');
  });
});
