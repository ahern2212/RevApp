// Upload rules for photos and videos. Kept free of app imports so they can be unit-tested.
// The server enforces the same limits: see supabase/migrations/20260928000000_media_safety.sql.

export type MediaKind = 'image' | 'video';

/** What we store. Every photo is re-encoded to JPEG before upload; PNG/WebP stay allowed for older builds. */
export const UPLOAD_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
/** What we accept from the photo library (HEIC/HEIF is converted to JPEG on the device). */
export const PICKABLE_IMAGE_TYPES = [...UPLOAD_IMAGE_TYPES, 'image/heic', 'image/heif'] as const;
export const VIDEO_TYPES = ['video/mp4', 'video/quicktime'] as const;

const MB = 1024 * 1024;
/** Largest original photo we'll try to decode (big enough for 48 MP phone shots). */
export const IMAGE_SOURCE_MAX_BYTES = 40 * MB;
/** Largest photo we upload; matches the post-images bucket limit. */
export const IMAGE_UPLOAD_MAX_BYTES = 10 * MB;
/** Largest video we upload; matches the post-videos bucket limit. */
export const VIDEO_MAX_BYTES = 50 * MB;
export const VIDEO_MAX_SECONDS = 60;
export const VIDEO_MIN_SECONDS = 1;
/** Photos are resized so their longest side is at most this. */
export const IMAGE_MAX_SIDE = 2048;
/** Tiny images (icons, tracking pixels, memes cropped to nothing) are turned away. */
export const IMAGE_MIN_SIDE = 320;
/** Wider or taller than 3:1 is a banner or a screenshot strip, not a car photo. */
export const MAX_ASPECT_RATIO = 3;

export type PickedInfo = {
  kind: MediaKind;
  mimeType?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  /** Smallest allowed side for photos (defaults to IMAGE_MIN_SIDE). */
  minSide?: number;
};

const mb = (bytes: number) => `${Math.round(bytes / MB)} MB`;

function normalizeType(mimeType?: string | null): string | null {
  if (!mimeType) return null;
  const type = mimeType.toLowerCase().split(';')[0].trim();
  return type === 'image/jpg' ? 'image/jpeg' : type;
}

/**
 * Checks what the picker told us about a file before we touch its bytes.
 * Returns a message to show the user, or null if it's fine. Unknown values (0 or missing)
 * pass here and are checked again after decoding or at upload.
 */
export function checkPicked(info: PickedInfo): string | null {
  const type = normalizeType(info.mimeType);

  if (info.kind === 'image') {
    if (type && !(PICKABLE_IMAGE_TYPES as readonly string[]).includes(type)) {
      return 'Use a JPEG, PNG, WebP or HEIC photo. GIFs, SVGs and other files aren’t allowed.';
    }
    if (info.fileSize && info.fileSize > IMAGE_SOURCE_MAX_BYTES) {
      return `That photo is too big (max ${mb(IMAGE_SOURCE_MAX_BYTES)}).`;
    }
    return checkDimensions(info.width ?? 0, info.height ?? 0, info.minSide);
  }

  if (type && !(VIDEO_TYPES as readonly string[]).includes(type)) {
    return 'Use an MP4 or MOV video.';
  }
  if (info.fileSize && info.fileSize > VIDEO_MAX_BYTES) {
    return `That video is too big (max ${mb(VIDEO_MAX_BYTES)}). Trim it or record at a lower quality.`;
  }
  return checkDuration(info.durationMs);
}

/** Minimum size and aspect ratio for photos; 0×0 means "unknown" and passes. */
export function checkDimensions(width: number, height: number, minSide = IMAGE_MIN_SIDE): string | null {
  if (!width || !height) return null;
  if (Math.min(width, height) < minSide) {
    return `That photo is too small. Use one at least ${minSide} pixels on each side.`;
  }
  if (Math.max(width, height) / Math.min(width, height) > MAX_ASPECT_RATIO) {
    return 'That photo is too stretched. Crop it closer to a normal photo shape.';
  }
  return null;
}

export function checkDuration(durationMs?: number | null): string | null {
  if (!durationMs) return null;
  if (durationMs > VIDEO_MAX_SECONDS * 1000 + 500) {
    return `Videos can be up to ${VIDEO_MAX_SECONDS} seconds. Trim it and try again.`;
  }
  if (durationMs < VIDEO_MIN_SECONDS * 1000) return 'That video is too short.';
  return null;
}

/** New width/height that fits within `maxSide`, or null if the image is already small enough. */
export function fitWithin(
  width: number,
  height: number,
  maxSide: number
): { width: number; height: number } | null {
  if (!width || !height || Math.max(width, height) <= maxSide) return null;
  const scale = maxSide / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

// ISO base media ("ftyp" box) brands we recognise.
const HEIF_BRANDS = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1'];
const MP4_BRANDS = ['isom', 'iso2', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'M4V ', 'mmp4', 'dash'];

const ascii = (bytes: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...bytes.subarray(start, end));

/**
 * Works out a file's real type from its first bytes (its "magic number"), ignoring the
 * name and whatever MIME type the device claimed. Returns null for anything we don't allow.
 */
export function sniffType(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (
    bytes[0] === 0x89 &&
    ascii(bytes, 1, 4) === 'PNG' &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return 'image/webp';
  if (ascii(bytes, 4, 8) === 'ftyp') {
    const brand = ascii(bytes, 8, 12);
    if (brand === 'qt  ') return 'video/quicktime';
    if (MP4_BRANDS.includes(brand)) return 'video/mp4';
    if (HEIF_BRANDS.includes(brand)) return 'image/heic';
  }
  return null;
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};

export type CheckedUpload = { contentType: string; ext: string };

/**
 * Final gate before anything is uploaded: the bytes must really be an allowed type for
 * this kind of upload and within the size limit. Throws a readable error otherwise.
 */
export function checkUpload(kind: MediaKind, bytes: Uint8Array, maxBytes?: number): CheckedUpload {
  const limit = maxBytes ?? (kind === 'image' ? IMAGE_UPLOAD_MAX_BYTES : VIDEO_MAX_BYTES);
  if (bytes.length === 0) throw new Error('That file is empty.');
  if (bytes.length > limit) throw new Error(`That file is too big (max ${mb(limit)}).`);

  const type = sniffType(bytes);
  const allowed: readonly string[] = kind === 'image' ? UPLOAD_IMAGE_TYPES : VIDEO_TYPES;
  if (!type || !allowed.includes(type)) {
    throw new Error(
      kind === 'image'
        ? 'That file isn’t a supported photo. Use a JPEG, PNG or WebP image.'
        : 'That file isn’t a supported video. Use an MP4 or MOV.'
    );
  }
  return { contentType: type, ext: EXTENSIONS[type] };
}

/** "0:07", "1:00" */
export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
