/**
 * The plain chord on each degree, as the tables and the circle of fifths show it.
 *
 * @module pages/number-system/plain-chord
 */
import { FLAVOURS } from '../../music/chords.js';
import { commonVoicing, formatFrets, guitarNotes } from '../../music/guitar.js';
import { pianoNotes, pianoVoicing } from '../../music/piano.js';
import { drawGuitarChord, drawPianoChord } from '../../draw/chord-diagram.js';
import { playAttrs } from '../../ui/play-buttons.js';

/** The chord's guitar diagram. `chord` is one of diatonicChords(key) (music/keys.js). */
export function guitarArt(chord) {
  return drawGuitarChord(commonVoicing(chord.root, chord.quality), { root: chord.root, quality: chord.quality });
}

/** 'x 3 2 0 1 0' */
export function guitarFrets(chord) {
  return formatFrets(commonVoicing(chord.root, chord.quality).frets);
}

/** The chord in root position on piano. */
export function pianoChord(chord) {
  return pianoVoicing(chord.root, FLAVOURS[chord.quality][0], 0);
}

export function pianoArt(chord) {
  return drawPianoChord(pianoChord(chord).notes, { quality: chord.quality });
}

/** The attributes that make a play button play the chord. */
export function playable(chord) {
  return playAttrs(guitarNotes(commonVoicing(chord.root, chord.quality).frets), pianoNotes(pianoChord(chord).notes));
}

/** A voicing's notes, by name: 'C · E · G' */
export function noteList(notes) {
  return notes.map((n) => n.name).join(' · ');
}

/** '6m · vi' */
export function numberLabel(degree) {
  return degree.number + ' · ' + degree.roman;
}
