-- Lets users change their username. The existing unique constraint and
-- check (lowercase letters, numbers, . and _, 2–30 chars) still apply.
-- Run once in the Supabase dashboard → SQL Editor.

grant update (username) on public.profiles to authenticated;
