import { isValidHandle } from '@/lib/handles';
import { readUpload } from '@/lib/media';
import { supabase } from '@/lib/supabase';

export const AVATAR_BUCKET = 'avatars';
export const BIO_MAX = 160;
const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // matches the avatars bucket limit
const POST_BUCKET = 'post-images';
const VIDEO_BUCKET = 'post-videos';

export type Profile = {
  id: string;
  username: string;
  bio: string;
  avatarPath: string | null;
  avatarUri: string | null;
};

type ProfileRow = { id: string; username: string; bio?: string; avatar_path?: string | null };

function toProfile(row: ProfileRow): Profile {
  const avatarPath = row.avatar_path ?? null;
  return {
    id: row.id,
    username: row.username,
    bio: row.bio ?? '',
    avatarPath,
    avatarUri: avatarPath
      ? supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath).data.publicUrl
      : null,
  };
}

/** Profiles by id. Works before the profile-editing migration too (no bio/picture yet). */
export async function fetchProfiles(ids: string[]): Promise<Profile[]> {
  if (ids.length === 0) return [];
  const full = await supabase.from('profiles').select('id, username, bio, avatar_path').in('id', ids);
  if (!full.error) return (full.data as ProfileRow[]).map(toProfile);

  const basic = await supabase.from('profiles').select('id, username').in('id', ids);
  if (basic.error) throw basic.error;
  return (basic.data as ProfileRow[]).map(toProfile);
}

type ProfileUpdate = {
  bio: string;
  /** New picture picked on the device, if any. */
  image?: { uri: string };
  removeAvatar?: boolean;
};

/** Saves the signed-in user's bio and (optionally) a new picture. */
export async function updateMyProfile(current: Profile, update: ProfileUpdate): Promise<Profile> {
  let avatarPath = update.removeAvatar ? null : current.avatarPath;

  if (update.image) {
    const { body, contentType, ext } = await readUpload(update.image.uri, 'image', AVATAR_MAX_BYTES);
    avatarPath = `${current.id}/avatar-${Date.now()}.${ext}`;
    const upload = await supabase.storage.from(AVATAR_BUCKET).upload(avatarPath, body, { contentType });
    if (upload.error) throw upload.error;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ bio: update.bio.trim(), avatar_path: avatarPath })
    .eq('id', current.id)
    .select('id, username, bio, avatar_path')
    .maybeSingle();
  if (error || !data) {
    if (update.image && avatarPath) await supabase.storage.from(AVATAR_BUCKET).remove([avatarPath]);
    throw error ?? new Error('The database did not allow this edit. Run the latest SQL migration.');
  }

  // Best effort: drop the old picture once the new one is saved.
  if (current.avatarPath && current.avatarPath !== avatarPath) {
    await supabase.storage.from(AVATAR_BUCKET).remove([current.avatarPath]);
  }
  return toProfile(data as ProfileRow);
}

/** Changes the signed-in user's username. Throws a readable error if it's invalid or taken. */
export async function updateUsername(userId: string, username: string): Promise<void> {
  if (!isValidHandle(username)) {
    throw new Error('Use 2–30 lowercase letters, numbers, dots or underscores.');
  }
  const { data, error } = await supabase
    .from('profiles')
    .update({ username })
    .eq('id', userId)
    .select('id');
  if (error?.code === '23505') throw new Error(`@${username} is already taken. Try another.`);
  if (error) throw error;
  if (!data?.length) {
    throw new Error('Username changes need the latest database update (run the SQL migration).');
  }
  // Keep sign-up metadata in step (used only as a fallback before the profile loads).
  await supabase.auth.updateUser({ data: { username } }).catch(() => {});
}

async function removeFolder(bucket: string, folder: string): Promise<void> {
  for (;;) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 1000 });
    if (error) throw error;
    if (!data?.length) return;
    const removal = await supabase.storage
      .from(bucket)
      .remove(data.map((file) => `${folder}/${file.name}`));
    if (removal.error) throw removal.error;
    if (data.length < 1000) return;
  }
}

/**
 * Permanently deletes the signed-in user: their photos and videos first, then the account itself
 * (posts, likes, comments, saves, events and notifications cascade in the database).
 */
export async function deleteMyAccount(userId: string): Promise<void> {
  await removeFolder(POST_BUCKET, userId);
  await removeFolder(AVATAR_BUCKET, userId).catch(() => {}); // bucket may not exist yet
  await removeFolder(VIDEO_BUCKET, userId).catch(() => {}); // bucket may not exist yet
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  // The server session is gone with the user; just clear it on this device.
  await supabase.auth.signOut({ scope: 'local' });
}
