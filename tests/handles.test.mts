import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cleanHandle, isValidHandle } from '../lib/handles.ts';

test('cleanHandle lowercases and strips disallowed characters', () => {
  assert.equal(cleanHandle("Joe's Car!"), 'joescar');
  assert.equal(cleanHandle('Rev_App.2026'), 'rev_app.2026');
  assert.equal(cleanHandle('ÉmilE'), 'mile');
  assert.equal(cleanHandle('a'.repeat(40)).length, 30);
  assert.equal(cleanHandle('a'.repeat(40), 24).length, 24);
});

test('isValidHandle enforces 2–30 allowed characters', () => {
  assert.ok(isValidHandle('ab'));
  assert.ok(isValidHandle('rev_app.26'));
  assert.ok(!isValidHandle('a'));
  assert.ok(!isValidHandle('a'.repeat(31)));
  assert.ok(!isValidHandle('Caps'));
  assert.ok(!isValidHandle('has space'));
});
