-- Unsending a message also fixes the inbox preview: it shows the newest message that's left
-- (or hides the chat if none are), so the other person doesn't keep seeing unsent text.
-- Requires 20260928090000_share_posts_in_messages.sql.
-- Run once in the Supabase dashboard → SQL Editor.

create function public.after_message_deleted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  latest public.messages%rowtype;
begin
  select * into latest
  from public.messages m
  where m.conversation_id = old.conversation_id
  order by m.created_at desc
  limit 1;

  update public.conversations
  set last_message_at = latest.created_at,
      last_message = case
        when latest.id is null then ''
        when length(trim(latest.body)) = 0 then 'Sent a post'
        else left(latest.body, 200)
      end,
      last_sender_id = latest.sender_id
  where id = old.conversation_id;
  return old;
end;
$$;

create trigger messages_after_delete
  after delete on public.messages
  for each row execute function public.after_message_deleted();
