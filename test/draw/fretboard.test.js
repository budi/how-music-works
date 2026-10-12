import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { drawFretboard } from '../../js/draw/fretboard.js';

const svg = (opts) => new JSDOM(`<body>${drawFretboard(opts)}</body>`).window.document.querySelector('svg');
const $$ = (el, selector) => [...el.querySelectorAll(selector)];
const spot = (s, string, fret) => s.querySelector(`.spot[data-string="${string}"][data-fret="${fret}"]`);

describe('the guitar neck', () => {
  it('has a spot to tap for every string and fret, open strings too, each with its note', () => {
    const s = svg({ frets: 12 });
    assert.equal($$(s, '.spot').length, 6 * 13);
    assert.equal(spot(s, 6, 0).dataset.midi, '40', 'low E');
    assert.equal(spot(s, 1, 12).dataset.midi, '76', 'high E, an octave up');
    assert.equal(spot(s, 2, 1).dataset.midi, '60', 'middle C');
    assert.deepEqual($$(s, '.fretno').map((t) => t.textContent), ['0', '3', '5', '7', '9', '12']);
  });

  it('labels the marked spots, and can letter the natural notes', () => {
    const s = svg({ marks: [{ string: 5, fret: 3, label: '1', cls: 'is-root' }], names: true });
    assert.ok(spot(s, 5, 3).classList.contains('is-root'));
    assert.equal(spot(s, 5, 3).querySelector('.slabel').textContent, '1');
    assert.equal(spot(s, 5, 3).querySelector('.sname'), null);
    assert.equal(spot(s, 6, 1).querySelector('.sname').textContent, 'F');
    assert.equal(spot(s, 6, 2).querySelector('.sname'), null, 'F♯: no letter of its own');
  });
});
