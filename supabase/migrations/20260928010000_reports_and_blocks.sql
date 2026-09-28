-- Report and block (App Store guideline 1.2 for apps with user posts).
--   • Block: neither person sees the other's posts, comments, threads, replies, listings or
--     garage, and can't like or comment on the other's posts. Old notifications disappear.
--   • Report: posts, comments, listings, forum threads and replies. What you report disappears for you straight
--     away; anything reported by 3 different people is hidden for everyone except its owner.
-- Review reports in the SQL Editor:
--   select reason, count(*), post_id, comment_id, listing_id, thread_id, reply_id
--   from public.reports group by 1, 3, 4, 5, 6, 7 order by 2 desc;
-- Un-hide something: update public.posts set hidden_at = null where id = '…';
-- Run once in the Supabase dashboard → SQL Editor.

-- ─── Blocks ────────────────────────────────────────────────────────────────

create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_id_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

create policy "users see who they blocked"
  on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

create policy "users block as themselves"
  on public.blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));

create policy "users unblock"
  on public.blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

-- True if the signed-in user blocked `other` or `other` blocked them. Security definer so
-- it can see blocks in both directions (users can only read their own).
create function public.is_blocked(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = other)
       or (b.blocker_id = other and b.blocked_id = (select auth.uid()))
  );
$$;

revoke execute on function public.is_blocked(uuid) from public, anon;
grant execute on function public.is_blocked(uuid) to authenticated;

-- ─── Reports ───────────────────────────────────────────────────────────────

alter table public.posts add column hidden_at timestamptz;
alter table public.comments add column hidden_at timestamptz;
alter table public.listings add column hidden_at timestamptz;
alter table public.forum_threads add column hidden_at timestamptz;
alter table public.forum_replies add column hidden_at timestamptz;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete cascade,
  thread_id uuid references public.forum_threads (id) on delete cascade,
  reply_id uuid references public.forum_replies (id) on delete cascade,
  -- Must match REPORT_REASONS in lib/safety.ts.
  reason text not null check (reason in (
    'Spam',
    'Nudity or sexual content',
    'Harassment or hate',
    'Violence or dangerous driving',
    'Scam or fraud',
    'Not car related',
    'Something else'
  )),
  created_at timestamptz not null default now(),
  check (num_nonnulls(post_id, comment_id, listing_id, thread_id, reply_id) = 1)
);

create unique index reports_post_once on public.reports (reporter_id, post_id) where post_id is not null;
create unique index reports_comment_once on public.reports (reporter_id, comment_id) where comment_id is not null;
create unique index reports_listing_once on public.reports (reporter_id, listing_id) where listing_id is not null;
create unique index reports_thread_once on public.reports (reporter_id, thread_id) where thread_id is not null;
create unique index reports_reply_once on public.reports (reporter_id, reply_id) where reply_id is not null;
create index reports_post_id_idx on public.reports (post_id);
create index reports_comment_id_idx on public.reports (comment_id);
create index reports_listing_id_idx on public.reports (listing_id);
create index reports_thread_id_idx on public.reports (thread_id);
create index reports_reply_id_idx on public.reports (reply_id);

alter table public.reports enable row level security;

create policy "users see their own reports"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()));

create policy "users report as themselves"
  on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));

create trigger reports_rate_limit before insert on public.reports
  for each row execute function public.enforce_rate_limit('reporter_id', '30', '1 hour');

-- Hides content once 3 different people have reported it.
create function public.hide_reported_content()
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
  end if;
  return new;
end;
$$;

create trigger reports_hide_content
  after insert on public.reports
  for each row execute function public.hide_reported_content();

-- ─── What people can see ───────────────────────────────────────────────────
-- Owners always see their own things. Everyone else doesn't see content that is hidden,
-- from someone they blocked (or who blocked them), or that they reported themselves.

drop policy "posts are readable by signed-in users" on public.posts;
create policy "posts are readable by signed-in users"
  on public.posts for select to authenticated
  using (
    author_id = (select auth.uid())
    or (
      hidden_at is null
      and not public.is_blocked(author_id)
      and not exists (
        select 1 from public.reports r
        where r.post_id = posts.id and r.reporter_id = (select auth.uid())
      )
    )
  );

drop policy "comments are readable by signed-in users" on public.comments;
create policy "comments are readable by signed-in users"
  on public.comments for select to authenticated
  using (
    author_id = (select auth.uid())
    or (
      hidden_at is null
      and not public.is_blocked(author_id)
      and not exists (
        select 1 from public.reports r
        where r.comment_id = comments.id and r.reporter_id = (select auth.uid())
      )
    )
  );

drop policy "listings are readable by signed-in users" on public.listings;
create policy "listings are readable by signed-in users"
  on public.listings for select to authenticated
  using (
    seller_id = (select auth.uid())
    or (
      hidden_at is null
      and not public.is_blocked(seller_id)
      and not exists (
        select 1 from public.reports r
        where r.listing_id = listings.id and r.reporter_id = (select auth.uid())
      )
    )
  );

drop policy "threads are readable by signed-in users" on public.forum_threads;
create policy "threads are readable by signed-in users"
  on public.forum_threads for select to authenticated
  using (
    author_id = (select auth.uid())
    or (
      hidden_at is null
      and not public.is_blocked(author_id)
      and not exists (
        select 1 from public.reports r
        where r.thread_id = forum_threads.id and r.reporter_id = (select auth.uid())
      )
    )
  );

drop policy "replies are readable by signed-in users" on public.forum_replies;
create policy "replies are readable by signed-in users"
  on public.forum_replies for select to authenticated
  using (
    author_id = (select auth.uid())
    or (
      hidden_at is null
      and not public.is_blocked(author_id)
      and not exists (
        select 1 from public.reports r
        where r.reply_id = forum_replies.id and r.reporter_id = (select auth.uid())
      )
    )
  );

drop policy "garages are readable by signed-in users" on public.cars;
create policy "garages are readable by signed-in users"
  on public.cars for select to authenticated
  using (owner_id = (select auth.uid()) or not public.is_blocked(owner_id));

drop policy "users read their own notifications" on public.notifications;
create policy "users read their own notifications"
  on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()) and not public.is_blocked(actor_id));

-- You can only like or comment on a post you can see (the subquery runs with your own
-- read access, so hidden posts and blocked authors fail it).
drop policy "users like as themselves" on public.likes;
create policy "users like as themselves"
  on public.likes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.posts p where p.id = post_id)
  );

drop policy "users comment as themselves" on public.comments;
create policy "users comment as themselves"
  on public.comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (select 1 from public.posts p where p.id = post_id)
  );

drop policy "users reply as themselves" on public.forum_replies;
create policy "users reply as themselves"
  on public.forum_replies for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (select 1 from public.forum_threads t where t.id = thread_id)
  );
