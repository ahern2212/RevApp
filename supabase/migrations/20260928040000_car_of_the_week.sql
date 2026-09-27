-- "Car of the week": the most-liked post from the last 7 days, shown at the top of the feed.
-- Security invoker, so hidden posts and blocked authors never win for you.
-- Run once in the Supabase dashboard → SQL Editor.

create function public.car_of_the_week()
returns setof public.posts
language sql
stable
set search_path = ''
as $$
  select p.*
  from public.posts p
  where p.created_at > now() - interval '7 days'
    and exists (select 1 from public.likes l where l.post_id = p.id)
  order by (select count(*) from public.likes l where l.post_id = p.id) desc, p.created_at desc
  limit 1;
$$;

revoke execute on function public.car_of_the_week() from public, anon;
grant execute on function public.car_of_the_week() to authenticated;
