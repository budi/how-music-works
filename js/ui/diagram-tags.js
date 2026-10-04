/**
 * Chord diagrams written straight into HTML, no script needed on the page:
 *
 *     <span data-guitar="1 3 3 2 1 1 (barre 6-1)" data-root="F" data-quality="maj"></span>
 *     <span data-guitar="x 1 3 3 3 1 (barre 5-1)" data-root="Bb" data-quality="maj" data-movable></span>
 *     <span data-piano="C E G" data-root="C" data-quality="maj"></span>
 *     <span data-piano="C Eb Gb A" data-root="C" data-faded="A" data-quality="dim"></span>
 *
 * Guitar voicings are written as in music/guitar.js; piano notes by name,
 * stacked upward from the first.
 *
 * @module ui/diagram-tags
 */
import { parseGuitar } from '../music/guitar.js';
import { stackNotes } from '../music/piano.js';
import { drawGuitarChord, drawPianoChord } from '../draw/chord-diagram.js';

/** Draws every data-guitar and data-piano element in `scope`. */
export function renderDiagramTags(scope) {
  scope.querySelectorAll('[data-guitar]').forEach((el) => {
    const { guitar, root, quality } = el.dataset;
    el.innerHTML = drawGuitarChord(parseGuitar(guitar), { root, quality, movable: 'movable' in el.dataset });
  });
  scope.querySelectorAll('[data-piano]').forEach((el) => {
    const { piano, root, faded, quality } = el.dataset;
    el.innerHTML = drawPianoChord(stackNotes(piano, { root, faded }), { quality });
  });
}
