-- Meet photos: tag a post with a car meet you're hosting or going to (from 2 days before it
-- starts until a day after), and the meet's page shows every post tagged with it.
-- Requires 20260928060000_photo_carousels.sql.
-- Run once in the Supabase dashboard → SQL Editor.

alter table public.posts add column event_id uuid references public.events (id) on delete set null;

create index posts_event_id_idx on public.posts (event_id, created_at desc) where event_id is not null;

-- Same as 20260928060000_photo_carousels.sql, plus the meet rule.
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
    and (
      event_id is null
      or exists (
        select 1 from public.events e
        where e.id = posts.event_id
          and e.starts_at between now() - interval '1 day' and now() + interval '2 days'
          and (
            e.host_id = (select auth.uid())
            or exists (
              select 1 from public.event_rsvps r
              where r.event_id = e.id and r.user_id = (select auth.uid())
            )
          )
      )
    )
  );
