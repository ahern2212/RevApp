import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatCar, isValidYear, MAKES, suggest } from '../lib/vehicles.ts';

test('formatCar joins trimmed parts and skips blanks', () => {
  assert.equal(formatCar({ year: '2018', make: 'Honda', model: ' Civic Type R ' }), '2018 Honda Civic Type R');
  assert.equal(formatCar({ year: '', make: 'Mazda', model: '' }), 'Mazda');
  assert.equal(formatCar({ year: '', make: '', model: '' }), '');
});

test('isValidYear accepts 1900 through next year only', () => {
  const next = String(new Date().getFullYear() + 1);
  assert.ok(isValidYear('1969'));
  assert.ok(isValidYear(next));
  assert.ok(!isValidYear('1899'));
  assert.ok(!isValidYear(String(Number(next) + 1)));
  assert.ok(!isValidYear('20'));
  assert.ok(!isValidYear('abcd'));
});

test('suggest puts prefix matches before contains matches', () => {
  assert.deepEqual(suggest(MAKES, 'ro'), ['Rolls-Royce', 'Alfa Romeo', 'Chevrolet', 'Land Rover']);
});

test('suggest is case-insensitive, hides exact matches, and respects the limit', () => {
  assert.deepEqual(suggest(['Civic', 'Civic Type R', 'Accord'], 'CIVIC'), ['Civic Type R']);
  assert.equal(suggest(MAKES, '', 5).length, 5);
});
