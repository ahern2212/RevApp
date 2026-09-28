/** Parses "7pm", "7:30 PM", "19:30" or "730pm" into hours/minutes (24h), or null if invalid. */
export function parseTime(text: string): { hours: number; minutes: number } | null {
  const match = text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .match(/^(\d{1,2})(?::?(\d{2}))?(am|pm|a|p)?$/);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3]?.[0];
  if (minutes > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === 'p' && hours !== 12) hours += 12;
    if (meridiem === 'a' && hours === 12) hours = 0;
  } else if (hours > 23) {
    return null;
  }
  return { hours, minutes };
}

/** Local midnight for each of the next `count` days, starting today. */
export function nextDays(count: number, from = new Date()): Date[] {
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    return day;
  });
}

/** "Today", "Tomorrow", then "Sat 4". */
export function dayLabel(day: Date, today = new Date()): string {
  const diff = Math.round(
    (day.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86_400_000
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `${day.toLocaleDateString(undefined, { weekday: 'short' })} ${day.getDate()}`;
}

/** Combines a local day with a time of day. */
export function atTime(day: Date, time: { hours: number; minutes: number }): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.hours, time.minutes);
}

/** A meet counts as "happening now" for this long after it starts, then it has ended. */
export const MEET_LENGTH_MS = 6 * 60 * 60 * 1000;

export type MeetPhase = 'upcoming' | 'live' | 'ended';

export function meetPhase(startsAt: number, now = Date.now()): MeetPhase {
  if (startsAt > now) return 'upcoming';
  return now - startsAt < MEET_LENGTH_MS ? 'live' : 'ended';
}
