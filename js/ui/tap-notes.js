/**
 * Notes drawn on a staff, a keyboard or the guitar neck play when tapped, and
 * light up for a moment: on the piano, or on the guitar for the neck's spots.
 *
 * @module ui/tap-notes
 */
import { sharedPlayer } from '../audio/player.js';
import { flash } from '../lib/dom.js';

/** Makes the notes in `scope` play when tapped: its `.sn`, `.key` and `.spot` elements, with data-midi. */
export function wireNoteTaps(scope) {
  scope.addEventListener('click', (e) => {
    const note = e.target.closest('.sn, .key, .spot');
    if (!note) return;
    sharedPlayer().strum(note.classList.contains('spot') ? 'guitar' : 'piano', [Number(note.dataset.midi)]);
    flash(note, 'is-now', 700);
  });
}
