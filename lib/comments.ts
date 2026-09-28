import { supabase } from '@/lib/supabase';

export const COMMENT_MAX_LENGTH = 500;

export type Comment = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: number;
  /** The top-level comment this replies to (null for top-level comments). */
  parentId: string | null;
  likedBy: string[];
};

type CommentRow = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  parent_id?: string | null;
  author: { username: string } | null;
  comment_likes?: { user_id: string }[];
};

// "*" picks up parent_id once the replies migration has run. Likes are an embedded table,
// so before that migration the select is retried without them (PGRST200 = no relationship).
const BASE_SELECT = '*, author:profiles!comments_author_id_fkey(username)';
const LIKES_SELECT = `${BASE_SELECT}, comment_likes(user_id)`;
let hasCommentLikes = true;

async function withCommentSelect<T extends { error: { code?: string } | null }>(
  run: (select: string) => PromiseLike<T>
): Promise<T> {
  if (hasCommentLikes) {
    const result = await run(LIKES_SELECT);
    if (result.error?.code !== 'PGRST200') return result;
    hasCommentLikes = false;
  }
  return run(BASE_SELECT);
}

function toComment(row: CommentRow): Comment {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author?.username ?? 'driver',
    body: row.body,
    createdAt: Date.parse(row.created_at),
    parentId: row.parent_id ?? null,
    likedBy: (row.comment_likes ?? []).map((like) => like.user_id),
  };
}

/** Every comment and reply on a post, oldest first. */
export async function fetchComments(postId: string): Promise<Comment[]> {
  const { data, error } = await withCommentSelect((select) =>
    supabase.from('comments').select(select).eq('post_id', postId).order('created_at', { ascending: true })
  );
  if (error) throw error;
  return (data as unknown as CommentRow[]).map(toComment);
}

/** Adds a comment, or a reply when `parentId` is a top-level comment's id. */
export async function addComment(postId: string, body: string, parentId?: string | null): Promise<Comment> {
  const row = { post_id: postId, body: body.trim(), ...(parentId ? { parent_id: parentId } : {}) };
  const { data, error } = await withCommentSelect((select) =>
    supabase.from('comments').insert(row).select(select).single()
  );
  if (error?.code === 'PGRST204' && parentId) {
    throw new Error('Replies need the latest database update. Post it as a comment for now.');
  }
  if (error) throw error;
  return toComment(data as unknown as CommentRow);
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) throw error;
}

export async function setCommentLiked(commentId: string, userId: string, liked: boolean): Promise<void> {
  const { error } = liked
    ? await supabase.from('comment_likes').insert({ comment_id: commentId })
    : await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId);
  if (error && error.code !== '23505') {
    if (error.code === 'PGRST205' || error.code === '42P01') {
      throw new Error('Comment likes need the latest database update.');
    }
    throw error;
  }
}
