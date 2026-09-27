import assert from 'node:assert/strict';
import { test } from 'node:test';

import { tokenize, topTags } from '../lib/richText.ts';

test('tokenize finds hashtags and mentions between plain text', () => {
  assert.deepEqual(tokenize('New wheels on the #civic, thanks @maya_k!'), [
    { kind: 'text', text: 'New wheels on the ' },
    { kind: 'tag', text: '#civic', tag: 'civic' },
    { kind: 'text', text: ', thanks ' },
    { kind: 'mention', text: '@maya_k', handle: 'maya_k' },
    { kind: 'text', text: '!' },
  ]);
});

test('tokenize leaves plain text alone', () => {
  assert.deepEqual(tokenize('just a car'), [{ kind: 'text', text: 'just a car' }]);
  assert.deepEqual(tokenize(''), []);
});

test('tags are lowercased for search, keep their typed text, and need a letter', () => {
  assert.deepEqual(tokenize('#JDM'), [{ kind: 'tag', text: '#JDM', tag: 'jdm' }]);
  assert.deepEqual(tokenize('#1 fan'), [{ kind: 'text', text: '#1 fan' }]);
  assert.deepEqual(tokenize('#stance_nation'), [{ kind: 'tag', text: '#stance_nation', tag: 'stance_nation' }]);
  assert.deepEqual(tokenize('#ÉtéRS'), [{ kind: 'tag', text: '#ÉtéRS', tag: 'étérs' }]);
});

test('mentions drop a trailing full stop and respect username length', () => {
  assert.deepEqual(tokenize('shot by @joe.'), [
    { kind: 'text', text: 'shot by ' },
    { kind: 'mention', text: '@joe', handle: 'joe' },
    { kind: 'text', text: '.' },
  ]);
  assert.deepEqual(tokenize('@a'), [{ kind: 'text', text: '@a' }]);
  assert.deepEqual(tokenize('@Joe.Builds'), [{ kind: 'mention', text: '@Joe.Builds', handle: 'joe.builds' }]);
});

test('emails, C# and mid-word symbols stay plain text', () => {
  assert.deepEqual(tokenize('mail me at a@b.com'), [{ kind: 'text', text: 'mail me at a@b.com' }]);
  assert.deepEqual(tokenize('I code C#'), [{ kind: 'text', text: 'I code C#' }]);
});

test('tokens next to punctuation and emoji', () => {
  assert.deepEqual(tokenize('🔥#boost(@turbo_tom)'), [
    { kind: 'text', text: '🔥' },
    { kind: 'tag', text: '#boost', tag: 'boost' },
    { kind: 'text', text: '(' },
    { kind: 'mention', text: '@turbo_tom', handle: 'turbo_tom' },
    { kind: 'text', text: ')' },
  ]);
});

test('topTags counts each tag once per caption and ranks by use', () => {
  const captions = [
    '#JDM #jdm night meet #supra',
    'clean #supra',
    '#stance #supra #jdm',
    'no tags here',
  ];
  assert.deepEqual(topTags(captions, 2), [
    { tag: 'supra', count: 3 },
    { tag: 'jdm', count: 2 },
  ]);
  assert.deepEqual(topTags([], 5), []);
  // Ties sort alphabetically so the list doesn't jump around.
  assert.deepEqual(topTags(['#b #a'], 5), [
    { tag: 'a', count: 1 },
    { tag: 'b', count: 1 },
  ]);
});
