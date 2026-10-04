import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createProgression, progressionNotes } from '../../../js/pages/number-system/progression.js';

// The builder's choices (keys, numbers, flavours, shapes) are tested through the page.
describe('the progression builder’s chords', () => {
  it('gives each chord’s notes for the instrument playing', () => {
    const state = createProgression();
    assert.deepEqual(progressionNotes(state, 'piano'), [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]);
    assert.deepEqual(progressionNotes(state, 'guitar')[0], [48, 52, 55, 60]); // C shape: x 3 2 0 1 x
  });
});
