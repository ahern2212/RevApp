import type { VideoPoster } from './videoPoster';

export type { VideoPoster };

const POSTER_SECONDS = 0.5;
const POSTER_MAX_SIDE = 1080;
const LOAD_TIMEOUT_MS = 15_000;

function waitFor(video: HTMLVideoElement, event: 'loadeddata' | 'seeked'): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => done(new Error('Timed out reading the video')), LOAD_TIMEOUT_MS);
    const onEvent = () => done();
    const onError = () => done(new Error('The browser can’t play this video'));
    function done(error?: Error) {
      clearTimeout(timer);
      video.removeEventListener(event, onEvent);
      video.removeEventListener('error', onError);
      if (error) reject(error);
      else resolve();
    }
    video.addEventListener(event, onEvent);
    video.addEventListener('error', onError);
  });
}

/** Grabs a frame near the start of a local video with a hidden <video> and a canvas (web). */
export async function makeVideoPoster(videoUri: string): Promise<VideoPoster> {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = videoUri;
  try {
    await waitFor(video, 'loadeddata');
    const durationMs = Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : null;
    video.currentTime = Math.min(POSTER_SECONDS, (video.duration || 1) / 2);
    await waitFor(video, 'seeked');

    const scale = Math.min(1, POSTER_MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);
    if (!width || !height) throw new Error('The video has no picture');

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')?.drawImage(video, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    if (!blob) throw new Error('Could not save the video frame');
    return { uri: URL.createObjectURL(blob), width, height, durationMs };
  } finally {
    video.removeAttribute('src');
    video.load();
  }
}
