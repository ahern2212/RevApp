-- Comment likes and one level of replies (a reply to a reply attaches to the top comment,
-- like Instagram). Replies start with "@name", so the mention trigger notifies that person.
-- Requires 20260928010000_reports_and_blocks.sql (comment insert rule) and
-- 20260928000000_media_safety.sql (enforce_rate_limit).
-- Run once in the Supabase dashboard → SQL Editor.

-- ─── Replies ───────────────────────────────────────────────────────────────

alter table public.comments
  add column parent_id uuid references public.comments (id) on delete cascade;

create index comments_parent_id_idx on public.comments (parent_id) where parent_id is not null;

-- True when `parent` is a top-level comment on `post`. A policy on comments can't query
-- comments itself (Postgres rejects that as infinite recursion), so this runs as a
-- security definer function instead.
create function public.is_reply_target(parent uuid, post uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.comments c
    where c.id = parent and c.post_id = post and c.parent_id is null
  );
$$;

revoke execute on function public.is_reply_target(uuid, uuid) from public, anon;
grant execute on function public.is_reply_target(uuid, uuid) to authenticated;

-- Same as 20260928010000_reports_and_blocks.sql, plus: a reply's parent is a top-level
-- comment on the same post (which you can see, since the post check covers it).
drop policy "users comment as themselves" on public.comments;
create policy "users comment as themselves"
  on public.comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (select 1 from public.posts p where p.id = post_id)
    and (parent_id is null or public.is_reply_target(parent_id, post_id))
  );

-- ─── Comment likes ─────────────────────────────────────────────────────────

create table public.comment_likes (
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index comment_likes_user_id_idx on public.comment_likes (user_id);

alter table public.comment_likes enable row level security;

create policy "comment likes are readable by signed-in users"
  on public.comment_likes for select to authenticated
  using (true);

-- Only comments you can see (hidden, reported and blocked ones fail the subquery).
create policy "users like comments as themselves"
  on public.comment_likes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.comments c where c.id = comment_id)
  );

create policy "users unlike comments"
  on public.comment_likes for delete to authenticated
  using (user_id = (select auth.uid()));

create trigger comment_likes_rate_limit before insert on public.comment_likes
  for each row execute function public.enforce_rate_limit('user_id', '300', '1 hour');
