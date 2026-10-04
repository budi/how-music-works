import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { drawKeyboard, keyLayout } from '../../js/draw/keyboard.js';

const svg = (opts) => new JSDOM(`<body>${drawKeyboard(opts)}</body>`).window.document.querySelector('svg');
const $$ = (el, selector) => [...el.querySelectorAll(selector)];

describe('where the keys go', () => {

  it('puts a black key over the join of two white keys a whole step apart', () => {
    const { whites, blacks } = keyLayout(60, 8, { white: 10, black: 6 });
    assert.deepEqual(whites.map((k) => k.pitch), [60, 62, 64, 65, 67, 69, 71, 72]);
    assert.deepEqual(whites.map((k) => k.x), [1, 11, 21, 31, 41, 51, 61, 71]);
    assert.deepEqual(blacks.map((k) => [k.pitch, k.x]), [[61, 8], [63, 18], [66, 38], [68, 48], [70, 58]]);
  });
});

describe('a keyboard to play on', () => {
  it('draws every key from one white key to another, each one named', () => {
    const s = svg({ from: 'C3', to: 'C5' });
    assert.equal($$(s, '.kw').length, 15);
    assert.equal($$(s, '.kb').length, 10);
    assert.deepEqual($$(s, '.key').slice(0, 2).map((k) => k.dataset.name), ['C3', 'D3']);
    assert.equal($$(s, '.key').find((k) => k.dataset.midi === '49').dataset.name, 'C♯3 / D♭3');
    assert.equal(s.dataset.whites, '15');
  });

  it('dots and names the marked keys, one in red, and says which is middle C', () => {
    const s = svg({ from: 'C3', to: 'C5', marks: 'C3 F3 C4 G4 C5', highlight: 'C4' });
    assert.deepEqual($$(s, '.klabel').map((t) => t.textContent), ['C3', 'F3', 'C4', 'middle C', 'G4', 'C5']);
    assert.equal($$(s, '.kdot').length, 5);
    assert.equal(s.querySelector('.kdot.is-highlight').closest('.key').dataset.name, 'C4');
    assert.equal(s.getAttribute('aria-label'), 'Piano keys from C3 to C5, with C3, F3, C4, G4, C5 marked');
  });

  it('can name only middle C, and write every key’s name on it', () => {
    const s = svg({ from: 'G3', to: 'D6', marks: 'C4', highlight: 'C4', names: false, keyNames: true });
    assert.deepEqual($$(s, '.klabel').map((t) => t.textContent), ['middle C']);
    assert.deepEqual($$(s, '.kname:not(.on-black)').slice(0, 3).map((t) => t.textContent), ['G3', 'A3', 'B3']);
    assert.deepEqual($$(s, '.kname.on-black').slice(0, 2).map((t) => t.textContent), ['G♯', 'A♭']);
  });
});
