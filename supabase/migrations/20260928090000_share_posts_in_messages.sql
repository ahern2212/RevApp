-- Send a post in a direct message (Instagram's paper-plane). The chat shows it as a card
-- that opens the post. A shared post needs no text; the inbox preview says "Sent a post".
-- Requires 20260928080000_direct_messages.sql.
-- Run once in the Supabase dashboard → SQL Editor.

alter table public.messages
  add column post_id uuid references public.posts (id) on delete set null;

-- Text is optional when a post is attached.
alter table public.messages drop constraint messages_body_check;
alter table public.messages add constraint messages_body_check check (
  length(body) <= 1000 and (post_id is not null or length(trim(body)) >= 1)
);

-- Same as 20260928080000_direct_messages.sql, plus: you can only share a post you can see.
drop policy "members send messages" on public.messages;
create policy "members send messages"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.conversation_partner(conversation_id) is not null
    and not public.is_blocked(public.conversation_partner(conversation_id))
    and (post_id is null or exists (select 1 from public.posts p where p.id = post_id))
  );

-- Same as 20260928080000_direct_messages.sql, with "Sent a post" for text-less shares.
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
