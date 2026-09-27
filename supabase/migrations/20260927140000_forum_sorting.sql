-- Stores each thread's reply count so the forums can sort by "Top" and filter "Unanswered".
-- Run once in the Supabase dashboard → SQL Editor.

alter table public.forum_threads add column reply_count integer not null default 0;

update public.forum_threads t
set reply_count = (select count(*) from public.forum_replies r where r.thread_id = t.id);

create index forum_threads_reply_count_idx on public.forum_threads (reply_count desc, last_activity_at desc);
create index forum_threads_created_at_idx on public.forum_threads (created_at desc);

-- Keep the count in sync (replaces the earlier bump-only trigger function).
create or replace function public.bump_forum_thread()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.forum_threads
    set last_activity_at = new.created_at, reply_count = reply_count + 1
    where id = new.thread_id;
    return new;
  end if;
  update public.forum_threads
  set reply_count = greatest(reply_count - 1, 0)
  where id = old.thread_id;
  return old;
end;
$$;

create trigger forum_replies_unbump_thread
  after delete on public.forum_replies
  for each row execute function public.bump_forum_thread();
