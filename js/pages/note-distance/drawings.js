/**
 * Note distance's drawings: one octave of keys with a major scale on it, the
 * scale as a staircase, and the ladder of semitones that sung jumps are
 * drawn on.
 *
 * @module pages/note-distance/drawings
 */
import { keySpellings, parsePitch } from '../../music/pitch.js';
import { SEMITONES, SYLLABLES, distance } from '../../music/solfege.js';
import { keyLayout } from '../../draw/keyboard.js';
import { circle, el, rect, svg, text } from '../../lib/svg.js';

/** A degree as HTML: the high do is a 1 with a dot over it (drawn by CSS: .hi). */
export function degreeHtml(degree) {
  return degree === 8 ? '<span class="hi">1</span>' : String(degree);
}

// …and in SVG, centred on x with its baseline at y, `size` px tall. The dot
// is drawn rather than the combining character, which few fonts place well;
// it's an ellipse so that styles for the ladder's circles leave it alone.
function degreeSvg(x, y, degree, cls, size) {
  if (degree !== 8) return text(x, y, degree, cls);
  const r = size * 0.12;
  return text(x, y, 1, cls) + el('ellipse', { class: cls + '-dot', cx: x, cy: y - size * 1.2, rx: r, ry: r });
}

/* ---------- one octave of keys ---------- */

/**
 * One octave of keys from a white key (C by default), its major scale marked:
 * a dot and the syllable under each note, and an arc labelled whole or half
 * between each note and the next.
 * @param {string} [from='C']  a letter
 * @returns {string} SVG
 */
export function octaveKeys(from = 'C') {
  const W = 40;
  const H = 120;
  const BW = 24;
  const BH = 74;
  const start = parsePitch(from + 4).midi;
  const { whites, blacks } = keyLayout(start, 8, { white: W, black: BW });
  const keys = {}; // semitones above do -> { x: centre, black }
  const out = [];
  for (const k of whites) {
    keys[k.pitch - start] = { x: k.x + W / 2, black: false };
    out.push(rect(k.x, 1, W, H, 'kw', 3), text(k.x + W / 2, H - 10, keySpellings(k.pitch)[0], 'kname'));
  }
  // a black key between two white keys a whole step apart: it has a name from each side
  for (const k of blacks) {
    const x = k.x + BW / 2;
    const [sharp, flat] = keySpellings(k.pitch);
    keys[k.pitch - start] = { x, black: true };
    out.push(rect(k.x, 1, BW, BH, 'kb', 2), text(x, BH - 22, sharp, 'kbname'), text(x, BH - 11, flat, 'kbname'));
  }

  // the scale: dots, syllables, and the step from each note to the next
  const notes = SEMITONES.slice(1).map((s, d) => ({ pitch: s, degree: d + 1, key: keys[s] }));
  for (const n of notes) {
    out.push(circle(n.key.x, n.key.black ? BH - 40 : H - 34, 5, 'kdot' + (n.key.black ? ' on-black' : '')));
    out.push(text(n.key.x, H + 16, SYLLABLES[n.degree], 'ksyl'));
  }
  notes.slice(1).forEach((n, i) => {
    const a = notes[i].key.x + 3;
    const b = n.key.x - 3;
    const whole = n.pitch - notes[i].pitch === 2;
    const half = whole ? '' : ' is-half';
    out.push(el('path', { class: 'kstep' + half, d: `M${a} ${H + 24}Q${(a + b) / 2} ${H + 38} ${b} ${H + 24}` }));
    out.push(text((a + b) / 2, H + 50, whole ? 'whole' : 'half', 'kstepl' + half));
  });

  const label = `One octave of a keyboard from ${from}, with the major scale from ${from} marked: ` +
    notes.map((n) => SYLLABLES[n.degree]).join(' ') + ', stepping whole, whole, half, whole, whole, whole, half.';
  return svg({ cls: 'keyboard', viewBox: [0, 0, whites.length * W + 2, H + 56], label }, out.join(''));
}

/* ---------- the scale as a staircase: a whole step is a tall stair, a half step a short one ---------- */

export function staircase() {
  const STEP_W = 64;
  const UNIT = 14;
  const TOP = 24;
  const LEFT = 8;
  const height = TOP + 13 * UNIT + 46; // a stair per semitone, and one for do to stand on
  const y = (degree) => TOP + (12 - SEMITONES[degree]) * UNIT;
  const out = [];
  for (let d = 1; d <= 8; d++) {
    const x = LEFT + (d - 1) * STEP_W;
    out.push(rect(x, y(d), STEP_W - 4, height - 40 - y(d), 'stair' + (d === 1 || d === 8 ? ' is-do' : ''), 3));
    out.push(text(x + STEP_W / 2 - 2, y(d) - 8, SYLLABLES[d], 'ssyl'));
    out.push(degreeSvg(x + STEP_W / 2 - 2, height - 22, d, 'snum', 10));
    if (d > 1) {
      const size = SEMITONES[d] - SEMITONES[d - 1];
      out.push(text(x - 2, height - 4, size === 2 ? 'W' : 'H', 'sstep' + (size === 1 ? ' is-half' : '')));
    }
  }
  return svg({ cls: 'staircase', viewBox: [0, 0, LEFT * 2 + 8 * STEP_W, height],
    label: 'The major scale as a staircase: whole, whole, half, whole, whole, whole, half.' }, out.join(''));
}

/* ---------- the ladder: a rung per semitone, do at the bottom, high do at the top ---------- */

const LADDER = { w: 132, unit: 19, top: 14, rail: 52 };
const rungY = (semitones) => LADDER.top + (12 - semitones) * LADDER.unit;

/** The ladder. A jump sung on it is drawn as an arrow beside it: see showJump. */
export function ladder() {
  const bottom = rungY(0);
  const out = [el('line', { class: 'lrail', x1: LADDER.rail, y1: LADDER.top, x2: LADDER.rail, y2: bottom })];
  for (let s = 0; s <= 12; s++) {
    const y = rungY(s);
    const degree = s === 12 ? 8 : SEMITONES.indexOf(s);
    if (degree > 0) {
      out.push(el('g', { class: 'lnote', 'data-degree': degree },
        circle(LADDER.rail, y, 8) + text(LADDER.rail - 16, y + 4, SYLLABLES[degree], 'lsyl') + degreeSvg(LADDER.rail, y + 3.5, degree, 'lnum', 7)));
    } else {
      out.push(el('line', { class: 'ltick', x1: LADDER.rail - 4, y1: y, x2: LADDER.rail + 4, y2: y }));
    }
  }
  out.push(el('path', { class: 'ljump', d: '' }), text(0, 0, '', 'ljumpl'));
  return svg({ cls: 'ladder', viewBox: [0, 0, LADDER.w, bottom + LADDER.top],
    label: 'Each semitone of the octave as a rung, do at the bottom; the notes of the scale are circled.' }, out.join(''));
}

/**
 * Lights `to` on the ladders in `scope`, and draws the jump to it from `from`
 * (null: just light the note; both null: clear it all).
 */
export function showJump(scope, from, to) {
  scope.querySelectorAll('.lnote').forEach((g) => {
    const d = Number(g.dataset.degree);
    g.classList.toggle('is-now', d === to);
    g.classList.toggle('is-from', d === from && from !== to);
  });
  const path = scope.querySelector('.ljump');
  const label = scope.querySelector('.ljumpl');
  if (from === null || to === null || from === to) {
    path.setAttribute('d', '');
    label.textContent = '';
    return;
  }
  const y1 = rungY(SEMITONES[from]);
  const y2 = rungY(SEMITONES[to]);
  const x = LADDER.rail + 14;
  const bend = x + 12 + Math.min(Math.abs(y2 - y1) * 0.1, 16); // bigger jumps bow out more, but leave room for "+12"
  path.setAttribute('d', `M${x} ${y1}C${bend} ${y1} ${bend} ${y2} ${x} ${y2}`);
  const dist = distance(from, to);
  label.setAttribute('x', bend + 4);
  label.setAttribute('y', (y1 + y2) / 2 + 4);
  label.textContent = (dist.up ? '+' : '−') + dist.semitones;
}
