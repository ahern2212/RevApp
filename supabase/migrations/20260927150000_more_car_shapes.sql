-- More garage render shapes (911-style, muscle, roadster, JDM, supercar, off-roader).
-- Must match BODY_STYLES in lib/carShapes.ts.
-- Run once in the Supabase dashboard → SQL Editor.

alter table public.cars drop constraint if exists cars_body_style_check;
alter table public.cars add constraint cars_body_style_check check (
  body_style in (
    'coupe', 'sedan', 'hatch', 'suv', 'truck',
    'sports', 'muscle', 'roadster', 'jdm', 'supercar', 'offroad'
  )
);
