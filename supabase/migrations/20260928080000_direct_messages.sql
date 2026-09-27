-- Direct messages between two drivers: an inbox, live chats, unread dots and push.
--   • Blocks apply both ways: a chat with someone on either side of a block is hidden and
--     no one can start or continue it.
--   • Messages can be unsent by their sender and reported by the other person (a reported
--     message disappears for the reporter).
-- Requires 20260928000000_media_safety.sql (enforce_rate_limit) and
-- 20260928010000_reports_and_blocks.sql (is_blocked, reports).
-- Run once in the Supabase dashboard → SQL Editor.

-- ─── Conversations ─────────────────────────────────────────────────────────
-- One row per pair of people (user_a < user_b, so a pair can only exist once).

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_message text not null default '' check (length(last_message) <= 200),
  last_sender_id uuid references public.profiles (id) on delete set null,
  user_a_read_at timestamptz,
  user_b_read_at timestamptz,
  check (user_a < user_b),
  unique (user_a, user_b)
);

create index conversations_user_a_idx on public.conversations (user_a, last_message_at desc);
create index conversations_user_b_idx on public.conversations (user_b, last_message_at desc);

alter table public.conversations enable row level security;

-- No insert/update/delete policies: conversations only change through the functions below.
create policy "members read their conversations"
  on public.conversations for select to authenticated
  using (
    (select auth.uid()) in (user_a, user_b)
    and not public.is_blocked(case when user_a = (select auth.uid()) then user_b else user_a end)
  );

-- The other person in a conversation, or null if the signed-in user isn't in it.
create function public.conversation_partner(conv uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when c.user_a = (select auth.uid()) then c.user_b
    when c.user_b = (select auth.uid()) then c.user_a
  end
  from public.conversations c
  where c.id = conv;
$$;

revoke execute on function public.conversation_partner(uuid) from public, anon;
grant execute on function public.conversation_partner(uuid) to authenticated;

-- ─── Messages ──────────────────────────────────────────────────────────────

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx on public.messages (conversation_id, created_at desc);
create index messages_sender_created_idx on public.messages (sender_id, created_at);

alter table public.messages enable row level security;

-- Reports can point at a message too (the table allows exactly one target per report).
alter table public.reports add column message_id uuid references public.messages (id) on delete cascade;
do $$
declare
  old_check text;
begin
  select conname into old_check
  from pg_constraint
  where conrelid = 'public.reports'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%num_nonnulls%';
  if old_check is not null then
    execute format('alter table public.reports drop constraint %I', old_check);
  end if;
end;
$$;
alter table public.reports add constraint reports_one_target check (
  num_nonnulls(post_id, comment_id, listing_id, thread_id, reply_id, message_id) = 1
);
create unique index reports_message_once on public.reports (reporter_id, message_id) where message_id is not null;
create index reports_message_id_idx on public.reports (message_id);

create policy "members read messages"
  on public.messages for select to authenticated
  using (
    public.conversation_partner(conversation_id) is not null
    and not exists (
      select 1 from public.reports r
      where r.message_id = messages.id and r.reporter_id = (select auth.uid())
    )
  );

create policy "members send messages"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.conversation_partner(conversation_id) is not null
    and not public.is_blocked(public.conversation_partner(conversation_id))
  );

create policy "senders unsend their messages"
  on public.messages for delete to authenticated
  using (sender_id = (select auth.uid()));

create trigger messages_rate_limit before insert on public.messages
  for each row execute function public.enforce_rate_limit('sender_id', '60', '10 minutes');

-- ─── Functions the app calls ───────────────────────────────────────────────

-- Opens (creating if needed) the chat with `other` and returns its id.
create function public.start_conversation(other uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  a uuid;
  b uuid;
  conv uuid;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  if other is null or other = me then
    raise exception 'You can''t message yourself.';
  end if;
  if not exists (select 1 from public.profiles p where p.id = other) then
    raise exception 'That driver doesn''t exist anymore.';
  end if;
  if public.is_blocked(other) then
    raise exception 'You can''t message this driver.';
  end if;
  a := least(me, other);
  b := greatest(me, other);
  insert into public.conversations (user_a, user_b) values (a, b)
  on conflict (user_a, user_b) do nothing;
  select c.id into conv from public.conversations c where c.user_a = a and c.user_b = b;
  return conv;
end;
$$;

-- Marks a chat read for the signed-in user (clears its unread dot).
create function public.mark_conversation_read(conv uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.conversations
  set user_a_read_at = case when user_a = (select auth.uid()) then now() else user_a_read_at end,
      user_b_read_at = case when user_b = (select auth.uid()) then now() else user_b_read_at end
  where id = conv and (select auth.uid()) in (user_a, user_b);
$$;

revoke execute on function public.start_conversation(uuid) from public, anon;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.start_conversation(uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- After each message: update the inbox preview, count it as read for the sender, and push
-- it to the other person's devices ("maya" / "is it still for sale?").
create function public.after_message()
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
  preview text;
begin
  update public.conversations
  set last_message_at = new.created_at,
      last_message = left(new.body, 200),
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
  preview := case when length(new.body) > 100 then left(new.body, 100) || '…' else new.body end;

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

create trigger messages_after_insert
  after insert on public.messages
  for each row execute function public.after_message();

-- Live chats and inbox updates.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
