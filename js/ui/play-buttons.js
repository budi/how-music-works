/**
 * Small round ▶ buttons that play something once, and the ones on chords.
 *
 * A chord's button plays the chord it sits in, for whichever instrument is
 * showing — from the notes written on the chord (MIDI numbers, 60 = middle C):
 *
 *     <td data-play-g="48 52 55 60 64" data-play-p="60 64 67"> … <button class="chord-play"> … </td>
 *
 * or, in a chord-shape gallery, from the voicing drawn beside it (data-guitar or
 * data-piano on its .shapeart; see templates/partials/chord-shape.hbs).
 *
 * @module ui/play-buttons
 */
import { guitarNotes, parseGuitar } from '../music/guitar.js';
import { namedNotes } from '../music/piano.js';
import { sharedPlayer } from '../audio/player.js';
import { currentInstrument } from './instrument.js';
import { escape } from '../lib/svg.js';
import { flash } from '../lib/dom.js';

export const PLAY_ICON = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5 1.5v7l6-3.5z"/></svg>';

/**
 * A ▶ button: playButton('Play C') for a chord, or with its own class and
 * attributes: playButton('Hear do to re', 'hear-it', ' data-degree="2"').
 */
export function playButton(label, cls = 'chord-play', attrs = '') {
  return `<button type="button" class="${cls}"${attrs} aria-label="${escape(label)}">${PLAY_ICON}</button>`;
}

/** The attributes that tell a chord's play button what to play, on each instrument (MIDI notes). */
export function playAttrs(guitar, piano) {
  return ` data-play-g="${guitar.join(' ')}" data-play-p="${piano.join(' ')}"`;
}

// what a chord's button plays: [instrument, notes], or null
function chordFor(btn) {
  const holder = btn.closest('[data-play-g], [data-play-p]');
  if (holder) {
    const instrument = currentInstrument(btn.ownerDocument);
    const list = holder.getAttribute(instrument === 'piano' ? 'data-play-p' : 'data-play-g');
    return list ? [instrument, list.split(' ').map(Number)] : null;
  }
  const art = btn.closest('figure')?.querySelector('.shapeart');
  if (art?.dataset.guitar) return ['guitar', guitarNotes(parseGuitar(art.dataset.guitar).frets)];
  if (art?.dataset.piano) return ['piano', namedNotes(art.dataset.piano)];
  return null;
}

/** Makes every chord's play button in `scope` play, now and added later; each is lit while its chord rings. */
export function wireChordButtons(scope) {
  scope.addEventListener('click', (e) => {
    const btn = e.target.closest?.('.chord-play');
    const chord = btn && chordFor(btn);
    if (!chord) return;
    sharedPlayer().strum(chord[0], chord[1]);
    flash(btn, 'is-sounding', 1200);
  });
}
