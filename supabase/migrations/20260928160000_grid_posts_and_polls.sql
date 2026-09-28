-- Grid posts and polls.
--   • Grid: a post with 2–6 photos can show them tiled in one frame instead of a carousel.
--   • Polls: a post can ask a question with 2–4 answers. One vote per person, final. Everyone
--     sees the totals; only the post's author sees who voted for what.
-- Requires 20260928060000_photo_carousels.sql.
-- Run once in the Supabase dashboard → SQL Editor.

-- ─── Grid layout ───────────────────────────────────────────────────────────

alter table public.posts
  add column layout text not null default 'carousel'
    constraint posts_layout_check check (layout in ('carousel', 'grid'));

-- A grid needs 2–6 photos: the cover plus 1–5 more.
alter table public.posts add constraint posts_grid_photo_count check (
  layout = 'carousel' or cardinality(extra_image_paths) between 1 and 5
);

-- ─── Polls ─────────────────────────────────────────────────────────────────

-- 2–4 answers, each 1–40 characters (must match lib/pollRules.ts).
create function public.valid_poll_options(options text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(options) between 2 and 4
    and coalesce(bool_and(length(trim(o)) between 1 and 40), false)
  from unnest(options) as o;
$$;

-- Set by a trigger so the feed knows which posts have a poll without loading every one.
alter table public.posts add column has_poll boolean not null default false;

create table public.polls (
  post_id uuid primary key references public.posts (id) on delete cascade,
  question text not null check (length(trim(question)) between 1 and 120),
  options text[] not null check (public.valid_poll_options(options)),
  -- Kept by triggers (one count per answer); anything the app sends is replaced.
  vote_counts integer[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.polls enable row level security;

-- Anyone who can see the post can see its poll (the subquery uses your own read access).
create policy "polls are visible with their post"
  on public.polls for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));

create policy "authors add a poll to their own post"
  on public.polls for insert to authenticated
  with check (
    exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid()))
  );

create function public.start_poll()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.vote_counts := array_fill(0, array[cardinality(new.options)]);
  update public.posts set has_poll = true where id = new.post_id;
  return new;
end;
$$;

create trigger polls_start
  before insert on public.polls
  for each row execute function public.start_poll();

create table public.poll_votes (
  post_id uuid not null references public.polls (post_id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  option_index smallint not null check (option_index >= 0),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index poll_votes_user_id_idx on public.poll_votes (user_id);

alter table public.poll_votes enable row level security;

-- Vote as yourself, on a poll you can see, for an answer that exists.
create policy "users vote as themselves"
  on public.poll_votes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.polls pl
      where pl.post_id = poll_votes.post_id and poll_votes.option_index < cardinality(pl.options)
    )
  );

-- Your own vote, or every vote on your own post's poll.
create policy "voters and authors see votes"
  on public.poll_votes for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.posts p where p.id = poll_votes.post_id and p.author_id = (select auth.uid())
    )
  );

-- Keep the totals in step (votes also disappear when an account is deleted).
create function public.count_poll_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.polls
    set vote_counts[new.option_index + 1] = vote_counts[new.option_index + 1] + 1
    where post_id = new.post_id;
    return new;
  end if;
  update public.polls
  set vote_counts[old.option_index + 1] = greatest(vote_counts[old.option_index + 1] - 1, 0)
  where post_id = old.post_id;
  return old;
end;
$$;

create trigger poll_votes_count
  after insert or delete on public.poll_votes
  for each row execute function public.count_poll_vote();
