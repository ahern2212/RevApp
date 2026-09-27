// Username ("handle") rules, matching the database check: lowercase letters, numbers,
// "." and "_", 2–30 characters. Sign-up caps new handles at 24 to leave room for the
// numbers the database adds when a name is taken.
export const HANDLE_MIN = 2;
export const HANDLE_MAX = 30;

/** Normalizes typing into a valid handle as the user types ("Joe's Car" → "joescar"). */
export function cleanHandle(text: string, max = HANDLE_MAX): string {
  return text.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, max);
}

export function isValidHandle(handle: string): boolean {
  return new RegExp(`^[a-z0-9_.]{${HANDLE_MIN},${HANDLE_MAX}}$`).test(handle);
}
