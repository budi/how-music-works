/**
 * How far from do (#from-do): every note of the octave, its distance from do
 * three ways, a song it starts (data-song2 … data-song8 on the table), and a
 * button to hear the jump.
 *
 * @module pages/note-distance/from-do
 */
import { SYLLABLES, degreeName, distance } from '../../music/solfege.js';
import { playButton } from '../../ui/play-buttons.js';
import { degreeHtml } from './drawings.js';
import { hear } from './your-do.js';

export function renderFromDo(el) {
  const rows = [];
  for (let d = 2; d <= 8; d++) {
    const dist = distance(1, d);
    rows.push(`<tr><td><b>${degreeHtml(d)}</b> ${SYLLABLES[d]}</td><td>${dist.semitones}</td><td>${dist.steps}</td>` +
      `<td>${dist.name}</td><td class="song">${el.dataset['song' + d] || ''}</td>` +
      `<td>${playButton('Hear do to ' + degreeName(d), 'hear-it', ` data-degree="${d}"`)}</td></tr>`);
  }
  el.innerHTML = '<thead><tr><th>Note</th><th>Semitones</th><th>Steps</th><th>Name</th><th>You may know it from</th><th>Hear it</th></tr></thead>' +
    '<tbody>' + rows.join('') + '</tbody>';

  // do, then the note; the button stays lit until both are done
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('.hear-it');
    if (!btn) return;
    hear([1, Number(btn.dataset.degree)], { onStop: () => btn.classList.remove('is-sounding') });
    btn.classList.add('is-sounding');
  });
}
