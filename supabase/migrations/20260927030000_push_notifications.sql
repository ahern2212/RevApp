-- Push notifications: devices register their Expo push token, and every new row in
-- public.notifications is sent to the recipient's devices through Expo's push service
-- (with the car-horn sound). Requires 20260927020000_notifications.sql first.
-- Run once in the Supabase dashboard → SQL Editor.

create extension if not exists pg_net with schema extensions;

-- ─── Device tokens ─────────────────────────────────────────────────────────

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);

create index push_tokens_user_id_idx on public.push_tokens (user_id);

-- RLS on with no policies: the table is only reachable through the functions below.
alter table public.push_tokens enable row level security;

-- Claims a device token for the signed-in user. A phone that switches accounts moves
-- its token to the new user, so the previous account stops getting pushes there.
create function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in';
  end if;
  if p_token !~ '^Expo(nent)?PushToken\[.+\]$' then
    raise exception 'invalid push token';
  end if;

  insert into public.push_tokens (token, user_id, platform)
  values (p_token, (select auth.uid()), p_platform)
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$;

create function public.unregister_push_token(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_tokens where token = p_token and user_id = (select auth.uid());
$$;

revoke execute on function public.register_push_token(text, text) from public, anon;
revoke execute on function public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

-- ─── Send a push for every new notification ────────────────────────────────

create function public.send_push_notification()
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
      'title', 'Garage',
      'body', message,
      'sound', 'car_horn.wav',
      'channelId', 'activity',
      'priority', 'high',
      'data', jsonb_build_object('postId', new.post_id)
    )
  );
  return new;
end;
$$;

create trigger notifications_send_push
  after insert on public.notifications
  for each row execute function public.send_push_notification();
