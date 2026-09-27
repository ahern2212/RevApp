import type { AppTheme } from '@/constants/themes';
import { supabase } from '@/lib/supabase';

export type ThemeTally = { counts: Record<string, number>; total: number; mine: string | null };

/** Vote counts per theme plus the signed-in user's own vote. */
export async function fetchThemeTally(userId: string): Promise<ThemeTally> {
  const { data, error } = await supabase.from('theme_votes').select('user_id, theme_id');
  if (error) throw error;
  const counts: Record<string, number> = {};
  let mine: string | null = null;
  for (const row of data as { user_id: string; theme_id: string }[]) {
    counts[row.theme_id] = (counts[row.theme_id] ?? 0) + 1;
    if (row.user_id === userId) mine = row.theme_id;
  }
  return { counts, total: data.length, mine };
}

/** Casts or changes the user's vote (one per user). */
export async function castThemeVote(userId: string, themeId: AppTheme['id']): Promise<void> {
  const { error } = await supabase
    .from('theme_votes')
    .upsert({ user_id: userId, theme_id: themeId, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function withdrawThemeVote(userId: string): Promise<void> {
  const { error } = await supabase.from('theme_votes').delete().eq('user_id', userId);
  if (error) throw error;
}
