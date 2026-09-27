-- Follows: follow other drivers, a "Following" feed, follower counts and lists, and a
-- notification (in-app + push) the first time someone follows you.
-- Requires 20260928000000_media_safety.sql and 20260928010000_reports_and_blocks.sql.
-- Run once in the Supabase dashboard → SQL Editor.

create table public.follows (
  follower_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_followee_id_idx on public.follows (followee_id, created_at desc);

alter table public.follows enable row level security;

-- Follower lists are public to signed-in users, minus anyone on either side of a block.
create policy "follows are readable by signed-in users"
  on public.follows for select to authenticated
  using (not public.is_blocked(follower_id) and not public.is_blocked(followee_id));

create policy "users follow as themselves"
  on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()) and not public.is_blocked(followee_id));

create policy "users unfollow"
  on public.follows for delete to authenticated
  using (follower_id = (select auth.uid()));

create trigger follows_rate_limit before insert on public.follows
  for each row execute function public.enforce_rate_limit('follower_id', '200', '1 hour');

-- Blocking someone ends follows in both directions.
create function public.end_follows_on_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and followee_id = new.blocked_id)
     or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return new;
end;
$$;

create trigger blocks_end_follows
  after insert on public.blocks
  for each row execute function public.end_follows_on_block();

-- ─── "X started following you" ─────────────────────────────────────────────

alter table public.notifications alter column post_id drop not null;
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like', 'comment', 'follow'));

-- Only the first follow notifies, so unfollow/follow again can't be used to spam someone.
create function public.notify_new_follower()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.notifications n
    where n.recipient_id = new.followee_id and n.actor_id = new.follower_id and n.type = 'follow'
  ) then
    insert into public.notifications (recipient_id, actor_id, type)
    values (new.followee_id, new.follower_id, 'follow');
  end if;
  return new;
end;
$$;

create trigger follows_notify_followee
  after insert on public.follows
  for each row execute function public.notify_new_follower();

-- Push text for follows; tapping a follow push opens the follower's profile.
-- Same as 20260927120000_rename_to_revapp.sql plus the 'follow' branch and data.
create or replace function public.send_push_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tokens text[];
  actor_name text;
  preview text;
  message text;
begin
  select array_agg(t.token) into tokens
  from public.push_tokens t
  where t.user_id = new.recipient_id;

  if tokens is null then
    return new;
  end if;

  select coalesce(p.username, 'Someone') into actor_name
  from public.profiles p where p.id = new.actor_id;

  if new.type = 'like' then
    message := actor_name || ' liked your post';
  elsif new.type = 'follow' then
    message := actor_name || ' started following you';
  else
    select c.body into preview from public.comments c where c.id = new.comment_id;
    if length(preview) > 60 then
      preview := left(preview, 60) || '…';
    end if;
    message := actor_name || ' commented: "' || coalesce(preview, '') || '"';
  end if;

  -- Async HTTP call; does not slow down or fail the like/comment if Expo is unreachable.
  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'to', to_jsonb(tokens),
      'title', 'RevApp',
      'body', message,
      'sound', 'car_horn.wav',
      'channelId', 'activity',
      'priority', 'high',
      'data', case
        when new.type = 'follow' then jsonb_build_object('userId', new.actor_id, 'username', actor_name)
        else jsonb_build_object('postId', new.post_id)
      end
    )
  );
  return new;
end;
$$;

-- ─── Following feed ────────────────────────────────────────────────────────
-- Posts by people you follow, plus your own. Security invoker, so the usual read rules
-- (hidden, blocked, reported) still apply. The app pages it like the main feed:
--   rpc('following_posts').select(...).order('created_at', desc).lt('created_at', cursor)

create function public.following_posts()
returns setof public.posts
language sql
stable
set search_path = ''
as $$
  select p.*
  from public.posts p
  where p.author_id = (select auth.uid())
     or p.author_id in (
       select f.followee_id from public.follows f where f.follower_id = (select auth.uid())
     );
$$;

revoke execute on function public.following_posts() from public, anon;
grant execute on function public.following_posts() to authenticated;
