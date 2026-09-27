import { Platform } from 'react-native';

export type Place = { name: string; address: string; latitude: number; longitude: number };

type NominatimResult = { display_name: string; name?: string; lat: string; lon: string };

/**
 * Address / place search via OpenStreetMap's free Nominatim service. Its usage policy
 * allows light use (≈1 request per second, only on an explicit search — no search-as-you-type)
 * and asks native apps to identify themselves.
 */
export async function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers:
      Platform.OS === 'web'
        ? { Accept: 'application/json' }
        : { Accept: 'application/json', 'User-Agent': 'GarageApp/1.0 (Expo car-meet map)' },
  });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const results = (await res.json()) as NominatimResult[];
  return results.map((r) => {
    const [first, ...rest] = r.display_name.split(', ');
    return {
      name: r.name || first,
      address: (r.name ? r.display_name : rest.join(', ')) || r.display_name,
      latitude: Number(r.lat),
      longitude: Number(r.lon),
    };
  });
}
