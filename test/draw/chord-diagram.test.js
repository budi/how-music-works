import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseGuitar } from '../../js/music/guitar.js';
import { drawGuitarChord, drawPianoChord } from '../../js/draw/chord-diagram.js';

const count = (svg, pattern) => (svg.match(new RegExp(pattern, 'g')) || []).length;
const guitar = (frets, opts) => drawGuitarChord(parseGuitar(frets), opts);

describe('guitar diagrams', () => {
  it('is an SVG coloured by quality, with a title when asked', () => {
    const svg = guitar('x 3 2 0 1 0', { root: 'C', quality: 'maj', title: 'C major' });
    assert.match(svg, /^<svg class="diagram q-maj"/);
    assert.match(svg, /<title>C major<\/title>/);
  });

  it('marks muted, open and fretted strings', () => {
    const svg = guitar('x 3 2 0 1 0', { root: 'C', quality: 'maj' });
    assert.equal(count(svg, 'class="mark">×'), 1);
    assert.equal(count(svg, 'class="open"'), 2); // G and high E
    assert.equal(count(svg, 'class="dot"'), 3);
  });

  it('marks every string sounding the root with an R, open ones included', () => {
    assert.equal(count(guitar('x 3 2 0 1 0', { root: 'C' }), 'class="root-ring"'), 2); // C on strings 5 and 2
    const e = guitar('0 2 2 1 0 0', { root: 'E' });
    assert.deepEqual([count(e, 'class="open-root"'), count(e, 'class="root-ring"')], [2, 1]);
  });

  it('draws the nut for chords near it, and a fret number further up or on a movable shape', () => {
    const low = guitar('x 2 4 4 3 2 (barre 5-1)', {});
    assert.deepEqual([count(low, 'class="nut"'), count(low, 'fretno')], [1, 0]);
    const high = guitar('x 6 8 8 7 6 (barre 5-1)', {});
    assert.equal(count(high, 'class="nut"'), 0);
    assert.match(high, />6fr</);
    assert.match(guitar('1 3 3 2 1 1 (barre 6-1)', { movable: true }), />1fr</);
  });

  it('draws a barre instead of dots under it', () => {
    const svg = guitar('1 3 3 2 1 1 (barre 6-1)', {});
    assert.equal(count(svg, '<rect class="dot"'), 1);
    assert.equal(count(svg, '<circle class="dot"'), 3); // strings 5, 4, 3
  });
});

describe('piano diagrams', () => {
  const notes = (...list) => list.map(([name, pitch, extra = {}]) => ({ name, pitch, ...extra }));
  const whites = (svg) => count(svg, 'class="white');

  it('is at least 8 white keys wide, and wider for big chords', () => {
    assert.equal(whites(drawPianoChord(notes(['C', 0], ['E', 4], ['G', 7]), {})), 8);
    assert.equal(whites(drawPianoChord(notes(['E', 4], ['G', 7], ['D', 14], ['C', 24]), {})), 13); // E up to the next-but-one C
  });

  it('lights up and labels the chord notes, fading the optional ones', () => {
    const svg = drawPianoChord(notes(['C', 0, { root: true }], ['Eb', 3], ['Gb', 6], ['A', 9, { faded: true }]), { quality: 'dim' });
    assert.deepEqual([count(svg, 'class="white on'), count(svg, 'class="black on')], [2, 2]);
    assert.match(svg, /class="pk pkb">Eb</);
    assert.match(svg, /class="pkr">R</);
    assert.equal(count(svg, 'faded'), 1);
  });

  it('starts on the letter of a sharp bass note', () => {
    // C# sits right of C, so the strip starts on C; E# starts on E
    assert.match(drawPianoChord(notes(['C#', 1], ['E#', 5], ['G#', 8]), {}), /<rect class="white" x="1"/);
    assert.match(drawPianoChord(notes(['E#', 5], ['G#', 8], ['B', 11]), {}), /<rect class="white" x="1"[^>]*\/><rect class="white on" x="16"/);
  });
});
