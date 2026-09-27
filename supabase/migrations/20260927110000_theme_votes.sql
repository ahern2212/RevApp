-- Community vote on the app's color theme: one vote per user, changeable.
-- The theme ids must match constants/themes.ts.
-- Run once in the Supabase dashboard → SQL Editor.

create table public.theme_votes (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  theme_id text not null
    check (theme_id in ('purple90s', 'sunsetDrive', 'racingGreen', 'gulfLivery', 'midnightNeon')),
  updated_at timestamptz not null default now()
);

alter table public.theme_votes enable row level security;

-- Everyone can see the tally; you can only cast or change your own vote.
create policy "votes are readable by signed-in users"
  on public.theme_votes for select to authenticated using (true);
create policy "users vote as themselves"
  on public.theme_votes for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "users change their own vote"
  on public.theme_votes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "users withdraw their own vote"
  on public.theme_votes for delete to authenticated
  using (user_id = (select auth.uid()));
