import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadPage, until } from '../helpers.js';
import { FakeAudioContext } from '../fake-audio.js';
import { parsePitch } from '../../js/music/pitch.js';

let window;
const $ = (selector, scope = window.document) => scope.querySelector(selector);
const $$ = (selector, scope = window.document) => [...scope.querySelectorAll(selector)];
const press = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const figure = (name) => $$('figure.staff-fig').find((f) => $('figcaption b', f).textContent === name);
const audio = () => FakeAudioContext.instances.at(-1);
const played = () => audio().started.filter((s) => s.kind === 'noise').length;

// random() = 0, so the quiz asks the lowest note it can, then the next one up
beforeEach(async () => {
  FakeAudioContext.instances = [];
  window = await loadPage('reading-notes.html', { setup: (w) => { w.AudioContext = FakeAudioContext; w.Math.random = () => 0; } });
});
afterEach(() => window.close());

describe('staff diagrams', () => {
  it('draws every diagram, and none has a mistake', () => {
    for (const f of $$('figure.staff-fig')) {
      assert.ok($('svg.staff', f), $('figcaption b', f).textContent);
      assert.equal($$('.sn', f).length, f.dataset.notes.split(' ').length);
    }
    assert.equal($('.rhythm-error'), null);
  });

  it('names the treble and bass lines and spaces', () => {
    const labels = (name) => $$('.sn-label', figure(name)).map((t) => t.textContent).join(' ');
    assert.equal(labels('The lines: E G B D F'), 'E G B D F');
    assert.equal(labels('The spaces: F A C E'), 'F A C E');
    assert.equal(labels('The lines: G B D F A'), 'G B D F A');
    assert.equal(labels('The spaces: A C E G'), 'A C E G');
    assert.equal(labels('Across the middle'), 'A3 B3 C4 C4 D4 E4');
  });

  it('plays a note when you tap it, and lights it', () => {
    assert.equal(FakeAudioContext.instances.length, 0, 'no sound before a tap');
    const note = $('.sn', figure('The lines: E G B D F'));
    press($('.head', note));
    assert.equal(played(), 1);
    assert.ok(note.classList.contains('is-now'));
  });

  it('plays all the notes in turn, each lit as it sounds, and stops', async () => {
    const fig = figure('The spaces: F A C E');
    const play = $('.rhythm-play', fig);
    press(play);
    assert.equal(play.textContent, 'Stop');
    audio().currentTime = 0.08 + 0.6 + 0.05; // the 2nd note at 100 bpm
    await until(() => $('.sn.is-now', fig)?.dataset.i === '1');
    assert.equal($('.sn.is-now', fig).dataset.i, '1');
    press(play);
    assert.equal(play.textContent, 'Play');
    assert.equal($$('.sn.is-now', fig).length, 0);
  });
});

describe('the staff on the keys', () => {
  it('shows middle C up to the next C, every key named, middle C in red', () => {
    const fig = $('figure.keys-fig');
    assert.equal($('figcaption b', fig).textContent, 'The same notes on the piano');
    assert.equal($$('.kw', fig).length, 8);
    assert.equal($$('.kb', fig).length, 5);
    assert.deepEqual($$('.klabel', fig).map((t) => t.textContent), ['C4', 'middle C', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']);
    assert.equal($('.kdot.is-highlight', fig).closest('.key').dataset.name, 'C4');
    // the same notes as the staff above it
    const staff = $$('figure.staff-fig')[0];
    assert.deepEqual($$('.sn', staff).map((n) => n.dataset.midi), $$('.kdot', fig).map((d) => d.closest('.key').dataset.midi));
  });
});

describe('the landmarks on the keys', () => {
  const keys = () => $$('figure.keys-fig').find((f) => $('figcaption b', f).textContent === 'Landmarks on the keys');

  it('plays a key when you tap it, black or white', () => {
    press($('.key[data-name="C4"] .kw', keys()));
    press($$('.kb', keys())[0]);
    assert.equal(played(), 2);
  });
});

describe('the note quiz', () => {
  const quiz = () => $('#note-quiz');
  const shown = () => $('.nq-staff .sn', quiz());
  const key = (midi) => $(`.nq-keys .key[data-midi="${midi}"]`, quiz());
  const pressKey = (midi) => press($('rect', key(midi)));
  const result = () => $('.nq-result', quiz()).textContent;
  const choose = (setting, value) => {
    const el = $(`[data-setting="${setting}"]`, quiz());
    if (el.type === 'checkbox') el.checked = value; else el.value = value;
    el.dispatchEvent(new window.Event('change', { bubbles: true }));
  };
  const keyNames = () => $$('.nq-keys .key', quiz()).filter((k) => $('.kw', k)).map((k) => k.dataset.name);

  it('shows a note with no name, and a keyboard to answer on', () => {
    assert.equal(shown().dataset.name, 'G3', 'the lowest it asks: three ledger lines down');
    assert.equal($$('.nq-staff .sn-label', quiz()).length, 0);
  });

  it('gives each clef its own keys, middle C marked', () => {
    const ends = () => [keyNames()[0], keyNames().at(-1)];
    assert.deepEqual(ends(), ['G3', 'D6']);
    choose('clef', 'bass');
    assert.deepEqual(ends(), ['B1', 'F4']);
    choose('clef', 'both');
    assert.deepEqual(ends(), ['B1', 'D6']);
    assert.equal($$('.nq-keys .klabel', quiz()).map((t) => t.textContent).join(), 'middle C', 'only middle C is named');
    assert.equal($('.nq-keys .kdot.is-highlight', quiz()).closest('.key').dataset.midi, '60');
  });

  it('wants the right key in the right octave, and says which way to go', async () => {
    pressKey(67); // G4: the right letter, an octave too high
    assert.ok(key(67).classList.contains('is-wrong'));
    assert.equal(result(), 'Right note, wrong octave: that’s G4. Go down 1 octave.');
    pressKey(57); // A3
    assert.equal(result(), 'Not that one — you pressed A3. Go lower.');
    pressKey(56); // a black key
    assert.equal(result(), 'Not that one — you pressed G♯3 / A♭3. Go lower.');
    pressKey(55); // G3
    assert.ok(key(55).classList.contains('is-right'));
    assert.equal(result(), 'Yes: G3, just below the second ledger line under the treble staff.');
    assert.equal($('.nq-score', quiz()).textContent, '0 of 1 right first time.');
    assert.equal(played(), 4, 'every key sounds as you press it');
    await until(() => shown().dataset.name !== 'G3');
    assert.equal(shown().dataset.name, 'A3', 'a new note, never the same one twice');
    assert.equal($$('.nq-keys .is-wrong, .nq-keys .is-right', quiz()).length, 0, 'the keyboard is cleared');
    pressKey(57);
    assert.equal($('.nq-score', quiz()).textContent, '1 of 2 right first time.');
  });

  it('asks sharps and flats when ticked, answered on the black keys', () => {
    window.Math.random = () => 0.99; // the last choice: a flat, given the list's order
    choose('accidentals', true);
    const n = parsePitch(shown().dataset.name.replace('♯', '#').replace('♭', 'b'));
    assert.ok(n.accidental, shown().dataset.name);
    assert.ok($('.kb', key(n.midi)), 'its key is a black one');
    pressKey(n.midi);
    assert.match(result(), /^Yes: /);
  });

  it('shows and hides the key names, keeping the question and what you pressed', () => {
    const box = $('.nq-keys', quiz());
    const visible = () => box.classList.contains('show-names');
    assert.equal(visible(), true, 'shown to start');
    assert.ok($('input[data-setting="names"]', quiz()).checked);
    assert.deepEqual($$('.kname:not(.on-black)', box).slice(0, 3).map((n) => n.textContent), ['G3', 'A3', 'B3']);
    assert.deepEqual($$('.kname.on-black', box).slice(0, 2).map((n) => n.textContent), ['G♯', 'A♭']);
    pressKey(57); // a wrong answer
    choose('names', false);
    assert.equal(visible(), false);
    assert.equal(shown().dataset.name, 'G3', 'same question');
    assert.ok(key(57).classList.contains('is-wrong'), 'the wrong press is still marked');
    choose('clef', 'bass');
    assert.equal(visible(), false, 'stays off for a new clef');
    choose('names', true);
    assert.equal(visible(), true);
  });

  it('can stay quiet', () => {
    choose('sound', false);
    pressKey(55);
    assert.equal(FakeAudioContext.instances.length, 0);
  });
});
