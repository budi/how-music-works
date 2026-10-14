/**
 * Every interval at a glance (#interval-table): a row for each, from a unison
 * to an octave, with its sizes and the notes it spans from C; ▶ plays it.
 *
 * @module pages/intervals/table
 */
import { INTERVALS, parseInterval, pitchAbove } from '../../music/intervals.js';
import { parsePitch, printed } from '../../music/pitch.js';
import { melodyTimeline } from '../../audio/timeline.js';
import { sharedPlayer } from '../../audio/player.js';
import { currentInstrument } from '../../ui/instrument.js';
import { playButton } from '../../ui/play-buttons.js';
import { flash } from '../../lib/dom.js';

export function renderIntervalTable(table) {
  const rows = INTERVALS.map((iv, size) => {
    const degree = iv.degrees[0];
    const top = pitchAbove('C4', degree);
    const name = printed(top.slice(0, -1));
    return `<tr class="q-${iv.quality}" data-midis="60 ${parsePitch(top).midi}">` +
      `<th scope="row"><b>${iv.short}</b> ${iv.name}</th>` +
      `<td>${parseInterval(degree).steps + 1}</td><td>${size}</td><td>C–${name}</td>` +
      `<td>${playButton(`Hear C up to ${name}`, 'iv-hear')}</td></tr>`;
  });
  table.innerHTML = '<thead><tr><th scope="col">Interval</th><th scope="col">Letters</th><th scope="col">Half steps</th>' +
    '<th scope="col">From C</th><th scope="col" aria-label="Play"></th></tr></thead>' +
    `<tbody>${rows.join('')}</tbody>`;

  table.addEventListener('click', (e) => {
    const btn = e.target.closest('.iv-hear');
    if (!btn) return;
    const instrument = currentInstrument();
    sharedPlayer().play(melodyTimeline(btn.closest('tr').dataset.midis.split(' ').map(Number), { bpm: 120, instrument }));
    flash(btn, 'is-sounding', 1000);
  });
}
