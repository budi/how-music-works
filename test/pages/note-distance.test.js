import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadPage, texts, until } from '../helpers.js';
import { FakeAudioContext } from '../fake-audio.js';

let window;
const $ = (selector, scope = window.document) => scope.querySelector(selector);
const $$ = (selector, scope = window.document) => [...scope.querySelectorAll(selector)];
const press = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const exercise = (name) => $$('figure.interval-ex').find((f) => $('figcaption b', f).textContent === name);
const audio = () => FakeAudioContext.instances.at(-1);
const played = () => audio().started.filter((s) => s.kind === 'noise').length;
// the player schedules a moment ahead: move its clock on until `n` notes have sounded
async function heard(n) {
  audio().currentTime += 1.5;
  await until(() => played() >= n);
  return played();
}

// random() = 0 everywhere, so the ear check always asks do → re (or high do → do)
async function load(storage = {}) {
  FakeAudioContext.instances = [];
  window = await loadPage('note-distance.html', {
    storage,
    setup: (w) => { w.AudioContext = FakeAudioContext; w.Math.random = () => 0; },
  });
}

beforeEach(() => load());
afterEach(() => window.close());

describe('drawings', () => {
  it('draws one octave of keys from C, the scale on white keys, each step labelled', () => {
    const c = '.keys[data-do="C"]';
    assert.equal($$(`${c} .kw`).length, 8);
    assert.equal($$(`${c} .kb`).length, 5);
    assert.deepEqual(texts(window, `${c} .kname`), ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C']);
    assert.deepEqual(texts(window, `${c} .kbname`).slice(0, 2), ['C♯', 'D♭'], 'a black key has a name from each side');
    assert.deepEqual(texts(window, `${c} .ksyl`), ['do', 're', 'mi', 'fa', 'sol', 'la', 'ti', 'do']);
    assert.deepEqual(texts(window, `${c} .kstepl`), ['whole', 'whole', 'half', 'whole', 'whole', 'whole', 'half']);
    assert.equal($$(`${c} .kdot.on-black`).length, 0, 'only white keys from C');
  });

  it('draws the same steps from D, which need F♯ and C♯', () => {
    const d = '.keys[data-do="D"]';
    assert.deepEqual(texts(window, `${d} .kname`), ['D', 'E', 'F', 'G', 'A', 'B', 'C', 'D']);
    assert.deepEqual(texts(window, `${d} .kstepl`), ['whole', 'whole', 'half', 'whole', 'whole', 'whole', 'half']);
    const onBlack = $$(`${d} .kdot.on-black`).map((dot) => Number(dot.getAttribute('cx')));
    const blackKey = (name) => Number($$(`${d} .kbname`).find((t) => t.textContent === name).getAttribute('x'));
    assert.deepEqual(onBlack, [blackKey('F♯'), blackKey('C♯')]);
  });

  it('draws the scale as a staircase: W W H W W W H', () => {
    assert.equal($$('#staircase .stair').length, 8);
    assert.deepEqual(texts(window, '#staircase .sstep'), ['W', 'W', 'H', 'W', 'W', 'W', 'H']);
    const heights = $$('#staircase .stair').map((r) => Number(r.getAttribute('height')));
    assert.deepEqual(heights, [...heights].sort((a, b) => a - b), 'each stair higher than the last');
  });

  it('tabulates the distance from do to every note, with a dotted high do', () => {
    const rows = $$('#from-do tbody tr').map((tr) => [...tr.cells].slice(1, 4).map((c) => c.textContent));
    assert.deepEqual(rows.map((r) => r[0]), ['2', '4', '5', '7', '9', '11', '12']);
    assert.deepEqual(rows.at(-1), ['12', '6 whole steps', 'octave']);
    assert.ok($('#from-do tbody tr:last-child .hi'), 'high do drawn with its dot');
    assert.ok($$('#from-do .song').every((td) => td.textContent), 'a song for every note, ti too');
  });

  it('plays do and each note from the table', async () => {
    assert.equal($$('#from-do thead th').at(-1).textContent, 'Hear it');
    const buttons = $$('#from-do .hear-it');
    assert.deepEqual(buttons.map((b) => b.getAttribute('aria-label')).slice(-2), ['Hear do to ti', 'Hear do to high do']);
    press(buttons[2]); // do to fa
    assert.ok(buttons[2].classList.contains('is-sounding'));
    assert.equal(await heard(2), 2);
    press(buttons[3]); // another one takes over
    assert.ok(!buttons[2].classList.contains('is-sounding'));
    assert.ok(buttons[3].classList.contains('is-sounding'));
  });
});

describe('your do', () => {
  it('starts on middle C, plays and remembers another choice, and plays it again on request', async () => {
    assert.equal($$('#your-do [data-do]').length, 8);
    assert.equal($$('#your-do [data-do]').at(-1).textContent, 'C4');
    assert.equal($('#your-do > :last-child').textContent, 'Hear again');
    assert.equal($('#your-do [aria-pressed="true"]').textContent, 'C4');
    press($('#your-do [data-do="57"]'));
    assert.equal($('#your-do [aria-pressed="true"]').textContent, 'A3');
    assert.equal(window.localStorage.getItem('music.do'), '57');
    assert.equal(await heard(2), 2, 'plays do and high do to try it');
    press($('#your-do .yd-hear'));
    assert.equal(await heard(4), 4);

    window.close();
    await load({ 'music.do': '57' });
    assert.equal($('#your-do [aria-pressed="true"]').textContent, 'A3');
  });
});

describe('sung exercises', () => {
  it('lays out every pattern in groups, each note with its number and syllable', () => {
    const figs = $$('figure.interval-ex');
    assert.deepEqual(figs.map((f) => $('.rhythm-tempo output', f).textContent), ['80', '80', '80', '80']);
    assert.equal(figs.length, 4);
    for (const fig of figs) {
      const pattern = fig.dataset.pattern.split(' ');
      assert.equal($$('.chip', fig).length, pattern.length);
      assert.ok($('.ladder', fig));
    }
    const leaps = exercise('Leaps up from do');
    assert.equal($$('.group', leaps).length, 7);
    assert.deepEqual(texts(window, 'figure.interval-ex:nth-of-type(2) .chip').slice(0, 2), ['1do', '2re']);
    assert.equal($$('.chip .hi', leaps).length, 1, 'the high do');
    assert.equal($$('.group', exercise('Walk the scale')).length, 2);
  });

  it('plays, lights the note, and draws the jump on the ladder', async () => {
    const fig = exercise('Leaps up from do'); // 80 bpm
    $('input[data-option="countIn"]', fig).click();
    press($('.rhythm-play', fig));
    assert.equal($('.rhythm-play', fig).textContent, 'Stop');
    assert.equal(played(), 1, 'the first note straight away');

    audio().currentTime = 0.08 + 60 / 80 + 0.05; // the 2nd note: re
    await until(() => $('.chip.is-now', fig)?.dataset.i === '1');
    assert.equal($('.chip.is-now', fig).dataset.i, '1');
    assert.equal($('.iv-now', fig).textContent, 'do → re: up 2 semitones · 1 whole step · major 2nd');
    assert.equal($('.ljumpl', fig).textContent, '+2');
    assert.equal($('.lnote.is-now', fig).dataset.degree, '2');
    assert.equal($('.lnote.is-from', fig).dataset.degree, '1');

    press($('.rhythm-play', fig));
    assert.equal($('.rhythm-play', fig).textContent, 'Play');
    assert.equal($$('.is-now', fig).length, 0);
    assert.equal($('.ljumpl', fig).textContent, '');
  });
});

describe('ear check', () => {
  const ec = () => $('#ear-check');
  const answer = (degree) => $(`.ec-answer[data-degree="${degree}"]`, ec());

  it('waits for a question before taking answers, which are notes, not sizes', () => {
    assert.deepEqual($$('.ec-answer', ec()).map((b) => b.textContent), ['2re', '3mi', '4fa', '5sol', '6la', '7ti', '1do']);
    assert.ok($('.ec-answer:last-child .hi', ec()), 'high do, dotted');
    assert.ok($$('.ec-answer', ec()).every((b) => b.disabled));
    assert.ok($('.ec-again', ec()).disabled);
  });

  it('plays two notes, lets you retry, and shows the jump when you get it', async () => {
    press($('.ec-new', ec()));
    assert.equal(await heard(2), 2);
    assert.ok($$('.ec-answer', ec()).every((b) => !b.disabled));

    press(answer(3)); // the question is do → re
    assert.ok(answer(3).classList.contains('is-wrong'));
    assert.equal(await heard(4), 4, 'plays it again after a wrong answer');
    assert.match($('.ec-result', ec()).textContent, /Not that one/);

    press(answer(2));
    assert.ok(answer(2).classList.contains('is-right'));
    assert.equal($('.ec-result', ec()).textContent, 'Yes: do → re is up 2 semitones · 1 whole step · major 2nd.');
    assert.equal($('.ec-score', ec()).textContent, '0 of 1 right first time.');
    assert.equal($('.ljumpl', ec()).textContent, '+2');
    assert.ok($$('.ec-answer', ec()).filter((b) => b !== answer(2)).every((b) => b.disabled), 'done: the rest are locked');

    press($('.ec-new', ec())); // not do → re again, though random() is the same
    press(answer(3));
    assert.match($('.ec-result', ec()).textContent, /^Yes: do → mi/);
    assert.equal($('.ec-score', ec()).textContent, '1 of 2 right first time.');

    press($('.ec-new', ec())); // and re can come back after that
    press(answer(2));
    assert.match($('.ec-result', ec()).textContent, /^Yes: do → re/);
  });

  it('can go down from high do', () => {
    const select = $('.ec-direction', ec());
    select.value = 'down';
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.deepEqual($$('.ec-answer', ec()).map((b) => b.textContent), ['7ti', '6la', '5sol', '4fa', '3mi', '2re', '1do']);
    press($('.ec-new', ec()));
    press(answer(1)); // high do → do
    assert.equal($('.ec-result', ec()).textContent, 'Yes: high do → do is down 12 semitones · 6 whole steps · octave.');
    assert.equal($('.ljumpl', ec()).textContent, '−12');
  });
});
