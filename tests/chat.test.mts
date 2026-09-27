import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CHAT_TIME_GAP_MS, isUnread, showTimeAbove } from '../lib/chat.ts';

test('showTimeAbove marks the first message and pauses longer than the gap', () => {
  assert.equal(showTimeAbove(null, 1000), true);
  assert.equal(showTimeAbove(1000, 1000 + CHAT_TIME_GAP_MS), false);
  assert.equal(showTimeAbove(1000, 1001 + CHAT_TIME_GAP_MS), true);
});

test('isUnread only counts the other person’s newer messages', () => {
  const me = 'me';
  assert.equal(isUnread({ lastMessageAt: null, lastSenderId: null, myReadAt: null }, me), false);
  assert.equal(isUnread({ lastMessageAt: 5, lastSenderId: me, myReadAt: null }, me), false);
  assert.equal(isUnread({ lastMessageAt: 5, lastSenderId: 'them', myReadAt: null }, me), true);
  assert.equal(isUnread({ lastMessageAt: 5, lastSenderId: 'them', myReadAt: 4 }, me), true);
  assert.equal(isUnread({ lastMessageAt: 5, lastSenderId: 'them', myReadAt: 5 }, me), false);
});
