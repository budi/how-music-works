/**
 * Any interval from any root (#interval-explorer): pick both, and see it named
 * and counted, on the staff, and on the piano or the guitar neck; hear it one
 * note after the other, or together.
 *
 * @module pages/intervals/explorer
 */
import { INTERVALS, ROOTS, intervalDegree, parseInterval, pitchAbove, transpose, wellSpelled } from '../../music/intervals.js';
import { STRING_2_CLOSER, intervalPosition, rootPosition } from '../../music/guitar.js';
import { LETTERS, parsePitch, printed } from '../../music/pitch.js';
import { drawStaff } from '../../draw/staff.js';
import { drawKeyboard } from '../../draw/keyboard.js';
import { drawFretboard } from '../../draw/fretboard.js';
import { melodyTimeline } from '../../audio/timeline.js';
import { sharedPlayer } from '../../audio/player.js';
import { choiceGroup, markChosen } from '../../ui/choices.js';
import { currentInstrument } from '../../ui/instrument.js';
import { wireNoteTaps } from '../../ui/tap-notes.js';
import { sizeToDrawing } from '../../lib/dom.js';
import { plural } from '../../lib/text.js';

const WORDS = ['', 'one', 'two', 'three'];

// what kind of interval it is, and its neighbours: 'Major: the 3 of C major. …'
function describeQuality(root, size) {
  const iv = INTERVALS[size];
  const r = printed(root);
  const note = (s) => printed(transpose(root, intervalDegree(root, s)));
  const number = iv.degrees[0].replace(/\D/g, '');
  switch (iv.quality) {
    case 'major':
      return `Major: the ${number} of ${r} major. A half step smaller makes a ${INTERVALS[size - 1].name}: ${r} to ${note(size - 1)}.`;
    case 'minor':
      return `Minor: a half step smaller than the ${INTERVALS[size + 1].name}, ${r} to ${note(size + 1)}.`;
    case 'tritone': {
      const ways = { '#4': 'an augmented 4th', b5: 'a diminished 5th' };
      const spelled = wellSpelled(root, size).map((d) => `${r} to ${printed(transpose(root, d))} is ${ways[d]}`);
      return `Three whole steps: halfway to the octave, and neither major, minor nor perfect. ${spelled.join('; ')}.`;
    }
    default:
      if (size === 0) return 'Perfect: the same note twice.';
      if (size === 12) return 'Perfect: the same letter eight letters up, the note again an octave higher.';
      return `Perfect: the ${number} of ${r} major. A half step either way and it isn’t perfect any more.`;
  }
}

// where the guitar's second note is from the first: 'One string over, two frets up.'
function describeReach(root, upper) {
  const strings = root.string - upper.string;
  const frets = upper.fret - root.fret;
  const across = strings ? `${WORDS[strings]} ${strings > 1 ? 'strings' : 'string'} over` : 'on the same string';
  const along = frets ? `${WORDS[Math.abs(frets)]} ${Math.abs(frets) > 1 ? 'frets' : 'fret'} ${frets > 0 ? 'up' : 'down'}` : 'at the same fret';
  const text = `${across}, ${along}.`;
  const shifted = root.string >= 3 && upper.string <= 2 ? ` Crossing from string 3 to string 2 moves it up a fret: ${STRING_2_CLOSER}.` : '';
  return text[0].toUpperCase() + text.slice(1) + shifted;
}

export function setupExplorer(el) {
  let root = 'C';
  let size = 4;
  let rootString = null; // the root's string on the guitar; null: whichever suits the key, 6 or 5
  let notes; // { piano: [low, high], guitar: [low, high] } as MIDI numbers
  el.innerHTML =
    choiceGroup('From', 'root', ROOTS, { text: printed }) +
    choiceGroup('Interval', 'size', INTERVALS.map((_, i) => i), { text: (s) => INTERVALS[s].short, cls: 'iv-sizes' }) +
    '<p class="iv-name" aria-live="polite"></p>' +
    '<p class="iv-count"></p>' +
    '<p class="iv-quality"></p>' +
    '<div class="staff-art iv-staff"></div>' +
    '<div class="keys-art iv-keys only-p"></div>' +
    choiceGroup('Root on string', 'string', [6, 5, 4, 3], { cls: 'iv-strings only-g' }) +
    '<div class="neck-art iv-neck only-g"></div>' +
    '<p class="iv-reach only-g"></p>' +
    '<p class="rhythm-controls"><button type="button" class="rhythm-play" data-play="up">Up</button>' +
      '<button type="button" class="rhythm-play" data-play="together">Together</button></p>';
  const $ = (selector) => el.querySelector(selector);

  function show() {
    markChosen(el, 'root', root);
    markChosen(el, 'size', size);
    const iv = INTERVALS[size];
    const degree = intervalDegree(root, size);
    const pitches = [root + '4', pitchAbove(root + '4', degree)];
    const [low, high] = pitches.map((p) => printed(p.slice(0, -1)));
    const letters = parseInterval(degree).steps + 1;
    const first = LETTERS.indexOf(root[0]);

    $('.iv-name').innerHTML = `${low} up to ${high}: ${size === 12 ? 'an' : 'a'} <b>${iv.name}</b> (${iv.short})`;
    $('.iv-count').textContent = `${plural(letters, 'letter')}: ${Array.from({ length: letters }, (_, i) => LETTERS[(first + i) % 7]).join(' ')} · ` +
      plural(size, 'half step');
    $('.iv-quality').textContent = describeQuality(root, size);

    const staff = $('.iv-staff');
    staff.innerHTML = drawStaff({ clef: 'treble', notes: pitches, labels: 'letters', title: `${low} up to ${high}` });
    sizeToDrawing(staff);

    const midis = pitches.map((p) => parsePitch(p).midi);
    const keys = $('.iv-keys');
    keys.innerHTML = drawKeyboard({ from: 'C4', to: 'B5', names: false, tags: { [midis[0]]: low, [midis[1]]: high } });
    sizeToDrawing(keys);

    // off the nut, so the shape is the one that moves: below fret 2 it couldn't reach back two frets
    let from = rootPosition(root, rootString);
    if (from.fret < 2) from = { ...from, fret: from.fret + 12, midi: from.midi + 12 };
    const to = intervalPosition(from, size);
    markChosen(el, 'string', from.string);
    const neck = $('.iv-neck');
    neck.innerHTML = drawFretboard({
      frets: Math.max(12, to.fret),
      marks: [{ ...to, label: high }, { ...from, label: low, cls: 'is-root' }],
      label: `${low} on string ${from.string}, fret ${from.fret}; ${high} on string ${to.string}, fret ${to.fret}`,
    });
    sizeToDrawing(neck);
    $('.iv-reach').textContent = describeReach(from, to);

    notes = { piano: midis, guitar: [from.midi, to.midi] };
  }

  function play(how) {
    const instrument = currentInstrument();
    if (how === 'together') sharedPlayer().strum(instrument, notes[instrument]);
    else sharedPlayer().play(melodyTimeline(notes[instrument], { bpm: 100, instrument }));
  }

  el.addEventListener('click', (e) => {
    const choice = e.target.closest('.choices button');
    if (choice) {
      const { root: r, size: s, string } = choice.dataset;
      if (r) root = r;
      else if (s) size = Number(s);
      else rootString = Number(string);
      show();
      play('up');
    }
    const button = e.target.closest('[data-play]');
    if (button) play(button.dataset.play);
  });
  wireNoteTaps(el);

  show();
}
