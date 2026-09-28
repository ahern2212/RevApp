import { MEET_LENGTH_MS } from '@/lib/datetime';
import { supabase } from '@/lib/supabase';

const EVENT_SELECT =
  'id, host_id, title, description, starts_at, location_name, latitude, longitude, host:profiles!events_host_id_fkey(username), rsvps:event_rsvps(user_id)';

type EventRow = {
  id: string;
  host_id: string;
  title: string;
  description: string;
  starts_at: string;
  location_name: string;
  latitude: number;
  longitude: number;
  host: { username: string } | null;
  rsvps: { user_id: string }[];
};

export type CarEvent = {
  id: string;
  hostId: string;
  hostName: string;
  title: string;
  description: string;
  startsAt: number;
  locationName: string;
  latitude: number;
  longitude: number;
  goingIds: string[];
};

function toEvent(row: EventRow): CarEvent {
  return {
    id: row.id,
    hostId: row.host_id,
    hostName: row.host?.username ?? 'driver',
    title: row.title,
    description: row.description,
    startsAt: Date.parse(row.starts_at),
    locationName: row.location_name,
    latitude: row.latitude,
    longitude: row.longitude,
    goingIds: row.rsvps.map((rsvp) => rsvp.user_id),
  };
}

// Matches the meet-photos rule: a meet can be tagged from 2 days before it starts to a day after.
const TAG_BEFORE_MS = 2 * 24 * 60 * 60 * 1000;
const TAG_AFTER_MS = 24 * 60 * 60 * 1000;

/** Meets you're hosting or going to that you can tag a post with right now. */
export async function fetchTaggableEvents(userId: string): Promise<CarEvent[]> {
  const now = Date.now();
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .gte('starts_at', new Date(now - TAG_AFTER_MS).toISOString())
    .lte('starts_at', new Date(now + TAG_BEFORE_MS).toISOString())
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return (data as unknown as EventRow[])
    .map(toEvent)
    .filter((event) => event.hostId === userId || event.goingIds.includes(userId));
}

/** Upcoming (and in-progress) events, soonest first. */
export async function fetchUpcomingEvents(): Promise<CarEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .gte('starts_at', new Date(Date.now() - MEET_LENGTH_MS).toISOString())
    .order('starts_at', { ascending: true })
    .limit(100);
  if (error) throw error;
  return (data as unknown as EventRow[]).map(toEvent);
}

/** Meets that have ended, most recent first. */
export async function fetchPastEvents(): Promise<CarEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .lt('starts_at', new Date(Date.now() - MEET_LENGTH_MS).toISOString())
    .order('starts_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data as unknown as EventRow[]).map(toEvent);
}

export async function fetchEvent(eventId: string): Promise<CarEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('id', eventId)
    .maybeSingle();
  if (error) throw error;
  return data ? toEvent(data as unknown as EventRow) : null;
}

export type NewEvent = {
  title: string;
  description: string;
  startsAt: Date;
  locationName: string;
  latitude: number;
  longitude: number;
};

export async function createEvent(input: NewEvent): Promise<CarEvent> {
  const { data, error } = await supabase
    .from('events')
    .insert({
      title: input.title.trim(),
      description: input.description.trim(),
      starts_at: input.startsAt.toISOString(),
      location_name: input.locationName.trim(),
      latitude: input.latitude,
      longitude: input.longitude,
    })
    .select(EVENT_SELECT)
    .single();
  if (error) throw error;
  return toEvent(data as unknown as EventRow);
}

export async function deleteEvent(eventId: string): Promise<void> {
  const { data, error } = await supabase.from('events').delete().eq('id', eventId).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('Only the host can delete this event.');
}

export async function setGoing(eventId: string, userId: string, going: boolean): Promise<void> {
  const { error } = going
    ? await supabase
        .from('event_rsvps')
        .upsert({ event_id: eventId, user_id: userId }, { ignoreDuplicates: true })
    : await supabase.from('event_rsvps').delete().eq('event_id', eventId).eq('user_id', userId);
  if (error) throw error;
}

/** "Sat, Oct 4 · 7:00 PM" in the viewer's locale. */
export function formatEventTime(timestamp: number): string {
  const date = new Date(timestamp);
  const day = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}
