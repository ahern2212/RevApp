import assert from 'node:assert/strict';
import { test } from 'node:test';

import { atTime, dayLabel, meetPhase, nextDays, parseTime } from '../lib/datetime.ts';

test('parseTime understands 12h and 24h formats', () => {
  assert.deepEqual(parseTime('7pm'), { hours: 19, minutes: 0 });
  assert.deepEqual(parseTime('7:30 PM'), { hours: 19, minutes: 30 });
  assert.deepEqual(parseTime('730pm'), { hours: 19, minutes: 30 });
  assert.deepEqual(parseTime('12am'), { hours: 0, minutes: 0 });
  assert.deepEqual(parseTime('12 pm'), { hours: 12, minutes: 0 });
  assert.deepEqual(parseTime('19:30'), { hours: 19, minutes: 30 });
  assert.deepEqual(parseTime('9a'), { hours: 9, minutes: 0 });
});

test('parseTime rejects nonsense', () => {
  for (const bad of ['', 'noon', '25:00', '13pm', '7:75', '0am', 'abc']) {
    assert.equal(parseTime(bad), null, bad);
  }
});

test('nextDays starts today at local midnight', () => {
  const from = new Date(2026, 8, 27, 15, 45);
  const days = nextDays(3, from);
  assert.equal(days.length, 3);
  assert.deepEqual(days[0], new Date(2026, 8, 27));
  assert.deepEqual(days[2], new Date(2026, 8, 29));
});

test('dayLabel names today and tomorrow', () => {
  const today = new Date(2026, 8, 27, 10);
  assert.equal(dayLabel(new Date(2026, 8, 27), today), 'Today');
  assert.equal(dayLabel(new Date(2026, 8, 28), today), 'Tomorrow');
  assert.match(dayLabel(new Date(2026, 9, 3), today), /3$/);
});

test('atTime combines day and time', () => {
  assert.deepEqual(atTime(new Date(2026, 9, 3), { hours: 19, minutes: 30 }), new Date(2026, 9, 3, 19, 30));
});

test('meetPhase: upcoming, live for 6 hours, then ended', () => {
  const now = Date.UTC(2026, 8, 27, 18, 0);
  const hour = 60 * 60 * 1000;
  assert.equal(meetPhase(now + hour, now), 'upcoming');
  assert.equal(meetPhase(now, now), 'live');
  assert.equal(meetPhase(now - 5 * hour, now), 'live');
  assert.equal(meetPhase(now - 6 * hour, now), 'ended');
  assert.equal(meetPhase(now - 30 * 24 * hour, now), 'ended');
});
