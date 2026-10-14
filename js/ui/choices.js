/**
 * A labelled row of buttons to pick one of: each button has `data-<attr>`, and
 * aria-pressed on the one picked.
 *
 * @example
 * box.innerHTML = choiceGroup('Key', 'key', ['C', 'G'], { text: printed });
 * markChosen(box, 'key', 'G');
 *
 * @module ui/choices
 */

/**
 * The row, as HTML.
 * @param {string} label  shown before the buttons, and read out for the group
 * @param {string} attr  one word: 'key' for data-key
 * @param {Array} values
 * @param {object} [options]
 * @param {function(*): string} [options.text]  what each button shows (HTML): its value by default
 * @param {string} [options.cls]  more classes for the row
 */
export function choiceGroup(label, attr, values, { text = String, cls = '' } = {}) {
  const buttons = values.map((v) => `<button type="button" data-${attr}="${v}" aria-pressed="false">${text(v)}</button>`).join('');
  return `<div class="choices ${cls}" role="group" aria-label="${label}"><span>${label}</span>${buttons}</div>`;
}

/** Marks the button for `value` as the one picked, and no other. */
export function markChosen(scope, attr, value) {
  scope.querySelectorAll(`[data-${attr}]`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[attr] === String(value))));
}
