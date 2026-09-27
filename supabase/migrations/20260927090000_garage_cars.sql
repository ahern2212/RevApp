-- "My Garage": the cars a user owns, shown on their profile with a customizable render.
-- Photos go in the existing post-images bucket under the owner's folder.
-- Run once in the Supabase dashboard → SQL Editor.

create table public.cars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  nickname text not null default '' check (length(nickname) <= 40),
  year smallint check (year between 1900 and 2100),
  make text not null default '' check (length(make) <= 30),
  model text not null default '' check (length(model) <= 40),
  body_style text not null default 'coupe'
    check (body_style in ('coupe', 'sedan', 'hatch', 'suv', 'truck')),
  paint_color text not null default '#8458B3' check (paint_color ~ '^#[0-9a-fA-F]{6}$'),
  wheel_color text not null default '#c0c4cc' check (wheel_color ~ '^#[0-9a-fA-F]{6}$'),
  stance text not null default 'stock' check (stance in ('stock', 'lowered', 'lifted')),
  mods text not null default '' check (length(mods) <= 1000),
  photo_path text check (length(photo_path) <= 300),
  created_at timestamptz not null default now()
);

create index cars_owner_id_idx on public.cars (owner_id, created_at);

alter table public.cars enable row level security;

create policy "garages are readable by signed-in users"
  on public.cars for select to authenticated
  using (true);

create policy "users add their own cars"
  on public.cars for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (photo_path is null or split_part(photo_path, '/', 1) = (select auth.uid())::text)
  );

create policy "users edit their own cars"
  on public.cars for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and (photo_path is null or split_part(photo_path, '/', 1) = (select auth.uid())::text)
  );

create policy "users remove their own cars"
  on public.cars for delete to authenticated
  using (owner_id = (select auth.uid()));
