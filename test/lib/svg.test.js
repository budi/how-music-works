import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { el, svg } from '../../js/lib/svg.js';

describe('svg markup', () => {
  it('writes compact elements, escaping text and leaving out empty attributes', () => {
    assert.equal(el('rect', { class: 'dot', x: 1.23456, y: null, hidden: false }), '<rect class="dot" x="1.235"/>');
    assert.equal(el('text', { 'aria-label': '"1" & <2>' }, ''), '<text aria-label="&quot;1&quot; &amp; &lt;2>"></text>');
  });

  it('wraps a drawing in an accessible <svg>', () => {
    assert.equal(svg({ cls: 'score', viewBox: [0, -6.0001, 10, 9], label: 'A rhythm' }, '<g/>'),
      '<svg class="score" viewBox="0 -6 10 9" role="img" aria-label="A rhythm" xmlns="http://www.w3.org/2000/svg"><g/></svg>');
    assert.match(svg({ cls: 'diagram', viewBox: [0, 0, 1, 1], title: 'C', data: { whites: 15 } }, ''), / data-whites="15" [^>]*><title>C<\/title>/);
  });

  it('refuses inline styles and event handlers, which the site’s Content-Security-Policy blocks', () => {
    assert.throws(() => el('rect', { style: 'fill: red' }), /No inline style/);
    assert.throws(() => el('g', { onclick: 'play()' }), /No inline onclick/);
  });
});
