-- Tag one of your garage cars on a post. The feed shows the car name as a link to your
-- garage. Deleting the car just removes the tag.
-- Requires 20260928000000_media_safety.sql.
-- Run once in the Supabase dashboard → SQL Editor.

alter table public.posts add column car_id uuid references public.cars (id) on delete set null;

create index posts_car_id_idx on public.posts (car_id) where car_id is not null;

-- Same as the media-safety policy, plus: a tagged car must be your own.
drop policy if exists "users create their own posts" on public.posts;
create policy "users create their own posts"
  on public.posts for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and split_part(image_path, '/', 1) = (select auth.uid())::text
    and (video_path is null or split_part(video_path, '/', 1) = (select auth.uid())::text)
    and (
      car_id is null
      or exists (select 1 from public.cars c where c.id = car_id and c.owner_id = (select auth.uid()))
    )
  );
