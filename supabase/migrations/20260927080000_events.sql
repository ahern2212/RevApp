-- Car meets / events with a location, and RSVPs ("Going").
-- Run once in the Supabase dashboard → SQL Editor.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (length(trim(title)) between 3 and 80),
  description text not null default '' check (length(description) <= 1000),
  starts_at timestamptz not null,
  location_name text not null check (length(trim(location_name)) between 2 and 200),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  created_at timestamptz not null default now()
);

create index events_starts_at_idx on public.events (starts_at);
create index events_host_id_idx on public.events (host_id);

create table public.event_rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index event_rsvps_user_id_idx on public.event_rsvps (user_id);

alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;

create policy "events are readable by signed-in users"
  on public.events for select to authenticated
  using (true);

create policy "users host events as themselves"
  on public.events for insert to authenticated
  with check (host_id = (select auth.uid()));

create policy "hosts delete their own events"
  on public.events for delete to authenticated
  using (host_id = (select auth.uid()));

create policy "rsvps are readable by signed-in users"
  on public.event_rsvps for select to authenticated
  using (true);

create policy "users rsvp as themselves"
  on public.event_rsvps for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "users cancel their own rsvp"
  on public.event_rsvps for delete to authenticated
  using (user_id = (select auth.uid()));
