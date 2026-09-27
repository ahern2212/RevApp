import assert from 'node:assert/strict';
import { test } from 'node:test';

import { timeAgo } from '../lib/time.ts';

const MIN = 60_000;
const ago = (ms: number) => timeAgo(Date.now() - ms);

test('timeAgo buckets', () => {
  assert.equal(ago(10_000), 'now');
  assert.equal(ago(5 * MIN), '5m');
  assert.equal(ago(59 * MIN), '59m');
  assert.equal(ago(60 * MIN), '1h');
  assert.equal(ago(23 * 60 * MIN), '23h');
  assert.equal(ago(24 * 60 * MIN), '1d');
  assert.equal(ago(6 * 24 * 60 * MIN), '6d');
  assert.equal(ago(7 * 24 * 60 * MIN), '1w');
  assert.equal(ago(30 * 24 * 60 * MIN), '4w');
});

test('timeAgo treats future timestamps (clock skew) as now', () => {
  assert.equal(timeAgo(Date.now() + 5 * MIN), 'now');
});
