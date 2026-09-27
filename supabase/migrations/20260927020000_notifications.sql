-- In-app notifications: a row is created for the post's author whenever someone else
-- likes or comments on their post. The app listens for new rows over Supabase Realtime.
-- Run once in the Supabase dashboard → SQL Editor.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  type text not null check (type in ('like', 'comment')),
  created_at timestamptz not null default now()
);

create index notifications_recipient_created_at_idx
  on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

-- Users only ever see their own notifications (this also scopes Realtime delivery).
create policy "users read their own notifications"
  on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));

-- No insert policy: rows are only created by the triggers below.

create function public.notify_post_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid;
  author uuid;
  comment uuid;
  kind text;
begin
  -- Separate branches: likes has no author_id/id columns and comments has no user_id,
  -- so each field may only be referenced on the table that has it.
  if tg_table_name = 'likes' then
    actor := new.user_id;
    kind := 'like';
  else
    actor := new.author_id;
    comment := new.id;
    kind := 'comment';
  end if;

  select p.author_id into author from public.posts p where p.id = new.post_id;

  if author is not null and author <> actor then
    insert into public.notifications (recipient_id, actor_id, post_id, comment_id, type)
    values (author, actor, new.post_id, comment, kind);
  end if;
  return new;
end;
$$;

create trigger likes_notify_post_author
  after insert on public.likes
  for each row execute function public.notify_post_author();

create trigger comments_notify_post_author
  after insert on public.comments
  for each row execute function public.notify_post_author();

-- Stream new rows to subscribed clients.
alter publication supabase_realtime add table public.notifications;
