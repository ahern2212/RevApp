import assert from 'node:assert/strict';
import { test } from 'node:test';

import { carParts } from '../lib/carDrawing.ts';
import { BODY_STYLES, bodyPath, guessBodyStyle, SHAPES } from '../lib/carShapes.ts';

test('guessBodyStyle matches well-known models', () => {
  const cases: [string, string, string][] = [
    ['Porsche', '911 Carrera', 'sports'],
    ['Porsche', 'Cayenne', 'suv'],
    ['Porsche', 'Boxster', 'roadster'],
    ['Mazda', 'MX-5', 'roadster'],
    ['Ford', 'Mustang GT', 'muscle'],
    ['Dodge', 'Challenger', 'muscle'],
    ['Toyota', 'Supra', 'jdm'],
    ['Nissan', '300ZX', 'jdm'],
    ['Nissan', 'GT-R', 'jdm'],
    ['Honda', 'Civic Type R', 'hatch'],
    ['Honda', 'Civic', 'sedan'],
    ['Honda', 'CR-V', 'suv'],
    ['Ford', 'F-150', 'truck'],
    ['Ford', 'Bronco', 'offroad'],
    ['Ford', 'Bronco Sport', 'suv'],
    ['Jeep', 'Wrangler', 'offroad'],
    ['Jeep', 'Grand Cherokee', 'suv'],
    ['Ram', '', 'truck'],
    ['Lamborghini', 'Huracan', 'supercar'],
    ['Ferrari', 'Roma', 'supercar'],
    ['Tesla', 'Model 3', 'sedan'],
    ['Tesla', 'Model Y', 'suv'],
  ];
  for (const [make, model, expected] of cases) {
    assert.equal(guessBodyStyle(make, model), expected, `${make} ${model}`);
  }
});

test('guessBodyStyle returns null when nothing matches', () => {
  assert.equal(guessBodyStyle('Acme', 'Roadrunner'), null);
  assert.equal(guessBodyStyle('', ''), null);
});

test('every shape builds a closed body with two wheel arches', () => {
  for (const style of BODY_STYLES) {
    const d = bodyPath(SHAPES[style]);
    assert.match(d, /^M/, style);
    assert.match(d, /Z$/, style);
    assert.equal((d.match(/ A/g) ?? []).length, 2, `${style} arches`);
    assert.ok(carParts(style, '#123456', '#abcdef').some((p) => p.key === 'paint'), style);
  }
});
