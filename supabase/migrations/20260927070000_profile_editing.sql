-- Profile bio + picture, and self-service account deletion.
-- Run once in the Supabase dashboard → SQL Editor.

-- ─── Bio and picture ───────────────────────────────────────────────────────

alter table public.profiles
  add column bio text not null default '' check (length(bio) <= 160),
  add column avatar_path text check (length(avatar_path) <= 300);

create policy "users edit their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    -- The picture must live in the user's own avatars folder.
    and (avatar_path is null or split_part(avatar_path, '/', 1) = (select auth.uid())::text)
  );

-- Only the bio and picture are editable; the username and ids stay fixed.
revoke update on public.profiles from authenticated, anon;
grant update (bio, avatar_path) on public.profiles to authenticated;

-- Public bucket for profile pictures, limited to the owner's folder, 5 MB, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "users upload their own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users delete their own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ─── Delete account ────────────────────────────────────────────────────────
-- Deletes the signed-in user. Everything they own cascades from auth.users → profiles →
-- posts, likes, comments, saves, notifications, push tokens (and events/RSVPs).
-- The app removes their photos from storage first.

create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = (select auth.uid());
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
