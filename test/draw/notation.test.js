import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { parseRhythm } from '../../js/music/rhythm.js';
import { DRUMS, drawDrums, drawRhythm } from '../../js/draw/notation.js';
import { GLYPHS } from '../../js/draw/glyphs.js';

// Draw, then read it back as a DOM.
const svg = (markup) => new JSDOM(`<body>${markup}</body>`).window.document.querySelector('svg');
const line = (text, time = '4/4', opts) => svg(drawRhythm(parseRhythm(text, time), opts));
const drums = (hands, feet, time = '4/4', opts) =>
  svg(drawDrums({ up: parseRhythm(hands, time, ['hh']), down: parseRhythm(feet, time, ['bd']) }, opts));
const glyphs = (el, name) => [...el.querySelectorAll('path.glyph')].filter((p) => p.getAttribute('d') === GLYPHS[name].d);
const xOf = (el) => Number(/translate\(([-\d.]+)/.exec(el.getAttribute('transform'))[1]);

describe('one-line rhythms', () => {
  it('is an accessible SVG, each note or rest in a group the player can light up', () => {
    const s = line('q qr h');
    assert.equal(s.getAttribute('role'), 'img');
    assert.equal(s.getAttribute('aria-label'), 'Rhythm in 4/4: quarter, quarter rest, half');
    assert.deepEqual([...s.querySelectorAll('g.ev')].map((g) => `${g.dataset.voice}:${g.dataset.i}`), ['main:0', 'main:1', 'main:2']);
  });

  it('uses the right note head, rest, flag and stem for each value', () => {
    const s = line('w | h hr | q qr e er q');
    assert.deepEqual(['noteheadWhole', 'noteheadHalf', 'noteheadBlack', 'restHalf', 'restQuarter', 'rest8th', 'flag8thUp'].map((g) => glyphs(s, g).length),
      [1, 1, 3, 1, 1, 1, 1]);
    assert.equal(s.querySelectorAll('.stem').length, 4, 'every note but the whole note');
  });

  it('beams eighths in beats (one beam) and sixteenths with two', () => {
    assert.equal(line('e e e e h').querySelectorAll('.beam').length, 2);
    assert.equal(glyphs(line('e e e e h'), 'flag8thUp').length, 0);
    assert.equal(line('s s s s q h').querySelectorAll('.beam').length, 2); // one long, one second beam
    assert.equal(line('e. s q h').querySelectorAll('.beam').length, 2); // beam + stub for the sixteenth
  });

  it('draws dots, ties and triplets', () => {
    assert.equal(glyphs(line('q. e h'), 'augmentationDot').length, 1);
    assert.equal(line('h ~ q q').querySelectorAll('.tie').length, 1);
    const triplets = line('[e e e] [q q q] q');
    assert.equal(glyphs(triplets, 'tuplet3').length, 2);
    assert.equal(triplets.querySelectorAll('.bracket').length, 1); // quarters aren't beamed: bracket
  });

  it('writes the time signature', () => {
    const s = line('e e e e e e', '6/8');
    assert.deepEqual([glyphs(s, 'timeSig6').length, glyphs(s, 'timeSig8').length], [1, 1]);
  });

  it('puts time on the page: longer notes take more room, and a bar line after every bar', () => {
    const xs = [...line('h q q').querySelectorAll('g.ev')].map((g) => xOf(g.querySelector('.glyph')));
    assert.ok(xs[1] - xs[0] > (xs[2] - xs[1]) * 1.9);
    assert.equal(line('h q | q q q', '3/4').querySelectorAll('.barline').length, 2);
  });

  it('writes the count for each note, marking beats and silences', () => {
    const counts = [...line('q er e h', '4/4', { count: true }).querySelectorAll('.count')];
    assert.deepEqual(counts.map((c) => c.textContent), ['1', '2', '&', '3']);
    assert.deepEqual(counts.map((c) => c.classList.contains('is-beat')), [true, true, false, true]);
    assert.deepEqual(counts.map((c) => c.classList.contains('is-rest')), [false, true, false, false]);
  });
});

describe('drum staff', () => {
  it('has five lines, a percussion clef and two voices: hi-hat as ×, snare and bass drum as notes', () => {
    const s = drums('e:hh e:hh e:hh+sn e:hh e:hh e:hh e:hh+sn e:hh', 'q:bd qr q:bd qr');
    assert.equal(s.querySelectorAll('.staff-line').length, 5);
    assert.equal(glyphs(s, 'unpitchedPercussionClef1').length, 1);
    assert.deepEqual(['up', 'down'].map((v) => s.querySelectorAll(`g.ev[data-voice="${v}"]`).length), [8, 4]);
    assert.equal(glyphs(s, 'noteheadXBlack').length, 8);
    assert.equal(glyphs(s, 'noteheadBlack').length, 2 + 2); // snare ×2, bass drum ×2
  });

  it('leaves a silent gap blank, and beams eighths within a beat', () => {
    const s = drums('e:hh e:hh e:hh e:hh e:hh e:hh e:hh e:hh', 'q:bd q_ e:bd e:bd q_');
    assert.equal(s.querySelectorAll('g.ev[data-voice="down"]').length, 3, 'the two gaps draw nothing');
    assert.ok(['restQuarter', 'rest8th'].every((r) => glyphs(s, r).length === 0), 'no rests at all');
    assert.equal(glyphs(s, 'flag8thDown').length, 0, 'the eighths share a beam instead of flags');
  });

  it('writes a cross-stick as an × in the snare’s space', () => {
    assert.equal(DRUMS.rim.y, DRUMS.sn.y);
    assert.equal(glyphs(drums('e:hh+rim e:hh e:hh e:hh e:hh e:hh e:hh e:hh', 'w:bd'), 'noteheadXBlack').length, 9);
  });

  it('counts a beat as sounding when either voice plays', () => {
    const counts = [...drums('qr q:hh q:hh+sn', 'q:bd hr', '3/4', { count: true }).querySelectorAll('.count')];
    assert.deepEqual(counts.map((c) => c.textContent), ['1', '2', '3']);
    assert.equal(counts[0].classList.contains('is-rest'), false); // hands rest, foot plays
  });
});
