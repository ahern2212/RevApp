-- Push notification settings: turn off pushes for likes, comments, new followers, mentions
-- or messages. Activity in the app still lists everything; this only affects pushes.
-- Requires 20260928090000_share_posts_in_messages.sql.
-- Run once in the Supabase dashboard → SQL Editor.

create table public.notification_settings (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  likes boolean not null default true,
  comments boolean not null default true,
  follows boolean not null default true,
  mentions boolean not null default true,
  messages boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_settings enable row level security;

create policy "users read their own notification settings"
  on public.notification_settings for select to authenticated
  using (user_id = (select auth.uid()));

create policy "users create their own notification settings"
  on public.notification_settings for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "users change their own notification settings"
  on public.notification_settings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Whether `recipient` wants a push for this kind of event (everything is on by default).
create function public.wants_push(recipient uuid, kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select case kind
        when 'like' then s.likes
        when 'comment' then s.comments
        when 'follow' then s.follows
        when 'mention' then s.mentions
        when 'message' then s.messages
        else true
      end
      from public.notification_settings s
      where s.user_id = recipient
    ),
    true
  );
$$;

revoke execute on function public.wants_push(uuid, text) from public, anon, authenticated;

-- Same as 20260928030000_mentions.sql, plus the settings check.
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
  if not public.wants_push(new.recipient_id, new.type) then
    return new;
  end if;

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

-- Same as 20260928090000_share_posts_in_messages.sql, plus the settings check (the inbox
-- preview still updates when message pushes are off).
create or replace function public.after_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  conv public.conversations%rowtype;
  recipient uuid;
  tokens text[];
  sender_name text;
  summary text;
  preview text;
begin
  summary := case when length(trim(new.body)) = 0 then 'Sent a post' else new.body end;

  update public.conversations
  set last_message_at = new.created_at,
      last_message = left(summary, 200),
      last_sender_id = new.sender_id,
      user_a_read_at = case when user_a = new.sender_id then new.created_at else user_a_read_at end,
      user_b_read_at = case when user_b = new.sender_id then new.created_at else user_b_read_at end
  where id = new.conversation_id
  returning * into conv;

  recipient := case when conv.user_a = new.sender_id then conv.user_b else conv.user_a end;
  if not public.wants_push(recipient, 'message') then
    return new;
  end if;

  select array_agg(t.token) into tokens from public.push_tokens t where t.user_id = recipient;
  if tokens is null then
    return new;
  end if;

  select coalesce(p.username, 'Someone') into sender_name from public.profiles p where p.id = new.sender_id;
  preview := case when length(summary) > 100 then left(summary, 100) || '…' else summary end;

  -- Async HTTP call; does not slow down or fail the message if Expo is unreachable.
  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'to', to_jsonb(tokens),
      'title', sender_name,
      'body', preview,
      'sound', 'car_horn.wav',
      'channelId', 'activity',
      'priority', 'high',
      'data', jsonb_build_object('conversationId', new.conversation_id)
    )
  );
  return new;
end;
$$;
