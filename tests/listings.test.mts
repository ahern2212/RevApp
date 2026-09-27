import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatPrice, parsePrice } from '../lib/listingPrice.ts';

test('formatPrice shows dollars with separators, and Free for 0', () => {
  assert.equal(formatPrice(0), 'Free');
  assert.equal(formatPrice(900), '$900');
  assert.equal(formatPrice(12500), '$12,500');
});

test('parsePrice accepts $ and commas, rejects junk and huge values', () => {
  assert.equal(parsePrice('12,500'), 12500);
  assert.equal(parsePrice('$900'), 900);
  assert.equal(parsePrice(' 0 '), 0);
  assert.equal(parsePrice('12.50'), null);
  assert.equal(parsePrice('abc'), null);
  assert.equal(parsePrice(''), null);
  assert.equal(parsePrice('20000000'), null);
});
