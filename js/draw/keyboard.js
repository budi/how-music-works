/**
 * Piano keyboards: where the keys go, and a stretch of keys to play on.
 *
 * @module draw/keyboard
 */
import { LETTER_PC, isBlackKey, keyName, keySpellings, mod12, parsePitch } from '../music/pitch.js';
import { circle, el, rect, svg, text } from '../lib/svg.js';
import { words } from '../lib/text.js';

/** White keys counted up from C0, a black key counting as the white key below it: whiteIndex(60) → 35 */
export function whiteIndex(pitch) {
  const pc = mod12(pitch);
  let i = LETTER_PC.length - 1;
  while (LETTER_PC[i] > pc) i--;
  return Math.floor(pitch / 12) * 7 + i;
}

/** The pitch of a white key, by its whiteIndex: whitePitch(35) → 60 */
export function whitePitch(index) {
  return Math.floor(index / 7) * 12 + LETTER_PC[index % 7];
}

/**
 * Where the keys go: `count` white keys side by side from `from`, starting at
 * x = 1, and a black key over the join of any two a whole step apart.
 * @param {number} from  where to start: a pitch (MIDI, or semitones up from a
 *   C); on a black key, the strip starts on the white key below it
 * @param {number} count
 * @param {{white: number, black: number}} widths
 * @param {boolean} [edge=false]  also the black key just past the last white key
 *   (cut off by the edge, so a strip looks cut from a real keyboard)
 * @returns {{whites: Array<{pitch: number, x: number}>, blacks: Array<{pitch: number, x: number}>}}
 *   left to right; x is each key's left edge
 */
export function keyLayout(from, count, { white, black }, edge = false) {
  const whites = [];
  const blacks = [];
  const first = whiteIndex(from);
  for (let i = 0; i < count; i++) {
    const pitch = whitePitch(first + i);
    const x = 1 + i * white;
    whites.push({ pitch, x });
    if (isBlackKey(pitch + 1) && (edge || i < count - 1)) blacks.push({ pitch: pitch + 1, x: x + white - black / 2 });
  }
  return { whites, blacks };
}

const KEY = { w: 26, h: 112, bw: 16, bh: 70 };

/**
 * Piano keys to tap: each is a `<g class="key" data-midi data-name>`.
 * @param {object} options
 * @param {string} options.from  the white key at the left end: 'C3'
 * @param {string} options.to  the white key at the right end: 'C5'
 * @param {string} [options.marks]  keys to dot and name underneath: 'C3 F3'
 * @param {string} [options.highlight]  one of them, in red
 * @param {boolean} [options.names=true]  false: name only middle C underneath
 * @param {boolean} [options.keyNames]  write every key's name on it, hidden until CSS
 *   shows it (.show-names)
 * @returns {string} SVG
 */
export function drawKeyboard({ from, to, marks, highlight, names = true, keyNames = false }) {
  const marked = words(marks);
  const isMarked = new Set(marked.map((m) => parsePitch(m).midi));
  const hi = highlight ? parsePitch(highlight).midi : null;
  const low = parsePitch(from).midi;
  const { whites, blacks } = keyLayout(low, whiteIndex(parsePitch(to).midi) - whiteIndex(low) + 1, { white: KEY.w, black: KEY.bw });
  const lit = (midi) => (midi === hi ? ' is-highlight' : '');
  const out = [];

  for (const k of whites) {
    const name = keyName(k.pitch);
    const parts = rect(k.x, 1, KEY.w, KEY.h, 'kw' + (isMarked.has(k.pitch) ? ' is-marked' : '') + lit(k.pitch), 3) +
      (isMarked.has(k.pitch) ? circle(k.x + KEY.w / 2, KEY.h - 16, 5, 'kdot' + lit(k.pitch)) : '') +
      (keyNames ? text(k.x + KEY.w / 2, KEY.bh + 15, name, 'kname') : '');
    out.push(el('g', { class: 'key', 'data-midi': k.pitch, 'data-name': name }, parts));
  }
  // black keys come in groups of two (C♯ D♯) and three (F♯ G♯ A♯)
  for (const k of blacks) {
    const parts = rect(k.x, 1, KEY.bw, KEY.bh, 'kb', 2) +
      (keyNames ? keySpellings(k.pitch).map((n, i) => text(k.x + KEY.bw / 2, KEY.bh - 18 + i * 10, n, 'kname on-black')).join('') : '');
    out.push(el('g', { class: 'key', 'data-midi': k.pitch, 'data-name': keyName(k.pitch) }, parts));
  }

  let lines = 0;
  for (const k of whites) {
    if (!isMarked.has(k.pitch)) continue;
    const label = names ? [keyName(k.pitch)] : [];
    if (k.pitch === 60) label.push('middle C');
    label.forEach((t, i) => out.push(text(k.x + KEY.w / 2, KEY.h + 16 + i * 14, t, 'klabel' + lit(k.pitch))));
    lines = Math.max(lines, label.length);
  }

  const width = whites.length * KEY.w + 2;
  const pad = lines ? 16 : 0; // room at the sides for a label like "middle C" under an end key
  return svg({
    cls: 'keyboard',
    viewBox: [-pad, 0, width + 2 * pad, KEY.h + 8 + lines * 14],
    label: `Piano keys from ${from} to ${to}` + (marked.length ? ', with ' + marked.join(', ') + ' marked' : ''),
    data: { whites: whites.length }, // CSS sizes it by its white keys: see sizeToDrawing in lib/dom.js
  }, out.join(''));
}
