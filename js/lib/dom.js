/**
 * Small helpers the page scripts share.
 *
 * @module lib/dom
 */

/**
 * Sets up every element in `scope` matching `selector`. If one fails — a typo
 * in a pattern, say — its error is shown where its drawing would be (the
 * element inside it matching `errorIn`), and the others still work.
 * @param {ParentNode} scope
 * @param {string} selector
 * @param {function(Element): *} setup
 * @param {string} errorIn
 * @returns {Array} what each successful setup returned
 */
export function setupEach(scope, selector, setup, errorIn) {
  const results = [];
  scope.querySelectorAll(selector).forEach((el) => {
    try {
      results.push(setup(el));
    } catch (err) {
      showError(el.querySelector(errorIn), err);
    }
  });
  return results;
}

/** Shows an error's message in place of what `box` holds, and logs it. */
export function showError(box, err) {
  const msg = box.ownerDocument.createElement('p');
  msg.className = 'rhythm-error';
  msg.textContent = err.message;
  box.replaceChildren(msg);
  console.error(err);
}

/**
 * Sets up the parts of a page that are there, by id:
 * mount(document, { 'key-table': renderKeyTable, … }).
 */
export function mount(scope, parts) {
  for (const [id, setup] of Object.entries(parts)) {
    const el = scope.querySelector('#' + id);
    if (el) setup(el);
  }
}

const timers = new WeakMap();

/** Puts `cls` on an element for `ms` milliseconds (from the latest call). */
export function flash(el, cls, ms) {
  el.classList.add(cls);
  clearTimeout(timers.get(el));
  timers.set(el, setTimeout(() => el.classList.remove(cls), ms));
}

let ids = 0;

/** An id no other element on the page has: uid('t') → 't1', then 't2', … */
export function uid(prefix) {
  ids += 1;
  return prefix + ids;
}

/** The width of a drawing, from its viewBox. */
export function viewBoxWidth(svg) {
  return Number(svg.getAttribute('viewBox').split(' ')[2]);
}

/**
 * Sizes the drawing in `box` by its own width (CSS reads it as --w, in staff
 * spaces), so a staff space comes out the same size in every drawing; a
 * keyboard's by its white keys (--whites). Set here rather than written into
 * the drawing, as a Content-Security-Policy that blocks inline styles allows it.
 */
export function sizeToDrawing(box) {
  const drawing = box.querySelector('svg');
  box.style.setProperty('--w', viewBoxWidth(drawing));
  if (drawing.dataset.whites) box.style.setProperty('--whites', drawing.dataset.whites);
}
