/**
 * The circle of fifths (#circle-of-fifths): a wheel of the twelve keys with
 * their relative minors inside. Tapping a key turns it to the top, marks its
 * 1, 4 and 5 (and 6m, 2m, 3m), and shows that key's seven chords.
 *
 * @module pages/number-system/circle
 */
import { chordName } from '../../music/chords.js';
import { ALSO_SPELLED, CIRCLE_OF_FIFTHS as KEYS, diatonicChords, keySignature, relativeMinor } from '../../music/keys.js';
import { playButton } from '../../ui/play-buttons.js';
import { guitarArt, pianoArt, playable } from './plain-chord.js';

const RING = { outer: 41, inner: 25 }; // radius of each ring, % of the wheel
const minorOf = (key) => chordName(relativeMinor(key), 'min');

export function renderCircle(el) {
  const keys = KEYS.map((key) => wheelKey(key, 'maj', key) + wheelKey(key, 'min', minorOf(key))).join('');
  el.innerHTML =
    '<div class="wheel">' +
      '<div class="ring"></div>' +
      '<div class="hub"><b></b><i></i><em>tap a key</em></div>' +
      keys +
    '</div>' +
    '<div class="panels">' + KEYS.map(keyPanel).join('') + '</div>';

  const wheel = el.querySelector('.wheel');
  // each key round its ring; set here, not in the markup, so a strict Content-Security-Policy allows it
  wheel.querySelectorAll('.key').forEach((btn) => {
    const angle = KEYS.indexOf(btn.dataset.key) * 30 * Math.PI / 180;
    const radius = btn.dataset.ring === 'maj' ? RING.outer : RING.inner;
    btn.style.left = (50 + radius * Math.sin(angle)).toFixed(2) + '%';
    btn.style.top = (50 - radius * Math.cos(angle)).toFixed(2) + '%';
  });
  let rotation = 0;
  let current = 0;

  function select(index) {
    // turn the short way round
    let delta = ((current - index) * 30) % 360;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    rotation += delta;
    current = index;
    wheel.style.setProperty('--rot', rotation + 'deg');

    const key = KEYS[index];
    const badges = {
      [key]: { maj: '1', min: '6m' },
      [KEYS[(index + 11) % 12]]: { maj: '4', min: '2m' },
      [KEYS[(index + 1) % 12]]: { maj: '5', min: '3m' },
    };
    wheel.querySelectorAll('.key').forEach((btn) => {
      const badge = badges[btn.dataset.key];
      const home = btn.dataset.key === key;
      btn.classList.toggle('is-home', home);
      btn.classList.toggle('is-near', !!badge && !home);
      btn.setAttribute('aria-pressed', String(home));
      if (badge) btn.dataset.badge = badge[btn.dataset.ring];
      else delete btn.dataset.badge;
    });
    wheel.querySelector('.hub b').textContent = key;
    wheel.querySelector('.hub i').textContent = minorOf(key);
    el.querySelectorAll('.panel').forEach((p) => { p.hidden = p.dataset.key !== key; });
  }

  wheel.addEventListener('click', (e) => {
    const btn = e.target.closest('.key');
    if (btn) select(KEYS.indexOf(btn.dataset.key));
  });
  select(0);
}

function wheelKey(key, ring, text) {
  return `<button type="button" class="key ${ring}" data-key="${key}" data-ring="${ring}"><span>${text}</span></button>`;
}

// a key's seven chords, its signature, and the same chords seen from its relative minor
function keyPanel(key, index) {
  const chords = diatonicChords(key);
  const minor = chords[5].name;
  const sig = keySignature(key);
  let sigText = 'no sharps or flats';
  if (sig.count) {
    const count = sig.count + ' ' + sig.accidental + (sig.count > 1 ? 's' : '');
    const other = ALSO_SPELLED[key];
    sigText = other ? `${count} · also spelled ${other} / ${minorOf(other)} with ${sig.count} flats` : count + ' · ' + sig.notes.join(' ');
  }

  const cells = chords.map((c) =>
    `<div class="cc q-${c.quality}"${playable(c)}>${playButton('Play ' + c.name)}<b>${c.degree.number}</b>` +
    `<span class="cn">${c.name}</span><span class="only-g">${guitarArt(c)}</span><span class="only-p">${pianoArt(c)}</span></div>`).join('');

  // the same seven chords, counted from the relative minor
  const minorRomans = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];
  const fromMinor = [5, 6, 0, 1, 2, 3, 4].map((d, i) => minorRomans[i] + ' ' + chords[d].name).join(' · ');
  const majorFive = chords[2].root;

  return `<div class="panel" data-key="${key}" hidden>` +
    `<h3>${key} major <span>relative minor ${minor} · ${sigText}</span></h3>` +
    `<div class="cgrid">${cells}</div>` +
    `<p class="minorline"><b>Seen from ${minor}</b> the same seven chords are numbered ${fromMinor}. ` +
      `Most songs in ${minor} swap the v for a major ${majorFive} (or ${majorFive}7) because it pulls back home harder.</p>` +
    `<p class="nextdoor">Next door: <b>${KEYS[(index + 11) % 12]}</b> is your 4, <b>${KEYS[(index + 1) % 12]}</b> is your 5. ` +
      'Either is an easy key to drift into mid-song.</p>' +
  '</div>';
}
