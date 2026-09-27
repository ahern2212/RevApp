-- Garage schema: profiles, posts, likes, and the post-images storage bucket.
-- Run once in the Supabase dashboard → SQL Editor (or `supabase db push` if you adopt the CLI).

-- ─── Profiles ──────────────────────────────────────────────────────────────
-- One row per auth user. Created automatically by a trigger on sign-up.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_.]{2,30}$'),
  created_at timestamptz not null default now()
);

-- Turns whatever the user typed into a valid, unused handle so sign-up never
-- fails on a bad or duplicate username ("Joe's Car" → "joescar", "joescar4821").
create function public.pick_username(raw text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  base text;
  candidate text;
begin
  base := left(regexp_replace(lower(coalesce(raw, '')), '[^a-z0-9_.]', '', 'g'), 24);
  if length(base) < 2 then
    base := 'driver';
  end if;
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    candidate := base || floor(random() * 10000)::int;
  end loop;
  return candidate;
end;
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    public.pick_username(
      coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for anyone who signed up before this script ran.
do $$
declare
  u record;
begin
  for u in
    select id, email, raw_user_meta_data from auth.users
    where id not in (select id from public.profiles)
  loop
    insert into public.profiles (id, username)
    values (
      u.id,
      public.pick_username(
        coalesce(u.raw_user_meta_data ->> 'username', split_part(u.email, '@', 1))
      )
    );
  end loop;
end;
$$;

-- ─── Posts ─────────────────────────────────────────────────────────────────

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  image_path text not null check (length(image_path) <= 300),
  car text not null default '' check (length(car) <= 80),
  caption text not null default '' check (length(caption) <= 2200),
  created_at timestamptz not null default now()
);

create index posts_created_at_idx on public.posts (created_at desc);
create index posts_author_id_idx on public.posts (author_id);

-- ─── Likes ─────────────────────────────────────────────────────────────────

create table public.likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index likes_user_id_idx on public.likes (user_id);

-- ─── Row Level Security ────────────────────────────────────────────────────
-- Signed-in users can read everything; they can only write rows as themselves.

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;

create policy "profiles are readable by signed-in users"
  on public.profiles for select to authenticated
  using (true);

create policy "posts are readable by signed-in users"
  on public.posts for select to authenticated
  using (true);

-- The image must live in the author's own storage folder ("<user id>/...").
create policy "users create their own posts"
  on public.posts for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and split_part(image_path, '/', 1) = (select auth.uid())::text
  );

create policy "likes are readable by signed-in users"
  on public.likes for select to authenticated
  using (true);

create policy "users like as themselves"
  on public.likes for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "users remove their own likes"
  on public.likes for delete to authenticated
  using (user_id = (select auth.uid()));

-- ─── Storage ───────────────────────────────────────────────────────────────
-- Public bucket so feed images load by URL; uploads are limited to the
-- uploader's own folder, 10 MB, images only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

create policy "users upload post images to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users delete their own post images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
