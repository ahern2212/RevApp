import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import {
  checkDimensions,
  checkDuration,
  checkPicked,
  checkUpload,
  type CheckedUpload,
  fitWithin,
  IMAGE_MAX_SIDE,
  type MediaKind,
  VIDEO_MAX_SECONDS,
} from '@/lib/mediaRules';
import { makeVideoPoster } from '@/lib/videoPoster';

/** A photo or video picked on this device, already checked and (for photos) cleaned. */
export type PickedMedia = {
  kind: MediaKind;
  uri: string;
  mimeType: string;
  width: number;
  height: number;
  /** Videos only: a JPEG frame used in grids, notifications and while the video loads. */
  posterUri?: string;
  durationMs?: number;
};

const JPEG_QUALITY = 0.85;

export type PhotoOptions = {
  /** Let the user crop to a square first (market listings, profile pictures). */
  square?: boolean;
  minSide?: number;
  maxSide?: number;
};

/**
 * Decodes the photo and saves a fresh JPEG. Anything that isn't a real image fails to
 * decode, and the new file carries no EXIF data, so GPS location and camera details
 * never leave the phone. Also converts HEIC (which most browsers can't show) and caps
 * the size at IMAGE_MAX_SIDE.
 */
async function cleanImage(uri: string, options: PhotoOptions = {}): Promise<PickedMedia> {
  let decoded;
  try {
    decoded = await ImageManipulator.manipulate(uri).renderAsync();
  } catch {
    throw new Error('That photo couldn’t be opened. Try a JPEG or PNG.');
  }
  try {
    const problem = checkDimensions(decoded.width, decoded.height, options.minSide);
    if (problem) throw new Error(problem);

    const target = fitWithin(decoded.width, decoded.height, options.maxSide ?? IMAGE_MAX_SIDE);
    const final = target
      ? await ImageManipulator.manipulate(decoded).resize(target).renderAsync()
      : decoded;
    try {
      const saved = await final.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
      return { kind: 'image', uri: saved.uri, mimeType: 'image/jpeg', width: saved.width, height: saved.height };
    } finally {
      if (final !== decoded) final.release();
    }
  } finally {
    decoded.release();
  }
}

async function prepareVideo(asset: ImagePicker.ImagePickerAsset): Promise<PickedMedia> {
  const poster = await makeVideoPoster(asset.uri).catch(() => {
    throw new Error('That video couldn’t be read. Try an MP4 recorded on your phone.');
  });
  const durationMs = asset.duration || poster.durationMs || undefined;
  const problem = checkDuration(durationMs);
  if (problem) throw new Error(problem);
  return {
    kind: 'video',
    uri: asset.uri,
    mimeType: asset.mimeType ?? 'video/mp4',
    width: asset.width || poster.width,
    height: asset.height || poster.height,
    posterUri: poster.uri,
    durationMs,
  };
}

async function prepare(asset: ImagePicker.ImagePickerAsset, options: PhotoOptions = {}): Promise<PickedMedia> {
  const kind: MediaKind = asset.type === 'video' || asset.type === 'pairedVideo' ? 'video' : 'image';
  const problem = checkPicked({
    kind,
    mimeType: asset.mimeType,
    fileSize: asset.fileSize,
    width: asset.width,
    height: asset.height,
    durationMs: asset.duration,
    minSide: options.minSide,
  });
  if (problem) throw new Error(problem);
  return kind === 'video' ? prepareVideo(asset) : cleanImage(asset.uri, options);
}

/** Opens the photo library for a single photo. Resolves null if cancelled; throws a readable error if the photo isn't allowed. */
export async function pickPhoto(options: PhotoOptions = {}): Promise<PickedMedia | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    ...(options.square ? { allowsEditing: true, aspect: [1, 1] as [number, number] } : {}),
  });
  if (result.canceled || !result.assets[0]) return null;
  return prepare(result.assets[0], options);
}

/** Opens the library for a photo or a video (up to VIDEO_MAX_SECONDS), like Instagram's post picker. */
export async function pickPostMedia(): Promise<PickedMedia | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    quality: 1,
    videoMaxDuration: VIDEO_MAX_SECONDS,
  });
  if (result.canceled || !result.assets[0]) return null;
  return prepare(result.assets[0]);
}

/** Reads a local file and runs the final byte-level check before it's uploaded. */
export async function readUpload(
  uri: string,
  kind: MediaKind,
  maxBytes?: number
): Promise<CheckedUpload & { body: ArrayBuffer }> {
  const body = await (await fetch(uri)).arrayBuffer();
  return { ...checkUpload(kind, new Uint8Array(body), maxBytes), body };
}

/** Unique file name in the user's own storage folder, e.g. "<user id>/car-1712345678901-x3k9.jpg". */
export function storagePath(userId: string, prefix: string, ext: string): string {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${userId}/${prefix ? `${prefix}-` : ''}${stamp}.${ext}`;
}
