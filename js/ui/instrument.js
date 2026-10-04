/**
 * Guitar or piano: the "Show for" switch on pages that have both.
 *
 * The choice is `<html data-instrument="guitar|piano">`, and CSS hides
 * `.only-g` or `.only-p` to match. It's remembered on this device, across pages.
 *
 * @module ui/instrument
 */
import { recall, remember } from '../lib/storage.js';

const KEY = 'music.instrument';
const CHOICES = ['guitar', 'piano'];

/** The instrument showing: 'guitar' or 'piano'. */
export function currentInstrument(doc = document) {
  return doc.documentElement.dataset.instrument === 'piano' ? 'piano' : 'guitar';
}

function choose(value) {
  document.documentElement.dataset.instrument = value;
  document.querySelectorAll('[data-instrument-choice]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.instrumentChoice === value));
  });
}

/**
 * Applies the remembered choice at once — run it before the page paints, so
 * it doesn't flicker — and makes the switch's buttons work once the page has loaded.
 */
export function setupInstrumentSwitch() {
  const root = document.documentElement;
  const saved = recall(KEY);
  if (CHOICES.includes(saved)) root.dataset.instrument = saved;

  document.addEventListener('DOMContentLoaded', () => {
    choose(root.dataset.instrument || 'guitar');
    document.addEventListener('click', (e) => {
      const btn = e.target.closest?.('[data-instrument-choice]');
      if (!btn) return;
      choose(btn.dataset.instrumentChoice);
      remember(KEY, btn.dataset.instrumentChoice);
    });
  });
}
