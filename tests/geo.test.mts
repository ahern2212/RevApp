import assert from 'node:assert/strict';
import { test } from 'node:test';

import { directionsUrl, fitBounds, project, tilesFor, toView, TILE_SIZE } from '../lib/geo.ts';

const close = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('project: null island is the center of the world at zoom 0', () => {
  const p = project({ latitude: 0, longitude: 0 }, 0);
  close(p.x, TILE_SIZE / 2);
  close(p.y, TILE_SIZE / 2);
});

test('project: known tile for Sacramento at zoom 12', () => {
  const p = project({ latitude: 38.5816, longitude: -121.4944 }, 12);
  assert.equal(Math.floor(p.x / TILE_SIZE), 665);
  assert.equal(Math.floor(p.y / TILE_SIZE), 1571);
});

test('toView puts the center point in the middle of the view', () => {
  const center = { latitude: 38.59, longitude: -121.43 };
  const v = toView(center, center, 12, 300, 200);
  close(v.x, 150);
  close(v.y, 100);
});

test('tilesFor covers the whole view with no gaps', () => {
  const tiles = tilesFor({ latitude: 38.59, longitude: -121.43 }, 12, 390, 220);
  assert.ok(tiles.length >= 2 && tiles.length <= 9);
  assert.ok(tiles.some((t) => t.left <= 0 && t.top <= 0), 'a tile covers the top-left corner');
  assert.ok(tiles.some((t) => t.left + TILE_SIZE >= 390 && t.top + TILE_SIZE >= 220), 'and the bottom-right');
});

test('fitBounds: single point zooms in, spread points zoom out, empty uses a default', () => {
  assert.equal(fitBounds([{ latitude: 38.5, longitude: -121.4 }], 390, 220).zoom, 13);
  const bayArea = fitBounds(
    [
      { latitude: 38.58, longitude: -121.49 }, // Sacramento
      { latitude: 37.77, longitude: -122.42 }, // San Francisco
    ],
    390,
    220
  );
  assert.ok(bayArea.zoom >= 6 && bayArea.zoom <= 9, `zoom ${bayArea.zoom}`);
  close(bayArea.center.latitude, (38.58 + 37.77) / 2);
  assert.equal(fitBounds([], 390, 220).zoom, 3);
});

test('directionsUrl uses Apple Maps on iOS and Google Maps elsewhere', () => {
  const point = { latitude: 38.5, longitude: -121.4 };
  assert.match(directionsUrl(point, 'Cal Expo', 'ios'), /^https:\/\/maps\.apple\.com\/\?daddr=38\.5,-121\.4&q=Cal%20Expo$/);
  assert.match(directionsUrl(point, 'Cal Expo', 'android'), /google\.com\/maps\/dir\/\?api=1&destination=38\.5,-121\.4$/);
});
