-- Featured cars on the sign-in screen: a slideshow behind the login form.
--   1. Your picks first: add rows to featured_cars in the dashboard (Table Editor or SQL), e.g.
--        insert into public.featured_cars (image_url, title, position)
--        values ('https://…/supra.jpg', '1998 Toyota Supra', 1);
--      Set active = false to take one down.
--   2. Then the community's most-liked photos of the last 60 days.
-- Visitors who aren't signed in only get the photo and the car name, never who posted it.
-- Requires 20260928010000_reports_and_blocks.sql (hidden posts are skipped).
-- Run once in the Supabase dashboard → SQL Editor.

create table public.featured_cars (
  id uuid primary key default gen_random_uuid(),
  image_url text not null check (image_url ~ '^https://' and length(image_url) <= 500),
  title text not null default '' check (length(title) <= 80),
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- No policies: rows are managed in the dashboard and read through featured_photos().
alter table public.featured_cars enable row level security;

create function public.featured_photos()
returns table (image_url text, image_path text, title text)
language sql
stable
security definer
set search_path = ''
as $$
  (
    select f.image_url, null::text, f.title
    from public.featured_cars f
    where f.active
    order by f.position, f.created_at desc
    limit 8
  )
  union all
  (
    select null::text, p.image_path, p.car
    from public.posts p
    where p.hidden_at is null
      and p.created_at > now() - interval '60 days'
      and exists (select 1 from public.likes l where l.post_id = p.id)
    order by (select count(*) from public.likes l where l.post_id = p.id) desc, p.created_at desc
    limit 8
  );
$$;

revoke execute on function public.featured_photos() from public;
grant execute on function public.featured_photos() to anon, authenticated;
