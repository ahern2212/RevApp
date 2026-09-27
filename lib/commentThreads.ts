// Orders comments for display: each top-level comment followed by its replies. Kept free of
// app imports so it can be unit-tested.

type Threadable = { id: string; parentId: string | null };

export type Threaded<T> = T & { isReply: boolean };

/**
 * Input must be oldest-first. A reply whose parent isn't in the list (deleted, hidden or
 * from someone you blocked) is shown as a normal comment instead of disappearing.
 */
export function threadComments<T extends Threadable>(comments: T[]): Threaded<T>[] {
  const ids = new Set(comments.map((comment) => comment.id));
  const replies = new Map<string, T[]>();
  const top: T[] = [];
  for (const comment of comments) {
    if (comment.parentId && ids.has(comment.parentId)) {
      replies.set(comment.parentId, [...(replies.get(comment.parentId) ?? []), comment]);
    } else {
      top.push(comment);
    }
  }
  return top.flatMap((comment) => [
    { ...comment, isReply: false },
    ...(replies.get(comment.id) ?? []).map((reply) => ({ ...reply, isReply: true })),
  ]);
}

/** The comment a reply should attach to: replying to a reply joins its parent's thread. */
export function replyParentId(comment: Threadable): string {
  return comment.parentId ?? comment.id;
}
