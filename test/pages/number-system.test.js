import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadPage, click, texts, until } from '../helpers.js';
import { FakeAudioContext } from '../fake-audio.js';
import { guitarNotes, guitarShapes } from '../../js/music/guitar.js';

let window;
const $ = (selector) => window.document.querySelector(selector);
const $$ = (selector) => [...window.document.querySelectorAll(selector)];

beforeEach(async () => {
  FakeAudioContext.instances = [];
  window = await loadPage('number-system.html', { setup: (w) => { w.AudioContext = FakeAudioContext; } });
});
// a playing progression keeps timers running; closing the window stops them
afterEach(() => window.close());

describe('the row of seven', () => {
  it('shows 1 2m 3m 4 5 6m 7° with their qualities', () => {
    assert.deepEqual(texts(window, '#spine .num'), ['1', '2m', '3m', '4', '5', '6m', '7°']);
    assert.deepEqual(texts(window, '#spine .rom'), ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
    assert.ok($('#spine .slot:last-child').classList.contains('q-dim'));
  });
});

describe('every key, chord by chord', () => {
  it('has a row per key, round the circle of fifths, each spelt in its own key', () => {
    assert.deepEqual(texts(window, '#key-table tbody th'), [
      'C', 'G', 'D', 'A', 'E', 'B', 'F# = Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F',
    ]);
    const row = (n) => [...$$('#key-table tbody tr')[n].querySelectorAll('.ch')].map((e) => e.textContent);
    assert.deepEqual(row(0), ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'B°']);
    assert.deepEqual(row(6), ['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m', 'E#°']);
    assert.deepEqual(row(7), ['Db', 'Ebm', 'Fm', 'Gb', 'Ab', 'Bbm', 'C°']);
  });

  it('gives every chord a guitar and a piano diagram with its spelling', () => {
    const cells = $$('#key-table td');
    assert.equal(cells.length, 84);
    for (const td of cells) {
      assert.ok(td.querySelector('.art.only-g svg'));
      assert.ok(td.querySelector('.art.only-p svg'));
    }
    const b = cells[6];
    assert.equal(b.querySelector('.fr.only-g').textContent, ['x', 2, 3, 1, 3, 'x'].join('\u2009'), 'frets spaced with thin spaces');
    assert.equal(b.querySelector('.fr.only-p').textContent, 'B · D · F · Ab');
  });
});

describe('shape galleries', () => {
  it('draws every hand-written diagram', () => {
    for (const el of $$('.shapeart')) assert.ok(el.querySelector('svg.diagram'), el.outerHTML);
  });
});

describe('circle of fifths', () => {
  const hub = () => [$('.hub b').textContent, $('.hub i').textContent];
  const badges = () =>
    $$('.key[data-badge]').map((k) => `${k.dataset.key}/${k.dataset.ring}=${k.dataset.badge}`).sort();
  const visiblePanels = () => $$('.panel:not([hidden]) h3').map((h) => h.firstChild.textContent.trim());
  const rotation = () => $('.wheel').style.getPropertyValue('--rot');

  it('starts on C', () => {
    assert.deepEqual(hub(), ['C', 'Am']);
    assert.deepEqual(visiblePanels(), ['C major']);
    assert.deepEqual(badges(), ['C/maj=1', 'C/min=6m', 'F/maj=4', 'F/min=2m', 'G/maj=5', 'G/min=3m']);
  });

  it('spins a tapped key to the top, from either ring, and shows its panel', () => {
    click(window, '.key.maj[data-key="E"]');
    assert.deepEqual(hub(), ['E', 'C#m']);
    assert.deepEqual(visiblePanels(), ['E major']);
    assert.equal(rotation(), '-120deg');
    assert.ok($('.key.maj[data-key="E"]').classList.contains('is-home'));
    assert.ok($('.key.min[data-key="A"]').classList.contains('is-near'));
    assert.equal($('.key.maj[data-key="E"]').getAttribute('aria-pressed'), 'true');
    click(window, '.key.min[data-key="G"]'); // Em
    assert.deepEqual(hub(), ['G', 'Em']);
  });

  it('turns the short way round', () => {
    click(window, '.key.maj[data-key="F"]');
    assert.equal(rotation(), '30deg'); // one step anticlockwise, not eleven clockwise
    click(window, '.key.maj[data-key="Db"]');
    assert.equal(rotation(), '150deg');
    click(window, '.key.maj[data-key="B"]');
    assert.equal(rotation(), '210deg'); // keeps going rather than unwinding
  });

  it('describes each key', () => {
    const panel = (key) => $(`.panel[data-key="${key}"]`).textContent;
    assert.match(panel('C'), /relative minor Am · no sharps or flats/);
    assert.match(panel('D'), /2 sharps · F# C#/);
    assert.match(panel('Ab'), /4 flats · Bb Eb Ab Db/);
    assert.match(panel('F#'), /6 sharps · also spelled Gb \/ Ebm with 6 flats/);
    assert.match(panel('C'), /numbered i Am · ii° B° · III C · iv Dm · v Em · VI F · VII G/);
    assert.match(panel('C'), /major E \(or E7\)/);
    assert.match(panel('F#'), /Next door: B is your 4, Db is your 5/);
  });
});

describe('progression builder', () => {
  const chart = () =>
    $$('.xchart .xc').map((c) => {
      const cap = c.querySelector('.cf.only-g figcaption');
      return cap.querySelector('b').textContent + ' ' + cap.lastChild.textContent;
    });
  const pianoChart = () => texts(window, '.xchart .cf.only-p figcaption');
  const pick = (slot, n) => click(window, `.xstage:nth-child(${slot}) .vrow.only-g .vc:nth-of-type(${n})`);

  it('starts with 1 - 6m - 4 - 5 in C, open shapes', () => {
    assert.deepEqual(texts(window, '.xchart .xnum'), ['1 · I', '6m · vi', '4 · IV', '5 · V']);
    assert.deepEqual(chart(), ['C C shape · open', 'Am Am shape · open', 'F E shape · fret 1', 'G G shape · open']);
    assert.deepEqual(pianoChart(), ['CC · E · G', 'AmA · C · E', 'FF · A · C', 'GG · B · D']);
  });

  it('follows the first pick up the neck', () => {
    pick(1, 2); // C: A shape, fret 3
    assert.deepEqual(chart(), [
      'C A shape · fret 3', 'Am Em shape · fret 5', 'F D shape · fret 3', 'G E shape · fret 3',
    ]);
    assert.ok($('.xstage:nth-child(1) .vrow.only-g .vc:nth-of-type(2)').classList.contains('is-selected'));
  });

  it('lets one chord take over, and hand back with "follow previous"', () => {
    pick(2, 4); // Am: 3rd shape — the "follow previous" button is the 1st button in the row
    // F and G now sit nearest fret 7 (a tie goes to the lower shape)
    assert.deepEqual(chart().slice(1), ['Am Dm shape · fret 7', 'F A shape · fret 8', 'G C shape · fret 7']);
    assert.equal($('.xstage:nth-child(2) .vrow.only-g .vauto').getAttribute('aria-pressed'), 'false');

    click(window, '.xstage:nth-child(2) .vrow.only-g .vauto');
    assert.deepEqual(chart().slice(1), ['Am Am shape · open', 'F E shape · fret 1', 'G G shape · open']);
    assert.equal($('.xstage:nth-child(2) .vrow.only-g .vauto').getAttribute('aria-pressed'), 'true');
  });

  it('follows on piano separately', () => {
    click(window, '.xstage:nth-child(1) .vrow.only-p .vc:nth-of-type(3)'); // C, 2nd inversion
    // everything settles nearest that G: Am and F in root position (a tie goes lower)
    assert.deepEqual(pianoChart(), ['CG · C · E', 'AmA · C · E', 'FF · A · C', 'GG · B · D']);
    click(window, '.xstage:nth-child(1) .vrow.only-p .vc:nth-of-type(2)'); // C, 1st inversion (E)
    assert.deepEqual(pianoChart(), ['CE · G · C', 'AmA · C · E', 'FF · A · C', 'GG · B · D']);
    assert.deepEqual(chart()[0], 'C C shape · open'); // guitar untouched
  });

  it('changes key', () => {
    click(window, '.xkeys [data-value="Db"]');
    assert.deepEqual(chart().map((c) => c.split(' ')[0]), ['Db', 'Bbm', 'Gb', 'Ab']);
    assert.equal($('.xkeys [data-value="Db"]').getAttribute('aria-pressed'), 'true');
  });

  it('changes a chord number', () => {
    click(window, '[data-action="degree"][data-value="1:6"]'); // slot 2 -> 7°
    assert.equal(texts(window, '.xchart .xnum')[1], '7° · vii°');
    assert.match(chart()[1], /^B°7 root on 5th/);
  });

  it('dresses a chord in a flavour, named in full', () => {
    click(window, '.xstage:nth-child(3) .tchip:nth-child(5)'); // F -> FM7
    assert.match(chart()[2], /^FM7 /);
    assert.equal(pianoChart()[2], 'FM7F · A · C · E');
    assert.deepEqual(texts(window, '.xstage:nth-child(3) .tchip'), ['F', 'sus2', 'sus4', 'add9', 'M7', 'M9']);
  });

  it('resets the flavour only when the chord quality changes', () => {
    click(window, '.xstage:nth-child(3) .tchip:nth-child(2)'); // Fsus2
    click(window, '[data-action="degree"][data-value="2:4"]'); // -> G, still major
    assert.match(chart()[2], /^Gsus2 /);
    click(window, '[data-action="degree"][data-value="2:1"]'); // -> Dm, minor
    assert.match(chart()[2], /^Dm /);
  });

  it('adds chords up to six and removes down to one', () => {
    const count = () => $$('.xchart .xc').length;
    click(window, '[data-action="add"]');
    click(window, '[data-action="add"]');
    assert.equal(count(), 6);
    assert.equal($('[data-action="add"]'), null);
    assert.deepEqual(texts(window, '.xchart .xnum').slice(4), ['2m · ii', '5 · V']);

    for (let i = 0; i < 5; i++) click(window, '[data-action="remove"]');
    assert.equal(count(), 1);
    assert.equal($('[data-action="remove"]'), null);
    assert.equal($$('.xslot').length, 1);
  });

  it('keeps a removed chord’s settings when it comes back', () => {
    click(window, '.xstage:nth-child(4) .tchip:nth-child(5)'); // G -> GM7
    click(window, '[data-action="remove"]');
    click(window, '[data-action="add"]');
    assert.match(chart()[3], /^GM7 /);
  });

  it('keeps keyboard focus on the button that was pressed', () => {
    const btn = $('.xkeys [data-value="E"]');
    btn.focus();
    btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(window.document.activeElement.dataset.id, 'key-E');
  });
});

describe('hearing the chords', () => {
  const audio = () => FakeAudioContext.instances.at(-1);
  const played = () => audio().started.filter((x) => x.kind === 'noise').length;
  const press = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

  it('puts a play button on every chord: table, circle, galleries, chart', () => {
    for (const chord of $$('#key-table td, #circle-of-fifths .cc, .shape, .xchart .xcell')) assert.ok(chord.querySelector('.chord-play'), chord.outerHTML);
    assert.equal($('#key-table td .chord-play').getAttribute('aria-label'), 'Play C');
  });

  it('plays what the diagram shows, for the instrument showing, lighting the button', () => {
    assert.equal(FakeAudioContext.instances.length, 0, 'no sound before a click');
    const c = $('#key-table td'); // C: x 3 2 0 1 0 on guitar, C E G on piano
    assert.equal(c.dataset.playG, '48 52 55 60 64');
    assert.equal(c.dataset.playP, '60 64 67');
    press(c.querySelector('.chord-play'));
    assert.equal(played(), 5);
    assert.ok(c.querySelector('.chord-play').classList.contains('is-sounding'));
    click(window, '[data-instrument-choice="piano"]');
    press(c.querySelector('.chord-play'));
    assert.equal(played(), 5 + 3);
  });

  it('plays the gallery shapes from their voicings', () => {
    press($('.only-g .shape .chord-play')); // 1 3 3 2 1 1: all six strings
    assert.equal(played(), 6);
    press($('.only-p .shape:last-child .chord-play')); // C Eb Gb A
    assert.equal(played(), 6 + 4);
  });

  it('plays the shape picked in the chart', () => {
    const shapes = guitarShapes('C', 'maj');
    const notes = (shape) => guitarNotes(shape.frets).join(' ');
    assert.equal($('.xchart .xc').dataset.playG, notes(shapes[0]));
    click(window, `[data-value="0:guitar:${shapes[1].position}"]`);
    assert.equal($('.xchart .xc').dataset.playG, notes(shapes[1]));
  });
});

describe('playing the progression', () => {
  const audio = () => FakeAudioContext.instances.at(-1);
  const play = () => $('.xplay .rhythm-play');
  const press = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const lit = () => $$('.xchart .xcell').map((c, i) => (c.classList.contains('is-now') ? i : -1)).filter((i) => i >= 0);

  it('counts in, then lights each chord as it plays, and loops', async () => {
    press(play());
    assert.equal(play().getAttribute('aria-pressed'), 'true');
    assert.equal(play().textContent, 'Stop');
    audio().currentTime = 0.1;
    await until(() => $('.xplay .rhythm-status').textContent === '1');
    assert.equal($('.xplay .rhythm-status').textContent, '1');

    const bar = 2; // 4 beats at 120
    audio().currentTime = 0.08 + bar + 0.1; // first chord
    await until(() => lit()[0] === 0);
    assert.equal($('.xplay .rhythm-status').textContent, '');
    assert.deepEqual(lit(), [0]);
    audio().currentTime = 0.08 + 3 * bar + 0.1; // third chord
    await until(() => lit()[0] === 2);
    assert.deepEqual(lit(), [2]);

    click(window, '.xkeys [data-value="G"]'); // redrawing keeps the light on
    assert.deepEqual(lit(), [2]);

    press(play());
    assert.equal(play().textContent, 'Play');
    assert.deepEqual(lit(), []);
  });

  it('strums the chords the chart shows', () => {
    for (const box of $$('.xplay input[type="checkbox"]')) {
      box.checked = false;
      box.dispatchEvent(new window.Event('change', { bubbles: true }));
    }
    press(play());
    // the first chord, straight away: one note per string the chart shows
    const strings = $('.xchart .xc').dataset.playG.split(' ').length;
    assert.equal(audio().started.filter((x) => x.kind === 'noise').length, strings);
    press(play());
  });
});
