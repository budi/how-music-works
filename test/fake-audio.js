/*
 * A stand-in for the browser's AudioContext: no sound, but it records every
 * oscillator and noise burst that gets started, and its clock only moves
 * when a test moves it.
 *
 *   const ctx = new FakeAudioContext();
 *   ctx.currentTime = 1.5;
 *   ctx.started   // [{ kind: 'oscillator' | 'noise', at, type, frequency, buffer }]
 *
 * ("noise" is any buffer played: a noise burst, or an instrument's note.)
 */
class FakeParam {
  constructor(value = 0) {
    this.value = value;
    this.events = [];
  }
  setValueAtTime(v, t) { this.events.push(['set', v, t]); return this; }
  exponentialRampToValueAtTime(v, t) { this.events.push(['exp', v, t]); return this; }
  linearRampToValueAtTime(v, t) { this.events.push(['lin', v, t]); return this; }
}

class FakeNode {
  constructor(ctx) { this.ctx = ctx; this.outputs = []; }
  connect(node) { this.outputs.push(node); return node; }
  disconnect() { this.outputs = []; }
}

export class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 8000;
    this.state = 'running';
    this.destination = new FakeNode(this);
    this.started = [];
    FakeAudioContext.instances.push(this);
  }
  createGain() {
    const node = new FakeNode(this);
    node.gain = new FakeParam(1);
    return node;
  }
  createOscillator() {
    const node = new FakeNode(this);
    node.type = 'sine';
    node.frequency = new FakeParam(440);
    node.start = (at) => this.started.push({ kind: 'oscillator', at, type: node.type, frequency: node.frequency.events[0]?.[1] });
    node.stop = () => {};
    return node;
  }
  createBufferSource() {
    const node = new FakeNode(this);
    node.start = (at) => this.started.push({ kind: 'noise', at, buffer: node.buffer, gain: node.outputs[0]?.gain });
    node.stop = () => {};
    return node;
  }
  createBiquadFilter() {
    const node = new FakeNode(this);
    node.type = 'lowpass';
    node.frequency = new FakeParam(350);
    return node;
  }
  createBuffer(channels, length) {
    const data = new Float32Array(length);
    return { getChannelData: () => data, length };
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
}
FakeAudioContext.instances = [];

// Timers and animation frames that only run when the test says so.
export function manualClock() {
  let timers = [];
  let frames = [];
  let next = 1;
  return {
    setTimer(fn) { const id = next++; timers.push({ id, fn }); return id; },
    clearTimer(id) { timers = timers.filter((t) => t.id !== id); },
    frame(fn) { frames.push(fn); },
    // run everything that's waiting (once each; new ones wait for the next tick)
    tick() {
      const t = timers; const f = frames;
      timers = []; frames = [];
      t.forEach((x) => x.fn());
      f.forEach((fn) => fn());
    },
    get pending() { return timers.length + frames.length; },
  };
}
