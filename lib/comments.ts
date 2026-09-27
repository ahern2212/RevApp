import { supabase } from '@/lib/supabase';

export const COMMENT_MAX_LENGTH = 500;

export type Comment = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: number;
};

type CommentRow = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: { username: string } | null;
};

const COMMENT_SELECT =
  'id, author_id, body, created_at, author:profiles!comments_author_id_fkey(username)';

function toComment(row: CommentRow): Comment {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author?.username ?? 'driver',
    body: row.body,
    createdAt: Date.parse(row.created_at),
  };
}

export async function fetchComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(COMMENT_SELECT)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as unknown as CommentRow[]).map(toComment);
}

export async function addComment(postId: string, body: string): Promise<Comment> {
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, body: body.trim() })
    .select(COMMENT_SELECT)
    .single();
  if (error) throw error;
  return toComment(data as unknown as CommentRow);
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) throw error;
}
