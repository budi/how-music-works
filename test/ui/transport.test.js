import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { FakeAudioContext } from '../fake-audio.js';
import { melodyTimeline } from '../../js/audio/timeline.js';
import { sharedPlayer } from '../../js/audio/player.js';
import { transport } from '../../js/ui/transport.js';

describe('play controls', () => {
  let window;
  const press = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const fire = (el, type) => el.dispatchEvent(new window.Event(type, { bubbles: true }));
  // a box for controls, in a figure; each box gets one set of controls
  const newBox = () => {
    const holder = window.document.createElement('figure');
    holder.append(window.document.createElement('div'));
    window.document.body.append(holder);
    return holder.firstChild;
  };

  before(() => {
    globalThis.AudioContext = FakeAudioContext;
    ({ window } = new JSDOM(''));
  });
  after(() => {
    sharedPlayer().stop();
    delete globalThis.AudioContext;
    window.close();
  });

  it('shows the tempo, the options, a menu and anything else asked for', () => {
    const box = newBox();
    const t = transport(box, {
      settings: { tempo: 90, metronome: true, countIn: false, strum: 'beats' },
      max: 160,
      beat: '♩.',
      checks: [['metronome', 'Metronome'], ['countIn', 'Count-in']],
      select: { setting: 'strum', label: 'Play', choices: [['bar', 'once a bar'], ['beats', 'on every beat']] },
      extra: '<button class="more">More</button>',
      timeline: () => melodyTimeline([60]),
    });
    assert.equal(box.querySelector('.rhythm-tempo').textContent, '♩. = 90');
    assert.equal(box.querySelector('input[type="range"]').max, '160');
    assert.deepEqual([...box.querySelectorAll('input[type="checkbox"]')].map((c) => [c.dataset.option, c.checked]),
      [['metronome', true], ['countIn', false]]);
    assert.equal(box.querySelector('select').value, 'beats');
    assert.ok(box.querySelector('.rhythm-status').nextElementSibling.matches('.more'));
    t.setBeat('♩');
    assert.equal(box.querySelector('.rhythm-tempo').textContent, '♩ = 90');
  });

  it('plays and stops, marking its figure, and keeps the settings up to date', () => {
    const asked = [];
    let stopped = 0;
    const box = newBox();
    const t = transport(box, {
      settings: { tempo: 80, metronome: true, countIn: true },
      checks: [['metronome', 'Metronome'], ['countIn', 'Count-in']],
      timeline: (s) => {
        asked.push({ ...s });
        return melodyTimeline([60, 62], { bpm: s.tempo });
      },
      onStopped: () => stopped++,
    });
    const play = box.querySelector('.rhythm-play');
    press(play);
    assert.equal(t.playing, true);
    assert.equal(play.textContent, 'Stop');
    assert.ok(box.parentNode.classList.contains('is-playing'));

    const slider = box.querySelector('input[type="range"]');
    slider.value = '100';
    fire(slider, 'input');
    assert.equal(box.querySelector('output').textContent, '100');
    assert.deepEqual(asked.map((s) => s.tempo), [80, 100], 'a new tempo carries on straight away');
    const countIn = box.querySelector('[data-option="countIn"]');
    countIn.checked = false;
    fire(countIn, 'change');
    assert.equal(asked.length, 2, 'the count-in only matters at the start');
    assert.equal(t.settings.countIn, false);

    press(play);
    assert.equal(t.playing, false);
    assert.equal(play.textContent, 'Play');
    assert.ok(!box.parentNode.classList.contains('is-playing'));
    assert.equal(stopped, 2, 'once for the restart, once for Stop');
  });

  it('plays one thing at a time', () => {
    const spec = { settings: { tempo: 80 }, timeline: () => melodyTimeline([60]) };
    const [a, b] = [newBox(), newBox()];
    const first = transport(a, spec);
    const second = transport(b, spec);
    first.start();
    second.start();
    assert.equal(first.playing, false);
    assert.equal(a.querySelector('.rhythm-play').textContent, 'Play');
    assert.equal(second.playing, true);
    second.stop();
    assert.equal(second.playing, false);
  });
});
