/**
 * The row of seven (#spine) and every key, chord by chord (#key-table).
 *
 * @module pages/number-system/tables
 */
import { QUALITIES } from '../../music/chords.js';
import { ALSO_SPELLED, CIRCLE_OF_FIFTHS, DEGREES, diatonicChords } from '../../music/keys.js';
import { playButton } from '../../ui/play-buttons.js';
import { guitarArt, guitarFrets, noteList, pianoArt, pianoChord, playable } from './plain-chord.js';

/** 1 2m 3m 4 5 6m 7°, with their qualities. */
export function renderSpine(el) {
  el.innerHTML = DEGREES.map((d) =>
    `<div class="slot q-${d.quality}"><span class="num">${d.number}</span><span class="rom">${d.roman}</span>` +
    `<span class="qual">${QUALITIES[d.quality].label}</span></div>`).join('');
}

/** A row per key round the circle of fifths: each chord drawn for guitar and piano, and playable. */
export function renderKeyTable(el) {
  const head = '<thead><tr><th>Key</th>' + DEGREES.map((d) =>
    `<th class="q-${d.quality}"><span class="hn">${d.number}</span><span class="hr">${d.roman}</span></th>`).join('') + '</tr></thead>';

  const rows = CIRCLE_OF_FIFTHS.map((key) => {
    const alt = ALSO_SPELLED[key] ? ` <i>= ${ALSO_SPELLED[key]}</i>` : '';
    const cells = diatonicChords(key).map((c) =>
      `<td class="q-${c.quality}"${playable(c)}>` +
        playButton('Play ' + c.name) +
        `<span class="ch">${c.name}</span>` +
        `<span class="art only-g">${guitarArt(c)}</span>` +
        `<span class="fr only-g">${guitarFrets(c)}</span>` +
        `<span class="art only-p">${pianoArt(c)}</span>` +
        `<span class="fr only-p">${noteList(pianoChord(c).notes)}</span>` +
      '</td>').join('');
    return `<tr><th scope="row">${key}${alt}</th>${cells}</tr>`;
  }).join('');

  el.innerHTML = head + '<tbody>' + rows + '</tbody>';
}
