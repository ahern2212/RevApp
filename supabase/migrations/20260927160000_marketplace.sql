-- Marketplace listings (cars, parts, wheels, accessories). Photos go in the existing
-- post-images bucket under the seller's folder.
-- Run once in the Supabase dashboard → SQL Editor.

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (length(trim(title)) between 3 and 80),
  price integer not null check (price between 0 and 10000000),
  category text not null
    check (category in ('Cars', 'Parts', 'Wheels & Tires', 'Accessories')),
  condition text not null default 'Used'
    check (condition in ('New', 'Like new', 'Used', 'For parts')),
  location text not null default '' check (length(location) <= 80),
  description text not null default '' check (length(description) <= 2000),
  contact text not null default '' check (length(contact) <= 200),
  photo_path text not null check (length(photo_path) <= 300),
  status text not null default 'active' check (status in ('active', 'sold')),
  created_at timestamptz not null default now()
);

create index listings_status_created_idx on public.listings (status, created_at desc);
create index listings_category_idx on public.listings (category, created_at desc);
create index listings_price_idx on public.listings (price);
create index listings_seller_id_idx on public.listings (seller_id);

alter table public.listings enable row level security;

create policy "listings are readable by signed-in users"
  on public.listings for select to authenticated using (true);

create policy "users list items as themselves"
  on public.listings for insert to authenticated
  with check (
    seller_id = (select auth.uid())
    and split_part(photo_path, '/', 1) = (select auth.uid())::text
  );

create policy "sellers edit their own listings"
  on public.listings for update to authenticated
  using (seller_id = (select auth.uid()))
  with check (seller_id = (select auth.uid()));

create policy "sellers delete their own listings"
  on public.listings for delete to authenticated
  using (seller_id = (select auth.uid()));

-- Sellers can only change a listing's status (sold/active), not rewrite it after posting.
revoke update on public.listings from authenticated, anon;
grant update (status) on public.listings to authenticated;
