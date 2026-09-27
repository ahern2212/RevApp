-- Comments on posts. Run once in the Supabase dashboard → SQL Editor.

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index comments_post_id_created_at_idx on public.comments (post_id, created_at);
create index comments_author_id_idx on public.comments (author_id);

alter table public.comments enable row level security;

create policy "comments are readable by signed-in users"
  on public.comments for select to authenticated
  using (true);

create policy "users comment as themselves"
  on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()));

create policy "users delete their own comments"
  on public.comments for delete to authenticated
  using (author_id = (select auth.uid()));
