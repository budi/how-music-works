/**
 * A rhythm exercise: a `<figure class="rhythm">` (templates/partials/rhythm-exercise.hbs)
 * becomes notation that plays, with tempo, metronome and count-in.
 *
 *     data-time     time signature, e.g. "3/4"
 *     data-pattern  a rhythm on one line (see music/rhythm.js); for drums instead:
 *     data-hands    hi-hat and snare (stems up)
 *     data-feet     bass drum (stems down)
 *     data-tempo    starting tempo, in beats per minute
 *     data-sound    what a one-line rhythm sounds like (default "clap")
 *     data-swing    play eighths long-short
 *     data-compact  just a Play button: the metronome on, no count-in or counting
 *
 * @module pages/beats-101/exercise
 */
import { beatNote, parseRhythm, parseTime } from '../../music/rhythm.js';
import { drawDrums, drawRhythm } from '../../draw/notation.js';
import { rhythmTimeline } from '../../audio/timeline.js';
import { transport } from '../../ui/transport.js';
import { sizeToDrawing } from '../../lib/dom.js';

/** Draws one exercise and gives it its controls. */
export function setupExercise(fig) {
  const d = fig.dataset;
  const time = parseTime(d.time || '4/4');
  const drums = d.hands !== undefined;
  const voices = {};
  if (drums) {
    voices.up = parseRhythm(d.hands, time, ['hh']);
    if (d.feet) voices.down = parseRhythm(d.feet, time, ['bd']);
  } else {
    voices.main = parseRhythm(d.pattern, time, [d.sound || 'clap']);
  }

  const compact = 'compact' in d;
  const score = fig.querySelector('.rhythm-score');
  score.innerHTML = drums ? drawDrums(voices, { count: !compact }) : drawRhythm(voices.main, { count: !compact });
  sizeToDrawing(score);

  return transport(fig.querySelector('.rhythm-controls'), {
    // compact rows keep the metronome: you hear the beat stay put
    settings: { tempo: Number(d.tempo) || 80, metronome: true, countIn: !compact, swing: 'swing' in d },
    playOnly: compact,
    beat: beatNote(time),
    checks: [['metronome', 'Metronome'], ['countIn', 'Count-in']],
    timeline: (s) => rhythmTimeline(voices, { bpm: s.tempo, swing: s.swing }),
    onStep: (step) => lightStep(fig, step),
    onStopped: () => unlight(fig),
  });
}

/** Lights the note and count of a timeline step, in place of the last one in its voice. */
export function lightStep(fig, step) {
  const voice = `[data-voice="${step.voice}"]`;
  fig.querySelectorAll('.is-now' + voice).forEach((el) => el.classList.remove('is-now'));
  fig.querySelectorAll(`${voice}[data-i="${step.index}"]`).forEach((el) => el.classList.add('is-now'));
}

export function unlight(fig) {
  fig.querySelectorAll('.is-now').forEach((el) => el.classList.remove('is-now'));
}
