-- Carousel posts: up to 10 photos in one post (image_path is the first/cover photo, the rest
-- are in extra_image_paths, in order). Videos stay single.
-- Requires 20260928050000_post_car_tags.sql.
-- Run once in the Supabase dashboard → SQL Editor.

-- True when every path is "<user id>/<safe name>.<photo ext>" (same rule as image_path).
create function public.are_photo_paths(paths text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(
    p ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_.-]{1,120}\.(jpg|jpeg|png|webp)$'
  ), true)
  from unnest(paths) as p;
$$;

alter table public.posts
  add column extra_image_paths text[] not null default '{}'
    constraint posts_extra_image_paths_check check (
      cardinality(extra_image_paths) <= 9 and public.are_photo_paths(extra_image_paths)
    );

-- A carousel can't also be a video.
alter table public.posts add constraint posts_carousel_or_video check (
  video_path is null or cardinality(extra_image_paths) = 0
);

-- Same as 20260928050000_post_car_tags.sql, plus: every carousel photo is in your folder.
drop policy if exists "users create their own posts" on public.posts;
create policy "users create their own posts"
  on public.posts for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and split_part(image_path, '/', 1) = (select auth.uid())::text
    and (video_path is null or split_part(video_path, '/', 1) = (select auth.uid())::text)
    and not exists (
      select 1 from unnest(extra_image_paths) as p
      where split_part(p, '/', 1) <> (select auth.uid())::text
    )
    and (
      car_id is null
      or exists (select 1 from public.cars c where c.id = car_id and c.owner_id = (select auth.uid()))
    )
  );
