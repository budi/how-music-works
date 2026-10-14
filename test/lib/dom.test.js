import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { sizeToDrawing } from '../../js/lib/dom.js';

describe('dom', () => {
  const page = (html) => new JSDOM(`<body>${html}</body>`).window.document;

  it('sizes a box by the drawing in it, and a keyboard by its white keys', () => {
    const box = page('<div><svg viewBox="0 -6 31.5 9"></svg></div>').querySelector('div');
    sizeToDrawing(box);
    assert.equal(box.style.getPropertyValue('--w'), '31.5');
    const keys = page('<div><svg viewBox="0 0 392 92" data-whites="15"></svg></div>').querySelector('div');
    sizeToDrawing(keys);
    assert.equal(keys.style.getPropertyValue('--whites'), '15');
  });
});
