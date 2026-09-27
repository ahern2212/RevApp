-- Lets users delete their own posts and edit their caption/car text.
-- Likes, comments, saves and notifications on a deleted post are removed automatically
-- (on delete cascade); the app also deletes the photo from storage.
-- Run once in the Supabase dashboard → SQL Editor.

create policy "users delete their own posts"
  on public.posts for delete to authenticated
  using (author_id = (select auth.uid()));

create policy "users edit their own posts"
  on public.posts for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

-- Only the text can change; the photo, author and timestamp stay fixed.
revoke update on public.posts from authenticated, anon;
grant update (caption, car) on public.posts to authenticated;
