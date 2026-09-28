import assert from 'node:assert/strict';
import { test } from 'node:test';

import { gridShape } from '../lib/gridLayout.ts';

const indexes = (count: number) => {
  const shape = gridShape(count);
  return (shape.kind === 'rows' ? shape.rows.flat() : [shape.main, ...shape.side]).sort();
};

test('gridShape uses every photo exactly once for 2–6 photos', () => {
  for (let count = 2; count <= 6; count++) {
    assert.deepEqual(indexes(count), Array.from({ length: count }, (_, i) => i), `${count} photos`);
  }
});

test('gridShape layouts', () => {
  assert.deepEqual(gridShape(2), { kind: 'rows', rows: [[0, 1]] });
  assert.deepEqual(gridShape(3), { kind: 'feature', main: 0, side: [1, 2] });
  assert.deepEqual(gridShape(4), { kind: 'rows', rows: [[0, 1], [2, 3]] });
  assert.deepEqual(gridShape(9), gridShape(6), 'clamped to 6');
});
