-- Forums: threads in a few categories, with replies. Threads with new replies rise to the top.
-- Run once in the Supabase dashboard → SQL Editor.

create table public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category text not null
    check (category in ('General', 'Builds', 'Tech Help', 'Meets', 'Off-Topic')),
  title text not null check (length(trim(title)) between 3 and 120),
  body text not null default '' check (length(body) <= 5000),
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create index forum_threads_activity_idx on public.forum_threads (last_activity_at desc);
create index forum_threads_category_activity_idx on public.forum_threads (category, last_activity_at desc);
create index forum_threads_author_id_idx on public.forum_threads (author_id);

create table public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index forum_replies_thread_created_idx on public.forum_replies (thread_id, created_at);
create index forum_replies_author_id_idx on public.forum_replies (author_id);

alter table public.forum_threads enable row level security;
alter table public.forum_replies enable row level security;

create policy "threads are readable by signed-in users"
  on public.forum_threads for select to authenticated using (true);
create policy "users start threads as themselves"
  on public.forum_threads for insert to authenticated
  with check (author_id = (select auth.uid()));
create policy "users delete their own threads"
  on public.forum_threads for delete to authenticated
  using (author_id = (select auth.uid()));

create policy "replies are readable by signed-in users"
  on public.forum_replies for select to authenticated using (true);
create policy "users reply as themselves"
  on public.forum_replies for insert to authenticated
  with check (author_id = (select auth.uid()));
create policy "users delete their own replies"
  on public.forum_replies for delete to authenticated
  using (author_id = (select auth.uid()));

-- Bump the thread when someone replies (repliers can't update other people's threads,
-- so this runs with the function owner's rights).
create function public.bump_forum_thread()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.forum_threads set last_activity_at = new.created_at where id = new.thread_id;
  return new;
end;
$$;

create trigger forum_replies_bump_thread
  after insert on public.forum_replies
  for each row execute function public.bump_forum_thread();
