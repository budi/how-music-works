/**
 * Choices remembered on this device (localStorage).
 *
 * Storage can be blocked — private browsing, strict settings — so neither
 * function ever throws: the choice just isn't remembered then.
 *
 * @module lib/storage
 */

/** The value saved under `key`, or null. */
export function recall(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function remember(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // blocked: nothing to do
  }
}
