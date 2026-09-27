-- Saved posts (bookmarks). Private: users only ever see their own saves.
-- Run once in the Supabase dashboard → SQL Editor.

create table public.saved_posts (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index saved_posts_user_created_at_idx on public.saved_posts (user_id, created_at desc);
create index saved_posts_post_id_idx on public.saved_posts (post_id);

alter table public.saved_posts enable row level security;

create policy "users read their own saves"
  on public.saved_posts for select to authenticated
  using (user_id = (select auth.uid()));

create policy "users save as themselves"
  on public.saved_posts for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "users remove their own saves"
  on public.saved_posts for delete to authenticated
  using (user_id = (select auth.uid()));
