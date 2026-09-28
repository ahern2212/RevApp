import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkPoll, cleanPoll, pollPercentages } from '../lib/pollRules.ts';

test('checkPoll accepts 2–4 distinct answers and a question', () => {
  assert.equal(checkPoll({ question: 'Which wheels?', options: ['Bronze', 'Black'] }), null);
  assert.equal(checkPoll({ question: 'Color?', options: ['Red', 'Blue', 'Green', 'Grey'] }), null);
  // Blank extra answer fields don't count.
  assert.equal(checkPoll({ question: 'Stance?', options: ['Low', 'Stock', ' ', ''] }), null);
});

test('checkPoll explains what is wrong', () => {
  assert.match(checkPoll({ question: ' ', options: ['A', 'B'] }) ?? '', /question/);
  assert.match(checkPoll({ question: 'Q', options: ['Only one', ''] }) ?? '', /at least 2/);
  assert.match(checkPoll({ question: 'Q', options: ['A', 'B', 'C', 'D', 'E'] }) ?? '', /up to 4/);
  assert.match(checkPoll({ question: 'Q', options: ['Same', 'same'] }) ?? '', /different/);
  assert.match(checkPoll({ question: 'Q', options: ['A', 'x'.repeat(41)] }) ?? '', /under 40/);
  assert.match(checkPoll({ question: 'x'.repeat(121), options: ['A', 'B'] }) ?? '', /under 120/);
});

test('cleanPoll trims and drops blank answers', () => {
  assert.deepEqual(cleanPoll({ question: '  Which?  ', options: [' A ', '', 'B'] }), {
    question: 'Which?',
    options: ['A', 'B'],
  });
});

test('pollPercentages always adds up to 100', () => {
  assert.deepEqual(pollPercentages([1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(pollPercentages([2, 1]), [67, 33]);
  assert.deepEqual(pollPercentages([0, 5]), [0, 100]);
  assert.deepEqual(pollPercentages([0, 0, 0]), [0, 0, 0]);
  for (const counts of [[3, 3, 1], [7, 2, 2, 1], [1, 2, 3, 4]]) {
    assert.equal(pollPercentages(counts).reduce((a, b) => a + b, 0), 100, JSON.stringify(counts));
  }
});
