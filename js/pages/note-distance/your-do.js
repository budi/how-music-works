/**
 * Your do (#your-do): where do sits, so the octave fits your voice. Every
 * note on the page is sung from it, and it's remembered on this device.
 *
 * @module pages/note-distance/your-do
 */
import { DOS, degreeMidis } from '../../music/solfege.js';
import { melodyTimeline } from '../../audio/timeline.js';
import { sharedPlayer } from '../../audio/player.js';
import { recall, remember } from '../../lib/storage.js';

const KEY = 'music.do';
let doMidi = 60; // middle C

/** Picks up the do remembered on this device, if there is one. */
export function loadDo() {
  const saved = Number(recall(KEY));
  if (DOS.some((d) => d.midi === saved)) doMidi = saved;
}

/**
 * Degrees sung from your do, a note a beat, in groups (usually pairs).
 * @param {number[]} degrees  1–8
 * @param {object} [options]  { bpm = 80, echo: a gap after each group to sing it back, group = 2 }
 * @returns {Timeline}
 */
export function sung(degrees, { bpm = 80, echo = false, group = 2 } = {}) {
  return melodyTimeline(degreeMidis(degrees, doMidi), { bpm, echo, group, gate: 0.92 });
}

/** Plays degrees from your do, once: hear([1, 8]). `options` are the player's (onStop, …). */
export function hear(degrees, options = {}) {
  sharedPlayer().play(sung(degrees), options);
}

/** The "Do is" buttons: choosing one plays do and high do from it. */
export function setupYourDo(el) {
  el.innerHTML = '<span class="yd-label">Do is</span>' +
    DOS.map((d) => `<button type="button" class="yd-choice" data-do="${d.midi}" aria-pressed="${d.midi === doMidi}">${d.name}</button>`).join('') +
    '<button type="button" class="yd-hear" aria-label="Hear do and high do again">Hear again</button>';
  el.addEventListener('click', (e) => {
    const choice = e.target.closest('[data-do]');
    if (choice) {
      doMidi = Number(choice.dataset.do);
      remember(KEY, doMidi);
      el.querySelectorAll('[data-do]').forEach((b) => b.setAttribute('aria-pressed', String(b === choice)));
      hear([1, 8]);
    }
    if (e.target.closest('.yd-hear')) hear([1, 8]);
  });
  markStuck(el);
}

// .is-stuck while it sits under the top bar (CSS: position: sticky), for its divider
function markStuck(el) {
  if (typeof IntersectionObserver === 'undefined') return;
  const top = parseFloat(getComputedStyle(el).top) || 0;
  new IntersectionObserver(([entry]) => {
    el.classList.toggle('is-stuck', entry.intersectionRatio < 1 && entry.boundingClientRect.top <= top + 1);
  }, { rootMargin: `-${top + 1}px 0px 0px 0px`, threshold: [1] }).observe(el);
}
