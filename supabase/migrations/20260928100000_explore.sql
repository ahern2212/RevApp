-- Explore: the most-liked posts of the last two weeks, and drivers you might want to follow
-- (people followed by the people you follow, then the most-followed). Both run with the
-- caller's own read access, so hidden posts and blocked people never show up.
-- Requires 20260928020000_follows.sql.
-- Run once in the Supabase dashboard → SQL Editor.

create function public.explore_posts()
returns setof public.posts
language sql
stable
set search_path = ''
as $$
  select p.*
  from public.posts p
  where p.created_at > now() - interval '14 days'
  order by (select count(*) from public.likes l where l.post_id = p.id) desc, p.created_at desc
  limit 30;
$$;

create function public.suggested_drivers(max_count integer default 10)
returns table (id uuid, username text, followers bigint, mutuals bigint)
language sql
stable
set search_path = ''
as $$
  with mine as (
    select f.followee_id from public.follows f where f.follower_id = (select auth.uid())
  )
  select
    p.id,
    p.username,
    (select count(*) from public.follows f where f.followee_id = p.id) as followers,
    (select count(*) from public.follows f
      where f.followee_id = p.id and f.follower_id in (select followee_id from mine)) as mutuals
  from public.profiles p
  where p.id <> (select auth.uid())
    and p.id not in (select followee_id from mine)
    and not public.is_blocked(p.id)
  order by mutuals desc, followers desc, p.created_at desc
  limit least(greatest(max_count, 1), 50);
$$;

revoke execute on function public.explore_posts() from public, anon;
revoke execute on function public.suggested_drivers(integer) from public, anon;
grant execute on function public.explore_posts() to authenticated;
grant execute on function public.suggested_drivers(integer) to authenticated;
