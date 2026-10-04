/**
 * Play controls: a Play / Stop button and, for longer pieces, a tempo slider,
 * options to tick (metronome, count-in, …) and the count-in, counted out.
 *
 * Everything plays on the page's one player, so starting one thing stops
 * whatever else was playing. While it plays, the figure around the controls
 * has the class `is-playing`.
 *
 * @module ui/transport
 */
import { sharedPlayer } from '../audio/player.js';
import { uid } from '../lib/dom.js';

/**
 * @typedef {object} TransportSpec
 * @property {object} settings  starting values — { tempo, metronome, countIn, … };
 *   the controls change them, and `timeline` reads them
 * @property {function(object): Timeline} timeline  what to play, given the settings
 * @property {boolean} [playOnly]  just the Play button: no tempo, options or count
 * @property {number} [max=200]  the fastest tempo on the slider
 * @property {string} [beat='♩']  the note the tempo counts
 * @property {Array<string[]>} [checks]  options as checkboxes: [setting, label]
 * @property {{setting: string, label: string, choices: Array<string[]>}} [select]
 *   an option as a menu; choices are [value, text]
 * @property {string} [extra]  more controls (HTML), after the rest
 * @property {boolean} [loop=true]
 * @property {function(number, object): Timeline} [next]  the timeline for pass n of
 *   the loop, given the settings (see PlayOptions in audio/player.js)
 * @property {function(number)} [onPass]  pass n has started
 * @property {function(object)} [onStep]  a step of the timeline is sounding
 * @property {function()} [onStopped]  it stopped, for whatever reason
 */

/**
 * Puts play controls into `box` (replacing what's there) and makes them work.
 * Changing the tempo or an option while it plays carries on with the change
 * straight away; the count-in only matters when it starts.
 * @param {Element} box
 * @param {TransportSpec} spec
 * @returns {{settings: object, playing: boolean, start: function(), stop: function(), setBeat: function(string)}}
 *   start() while it plays starts it again, with the settings as they are now
 */
export function transport(box, spec) {
  const settings = { ...spec.settings };
  box.innerHTML = controls(spec, settings, uid('t'));
  if (spec.select) box.querySelector('select[data-option]').value = settings[spec.select.setting];
  const button = box.querySelector('.rhythm-play');
  const status = box.querySelector('.rhythm-status');
  const figure = box.closest('figure');
  let playing = false;

  const count = (text) => {
    if (status) status.textContent = text;
  };

  function show(on) {
    playing = on;
    button.setAttribute('aria-pressed', String(on));
    button.textContent = on ? 'Stop' : 'Play';
    if (figure) figure.classList.toggle('is-playing', on);
  }

  function start() {
    const resuming = playing;
    sharedPlayer().play(spec.timeline(settings), {
      loop: spec.loop !== false,
      countIn: settings.countIn && !resuming,
      metronome: settings.metronome,
      next: spec.next && ((n) => spec.next(n, settings)),
      onPass: spec.onPass,
      onStep: spec.onStep,
      onCount: (n) => count(n === null ? '' : String(n)),
      onStop: () => {
        show(false);
        count('');
        if (spec.onStopped) spec.onStopped();
      },
    });
    show(true);
  }

  function stop() {
    if (playing) sharedPlayer().stop();
  }

  box.addEventListener('click', (e) => {
    if (!e.target.closest('.rhythm-play')) return;
    if (playing) stop();
    else start();
  });
  box.addEventListener('input', (e) => {
    if (e.target.type !== 'range') return;
    settings.tempo = Number(e.target.value);
    box.querySelector('.rhythm-tempo output').textContent = settings.tempo;
    if (playing) start();
  });
  box.addEventListener('change', (e) => {
    const setting = e.target.dataset.option;
    if (!setting) return;
    settings[setting] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (playing && setting !== 'countIn') start();
  });

  return {
    settings,
    get playing() {
      return playing;
    },
    start,
    stop,
    /** Changes the note the tempo counts: setBeat('♩.') */
    setBeat(beat) {
      box.querySelector('.rhythm-tempo span').firstChild.nodeValue = beat + ' = ';
    },
  };
}

function controls(spec, settings, id) {
  let html = '<button type="button" class="rhythm-play" aria-pressed="false">Play</button>';
  if (spec.playOnly) return html;
  html += `<label class="rhythm-tempo" for="${id}-t"><span>${spec.beat || '♩'} = <output>${settings.tempo}</output></span>` +
    `<input id="${id}-t" type="range" min="40" max="${spec.max || 200}" step="1" value="${settings.tempo}"></label>`;
  for (const [setting, label] of spec.checks || []) {
    html += `<label class="rhythm-check"><input type="checkbox" data-option="${setting}"${settings[setting] ? ' checked' : ''}> ${label}</label>`;
  }
  if (spec.select) {
    const { setting, label, choices } = spec.select;
    const options = choices.map(([value, text]) => `<option value="${value}">${text}</option>`).join('');
    html += `<label class="rhythm-select" for="${id}-s">${label} <select id="${id}-s" data-option="${setting}">${options}</select></label>`;
  }
  return html + '<span class="rhythm-status" aria-live="polite"></span>' + (spec.extra || '');
}
