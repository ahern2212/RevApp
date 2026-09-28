-- @mention notifications: "@maya" in a caption or comment notifies maya (in-app + push).
-- At most 5 people per caption/comment; never yourself, never someone on either side of a
-- block, and not the post's author for a comment (they already get "commented").
-- Requires 20260928020000_follows.sql.
-- Run once in the Supabase dashboard → SQL Editor.

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like', 'comment', 'follow', 'mention'));

create function public.notify_mentions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  body text;
  actor uuid;
  post uuid;
  comment uuid;
  post_author uuid;
  handle text;
  target uuid;
  sent integer := 0;
begin
  -- Separate branches: comments have body/post_id, posts have caption/id.
  if tg_table_name = 'comments' then
    body := new.body;
    actor := new.author_id;
    post := new.post_id;
    comment := new.id;
    select p.author_id into post_author from public.posts p where p.id = new.post_id;
  else
    body := new.caption;
    actor := new.author_id;
    post := new.id;
  end if;

  -- Same rules as the app (lib/richText.ts): "@" at the start of a word, 2–30 handle
  -- characters, a trailing "." isn't part of the name.
  for handle in
    select distinct h
    from (
      select lower(rtrim(m.parts[1], '.')) as h
      from regexp_matches(coalesce(body, ''), '(?:^|[^[:alnum:]_])@([A-Za-z0-9_.]+)', 'g') as m(parts)
    ) found
    where length(h) between 2 and 30
  loop
    exit when sent >= 5;
    select pr.id into target from public.profiles pr where pr.username = handle;
    continue when target is null or target = actor or target is not distinct from post_author;
    continue when exists (
      select 1 from public.blocks b
      where (b.blocker_id = target and b.blocked_id = actor)
         or (b.blocker_id = actor and b.blocked_id = target)
    );
    insert into public.notifications (recipient_id, actor_id, post_id, comment_id, type)
    values (target, actor, post, comment, 'mention');
    sent := sent + 1;
  end loop;
  return new;
end;
$$;

create trigger comments_notify_mentions
  after insert on public.comments
  for each row execute function public.notify_mentions();

create trigger posts_notify_mentions
  after insert on public.posts
  for each row execute function public.notify_mentions();

-- Push text for mentions. Same as 20260928020000_follows.sql plus the 'mention' branch.
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

  if new.comment_id is not null then
    select c.body into preview from public.comments c where c.id = new.comment_id;
    if length(preview) > 60 then
      preview := left(preview, 60) || '…';
    end if;
  end if;

  if new.type = 'like' then
    message := actor_name || ' liked your post';
  elsif new.type = 'follow' then
    message := actor_name || ' started following you';
  elsif new.type = 'mention' and new.comment_id is not null then
    message := actor_name || ' mentioned you: "' || coalesce(preview, '') || '"';
  elsif new.type = 'mention' then
    message := actor_name || ' mentioned you in a post';
  else
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
