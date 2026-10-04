/**
 * Words and numbers in plain text.
 *
 * @module lib/text
 */

/** The items of a space-separated list: words(' C4  E4 ') → ['C4', 'E4'] */
export function words(text) {
  return String(text ?? '').trim().split(/\s+/).filter(Boolean);
}

/** plural(1, 'octave') → '1 octave', plural(2, 'octave') → '2 octaves' */
export function plural(n, word) {
  return n + ' ' + word + (n === 1 ? '' : 's');
}
