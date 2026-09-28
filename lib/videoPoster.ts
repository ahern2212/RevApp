import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { createVideoPlayer } from 'expo-video';

export type VideoPoster = { uri: string; width: number; height: number; durationMs: number | null };

const POSTER_SECONDS = 0.5;
const POSTER_MAX_SIDE = 1080;

/** Grabs a frame near the start of a local video and saves it as a JPEG (iOS/Android). */
export async function makeVideoPoster(videoUri: string): Promise<VideoPoster> {
  const player = createVideoPlayer(videoUri);
  try {
    const [thumbnail] = await player.generateThumbnailsAsync(POSTER_SECONDS, {
      maxWidth: POSTER_MAX_SIDE,
      maxHeight: POSTER_MAX_SIDE,
    });
    if (!thumbnail) throw new Error('No video frame');
    const image = await ImageManipulator.manipulate(thumbnail).renderAsync();
    try {
      const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
      const durationMs = player.duration > 0 ? Math.round(player.duration * 1000) : null;
      return { uri: saved.uri, width: saved.width, height: saved.height, durationMs };
    } finally {
      image.release();
      thumbnail.release();
    }
  } finally {
    player.release();
  }
}
