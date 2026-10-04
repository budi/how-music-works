import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { drawStaff } from '../../js/draw/staff.js';
import { GLYPHS } from '../../js/draw/glyphs.js';

const svg = (opts) => new JSDOM(`<body>${drawStaff(opts)}</body>`).window.document.querySelector('svg');
const glyphs = (el, name) => [...el.querySelectorAll('path.glyph')].filter((p) => p.getAttribute('d') === GLYPHS[name].d);
const headYs = (s) => [...s.querySelectorAll('.sn .head')].map((p) => Number(/translate\([\d.]+ (-?[\d.]+)\)/.exec(p.getAttribute('transform'))[1]));
const height = (s) => Number(s.getAttribute('viewBox').split(' ')[3]);

describe('drawing a staff', () => {
  it('draws a clef, five lines and a note for each name, labelled', () => {
    const s = svg({ clef: 'treble', notes: 'E4 G4 B4', labels: 'letters' });
    assert.equal(glyphs(s, 'gClef').length, 1);
    assert.equal(s.querySelectorAll('.staff-line').length, 5);
    assert.deepEqual([...s.querySelectorAll('.sn')].map((g) => g.dataset.midi), ['64', '67', '71']);
    assert.deepEqual([...s.querySelectorAll('.sn-label')].map((t) => t.textContent), ['E', 'G', 'B']);
    assert.equal(s.getAttribute('aria-label'), 'Treble clef: E4, G4, B4');
  });

  it('draws higher notes higher', () => {
    const s = svg({ clef: 'bass', notes: 'G2 C3 A3' });
    const ys = headYs(s);
    assert.ok(ys[0] > ys[1] && ys[1] > ys[2], ys.join(' '));
    assert.equal(glyphs(s, 'fClef').length, 1);
  });

  it('draws ledger lines for notes off the staff', () => {
    const s = svg({ clef: 'treble', notes: 'C4 A3 E4 C6' });
    const count = (i) => s.querySelectorAll(`.sn[data-i="${i}"] .ledger`).length;
    assert.deepEqual([0, 1, 2, 3].map(count), [1, 2, 0, 2]);
  });

  it('draws sharps, flats and naturals before their notes, and names them', () => {
    const s = svg({ clef: 'treble', notes: 'F#4 Bb4 Bn4', labels: 'letters' });
    assert.deepEqual(['accidentalSharp', 'accidentalFlat', 'accidentalNatural'].map((g) => glyphs(s, g).length), [1, 1, 1]);
    assert.deepEqual([...s.querySelectorAll('.sn-label')].map((t) => t.textContent), ['F♯', 'B♭', 'B♮']);
  });

  it('joins a grand staff with a brace and puts each note on its staff', () => {
    const s = svg({ clef: 'grand', notes: 'C4@b C4@t', labels: 'names' });
    assert.equal(glyphs(s, 'brace').length, 1);
    assert.equal(s.querySelectorAll('.staff-line').length, 10);
    assert.equal(glyphs(s, 'gClef').length + glyphs(s, 'fClef').length, 2);
    const ys = headYs(s);
    assert.ok(ys[0] > ys[1], 'middle C on the bass staff is drawn lower on the page');
    assert.deepEqual([...s.querySelectorAll('.sn-label')].map((t) => t.textContent), ['C4', 'C4']);
  });

  it('keeps one height, given the room, wherever the note is', () => {
    const quiz = (note) => svg({ clef: 'treble', notes: note, width: 14, room: [-5, 13], title: 'Which note is this?' });
    assert.equal(height(quiz('G3')), height(quiz('D6')));
    assert.equal(height(quiz('G3')), height(quiz('B4')));
    assert.equal(quiz('B4').getAttribute('aria-label'), 'Which note is this?');
  });
});
