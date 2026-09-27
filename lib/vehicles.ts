// Car make/model suggestions. Makes are a curated list (proper casing, no trailer or
// motorcycle brands); models come from NHTSA's free vPIC API (no key, CORS-enabled).

const VPIC = 'https://vpic.nhtsa.dot.gov/api/vehicles';
// Passenger cars, SUVs/vans (MPV) and pickups; skips motorcycles, ATVs, trailers.
const VEHICLE_TYPES = ['car', 'mpv', 'truck'];

export const MAKES = [
  'Acura', 'Alfa Romeo', 'Aston Martin', 'Audi', 'Bentley', 'BMW', 'Buick', 'Cadillac',
  'Chevrolet', 'Chrysler', 'Dodge', 'Ferrari', 'Fiat', 'Ford', 'Genesis', 'GMC', 'Honda',
  'Hyundai', 'Infiniti', 'Jaguar', 'Jeep', 'Kia', 'Lamborghini', 'Land Rover', 'Lexus',
  'Lincoln', 'Lotus', 'Lucid', 'Maserati', 'Mazda', 'McLaren', 'Mercedes-Benz', 'Mini',
  'Mitsubishi', 'Nissan', 'Plymouth', 'Polestar', 'Pontiac', 'Porsche', 'Ram', 'Rivian',
  'Rolls-Royce', 'Saab', 'Saturn', 'Scion', 'Subaru', 'Suzuki', 'Tesla', 'Toyota',
  'Volkswagen', 'Volvo',
];

export type CarDetails = { year: string; make: string; model: string };

export function formatCar({ year, make, model }: CarDetails): string {
  return [year, make, model].map((part) => part.trim()).filter(Boolean).join(' ');
}

export function isValidYear(year: string): boolean {
  const n = Number(year);
  return /^\d{4}$/.test(year) && n >= 1900 && n <= new Date().getFullYear() + 1;
}

async function queryModels(make: string, year?: string): Promise<string[]> {
  const yearPath = year ? `/modelyear/${year}` : '';
  const lists = await Promise.all(
    VEHICLE_TYPES.map(async (type) => {
      const url = `${VPIC}/GetModelsForMakeYear/make/${encodeURIComponent(make)}${yearPath}/vehicletype/${type}?format=json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`vPIC ${res.status}`);
      const json = (await res.json()) as { Results: { Model_Name: string }[] };
      return json.Results.map((r) => r.Model_Name.trim());
    })
  );
  return [...new Set(lists.flat())].sort((a, b) => a.localeCompare(b));
}

const cache = new Map<string, Promise<string[]>>();

/** Models for a make (and year, if given). Falls back to all years when a year has no data. */
export function fetchModels(make: string, year?: string): Promise<string[]> {
  const key = `${make.trim().toLowerCase()}|${year ?? ''}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = queryModels(make.trim(), year).then((models) =>
      models.length > 0 || !year ? models : queryModels(make.trim())
    );
    pending.catch(() => cache.delete(key)); // don't cache failures
    cache.set(key, pending);
  }
  return pending;
}

/** Up to `limit` options matching the query: prefix matches first, then contains. */
export function suggest(options: string[], query: string, limit = 8): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return options.slice(0, limit);
  const starts = options.filter((o) => o.toLowerCase().startsWith(q));
  const contains = options.filter((o) => !o.toLowerCase().startsWith(q) && o.toLowerCase().includes(q));
  return [...starts, ...contains].filter((o) => o.toLowerCase() !== q).slice(0, limit);
}
