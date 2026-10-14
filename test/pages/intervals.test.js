import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { audio, loadPage, played, press, queries, seeded, until } from '../helpers.js';
import { intervalPosition, rootPosition } from '../../js/music/guitar.js';
import { parsePitch } from '../../js/music/pitch.js';
import { LEVELS, biggerQuestion } from '../../js/pages/intervals/bigger.js';

let window;
const { $, $$, text } = queries(() => window);

beforeEach(async () => {
  window = await loadPage('intervals.html', { audio: true, random: 0, storage: { 'music.instrument': 'guitar' } });
});
afterEach(() => window.close());

describe('every interval at a glance', () => {
  it('has a row for each, unison to octave, and plays it', () => {
    const rows = $$('#interval-table tbody tr');
    assert.equal(rows.length, 13);
    assert.deepEqual($$('td', rows[4]).slice(0, 3).map((td) => td.textContent), ['3', '4', 'C–E']);
    assert.equal(text('th', rows[6]), 'TT tritone');
    assert.equal(text('td:nth-child(4)', rows[8]), 'C–A♭');
    press($('.iv-hear', rows[7]));
    assert.equal(played(), 1, 'C now, G to come');
  });
});

describe('any interval from any note', () => {
  const ex = () => $('#interval-explorer');
  const choose = (attr, value) => press($(`[data-${attr}="${value}"]`, ex()));

  it('starts on a major 3rd from C, named, counted and drawn', () => {
    assert.equal(text('.iv-name', ex()), 'C up to E: a major 3rd (M3)');
    assert.equal(text('.iv-count', ex()), '3 letters: C D E · 4 half steps');
    assert.equal(text('.iv-quality', ex()), 'Major: the 3 of C major. A half step smaller makes a minor 3rd: C to E♭.');
    assert.deepEqual($$('.iv-staff .sn-label', ex()).map((t) => t.textContent), ['C', 'E']);
    assert.deepEqual($$('.iv-keys .ktag', ex()).map((t) => t.closest('.key').dataset.midi + t.textContent), ['60C', '64E']);
    const from = rootPosition('C');
    const to = intervalPosition(from, 4);
    assert.ok($(`.iv-neck .spot.is-root[data-string="${from.string}"][data-fret="${from.fret}"]`, ex()));
    assert.ok($(`.iv-neck .spot.is-marked[data-string="${to.string}"][data-fret="${to.fret}"]`, ex()));
    assert.equal(text('.iv-reach', ex()), 'One string over, one fret down.');
  });

  it('puts the guitar’s root on string 6, 5, 4 or 3, off the nut, for every choice after', () => {
    const at = (cls) => { const s = $(`.iv-neck .spot.${cls}`, ex()); return `${s.dataset.string}:${s.dataset.fret}`; };
    const string = () => text('.iv-strings [aria-pressed="true"]', ex());
    assert.equal(string(), '5', 'C starts on string 5');
    choose('string', '3');
    assert.equal(at('is-root'), '3:5');
    assert.equal(at('is-marked:not(.is-root)'), '2:5', 'E: the same fret, a string over');
    assert.equal(text('.iv-reach', ex()), 'One string over, at the same fret. Crossing from string 3 to string 2 moves it up a fret: ' +
      'string 2 is tuned a half step closer to string 3 than the other strings are to their neighbours.');
    choose('root', 'G');
    assert.equal(string(), '3', 'the string stays picked');
    assert.equal(at('is-root'), '3:12', 'not the open G: up an octave, so the shape is the one that moves');
    assert.equal($$('.iv-neck .spot[data-string="1"]', ex()).length, 13, 'frets 0 to 12 still fit it');
    choose('string', '4');
    choose('size', '7');
    assert.equal(at('is-root'), '4:5');
    assert.equal(at('is-marked:not(.is-root)'), '3:7');
    assert.equal(text('.iv-reach', ex()), 'One string over, two frets up.');
  });

  it('leaves out the one key whose intervals need double sharps or flats', () => {
    assert.deepEqual($$('[data-root]', ex()).map((b) => b.textContent), ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A', 'B♭', 'B']);
  });

  it('spells every interval from every root by letter, the tritone whichever way is single', () => {
    choose('root', 'F#');
    choose('size', '6');
    assert.equal(text('.iv-name', ex()), 'F♯ up to B♯: a tritone (TT)');
    assert.match(text('.iv-quality', ex()), /F♯ to B♯ is an augmented 4th; F♯ to C is a diminished 5th\.$/);
    choose('root', 'C#');
    assert.equal(text('.iv-name', ex()), 'C♯ up to G: a tritone (TT)', 'not F𝄪');
    choose('size', '10');
    assert.equal(text('.iv-quality', ex()), 'Minor: a half step smaller than the major 7th, C♯ to B♯.');
    choose('size', '12');
    assert.equal(text('.iv-name', ex()), 'C♯ up to C♯: an octave (P8)');
    assert.equal(text('.iv-count', ex()), '8 letters: C D E F G A B C · 12 half steps');
  });

  it('plays each choice up, and can play both notes together', () => {
    choose('size', '7');
    assert.equal(played(), 1, 'C, then G');
    press($('[data-play="together"]', ex()));
    assert.equal(played(), 3);
  });
});

describe('which is bigger?', () => {
  const quiz = () => $('#which-bigger');
  const answers = () => $$('.ib-answer', quiz());

  it('asks for two intervals the level apart in size, each from a note of its own', () => {
    const random = seeded(11);
    for (const [level, [near, far]] of Object.entries(LEVELS)) {
      const gaps = new Set();
      for (let i = 0; i < 300; i++) {
        const { intervals: [a, b], bigger } = biggerQuestion(level, random);
        const gap = Math.abs(a.size - b.size);
        assert.ok(gap >= near && gap <= far, level);
        assert.ok(a.size >= 1 && b.size <= 12 && a.low !== b.low);
        for (const iv of [a, b]) {
          assert.deepEqual(iv.notes.map((n) => parsePitch(n).midi), [iv.low, iv.low + iv.size], 'spelled as it sounds');
          assert.ok(iv.notes.every((n) => n.length <= 3), `${iv.notes}: no double sharps or flats`);
        }
        assert.equal(bigger, a.size > b.size ? 0 : 1);
        gaps.add(gap);
      }
      assert.equal(gaps.size, far - near + 1, `${level}: every gap comes up`);
    }
  });

  it('plays a pair, lighting each answer as its interval sounds, then says which was bigger', async () => {
    press($('.ib-new', quiz()));
    // random() = 0: a minor 2nd from C3, then a tritone from C♯3
    audio().currentTime = 0.1;
    await until(() => answers()[0].classList.contains('is-now'));
    assert.ok(answers()[0].classList.contains('is-now'));
    audio().currentTime = 0.08 + 4 * 60 / 140 + 0.05; // after the first pair and its gap
    await until(() => answers()[1].classList.contains('is-now'));
    assert.ok(answers()[1].classList.contains('is-now'));
    press(answers()[0]);
    assert.ok(answers()[0].classList.contains('is-wrong'));
    assert.equal(text('.quiz-result', quiz()), 'No: the second was bigger, by 5 half steps.');
    // both named, with bars: the tritone's 5 extra half steps marked
    const rows = $$('.ib-row', quiz());
    assert.deepEqual(rows.map((r) => text('.ib-what', r)), ['The first C3 up to D♭3', 'The second C♯3 up to G3']);
    assert.deepEqual(rows.map((r) => text('.ib-size', r)), ['m2 minor 2nd · 1 half step', 'TT tritone · 6 half steps']);
    assert.deepEqual(rows.map((r) => [$('.ib-bar', r).style.getPropertyValue('--base'), $('.ib-bar', r).style.getPropertyValue('--extra')]),
      [['1', '0'], ['1', '5']]);
    assert.equal(text('.quiz-score', quiz()), '0 of 1 right first time.');
    // each can be heard again on its own, lit while it sounds
    const before = played();
    press($('.iv-hear', rows[1]));
    audio().currentTime += 0.1;
    await until(() => rows[1].classList.contains('is-now'));
    assert.ok(rows[1].classList.contains('is-now') && !rows[0].classList.contains('is-now'));
    assert.equal(played(), before + 1, 'C♯3, then G3');
    press($('.ib-new', quiz()));
    assert.ok($('.ib-reveal', quiz()).hidden, 'a new pair hides the last one’s answer');
    assert.equal($$('.ib-row', quiz()).length, 0);
    assert.equal(text('.quiz-result', quiz()), '');
    assert.ok(answers().every((b) => !b.classList.contains('is-right') && !b.classList.contains('is-wrong')));
    press(answers()[1]);
    assert.match(text('.quiz-result', quiz()), /^Yes: the second/);
    assert.equal(text('.quiz-score', quiz()), '1 of 2 right first time.');
  });

  it('can play the two notes of each interval together', () => {
    $('[data-setting="how"]', quiz()).value = 'together';
    $('[data-setting="how"]', quiz()).dispatchEvent(new window.Event('change', { bubbles: true }));
    press($('.ib-new', quiz()));
    assert.equal(played(), 2, 'both notes of the first interval at once');
  });
});
