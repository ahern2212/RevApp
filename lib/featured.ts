import { BUCKET } from '@/lib/posts';
import { supabase } from '@/lib/supabase';

export type FeaturedPhoto = { uri: string; title: string };

type FeaturedRow = { image_url: string | null; image_path: string | null; title: string };

const MAX_PHOTOS = 10;

/**
 * Photos for the sign-in slideshow: your picks from featured_cars, then the community's
 * most-liked recent photos. Works signed out. Empty before the migration or when offline,
 * so the sign-in screen just shows no slideshow.
 */
export async function fetchFeaturedPhotos(): Promise<FeaturedPhoto[]> {
  const { data, error } = await supabase.rpc('featured_photos');
  if (error || !data) return [];
  return (data as FeaturedRow[])
    .flatMap((row) => {
      const uri =
        row.image_url ??
        (row.image_path ? supabase.storage.from(BUCKET).getPublicUrl(row.image_path).data.publicUrl : null);
      return uri ? [{ uri, title: row.title }] : [];
    })
    .slice(0, MAX_PHOTOS);
}
