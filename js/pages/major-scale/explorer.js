/**
 * Every major scale (#scale-explorer): pick a key and see its scale as a row
 * of steps, on the staff, and on the piano or the guitar neck — as a hand
 * shape with its root on string 6, 5, 4 or 3. Play goes up and back down,
 * lighting each note as it sounds.
 *
 * @module pages/major-scale/explorer
 */
import { CIRCLE_OF_FIFTHS, keySignature, scalePitches } from '../../music/keys.js';
import { majorShape } from '../../music/guitar.js';
import { isBlackKey, keySpellings, pitchClass, printed } from '../../music/pitch.js';
import { drawStaff } from '../../draw/staff.js';
import { drawKeyboard } from '../../draw/keyboard.js';
import { drawFretboard } from '../../draw/fretboard.js';
import { melodyTimeline } from '../../audio/timeline.js';
import { sharedPlayer } from '../../audio/player.js';
import { currentInstrument } from '../../ui/instrument.js';
import { transport } from '../../ui/transport.js';
import { flash, sizeToDrawing } from '../../lib/dom.js';
import { scaleMidis, scaleNames, scaleRow } from './scale.js';

// the twelve keys from C up, spelled as the circle of fifths spells them
const KEYS = [...CIRCLE_OF_FIFTHS].sort((a, b) => pitchClass(a) - pitchClass(b));
const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];
const FINGERS = ['first', 'second', 'third', 'fourth'];
const CLOSER = 'string 2 is tuned a half step closer to string 3 than the other strings are to their neighbours';

// up the octave and back down: indexes into the eight notes of the scale
const UP_AND_DOWN = [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 0];

// what a key's scale has in it: 'G major has one sharp: F♯.'
function describeKey(key) {
  const sig = keySignature(key);
  const name = printed(key) + ' major';
  if (!sig.count) return name + ' has no sharps or flats: it’s all white keys.';
  let out = `${name} has ${COUNT[sig.count]} ${sig.accidental}${sig.count > 1 ? 's' : ''}: ${sig.notes.map(printed).join(' ')}.`;
  // a sharp or flat that lands on a white key, like E♯
  for (const n of sig.notes.filter((n) => !isBlackKey(pitchClass(n)))) {
    out += ` ${printed(n)} is the key you’d otherwise call ${keySpellings(pitchClass(n))[0]}.`;
  }
  return out;
}

// how to hold a shape from majorShape: where the root goes, the frets the hand covers
function describeShape(shape) {
  const root = shape.notes[0];
  let out = `The root is on string ${root.string}, fret ${root.fret}: put your ${FINGERS[root.fret - shape.from]} finger there, ` +
    `and give each finger one fret, from ${shape.from} to ${shape.from + 3}.`;
  if (shape.to > shape.from + 3) out += ` On string 2 the shape reaches one fret further, to ${shape.to}, for your little finger: ${CLOSER}.`;
  else if (shape.notes.some((n) => n.string === 2)) out += ` Crossing onto string 2 moves the notes up a fret: ${CLOSER}.`;
  out += ` Slide the same shape along string ${root.string} to play any other major scale.`;
  if (shape.open) {
    const low = shape.open.notes[0];
    out += ' Up past fret 12 is a long reach, so the same notes an octave lower are shown too, at the nut: the root on ' +
      (low.fret ? `fret ${low.fret}` : 'the open string') + `, frets 0 to ${shape.open.to}. The open strings change the shape there, so it doesn’t slide.`;
  }
  return out;
}

// a shape's notes as marks on the neck, numbered, the roots picked out
const marks = (notes, cls) => notes.map((n) => ({
  string: n.string,
  fret: n.fret,
  label: String(n.degree === 8 ? 1 : n.degree),
  cls: cls + (n.degree % 7 === 1 ? ' is-root' : ''),
}));

const buttons = (attr, values, text = String) =>
  values.map((v) => `<button type="button" data-${attr}="${v}" aria-pressed="false">${text(v)}</button>`).join('');

const pressed = (group, attr, value) =>
  group.querySelectorAll(`[data-${attr}]`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[attr] === String(value))));

export function setupExplorer(el) {
  let key = 'C';
  let rootString = null; // null: whichever suits the key, 6 or 5
  let shape; // from majorShape
  let midis; // { piano, guitar }: the scale's notes on each
  el.innerHTML =
    `<div class="ms-pick" role="group" aria-label="Key">${buttons('key', KEYS, printed)}</div>` +
    '<div class="ms-scale"></div>' +
    '<p class="ms-about"></p>' +
    '<div class="staff-art ms-staff"></div>' +
    '<div class="keys-art ms-keys only-p"></div>' +
    `<div class="ms-strings only-g" role="group" aria-label="Root on string"><span>Root on string</span>${buttons('string', [6, 5, 4, 3])}</div>` +
    '<div class="ms-neck only-g"></div>' +
    '<p class="ms-shape only-g"></p>' +
    '<div class="staff-controls ms-play"></div>';
  const $ = (selector) => el.querySelector(selector);

  function show() {
    shape = majorShape(key, rootString);
    midis = { piano: scaleMidis(key, 'piano'), guitar: scaleMidis(key, 'guitar', shape) };
    pressed($('.ms-pick'), 'key', key);
    pressed($('.ms-strings'), 'string', shape.string);
    $('.ms-scale').innerHTML = scaleRow(key);
    $('.ms-about').textContent = describeKey(key);

    const staff = $('.ms-staff');
    staff.innerHTML = drawStaff({ clef: 'treble', notes: scalePitches(key), labels: 'letters', title: printed(key) + ' major scale' });
    sizeToDrawing(staff);

    const names = scaleNames(key);
    const keys = $('.ms-keys');
    keys.innerHTML = drawKeyboard({ from: 'C4', to: 'B5', names: false, tags: Object.fromEntries(midis.piano.map((m, i) => [m, names[i]])) });
    sizeToDrawing(keys);

    const neck = $('.ms-neck');
    const root = shape.notes[0];
    neck.innerHTML = drawFretboard({
      frets: Math.max(12, shape.to),
      marks: [...marks(shape.notes, 'in-shape'), ...marks(shape.open?.notes || [], 'in-open')],
      label: `${printed(key)} major scale on the guitar neck, from fret ${root.fret} on string ${root.string}` +
        (shape.open ? `, and an octave lower from fret ${shape.open.notes[0].fret}` : ''),
    });
    sizeToDrawing(neck);
    $('.ms-shape').textContent = describeShape(shape);
  }

  // the note of the scale that's sounding: lit on the staff, the keys and the neck
  function light(i) {
    el.querySelectorAll('.is-now').forEach((n) => n.classList.remove('is-now'));
    if (i == null) return;
    const { string, fret } = shape.notes[i];
    $(`.ms-staff .sn[data-i="${i}"]`).classList.add('is-now');
    $(`.ms-keys .key[data-midi="${midis.piano[i]}"]`).classList.add('is-now');
    $(`.ms-neck .spot[data-string="${string}"][data-fret="${fret}"]`).classList.add('is-now');
  }

  transport($('.ms-play'), {
    settings: {},
    playOnly: true,
    loop: false,
    timeline: () => {
      const instrument = currentInstrument();
      return melodyTimeline(UP_AND_DOWN.map((i) => midis[instrument][i]), { bpm: 132, instrument });
    },
    onStep: (step) => light(UP_AND_DOWN[step.index]),
    onStopped: () => light(null),
  });

  el.addEventListener('click', (e) => {
    const choice = e.target.closest('.ms-pick [data-key], .ms-strings [data-string]');
    if (choice) {
      sharedPlayer().stop();
      if (choice.dataset.key) key = choice.dataset.key;
      else rootString = Number(choice.dataset.string);
      show();
      return;
    }
    // a note tapped on any of the drawings: heard, and lit for a moment
    const note = e.target.closest('.sn, .key, .spot');
    if (!note) return;
    sharedPlayer().strum(note.classList.contains('spot') ? 'guitar' : 'piano', [Number(note.dataset.midi)]);
    flash(note, 'is-now', 700);
  });

  show();
}
