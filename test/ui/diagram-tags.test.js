import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { renderDiagramTags } from '../../js/ui/diagram-tags.js';

const count = (svg, pattern) => (svg.match(new RegExp(pattern, 'g')) || []).length;

describe('diagrams written as HTML', () => {
  const { window } = new JSDOM(`
    <span id="g" data-guitar="x 1 3 3 3 1 (barre 5-1)" data-root="Bb" data-quality="maj" data-movable></span>
    <span id="p" data-piano="C Eb Gb A" data-root="C" data-faded="A" data-quality="dim"></span>
    <span id="plain">untouched</span>`);
  renderDiagramTags(window.document);
  const $ = (id) => window.document.getElementById(id).innerHTML;

  it('draws data-guitar elements', () => {
    assert.match($('g'), /class="diagram q-maj"/);
    assert.match($('g'), />1fr</); // data-movable
    assert.equal(count($('g'), 'root-ring'), 2);
  });

  it('draws data-piano elements, stacking notes upward', () => {
    assert.match($('p'), /class="diagram q-dim"/);
    assert.equal(count($('p'), ' on'), 4);
    assert.equal(count($('p'), 'faded'), 1);
    assert.equal(count($('p'), 'class="pkr'), 1);
  });
});
