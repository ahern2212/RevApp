-- Fix: Android resource names can't contain hyphens, so the bundled sound was renamed
-- car-horn.wav → car_horn.wav. Re-creates the push function with the new name.
-- Run once in the Supabase dashboard → SQL Editor.

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
