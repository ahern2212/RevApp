import assert from 'node:assert/strict';
import { test } from 'node:test';

import { replyParentId, threadComments } from '../lib/commentThreads.ts';

const c = (id: string, parentId: string | null = null) => ({ id, parentId });

test('threadComments puts replies right after their parent, in order', () => {
  const ordered = threadComments([c('a'), c('b'), c('r1', 'a'), c('r2', 'b'), c('r3', 'a')]);
  assert.deepEqual(
    ordered.map((comment) => [comment.id, comment.isReply]),
    [
      ['a', false],
      ['r1', true],
      ['r3', true],
      ['b', false],
      ['r2', true],
    ]
  );
});

test('threadComments shows a reply whose parent is gone as a normal comment', () => {
  const ordered = threadComments([c('a'), c('orphan', 'deleted')]);
  assert.deepEqual(
    ordered.map((comment) => [comment.id, comment.isReply]),
    [
      ['a', false],
      ['orphan', false],
    ]
  );
});

test('replyParentId joins the top comment of a thread', () => {
  assert.equal(replyParentId(c('a')), 'a');
  assert.equal(replyParentId(c('r1', 'a')), 'a');
});
