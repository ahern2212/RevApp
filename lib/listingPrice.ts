// Price helpers for marketplace listings (whole US dollars). Kept free of app imports so
// they can be unit-tested directly.

export const PRICE_MAX = 10_000_000;

/** "$12,500", or "Free" for $0. */
export function formatPrice(price: number): string {
  return price === 0 ? 'Free' : `$${price.toLocaleString('en-US')}`;
}

/** Parses what the user typed ("12,500", "$900") into whole dollars, or null if invalid. */
export function parsePrice(text: string): number | null {
  const digits = text.replace(/[$,\s]/g, '');
  if (!/^\d+$/.test(digits)) return null;
  const value = Number(digits);
  return value <= PRICE_MAX ? value : null;
}
