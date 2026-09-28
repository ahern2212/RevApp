import type { PollDraft } from '@/lib/pollRules';
import { supabase } from '@/lib/supabase';

export type Poll = {
  question: string;
  options: string[];
  /** Votes per answer, in the same order as `options`. */
  counts: number[];
  /** The answer you picked, or null if you haven't voted. */
  myVote: number | null;
};

const MISSING_SCHEMA = new Set(['42P01', 'PGRST205', 'PGRST204', '42703']);

function readable(error: { code?: string; message: string }): Error {
  if (error.code && MISSING_SCHEMA.has(error.code)) return new Error('Polls need the latest database update.');
  if (error.code === '23505') return new Error('You already voted in this poll.');
  return error instanceof Error ? error : new Error(error.message);
}

export async function fetchPoll(postId: string, userId: string): Promise<Poll | null> {
  const [poll, mine] = await Promise.all([
    supabase.from('polls').select('question, options, vote_counts').eq('post_id', postId).maybeSingle(),
    supabase.from('poll_votes').select('option_index').eq('post_id', postId).eq('user_id', userId).maybeSingle(),
  ]);
  if (poll.error) throw readable(poll.error);
  if (!poll.data) return null;
  const row = poll.data as { question: string; options: string[]; vote_counts: number[] };
  return {
    question: row.question,
    options: row.options,
    counts: row.options.map((_, i) => row.vote_counts[i] ?? 0),
    myVote: (mine.data as { option_index: number } | null)?.option_index ?? null,
  };
}

export async function votePoll(postId: string, optionIndex: number): Promise<void> {
  const { error } = await supabase.from('poll_votes').insert({ post_id: postId, option_index: optionIndex });
  if (error) throw readable(error);
}

/** Adds a poll to one of your posts (call right after creating the post). */
export async function createPoll(postId: string, draft: PollDraft): Promise<void> {
  const { error } = await supabase
    .from('polls')
    .insert({ post_id: postId, question: draft.question, options: draft.options });
  if (error) throw readable(error);
}
