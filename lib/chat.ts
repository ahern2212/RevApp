// Small rules for chats. Kept free of app imports so they can be unit-tested.

/** A time label goes above a message when it's the first one or comes after a pause. */
export const CHAT_TIME_GAP_MS = 15 * 60 * 1000;

export function showTimeAbove(previousAt: number | null, at: number): boolean {
  return previousAt === null || at - previousAt > CHAT_TIME_GAP_MS;
}

export type ChatReadState = {
  lastMessageAt: number | null;
  lastSenderId: string | null;
  myReadAt: number | null;
};

/** Unread when the newest message is from the other person and arrived after you last looked. */
export function isUnread(chat: ChatReadState, myId: string): boolean {
  if (chat.lastMessageAt === null || chat.lastSenderId === myId) return false;
  return chat.myReadAt === null || chat.lastMessageAt > chat.myReadAt;
}
