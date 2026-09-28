import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  checkDimensions,
  checkDuration,
  checkPicked,
  checkUpload,
  fitWithin,
  formatDuration,
  sniffType,
  VIDEO_MAX_BYTES,
} from '../lib/mediaRules.ts';

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(
    parts.flatMap((part) => (typeof part === 'string' ? [...part].map((c) => c.charCodeAt(0)) : part))
  );
const pad = (head: Uint8Array, length = 64) => {
  const out = new Uint8Array(length);
  out.set(head);
  return out;
};

const JPEG = pad(bytes([0xff, 0xd8, 0xff, 0xe0]));
const PNG = pad(bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a]));
const WEBP = pad(bytes('RIFF', [0, 0, 0, 0], 'WEBP'));
const HEIC = pad(bytes([0, 0, 0, 0x18], 'ftypheic'));
const MP4 = pad(bytes([0, 0, 0, 0x20], 'ftypisom'));
const MOV = pad(bytes([0, 0, 0, 0x14], 'ftypqt  '));
const GIF = pad(bytes('GIF89a'));
const HTML = pad(bytes('<html><script>alert(1)</script>'));
const SVG = pad(bytes('<svg xmlns="http://www.w3.org/2000/svg">'));

test('sniffType recognises allowed formats by their bytes', () => {
  assert.equal(sniffType(JPEG), 'image/jpeg');
  assert.equal(sniffType(PNG), 'image/png');
  assert.equal(sniffType(WEBP), 'image/webp');
  assert.equal(sniffType(HEIC), 'image/heic');
  assert.equal(sniffType(MP4), 'video/mp4');
  assert.equal(sniffType(MOV), 'video/quicktime');
});

test('sniffType rejects GIF, HTML, SVG, unknown ftyp brands and short files', () => {
  assert.equal(sniffType(GIF), null);
  assert.equal(sniffType(HTML), null);
  assert.equal(sniffType(SVG), null);
  assert.equal(sniffType(pad(bytes([0, 0, 0, 0x18], 'ftypavif'))), null);
  assert.equal(sniffType(bytes([0xff, 0xd8, 0xff])), null);
});

test('checkUpload trusts the bytes, not the claimed type', () => {
  assert.deepEqual(checkUpload('image', JPEG), { contentType: 'image/jpeg', ext: 'jpg' });
  assert.deepEqual(checkUpload('image', PNG), { contentType: 'image/png', ext: 'png' });
  assert.deepEqual(checkUpload('video', MOV), { contentType: 'video/quicktime', ext: 'mov' });
  assert.deepEqual(checkUpload('video', MP4), { contentType: 'video/mp4', ext: 'mp4' });
  // A script renamed to .jpg, or a video posted as a photo, is refused.
  assert.throws(() => checkUpload('image', HTML), /supported photo/);
  assert.throws(() => checkUpload('image', SVG), /supported photo/);
  assert.throws(() => checkUpload('image', MP4), /supported photo/);
  assert.throws(() => checkUpload('video', JPEG), /supported video/);
  // HEIC must be converted before upload (it doesn't display in most browsers).
  assert.throws(() => checkUpload('image', HEIC), /supported photo/);
});

test('checkUpload enforces size limits', () => {
  assert.throws(() => checkUpload('image', new Uint8Array(0)), /empty/);
  assert.throws(() => checkUpload('image', JPEG, 10), /too big/);
  const huge = new Uint8Array(VIDEO_MAX_BYTES + 1);
  huge.set(MP4);
  assert.throws(() => checkUpload('video', huge), /too big/);
});

test('checkPicked screens types, sizes and durations from the picker', () => {
  assert.equal(checkPicked({ kind: 'image', mimeType: 'image/jpeg', width: 3000, height: 2000 }), null);
  assert.equal(checkPicked({ kind: 'image', mimeType: 'image/HEIC', width: 4032, height: 3024 }), null);
  assert.equal(checkPicked({ kind: 'image', mimeType: 'image/jpg' }), null);
  assert.match(checkPicked({ kind: 'image', mimeType: 'image/gif' }) ?? '', /GIFs/);
  assert.match(checkPicked({ kind: 'image', mimeType: 'image/svg+xml' }) ?? '', /SVGs/);
  assert.match(checkPicked({ kind: 'image', fileSize: 500 * 1024 * 1024 }) ?? '', /too big/);
  assert.equal(checkPicked({ kind: 'video', mimeType: 'video/mp4', durationMs: 15_000 }), null);
  assert.match(checkPicked({ kind: 'video', mimeType: 'video/webm' }) ?? '', /MP4 or MOV/);
  assert.match(checkPicked({ kind: 'video', durationMs: 5 * 60_000 }) ?? '', /up to 60 seconds/);
  assert.match(checkPicked({ kind: 'video', fileSize: VIDEO_MAX_BYTES + 1 }) ?? '', /too big/);
});

test('checkDimensions turns away tiny and stretched photos, and passes unknown sizes', () => {
  assert.equal(checkDimensions(0, 0), null);
  assert.equal(checkDimensions(1080, 1350), null);
  assert.match(checkDimensions(100, 100) ?? '', /too small/);
  assert.match(checkDimensions(4000, 1000) ?? '', /stretched/);
  assert.equal(checkDimensions(3000, 1000), null);
  // 48 MP phone photos are fine; a 20000×20000 "bomb" is not.
  assert.equal(checkDimensions(8064, 6048), null);
  assert.match(checkDimensions(20000, 20000) ?? '', /too many pixels/);
});

test('checkDuration allows 1–60 seconds', () => {
  assert.equal(checkDuration(null), null);
  assert.equal(checkDuration(60_000), null);
  assert.equal(checkDuration(60_400), null);
  assert.match(checkDuration(61_000) ?? '', /up to 60/);
  assert.match(checkDuration(400) ?? '', /too short/);
});

test('fitWithin scales the longest side down and leaves small images alone', () => {
  assert.deepEqual(fitWithin(4032, 3024, 2048), { width: 2048, height: 1536 });
  assert.deepEqual(fitWithin(3024, 4032, 2048), { width: 1536, height: 2048 });
  assert.equal(fitWithin(1080, 1350, 2048), null);
  assert.equal(fitWithin(0, 0, 2048), null);
});

test('formatDuration', () => {
  assert.equal(formatDuration(7_000), '0:07');
  assert.equal(formatDuration(60_000), '1:00');
  assert.equal(formatDuration(59_600), '1:00');
});
