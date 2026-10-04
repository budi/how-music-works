/**
 * Guitar and piano notes, synthesised — each pitch once per audio context,
 * then replayed.
 *
 * @module audio/instruments
 */

function hz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

// Plucked string (Karplus-Strong): a short burst of noise goes round a loop
// one period long, losing a little treble every time round — which is
// roughly what a string does after the pick lets go.
function guitarSamples(rate, midi) {
  const f = hz(midi);
  const data = new Float32Array(Math.floor(rate * INSTRUMENTS.guitar.ring));
  const period = Math.max(2, Math.round(rate / f));
  const loop = new Float32Array(period);
  let soft = 0;
  for (let i = 0; i < period; i++) {
    soft = soft * 0.45 + (Math.random() * 2 - 1) * 0.55; // a pick, not a click
    loop[i] = soft;
  }
  const seconds = midi < 52 ? 6 : midi < 60 ? 5 : 4; // to fade by 60 dB (the loop's filter takes more)
  const keep = 0.001 ** (1 / (f * seconds));
  for (let n = 0, p = 0; n < data.length; n++) {
    const next = (p + 1) % period;
    data[n] = loop[p];
    loop[p] = keep * 0.5 * (loop[p] + loop[next]);
    p = next;
  }
  return normalise(data);
}

// Struck string: a stack of partials, each a touch sharp of the last (as on a
// real piano), the high ones fading first, plus a thump of hammer.
function pianoSamples(rate, midi) {
  const f = hz(midi);
  const data = new Float32Array(Math.floor(rate * INSTRUMENTS.piano.ring));
  for (let k = 1; k <= 8; k++) {
    const fk = f * k * Math.sqrt(1 + 0.0004 * k * k);
    if (fk > rate / 2.2) break;
    const amp = (k === 1 ? 1 : 0.7) / k ** 1.3;
    const fade = Math.exp(-(0.7 + 0.45 * k + f / 900) / rate);
    const step = 2 * Math.PI * fk / rate;
    for (let n = 0, env = amp; n < data.length; n++, env *= fade) data[n] += env * Math.sin(step * n);
  }
  const attack = Math.floor(rate * 0.004);
  const thump = Math.floor(rate * 0.012);
  for (let m = 0; m < thump; m++) {
    if (m < attack) data[m] *= m / attack;
    data[m] += (Math.random() * 2 - 1) * 0.08 * (1 - m / thump);
  }
  return normalise(data);
}

function normalise(data) {
  let peak = 0;
  for (const v of data) peak = Math.max(peak, Math.abs(v));
  if (peak > 0) for (let i = 0; i < data.length; i++) data[i] /= peak;
  return data;
}

/**
 * The instruments chords can be played on.
 * - `samples(rate, midi)`: one note, made from scratch
 * - `ring`: seconds of it that are made
 * - `spread`: seconds between one string and the next as a chord is struck
 * - `level`: so the two sound about as loud as each other
 */
export const INSTRUMENTS = {
  guitar: { samples: guitarSamples, ring: 3.2, spread: 0.022, level: 1.5 },
  piano: { samples: pianoSamples, ring: 3.2, spread: 0.004, level: 0.8 },
};

const cache = new WeakMap(); // audio context -> { 'guitar60': AudioBuffer, … }

function noteBuffer(ctx, instrument, midi) {
  if (!cache.has(ctx)) cache.set(ctx, {});
  const buffers = cache.get(ctx);
  const key = instrument + midi;
  if (!buffers[key]) {
    const data = INSTRUMENTS[instrument].samples(ctx.sampleRate, midi);
    const buffer = ctx.createBuffer(1, data.length, ctx.sampleRate);
    buffer.getChannelData(0).set(data);
    buffers[key] = buffer;
  }
  return buffers[key];
}

// One note. `length` (seconds) cuts it short with a quick fade, the way a
// player damps the strings before the next chord.
function playNote(ctx, out, when, instrument, midi, peak, length) {
  const src = ctx.createBufferSource();
  src.buffer = noteBuffer(ctx, instrument, midi);
  const end = when + Math.min(length || Infinity, INSTRUMENTS[instrument].ring);
  const g = ctx.createGain();
  g.gain.setValueAtTime(peak, when);
  g.gain.setValueAtTime(peak, Math.max(when, end - 0.08));
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  src.connect(g);
  g.connect(out);
  src.start(when);
  src.stop(end + 0.02);
}

/**
 * A chord, low note first, each a moment after the last: a down strum.
 * @param {AudioContext} ctx
 * @param {AudioNode} out
 * @param {number} when  on the audio clock
 * @param {object} chord
 * @param {string} chord.instrument  'guitar' or 'piano'
 * @param {number[]} chord.notes  MIDI numbers
 * @param {number} [chord.length]  seconds before it's damped; otherwise it rings out
 * @param {boolean} [accent]  false: a little softer
 */
export function strum(ctx, out, when, chord, accent) {
  const instrument = INSTRUMENTS[chord.instrument];
  const notes = chord.notes.slice().sort((a, b) => a - b);
  const peak = (accent === false ? 0.75 : 0.95) * instrument.level / Math.sqrt(Math.max(1, notes.length));
  notes.forEach((midi, i) => {
    const at = when + i * instrument.spread;
    playNote(ctx, out, at, chord.instrument, midi, peak, chord.length && chord.length - i * instrument.spread);
  });
}
