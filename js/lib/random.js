/**
 * Picking at random. Each function takes the source of randomness — any
 * function returning a number in [0, 1) — so tests can pass their own.
 *
 * @module lib/random
 */

/** Any one item of a list. */
export function pick(list, random = Math.random) {
  return list[Math.floor(random() * list.length)];
}

/** One item of a list of { weight, … }: the heavier an item, the more often it comes up. */
export function pickWeighted(items, random = Math.random) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let x = random() * total;
  for (const item of items) {
    x -= item.weight;
    if (x < 0) return item;
  }
  return items[items.length - 1];
}
