-- Stories: a photo or short video that disappears after 24 hours. The tray at the top of the
-- feed shows your own and the people you follow; authors see who viewed each story.
-- Stories can be reported like posts: gone for the reporter at once, and expired for everyone
-- after 3 reports. Files go in the existing post-images / post-videos buckets.
-- Requires 20260928020000_follows.sql and 20260928080000_direct_messages.sql (reports).
-- Run once in the Supabase dashboard → SQL Editor.

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  image_path text not null constraint stories_image_path_format check (
    image_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_.-]{1,120}\.(jpg|jpeg|png|webp)$'
  ),
  video_path text constraint stories_video_path_format check (
    video_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_.-]{1,120}\.(mp4|mov)$'
  ),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index stories_author_created_idx on public.stories (author_id, created_at desc);
create index stories_expires_idx on public.stories (expires_at);

alter table public.stories enable row level security;

-- ─── Reports ───────────────────────────────────────────────────────────────

alter table public.reports add column story_id uuid references public.stories (id) on delete cascade;
alter table public.reports drop constraint reports_one_target;
alter table public.reports add constraint reports_one_target check (
  num_nonnulls(post_id, comment_id, listing_id, thread_id, reply_id, message_id, story_id) = 1
);
create unique index reports_story_once on public.reports (reporter_id, story_id) where story_id is not null;
create index reports_story_id_idx on public.reports (story_id);

-- Same as 20260928010000_reports_and_blocks.sql, plus: 3 reports expire a story.
create or replace function public.hide_reported_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  threshold constant integer := 3;
begin
  if new.post_id is not null
     and (select count(*) from public.reports where post_id = new.post_id) >= threshold then
    update public.posts set hidden_at = now() where id = new.post_id and hidden_at is null;
  elsif new.comment_id is not null
     and (select count(*) from public.reports where comment_id = new.comment_id) >= threshold then
    update public.comments set hidden_at = now() where id = new.comment_id and hidden_at is null;
  elsif new.listing_id is not null
     and (select count(*) from public.reports where listing_id = new.listing_id) >= threshold then
    update public.listings set hidden_at = now() where id = new.listing_id and hidden_at is null;
  elsif new.thread_id is not null
     and (select count(*) from public.reports where thread_id = new.thread_id) >= threshold then
    update public.forum_threads set hidden_at = now() where id = new.thread_id and hidden_at is null;
  elsif new.reply_id is not null
     and (select count(*) from public.reports where reply_id = new.reply_id) >= threshold then
    update public.forum_replies set hidden_at = now() where id = new.reply_id and hidden_at is null;
  elsif new.story_id is not null
     and (select count(*) from public.reports where story_id = new.story_id) >= threshold then
    update public.stories set expires_at = now() where id = new.story_id and expires_at > now();
  end if;
  return new;
end;
$$;

-- ─── Who sees what ─────────────────────────────────────────────────────────
-- Your own stories (even expired, so the app can clean up their files); everyone else's
-- while they're live, unless there's a block either way or you reported it.
create policy "live stories are visible"
  on public.stories for select to authenticated
  using (
    author_id = (select auth.uid())
    or (
      expires_at > now()
      and not public.is_blocked(author_id)
      and not exists (
        select 1 from public.reports r
        where r.story_id = stories.id and r.reporter_id = (select auth.uid())
      )
    )
  );

create policy "users post their own stories"
  on public.stories for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and split_part(image_path, '/', 1) = (select auth.uid())::text
    and (video_path is null or split_part(video_path, '/', 1) = (select auth.uid())::text)
    and expires_at <= now() + interval '24 hours 1 minute'
  );

create policy "users delete their own stories"
  on public.stories for delete to authenticated
  using (author_id = (select auth.uid()));

create trigger stories_rate_limit before insert on public.stories
  for each row execute function public.enforce_rate_limit('author_id', '30', '24 hours');

-- ─── Views ─────────────────────────────────────────────────────────────────

create table public.story_views (
  story_id uuid not null references public.stories (id) on delete cascade,
  viewer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

create index story_views_viewer_idx on public.story_views (viewer_id);

alter table public.story_views enable row level security;

create policy "viewers record their own views"
  on public.story_views for insert to authenticated
  with check (
    viewer_id = (select auth.uid())
    and exists (select 1 from public.stories s where s.id = story_id)
  );

-- You see your own views; a story's author sees everyone who viewed it.
create policy "viewers and authors see views"
  on public.story_views for select to authenticated
  using (
    viewer_id = (select auth.uid())
    or exists (select 1 from public.stories s where s.id = story_id and s.author_id = (select auth.uid()))
  );

-- ─── The tray ──────────────────────────────────────────────────────────────
-- One row per person with live stories: you first, then people with stories you haven't
-- seen, then the rest, newest first.

create function public.story_tray()
returns table (author_id uuid, username text, latest_at timestamptz, unseen bigint)
language sql
stable
set search_path = ''
as $$
  select t.author_id, t.username, t.latest_at, t.unseen
  from (
    select
      s.author_id,
      p.username,
      max(s.created_at) as latest_at,
      count(*) filter (
        where not exists (
          select 1 from public.story_views v
          where v.story_id = s.id and v.viewer_id = (select auth.uid())
        )
      ) as unseen
    from public.stories s
    join public.profiles p on p.id = s.author_id
    where s.expires_at > now()
      and (
        s.author_id = (select auth.uid())
        or s.author_id in (select f.followee_id from public.follows f where f.follower_id = (select auth.uid()))
      )
    group by s.author_id, p.username
  ) t
  order by t.author_id = (select auth.uid()) desc, t.unseen > 0 desc, t.latest_at desc
  limit 50;
$$;

revoke execute on function public.story_tray() from public, anon;
grant execute on function public.story_tray() to authenticated;
