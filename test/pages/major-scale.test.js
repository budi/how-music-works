import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { audio, change, loadPage, played, press, queries, seeded, until } from '../helpers.js';
import { CIRCLE_OF_FIFTHS } from '../../js/music/keys.js';
import { majorShape } from '../../js/music/guitar.js';
import { scaleQuestion, spellingNote } from '../../js/pages/major-scale/quiz.js';

let window;
const { $, $$ } = queries(() => window);
const row = (scope) => $$('.ms-cell span', scope).map((s) => s.textContent).join(' ');
const steps = (scope) => $$('.ms-step', scope).map((s) => s.textContent).join(' ');
// places on the neck — notes from majorShape, or spots' datasets — as 'string:fret', sorted
const places = (list) => list.map((p) => `${p.string}:${p.fret}`).sort().join(' ');
const spots = (selector, scope) => places($$(selector, scope).map((s) => s.dataset));

// random() = 0: the quiz asks the 2 of C major first, then the 3
async function load(instrument = 'guitar') {
  window = await loadPage('major-scale.html', { audio: true, random: 0, storage: { 'music.instrument': instrument } });
}
afterEach(() => window.close());

describe('every major scale', () => {
  beforeEach(() => load());
  const explorer = () => $('#scale-explorer');

  it('starts on C, and shows any key picked: the row, the staff, the keys and the neck', () => {
    assert.equal(row(explorer()), 'C D E F G A B C');
    assert.equal(steps(explorer()), 'W W H W W W H');
    press($('[data-key="F#"]', explorer()));
    assert.equal($('[aria-pressed="true"]', explorer()).textContent, 'F♯');
    assert.equal(row(explorer()), 'F♯ G♯ A♯ B C♯ D♯ E♯ F♯');
    assert.equal($('.ms-about', explorer()).textContent,
      'F♯ major has six sharps: F♯ C♯ G♯ D♯ A♯ E♯. E♯ is the key you’d otherwise call F.');
    assert.deepEqual($$('.ms-staff .sn-label', explorer()).map((t) => t.textContent), ['F♯', 'G♯', 'A♯', 'B', 'C♯', 'D♯', 'E♯', 'F♯']);
    assert.deepEqual($$('.ms-keys .ktag', explorer()).map((t) => t.closest('.key').dataset.midi + t.textContent).sort(),
      ['66F♯', '68G♯', '70A♯', '71B', '73C♯', '75D♯', '77E♯', '78F♯']);
    assert.equal(spots('.ms-neck .in-shape', explorer()), places(majorShape('F#').notes));
    assert.equal(spots('.ms-neck .is-root', explorer()), '4:4 6:2');
    assert.match($('.ms-shape', explorer()).textContent, /^The root is on string 6, fret 2: put your second finger there/);
  });

  it('moves the guitar shape to a root on string 6, 5, 4 or 3, for every key after', () => {
    const shown = (cls) => spots(`.ms-neck .${cls}`, explorer());
    const string = () => $('.ms-strings [aria-pressed="true"]', explorer()).textContent;
    const text = () => $('.ms-shape', explorer()).textContent;
    assert.equal(string(), '5', 'C starts with its root on string 5');
    press($('.ms-strings [data-string="3"]', explorer()));
    assert.equal(shown('in-shape'), places(majorShape('C', 3).notes));
    assert.match(text(), /^The root is on string 3, fret 5: put your first finger there, and give each finger one fret, from 5 to 8. Crossing onto string 2/);
    press($('[data-key="E"]', explorer()));
    assert.equal(string(), '3', 'the string stays picked');
    press($('.ms-strings [data-string="4"]', explorer()));
    assert.equal(shown('in-shape'), places(majorShape('E', 4).notes));
    assert.match(text(), /On string 2 the shape reaches one fret further, to 5/);
    // past fret 12: the neck grows to fit, and shows the octave below at the nut
    press($('[data-key="Eb"]', explorer()));
    assert.equal($$('.ms-neck .spot[data-string="1"]', explorer()).length, 17, 'frets 0 to 16');
    assert.equal(shown('in-open'), places(majorShape('Eb', 4).open.notes));
    assert.match(text(), /an octave lower are shown too, at the nut: the root on fret 1, frets 0 to 4/);
    press($('.ms-strings [data-string="6"]', explorer()));
    assert.equal(shown('in-open'), '', 'E♭ on string 6 sits at fret 11');
  });

  it('names the flats, and the keys with neither', () => {
    press($('[data-key="Eb"]', explorer()));
    assert.equal($('.ms-about', explorer()).textContent, 'E♭ major has three flats: B♭ E♭ A♭.');
    press($('[data-key="C"]', explorer()));
    assert.equal($('.ms-about', explorer()).textContent, 'C major has no sharps or flats: it’s all white keys.');
  });

  it('plays the scale up and back down, lighting each note on the staff, the keys and the neck', async () => {
    const play = $('.ms-play .rhythm-play', explorer());
    press(play);
    assert.equal(play.textContent, 'Stop');
    audio().currentTime = 0.08 + 60 / 132 + 0.05; // the 2nd note: D
    await until(() => $('.ms-staff .sn.is-now', explorer())?.dataset.i === '1');
    assert.equal($('.ms-keys .key.is-now', explorer()).dataset.midi, '62');
    assert.equal(spots('.ms-neck .is-now', explorer()), '5:5');
    press(play);
    assert.equal($$('.is-now', explorer()).length, 0);
  });
});

describe('find the missing note', () => {
  const quiz = () => $('#scale-quiz');
  const result = () => $('.quiz-result', quiz()).textContent;
  const key = (midi) => $(`.ms-keys .key[data-midi="${midi}"]`, quiz());
  const spot = (string, fret) => $(`.ms-neck .spot[data-string="${string}"][data-fret="${fret}"]`, quiz());
  const choose = (setting, value) => change($(`[data-setting="${setting}"]`, quiz()), value);

  describe('on the piano', () => {
    beforeEach(() => load('piano'));

    it('asks for one note of a scale, showing the rest of it and the root on the keys', () => {
      assert.equal($('.ms-ask', quiz()).textContent, 'What’s the 2 in C major?');
      assert.equal(row(quiz()), 'C ? E F G A B C');
      assert.equal(steps(quiz()), 'W W H W W W H');
      assert.deepEqual($$('.ms-keys .key.is-root', quiz()).map((k) => k.dataset.midi), ['60', '72']);
    });

    it('says what a wrong key is and how far to go, then takes the right note in any octave', async () => {
      press($('rect', key(60)));
      assert.equal(result(), 'That’s C, the 1 of C major. The 2 is 2 half steps above C.');
      assert.ok(key(60).classList.contains('is-wrong'));
      press($('rect', key(66)));
      assert.equal(result(), 'F♯ / G♭ isn’t in C major. The 2 is 2 half steps above C.');
      assert.equal($('.ms-next', quiz()).hidden, true);
      press($('rect', key(74))); // D5, an octave above the D next to the root: still D
      assert.equal(result(), 'Yes: the 2 of C major is D.');
      assert.equal(row(quiz()), 'C D E F G A B C');
      assert.deepEqual($$('.ms-keys .key.is-right', quiz()).map((k) => k.dataset.midi), ['62', '74']);
      assert.equal($('.quiz-score', quiz()).textContent, '0 of 1 right first time.');
      // three presses, then C D up the scale
      audio().currentTime = 0.5;
      await until(() => played() === 5);
      assert.equal(played(), 5);
      press($('.ms-next', quiz()));
      assert.equal($('.ms-ask', quiz()).textContent, 'What’s the 3 in C major?');
      assert.equal($$('.ms-keys .is-right, .ms-keys .is-wrong', quiz()).length, 0);
      press($('rect', key(64)));
      assert.equal($('.quiz-score', quiz()).textContent, '1 of 2 right first time.');
    });

    it('can give only the root, and stay quiet', () => {
      choose('level', 'hard');
      choose('sound', false);
      assert.equal($('.ms-ask', quiz()).textContent, 'What’s the 3 in C major?', 'a new question');
      assert.deepEqual($$('.ms-cell span', quiz()).map((s) => s.textContent), ['C', '', '?', '', '', '', '', 'C']);
      assert.equal($$('.ms-step', quiz()).length, 0);
      press($('rect', key(64)));
      assert.match(result(), /^Yes/);
      assert.equal(audio(), undefined);
    });

    it('shows and hides the key names', () => {
      const pad = $('.ms-keys', quiz());
      assert.ok(pad.classList.contains('show-names'));
      choose('names', false);
      assert.ok(!pad.classList.contains('show-names'));
      assert.equal($('.ms-ask', quiz()).textContent, 'What’s the 2 in C major?', 'same question');
    });
  });

  describe('on the guitar', () => {
    beforeEach(() => load('guitar'));

    it('marks every root on the neck, and takes the note on any string', () => {
      assert.ok(spot(5, 3).classList.contains('is-root'));
      assert.ok(spot(2, 1).classList.contains('is-root'));
      press($('.spot-hit', spot(6, 3))); // G
      assert.equal(result(), 'That’s G, the 5 of C major. The 2 is 2 half steps above C.');
      assert.ok(spot(6, 3).classList.contains('is-wrong'));
      press($('.spot-hit', spot(2, 3))); // D, on the B string
      assert.equal(result(), 'Yes: the 2 of C major is D.');
      assert.ok(spot(4, 0).classList.contains('is-right'), 'and every other D lights up');
      assert.equal(spot(4, 0).querySelector('.slabel').textContent, 'D');
    });
  });
});

describe('the questions', () => {
  it('asks the 2 to the 7 of each key, never the same twice running', () => {
    const random = seeded(7);
    let previous;
    const seen = new Set();
    for (let i = 0; i < 600; i++) {
      const q = scaleQuestion({ previous, random });
      assert.ok(!previous || q.key !== previous.key || q.degree !== previous.degree);
      seen.add(q.key + q.degree);
      previous = q;
    }
    assert.equal(seen.size, CIRCLE_OF_FIFTHS.length * 6);
    assert.equal(scaleQuestion({ keys: ['F#'], random: () => 0.99 }).note, 'E#');
  });

  it('explains a spelling that isn’t the key’s usual name', () => {
    assert.equal(spellingNote('F#', 7), 'E♯, not F: every letter comes once, and F♯ is already the 1.');
    assert.equal(spellingNote('F', 4), 'B♭, not A♯: every letter comes once, and A is already the 3.');
    assert.equal(spellingNote('D', 3), 'F♯, not G♭: every letter comes once, and G is already the 4.');
    assert.equal(spellingNote('C', 4), null);
  });
});
