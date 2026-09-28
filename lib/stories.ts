import type { PickedMedia } from '@/lib/media';
import { BUCKET, VIDEO_BUCKET } from '@/lib/posts';
import { supabase } from '@/lib/supabase';
import { uploadMedia } from '@/lib/uploads';

// Missing table / function: the stories migration hasn't been run yet.
const MISSING_SCHEMA = new Set(['42P01', '42883', 'PGRST202', 'PGRST205']);

function readable(error: { code?: string; message: string }): Error {
  if (error.code && MISSING_SCHEMA.has(error.code)) return new Error('Stories need the latest database update.');
  return error instanceof Error ? error : new Error(error.message);
}

export type StoryTrayItem = { authorId: string; username: string; latestAt: number; unseen: number };

/** You and the people you follow who have live stories; null before the stories migration. */
export async function fetchStoryTray(): Promise<StoryTrayItem[] | null> {
  const { data, error } = await supabase.rpc('story_tray');
  if (error) {
    if (error.code && MISSING_SCHEMA.has(error.code)) return null;
    throw error;
  }
  return (data as { author_id: string; username: string; latest_at: string; unseen: number | string }[]).map(
    (row) => ({
      authorId: row.author_id,
      username: row.username,
      latestAt: Date.parse(row.latest_at),
      unseen: Number(row.unseen),
    })
  );
}

export type Story = {
  id: string;
  authorId: string;
  imagePath: string;
  imageUri: string;
  videoPath: string | null;
  videoUri: string | null;
  createdAt: number;
};

type StoryRow = { id: string; author_id: string; image_path: string; video_path: string | null; created_at: string };

const toStory = (row: StoryRow): Story => ({
  id: row.id,
  authorId: row.author_id,
  imagePath: row.image_path,
  imageUri: supabase.storage.from(BUCKET).getPublicUrl(row.image_path).data.publicUrl,
  videoPath: row.video_path,
  videoUri: row.video_path ? supabase.storage.from(VIDEO_BUCKET).getPublicUrl(row.video_path).data.publicUrl : null,
  createdAt: Date.parse(row.created_at),
});

/** Someone's live stories, oldest first (the order they're watched in). */
export async function fetchStories(authorId: string): Promise<Story[]> {
  const { data, error } = await supabase
    .from('stories')
    .select('id, author_id, image_path, video_path, created_at')
    .eq('author_id', authorId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true });
  if (error) throw readable(error);
  return (data as StoryRow[]).map(toStory);
}

export async function postStory(userId: string, media: PickedMedia): Promise<void> {
  const upload = await uploadMedia(userId, media, 'story');
  const { error } = await supabase
    .from('stories')
    .insert({ image_path: upload.imagePath, ...(upload.videoPath ? { video_path: upload.videoPath } : {}) });
  if (error) {
    await upload.remove();
    throw readable(error);
  }
}

export async function markStoryViewed(storyId: string): Promise<void> {
  const { error } = await supabase.from('story_views').insert({ story_id: storyId });
  if (error && error.code !== '23505') throw readable(error);
}

export type StoryViewer = { id: string; username: string };

/** Who viewed one of your stories, most recent first. */
export async function fetchStoryViewers(storyId: string): Promise<StoryViewer[]> {
  const { data, error } = await supabase
    .from('story_views')
    .select('viewer_id, viewer:profiles!story_views_viewer_id_fkey(username)')
    .eq('story_id', storyId)
    .order('viewed_at', { ascending: false });
  if (error) throw readable(error);
  return (data as unknown as { viewer_id: string; viewer: { username: string } | null }[]).map((row) => ({
    id: row.viewer_id,
    username: row.viewer?.username ?? 'driver',
  }));
}

async function removeFiles(stories: Pick<Story, 'imagePath' | 'videoPath'>[]): Promise<void> {
  const images = stories.map((story) => story.imagePath);
  const videos = stories.flatMap((story) => (story.videoPath ? [story.videoPath] : []));
  if (images.length) await supabase.storage.from(BUCKET).remove(images);
  if (videos.length) await supabase.storage.from(VIDEO_BUCKET).remove(videos);
}

export async function deleteStory(story: Story): Promise<void> {
  const { data, error } = await supabase.from('stories').delete().eq('id', story.id).select('id');
  if (error) throw readable(error);
  if (!data?.length) throw new Error('Only the author can delete a story.');
  await removeFiles([story]).catch((err) => console.warn('Failed to delete story files', err));
}

/**
 * Deletes your expired stories and their files. Expired stories are already hidden from
 * everyone else; this just stops their files piling up in storage. Best effort.
 */
export async function cleanUpExpiredStories(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('stories')
    .select('id, image_path, video_path')
    .eq('author_id', userId)
    .lte('expires_at', new Date().toISOString())
    .limit(50);
  if (error || !data?.length) return;
  const rows = data as { id: string; image_path: string; video_path: string | null }[];
  const removed = await supabase
    .from('stories')
    .delete()
    .in(
      'id',
      rows.map((row) => row.id)
    );
  if (removed.error) return;
  await removeFiles(rows.map((row) => ({ imagePath: row.image_path, videoPath: row.video_path })));
}
