// Splits captions and comments into plain text, #hashtags and @mentions so they can be
// made tappable. Kept free of app imports so it can be unit-tested.

export type RichToken =
  | { kind: 'text'; text: string }
  | { kind: 'tag'; text: string; tag: string }
  | { kind: 'mention'; text: string; handle: string };

const WORD_CHAR = /[\p{L}\p{N}_]/u;
const TAG = /^#([\p{L}\p{N}_]+)/u;
const MENTION = /^@([A-Za-z0-9_.]+)/;
const TAG_MAX = 50;
// Same limits as usernames (lib/handles.ts).
const HANDLE_MIN = 2;
const HANDLE_MAX = 30;

function readTag(rest: string): RichToken | null {
  const match = TAG.exec(rest);
  // "#1" isn't a tag; a tag needs at least one letter.
  if (!match || match[1].length > TAG_MAX || !/\p{L}/u.test(match[1])) return null;
  return { kind: 'tag', text: match[0], tag: match[1].toLowerCase() };
}

function readMention(rest: string): RichToken | null {
  const match = MENTION.exec(rest);
  if (!match) return null;
  // A trailing "." ends the sentence ("thanks @maya."), it isn't part of the name.
  const handle = match[1].replace(/\.+$/, '');
  if (handle.length < HANDLE_MIN || handle.length > HANDLE_MAX) return null;
  return { kind: 'mention', text: `@${handle}`, handle: handle.toLowerCase() };
}

export function tokenize(text: string): RichToken[] {
  const tokens: RichToken[] = [];
  let plain = '';
  const flush = () => {
    if (plain) tokens.push({ kind: 'text', text: plain });
    plain = '';
  };

  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    // Only at the start of a word, so emails ("a@b.com") and "C#" stay plain text.
    const atWordStart = i === 0 || !WORD_CHAR.test(text[i - 1]);
    if (atWordStart && (ch === '#' || ch === '@')) {
      const token = ch === '#' ? readTag(text.slice(i)) : readMention(text.slice(i));
      if (token) {
        flush();
        tokens.push(token);
        i += token.text.length;
        continue;
      }
    }
    plain += ch;
    i += 1;
  }
  flush();
  return tokens;
}

export type TagCount = { tag: string; count: number };

/** Most-used hashtags across these captions (each caption counts a tag once). */
export function topTags(captions: string[], limit: number): TagCount[] {
  const counts = new Map<string, number>();
  for (const caption of captions) {
    const tags = new Set(
      tokenize(caption).flatMap((token) => (token.kind === 'tag' ? [token.tag] : []))
    );
    tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}

export type ActiveMention = { start: number; query: string };

/** The @mention being typed right before the cursor: "hi @ma|" → { start: 3, query: 'ma' }. */
export function activeMention(text: string, cursor: number): ActiveMention | null {
  const before = text.slice(0, cursor);
  const match = /(^|[^\p{L}\p{N}_])@([A-Za-z0-9_.]{0,30})$/u.exec(before);
  if (!match) return null;
  return { start: before.length - match[2].length - 1, query: match[2].toLowerCase() };
}

/** Replaces the mention being typed with "@username " and returns the new text and cursor. */
export function insertMention(
  text: string,
  mention: ActiveMention,
  cursor: number,
  username: string
): { text: string; cursor: number } {
  const inserted = `@${username} `;
  return {
    text: text.slice(0, mention.start) + inserted + text.slice(cursor).replace(/^\s+/, ''),
    cursor: mention.start + inserted.length,
  };
}
