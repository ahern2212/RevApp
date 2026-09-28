import { type PickedMedia, readUpload, storagePath } from '@/lib/media';
import { BUCKET, VIDEO_BUCKET } from '@/lib/posts';
import { supabase } from '@/lib/supabase';

export type UploadedMedia = {
  /** The photo, or the video's poster frame. */
  imagePath: string;
  videoPath: string | null;
  /** Deletes what was uploaded (when saving the post or story fails afterwards). */
  remove: () => Promise<void>;
};

/** Storage says "Bucket not found" until the media-safety migration has created it. */
function videoUploadError(error: Error): Error {
  return /bucket not found/i.test(error.message)
    ? new Error('Videos need the latest database update. Share a photo for now.')
    : error;
}

/**
 * Checks the bytes and uploads one photo, or a video and its poster, into the user's own
 * folder. `label` prefixes the file names (e.g. "story"). Cleans up after itself on failure.
 */
export async function uploadMedia(userId: string, media: PickedMedia, label = ''): Promise<UploadedMedia> {
  const isVideo = media.kind === 'video';
  if (isVideo && !media.posterUri) throw new Error('Pick the video again so we can make its cover.');

  // Byte-level checks run before anything leaves the device.
  const image = await readUpload(isVideo ? media.posterUri! : media.uri, 'image');
  const video = isVideo ? await readUpload(media.uri, 'video') : null;

  const uploaded: { bucket: string; path: string }[] = [];
  const remove = async () => {
    await Promise.all(uploaded.map(({ bucket, path }) => supabase.storage.from(bucket).remove([path]))).catch(
      (error) => console.warn('Failed to clean up upload', error)
    );
  };

  try {
    const imagePath = storagePath(userId, isVideo ? [label, 'poster'].filter(Boolean).join('-') : label, image.ext);
    const imageUpload = await supabase.storage
      .from(BUCKET)
      .upload(imagePath, image.body, { contentType: image.contentType });
    if (imageUpload.error) throw imageUpload.error;
    uploaded.push({ bucket: BUCKET, path: imagePath });

    let videoPath: string | null = null;
    if (video) {
      videoPath = storagePath(userId, [label, 'video'].filter(Boolean).join('-'), video.ext);
      const videoUpload = await supabase.storage
        .from(VIDEO_BUCKET)
        .upload(videoPath, video.body, { contentType: video.contentType });
      if (videoUpload.error) throw videoUploadError(videoUpload.error);
      uploaded.push({ bucket: VIDEO_BUCKET, path: videoPath });
    }
    return { imagePath, videoPath, remove };
  } catch (error) {
    await remove();
    throw error;
  }
}
