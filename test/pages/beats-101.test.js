import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as wait } from 'node:timers/promises';
import { loadPage, click, until } from '../helpers.js';
import { FakeAudioContext } from '../fake-audio.js';
import { parseRhythm } from '../../js/music/rhythm.js';
import { rhythmTimeline } from '../../js/audio/timeline.js';

let window;
const $ = (selector, scope = window.document) => scope.querySelector(selector);
const $$ = (selector, scope = window.document) => [...scope.querySelectorAll(selector)];
const exercise = (name) => $$('figure.rhythm').find((f) => f.querySelector('figcaption b').textContent === name);
const audio = () => FakeAudioContext.instances.at(-1);

beforeEach(async () => {
  FakeAudioContext.instances = [];
  window = await loadPage('beats-101.html', { setup: (w) => { w.AudioContext = FakeAudioContext; } });
});
// a playing exercise keeps timers running; closing the window stops them
afterEach(() => window.close());

describe('beats page', () => {
  it('draws every exercise', () => {
    const figs = $$('figure.rhythm');
    assert.ok(figs.length >= 30);
    for (const fig of figs) {
      assert.ok($('svg.score', fig), fig.querySelector('b').textContent + ' has notation');
      assert.equal($('.rhythm-error', fig), null, fig.querySelector('b').textContent + ' has no error');
    }
  });

  it('writes the drum beats without rests, except where silence is the point', () => {
    const start = $$('h2').find((h) => h.textContent === 'Common drum beats');
    const end = $$('h2').find((h) => h.textContent === 'Practise it');
    const figs = $$('figure.rhythm').filter((f) =>
      start.compareDocumentPosition(f) & window.Node.DOCUMENT_POSITION_FOLLOWING && end.compareDocumentPosition(f) & window.Node.DOCUMENT_POSITION_PRECEDING);
    const withRests = figs.filter((f) => {
      const d = f.dataset;
      const lines = d.pattern ? [d.pattern] : [d.hands, d.feet].filter(Boolean);
      return lines.some((line) => parseRhythm(line, d.time).events.some((e) => e.rest && !e.hidden)); // drawn rests
    }).map((f) => $('figcaption b', f).textContent);
    assert.deepEqual(withRests, [], 'silent beats are left blank');
  });

  it('draws drum beats on a drum staff', () => {
    const rock = exercise('Rock beat');
    assert.equal($$('.staff-line', rock).length, 5);
    assert.equal($$('g.ev[data-voice="up"]', rock).length, 8);
    assert.equal($$('g.ev[data-voice="down"]', rock).length, 2, 'two quarters, 1 and 3, and no rests drawn');
  });

  it('gives full exercises tempo, metronome and count-in, with the beat note for the time; compact ones just Play', () => {
    const full = exercise('Four beats to a bar');
    assert.ok($('.rhythm-play', full));
    assert.equal($('.rhythm-tempo output', full).textContent, '80');
    assert.equal($$('input[type="checkbox"]', full).length, 2);
    assert.ok($$('.count', full).length > 0);

    const compact = exercise('Whole note');
    assert.equal($$('.rhythm-controls > *', compact).length, 1);
    assert.equal($$('.count', compact).length, 0);
    assert.match($('.rhythm-tempo', full).textContent, /♩ = 80/);
    assert.match($('.rhythm-tempo', exercise('6/8: two beats of three')).textContent, /♩\. = 60/);
  });
});

describe('playing', () => {

  it('counts in, then lights up the note and count that are sounding', async () => {
    const fig = exercise('Four beats to a bar'); // 80 bpm: a beat is 0.75 s
    $('.rhythm-play', fig).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    audio().currentTime = 0.1;
    await until(() => $('.rhythm-status', fig).textContent === '1');
    assert.equal($('.rhythm-status', fig).textContent, '1');

    audio().currentTime = 3.08 + 0.75 + 0.05; // count-in over, into beat 2
    await until(() => $$('.is-now', fig).some((el) => el.dataset.i === '1'));
    assert.equal($('.rhythm-status', fig).textContent, '');
    assert.deepEqual($$('.is-now', fig).map((el) => el.tagName.toLowerCase() + ':' + el.dataset.i), ['g:1', 'text:1']);

    $('.rhythm-play', fig).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal($$('.is-now', fig).length, 0, 'stopping clears the highlight');
  });

  it('plays a single drum from the "hear each one" buttons', () => {
    click(window, '[data-hit="sn"]');
    assert.ok(audio().started.some((s) => s.kind === 'noise'));
  });
});

describe('sight-reading (made-up rhythms)', () => {
  const fig = () => exercise('Sight-reading');
  const lines = () => $$('.rhythm-line', fig());
  const drawn = () => lines().map((l) => l.querySelector('svg'));
  const width = (svg) => Number(svg.getAttribute('viewBox').split(' ')[2]);
  const press = (selector) => $(selector, fig()).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const choose = (setting, value) => {
    const select = $(`select[data-setting="${setting}"]`, fig());
    select.value = value;
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
  };

  it('draws eight bars on two lines of four, each as two scores of two bars, counted', () => {
    assert.equal(lines().length, 2);
    lines().forEach((line, i) => {
      const parsed = parseRhythm(line.dataset.pattern, '4/4');
      assert.equal(parsed.bars, 4);
      const svgs = $$('svg', line);
      assert.equal(svgs.length, 2);
      assert.deepEqual(svgs.map((svg) => $$('.timesig', svg).length), [1, 0], 'one time signature, at the start');
      assert.match(svgs[0].getAttribute('aria-label'), /^Rhythm in 4\/4/);
      // notes numbered straight through both scores, as the player counts them
      const voice = ['a', 'b'][i];
      const evs = $$('g.ev', line);
      assert.ok(evs.every((g) => g.dataset.voice === voice));
      assert.deepEqual(evs.map((g) => Number(g.dataset.i)), Array.from(parsed.events, (e) => e.index));
      assert.ok($$('.count', line).length > 0);
    });
  });

  it('draws every score at one scale, and both lines the same length', () => {
    const lineWidths = lines().map((line) => $$('svg', line).reduce((sum, svg) => sum + width(svg), 0));
    assert.ok(Math.abs(lineWidths[0] - lineWidths[1]) < 0.01, 'same spacing for the level');
    const svgs = $$('.rhythm-line svg', fig());
    const widest = Math.max(...svgs.map(width));
    assert.equal(Number($('.rhythm-score', fig()).style.getPropertyValue('--w')), widest);
    for (const svg of svgs) assert.equal(parseFloat(svg.style.width), width(svg) / widest * 100);
  });

  it('changes bars 1-4 while 5-8 play, and 5-8 when back on bar 1', async () => {
    $$('input[type="checkbox"]', fig()).forEach((box) => {
      box.checked = false;
      box.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    const first = drawn();
    press('.rhythm-play');
    const line = 4 * 4 * 60 / 72; // four bars of 4/4 at 72: 13.33 s

    audio().currentTime = 1;
    await wait(60);
    assert.deepEqual(drawn(), first, 'nothing changes the first time through bars 1-4');

    audio().currentTime = 0.08 + line + 0.1; // bar 5
    await until(() => drawn()[0] !== first[0]);
    const second = drawn();
    assert.notEqual(second[0], first[0], 'bars 1-4 are new');
    assert.equal(second[1], first[1], 'bars 5-8 stay while they play');

    audio().currentTime = 0.08 + 2 * line + 0.1; // bar 1 again
    await until(() => drawn()[1] !== second[1] && $$('.is-now', lines()[0]).length > 0);
    const third = drawn();
    assert.equal(third[0], second[0], 'bars 1-4 stay while they play');
    assert.notEqual(third[1], second[1], 'bars 5-8 are new');
    assert.ok($$('.is-now', lines()[0]).length > 0, 'and bar 1 lights up');
    press('.rhythm-play');
  });

  it('makes up a new rhythm on request, keeps playing it from bar 1', () => {
    const before = drawn();
    press('.rhythm-play');
    press('.rhythm-new');
    const after = drawn();
    assert.notEqual(after[0], before[0]);
    assert.notEqual(after[1], before[1]);
    assert.equal($('.rhythm-play', fig()).getAttribute('aria-pressed'), 'true');
    press('.rhythm-play');
  });

  it('hides the counts on request, and keeps them hidden for new bars', () => {
    const box = $('input[data-setting="counts"]', fig());
    assert.ok(box.checked, 'shown to start');
    assert.ok(!fig().classList.contains('hide-counts'));
    const before = drawn();
    box.checked = false;
    box.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.ok(fig().classList.contains('hide-counts'));
    assert.deepEqual(drawn(), before, 'the same rhythm, just without its counts');
    press('.rhythm-new');
    assert.ok(fig().classList.contains('hide-counts'), 'still hidden for a new rhythm');
    assert.ok($$('.count', fig()).length > 0, 'drawn, but hidden by CSS');
    box.checked = true;
    box.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.ok(!fig().classList.contains('hide-counts'));
  });

  it('follows the time signature and level chosen', () => {
    choose('time', '6/8');
    assert.match($('.rhythm-tempo', fig()).textContent, /♩\. = 72/);
    for (const line of lines()) {
      assert.match(line.querySelector('svg').getAttribute('aria-label'), /^Rhythm in 6\/8/);
      assert.equal(parseRhythm(line.dataset.pattern, '6/8').bars, 4);
    }
    choose('time', '4/4');
    choose('level', '1');
    for (const line of lines()) assert.doesNotMatch(line.dataset.pattern, /s|\[|\./);
    choose('level', 'swing-3');
    for (const line of lines()) assert.doesNotMatch(line.dataset.pattern, /\bs\b|e\./, 'no sixteenths to swing');
  });

  it('offers each level straight, then swung', () => {
    const menu = $$('select[data-setting="level"] option', fig());
    assert.deepEqual(menu.map((o) => o.textContent), ['Easy', 'Medium', 'Hard', 'Swing easy', 'Swing medium', 'Swing hard']);
    assert.deepEqual(menu.map((o) => o.value), ['1', '2', '3', 'swing-1', 'swing-2', 'swing-3']);
  });

  it('plays the swing levels swung: each "&" late, where a triplet’s last note would be', async () => {
    choose('level', 'swing-2');
    const slider = $('input[type="range"]', fig());
    slider.value = '60'; // a beat a second
    slider.dispatchEvent(new window.Event('input', { bubbles: true }));
    $$('input[type="checkbox"]', fig()).forEach((box) => {
      box.checked = false;
      box.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    // bars 1-4 as written, swung or not: new bars until swing changes them
    const notes = (swing) => rhythmTimeline({ a: parseRhythm(lines()[0].dataset.pattern, '4/4') }, { bpm: 60, swing })
      .notes.map((n) => Math.round(n.at * 1000));
    for (let k = 0; k < 20 && String(notes(true)) === String(notes(false)); k++) press('.rhythm-new');
    const swung = notes(true);
    assert.notDeepEqual(swung, notes(false));

    press('.rhythm-play');
    audio().currentTime = 16; // bars 1-4 played
    const claps = () => audio().started.filter((s) => s.type === 'triangle' && s.frequency === 900)
      .map((s) => Math.round((s.at - 0.08) * 1000)).filter((ms) => ms < 16000); // from the first note, 0.08 s in
    await until(() => claps().length >= swung.length);
    assert.deepEqual(claps(), swung);
    press('.rhythm-play');
  });

  it('only swings simple time: a swing level moves 6/8 to 4/4, and takes it off the menu', () => {
    const times = $('select[data-setting="time"]', fig());
    const option = (t) => [...times.options].find((o) => o.value === t);
    choose('time', '6/8');
    choose('level', 'swing-1');
    assert.equal(times.value, '4/4');
    assert.match($('.rhythm-tempo', fig()).textContent, /♩ = 72/);
    for (const line of lines()) assert.match(line.querySelector('svg').getAttribute('aria-label'), /^Rhythm in 4\/4/);
    assert.ok(option('6/8').disabled);
    assert.ok(!option('3/4').disabled, 'a jazz waltz swings');
    choose('level', '1');
    assert.ok(!option('6/8').disabled, 'back for the straight levels');
  });
});
