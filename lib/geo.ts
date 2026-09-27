// Web-Mercator math for drawing a small map from 256px tiles (no native map SDK needed).

export const TILE_SIZE = 256;
export const MIN_ZOOM = 3;
export const MAX_ZOOM = 16;

export type LatLng = { latitude: number; longitude: number };
export type Point = { x: number; y: number };

// OpenStreetMap's public tile server. Its usage policy requires the attribution below to
// stay visible and an identifying User-Agent on native (browsers send a Referer instead).
// It's meant for light use — for a big launch, switch to a keyed provider (MapTiler, Stadia…).
export const TILE_URL = (z: number, x: number, y: number): string =>
  `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
export const TILE_HEADERS = { 'User-Agent': 'GarageApp/1.0 (Expo car-meet map)' };
export const TILE_ATTRIBUTION = '© OpenStreetMap contributors';

/** World pixel position of a coordinate at a zoom level. */
export function project({ latitude, longitude }: LatLng, zoom: number): Point {
  const scale = TILE_SIZE * 2 ** zoom;
  const lat = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const sin = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

/** Center and zoom that fit every point inside a width × height box (with padding). */
export function fitBounds(
  points: LatLng[],
  width: number,
  height: number,
  padding = 40
): { center: LatLng; zoom: number } {
  if (points.length === 0) return { center: { latitude: 39.5, longitude: -98.35 }, zoom: MIN_ZOOM };
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const center = {
    latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
    longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
  };
  if (points.length === 1) return { center, zoom: 13 };

  for (let zoom = MAX_ZOOM; zoom > MIN_ZOOM; zoom--) {
    const pixels = points.map((p) => project(p, zoom));
    const spanX = Math.max(...pixels.map((p) => p.x)) - Math.min(...pixels.map((p) => p.x));
    const spanY = Math.max(...pixels.map((p) => p.y)) - Math.min(...pixels.map((p) => p.y));
    if (spanX <= width - padding * 2 && spanY <= height - padding * 2) return { center, zoom };
  }
  return { center, zoom: MIN_ZOOM };
}

export type Tile = { key: string; url: string; left: number; top: number };

/** The tiles covering a width × height view centered on `center`, positioned in view pixels. */
export function tilesFor(center: LatLng, zoom: number, width: number, height: number): Tile[] {
  const c = project(center, zoom);
  const originX = c.x - width / 2;
  const originY = c.y - height / 2;
  const count = 2 ** zoom;
  const tiles: Tile[] = [];

  for (let ty = Math.floor(originY / TILE_SIZE); ty <= Math.floor((originY + height) / TILE_SIZE); ty++) {
    if (ty < 0 || ty >= count) continue;
    for (let tx = Math.floor(originX / TILE_SIZE); tx <= Math.floor((originX + width) / TILE_SIZE); tx++) {
      const wrappedX = ((tx % count) + count) % count; // wrap around the antimeridian
      tiles.push({
        key: `${zoom}/${tx}/${ty}`,
        url: TILE_URL(zoom, wrappedX, ty),
        left: tx * TILE_SIZE - originX,
        top: ty * TILE_SIZE - originY,
      });
    }
  }
  return tiles;
}

/** Where a coordinate lands inside the view (pixels from its top-left corner). */
export function toView(point: LatLng, center: LatLng, zoom: number, width: number, height: number): Point {
  const p = project(point, zoom);
  const c = project(center, zoom);
  return { x: p.x - c.x + width / 2, y: p.y - c.y + height / 2 };
}

/** A maps link that opens turn-by-turn directions in the platform's maps app or site. */
export function directionsUrl(point: LatLng, label: string, platform: string): string {
  const ll = `${point.latitude},${point.longitude}`;
  if (platform === 'ios') return `https://maps.apple.com/?daddr=${ll}&q=${encodeURIComponent(label)}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${ll}`;
}
