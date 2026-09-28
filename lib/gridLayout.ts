// How a grid post tiles its photos. Kept free of app imports so it can be unit-tested.

export type GridShape =
  /** Rows of equal tiles, e.g. [[0, 1], [2, 3]] for a 2×2. */
  | { kind: 'rows'; rows: number[][] }
  /** One big photo on the left and a column of smaller ones on the right. */
  | { kind: 'feature'; main: number; side: number[] };

export const GRID_MIN = 2;
export const GRID_MAX = 6;

/**
 * 2 → side by side · 3 → one big + two stacked · 4 → 2×2 · 5 → 2 over 3 · 6 → 3 over 3.
 * Counts outside 2–6 are clamped (the database only allows 2–6).
 */
export function gridShape(count: number): GridShape {
  const n = Math.min(Math.max(count, GRID_MIN), GRID_MAX);
  switch (n) {
    case 2:
      return { kind: 'rows', rows: [[0, 1]] };
    case 3:
      return { kind: 'feature', main: 0, side: [1, 2] };
    case 4:
      return { kind: 'rows', rows: [[0, 1], [2, 3]] };
    case 5:
      return { kind: 'rows', rows: [[0, 1], [2, 3, 4]] };
    default:
      return { kind: 'rows', rows: [[0, 1, 2], [3, 4, 5]] };
  }
}
