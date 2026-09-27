-- Upload safety and video posts.
--   • Photos: only JPEG/PNG/WebP, only flat in your own folder, only with a matching extension.
--   • Videos: new post-videos bucket (MP4/MOV, 50 MB) and posts.video_path.
--   • Every stored path must look like "<your user id>/<safe file name>.<allowed ext>".
--   • Rate limits so one account can't flood the feed, comments, forums or market.
-- The app checks the same rules first (lib/mediaRules.ts) so people get a friendly message.
-- Run once in the Supabase dashboard → SQL Editor.

-- ─── Photo buckets: image types only ───────────────────────────────────────
-- The app re-encodes every photo to JPEG, so HEIC is no longer accepted (most browsers
-- can't display it anyway).

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'], file_size_limit = 10485760
where id = 'post-images';

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'], file_size_limit = 5242880
where id = 'avatars';

drop policy if exists "users upload post images to their own folder" on storage.objects;
create policy "users upload post images to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and cardinality(storage.foldername(name)) = 1
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

drop policy if exists "users upload their own avatar" on storage.objects;
create policy "users upload their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and cardinality(storage.foldername(name)) = 1
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

-- ─── Video bucket ──────────────────────────────────────────────────────────
-- Public so the feed can stream by URL. 50 MB is also the Supabase free-plan upload cap.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-videos', 'post-videos', true, 52428800, array['video/mp4', 'video/quicktime'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "users upload post videos to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and cardinality(storage.foldername(name)) = 1
    and lower(storage.extension(name)) in ('mp4', 'mov')
  );

create policy "users delete their own post videos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ─── Posts: optional video ─────────────────────────────────────────────────
-- image_path stays required: for a video it's the poster frame, so grids, notifications
-- and link previews keep working unchanged.

alter table public.posts
  add column video_path text
    constraint posts_video_path_format check (
      video_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_.-]{1,120}\.(mp4|mov)$'
    );

-- NOT VALID skips existing rows, but Postgres re-checks a row whenever it is updated, so
-- .heic stays allowed for photos from older builds. New HEIC uploads are blocked above.
alter table public.posts add constraint posts_image_path_format check (
  image_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_.-]{1,120}\.(jpg|jpeg|png|webp|heic)$'
) not valid;

alter table public.cars add constraint cars_photo_path_format check (
  photo_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_.-]{1,120}\.(jpg|jpeg|png|webp|heic)$'
) not valid;

alter table public.listings add constraint listings_photo_path_format check (
  photo_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_.-]{1,120}\.(jpg|jpeg|png|webp|heic)$'
) not valid;

alter table public.profiles add constraint profiles_avatar_path_format check (
  avatar_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_.-]{1,120}\.(jpg|jpeg|png|webp|heic)$'
) not valid;

-- The photo and the video must both be in the author's own folder.
drop policy if exists "users create their own posts" on public.posts;
create policy "users create their own posts"
  on public.posts for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and split_part(image_path, '/', 1) = (select auth.uid())::text
    and (video_path is null or split_part(video_path, '/', 1) = (select auth.uid())::text)
  );

-- ─── Rate limits ───────────────────────────────────────────────────────────
-- enforce_rate_limit(owner column, max rows, window): refuses an insert once the owner
-- already has that many rows in the window. Friendly message shown as-is by the app.

create function public.enforce_rate_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  owner_column text := tg_argv[0];
  max_rows integer := tg_argv[1]::integer;
  per interval := tg_argv[2]::interval;
  recent integer;
begin
  execute format(
    'select count(*) from %I.%I where %I = $1 and created_at > now() - $2',
    tg_table_schema, tg_table_name, owner_column
  )
  into recent
  using (to_jsonb(new) ->> owner_column)::uuid, per;

  if recent >= max_rows then
    raise exception 'You''re doing that too often. Take a break and try again later.'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;
  return new;
end;
$$;

create trigger posts_rate_limit before insert on public.posts
  for each row execute function public.enforce_rate_limit('author_id', '20', '1 hour');
create trigger comments_rate_limit before insert on public.comments
  for each row execute function public.enforce_rate_limit('author_id', '30', '10 minutes');
create trigger listings_rate_limit before insert on public.listings
  for each row execute function public.enforce_rate_limit('seller_id', '10', '1 hour');
create trigger forum_threads_rate_limit before insert on public.forum_threads
  for each row execute function public.enforce_rate_limit('author_id', '10', '1 hour');
create trigger forum_replies_rate_limit before insert on public.forum_replies
  for each row execute function public.enforce_rate_limit('author_id', '30', '10 minutes');
create trigger events_rate_limit before insert on public.events
  for each row execute function public.enforce_rate_limit('host_id', '5', '1 hour');
create trigger cars_rate_limit before insert on public.cars
  for each row execute function public.enforce_rate_limit('owner_id', '10', '1 hour');
