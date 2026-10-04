import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pickWeighted } from '../../js/lib/random.js';

describe('random', () => {
  it('picks heavier items more often', () => {
    const items = [{ id: 'a', weight: 1 }, { id: 'b', weight: 3 }];
    assert.deepEqual([0, 0.2, 0.3, 0.99].map((x) => pickWeighted(items, () => x).id), ['a', 'a', 'b', 'b']);
  });
});
