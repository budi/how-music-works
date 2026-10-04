/**
 * The percussion sounds, made on the spot from oscillators and noise — no
 * audio files: a metronome click, a clap and a drum kit.
 *
 * Each sound is a function (ctx, out, when, accent): it schedules itself on
 * the audio context `ctx` at time `when`, into the node `out`; an accented
 * hit is a little louder (and a click, higher).
 *
 * @module audio/sounds
 */

function envelope(ctx, out, when, peak, decay) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(peak, when + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
  g.connect(out);
  return g;
}

function tone(ctx, out, when, type, from, to, peak, decay) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, when);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, when + decay);
  osc.connect(envelope(ctx, out, when, peak, decay));
  osc.start(when);
  osc.stop(when + decay + 0.02);
}

function noise(ctx, out, when, filterType, freq, peak, decay) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(freq, when);
  src.connect(filter);
  filter.connect(envelope(ctx, out, when, peak, decay));
  src.start(when);
  src.stop(when + decay + 0.02);
}

const buffers = new WeakMap(); // half a second of noise per audio context

function noiseBuffer(ctx) {
  if (!buffers.has(ctx)) {
    const length = Math.floor(ctx.sampleRate * 0.5);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    buffers.set(ctx, buffer);
  }
  return buffers.get(ctx);
}

/** click (metronome), clap, and the drums: bd bass drum, sn snare, hh hi-hat, rim cross-stick. */
export const SOUNDS = {
  click(ctx, out, when, accent) {
    tone(ctx, out, when, 'sine', accent ? 1760 : 1320, accent ? 1760 : 1320, accent ? 0.5 : 0.3, 0.05);
  },
  clap(ctx, out, when, accent) {
    tone(ctx, out, when, 'triangle', 900, 700, accent ? 0.9 : 0.7, 0.12);
    noise(ctx, out, when, 'bandpass', 1800, accent ? 0.35 : 0.25, 0.06);
  },
  bd(ctx, out, when, accent) {
    tone(ctx, out, when, 'sine', 140, 45, accent ? 1 : 0.9, 0.35);
  },
  sn(ctx, out, when, accent) {
    noise(ctx, out, when, 'highpass', 1200, accent ? 0.7 : 0.6, 0.18);
    tone(ctx, out, when, 'triangle', 200, 160, 0.3, 0.08);
  },
  hh(ctx, out, when, accent) {
    noise(ctx, out, when, 'highpass', 7000, accent ? 0.35 : 0.25, 0.05);
  },
  // the stick laid on the snare, its shaft knocking the rim: a short, woody click
  rim(ctx, out, when, accent) {
    tone(ctx, out, when, 'triangle', 1050, 800, accent ? 0.55 : 0.45, 0.045);
    noise(ctx, out, when, 'bandpass', 3200, accent ? 0.3 : 0.22, 0.025);
  },
};
