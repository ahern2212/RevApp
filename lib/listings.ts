import { readUpload, storagePath } from '@/lib/media';
import { BUCKET } from '@/lib/posts';
import { cleanSearchQuery } from '@/lib/search';
import { supabase } from '@/lib/supabase';

// Must match the check constraints in supabase/migrations/20260927160000_marketplace.sql.
export const LISTING_CATEGORIES = ['Cars', 'Parts', 'Wheels & Tires', 'Accessories'] as const;
export type ListingCategory = (typeof LISTING_CATEGORIES)[number];
export const CONDITIONS = ['New', 'Like new', 'Used', 'For parts'] as const;
export type Condition = (typeof CONDITIONS)[number];

export const CATEGORY_ICONS: Record<ListingCategory, 'car-sport-outline' | 'construct-outline' | 'disc-outline' | 'pricetag-outline'> = {
  Cars: 'car-sport-outline',
  Parts: 'construct-outline',
  'Wheels & Tires': 'disc-outline',
  Accessories: 'pricetag-outline',
};

export const LISTING_SORTS = ['new', 'priceLow', 'priceHigh'] as const;
export type ListingSort = (typeof LISTING_SORTS)[number];
export const LISTING_SORT_LABELS: Record<ListingSort, string> = {
  new: 'Newest',
  priceLow: 'Price ↑',
  priceHigh: 'Price ↓',
};

export { formatPrice, parsePrice, PRICE_MAX } from '@/lib/listingPrice';

export const TITLE_MAX = 80;
export const DESCRIPTION_MAX = 2000;
export const CONTACT_MAX = 200;
export const LOCATION_MAX = 80;
const LIMIT = 60;

const LISTING_SELECT =
  'id, seller_id, title, price, category, condition, location, description, contact, photo_path, status, created_at, seller:profiles!listings_seller_id_fkey(username)';

type ListingRow = {
  id: string;
  seller_id: string;
  title: string;
  price: number;
  category: ListingCategory;
  condition: Condition;
  location: string;
  description: string;
  contact: string;
  photo_path: string;
  status: 'active' | 'sold';
  created_at: string;
  seller: { username: string } | null;
};

export type Listing = {
  id: string;
  sellerId: string;
  sellerName: string;
  title: string;
  price: number;
  category: ListingCategory;
  condition: Condition;
  location: string;
  description: string;
  contact: string;
  photoPath: string;
  photoUri: string;
  sold: boolean;
  createdAt: number;
};

function toListing(row: ListingRow): Listing {
  return {
    id: row.id,
    sellerId: row.seller_id,
    sellerName: row.seller?.username ?? 'driver',
    title: row.title,
    price: row.price,
    category: row.category,
    condition: row.condition,
    location: row.location,
    description: row.description,
    contact: row.contact,
    photoPath: row.photo_path,
    photoUri: supabase.storage.from(BUCKET).getPublicUrl(row.photo_path).data.publicUrl,
    sold: row.status === 'sold',
    createdAt: Date.parse(row.created_at),
  };
}

export type ListingFilters = {
  category: ListingCategory | null;
  sort: ListingSort;
  search: string;
  /** Include sold items (they sort after available ones). */
  includeSold: boolean;
};

export async function fetchListings(filters: ListingFilters): Promise<Listing[]> {
  let query = supabase.from('listings').select(LISTING_SELECT).limit(LIMIT);
  if (filters.category) query = query.eq('category', filters.category);
  if (!filters.includeSold) query = query.eq('status', 'active');
  const q = cleanSearchQuery(filters.search);
  if (q.length >= 2) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  // 'active' < 'sold' alphabetically, so available items always come first.
  query = query.order('status', { ascending: true });
  query =
    filters.sort === 'priceLow'
      ? query.order('price', { ascending: true })
      : filters.sort === 'priceHigh'
        ? query.order('price', { ascending: false })
        : query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as ListingRow[]).map(toListing);
}

export async function fetchListing(id: string): Promise<Listing | null> {
  const { data, error } = await supabase.from('listings').select(LISTING_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? toListing(data as unknown as ListingRow) : null;
}

export type NewListing = {
  title: string;
  price: number;
  category: ListingCategory;
  condition: Condition;
  location: string;
  description: string;
  contact: string;
  photo: { uri: string };
};

export async function createListing(sellerId: string, input: NewListing): Promise<Listing> {
  const { body, contentType, ext } = await readUpload(input.photo.uri, 'image');
  // Flat in the seller's folder so account deletion's cleanup catches it.
  const path = storagePath(sellerId, 'listing', ext);
  const upload = await supabase.storage.from(BUCKET).upload(path, body, { contentType });
  if (upload.error) throw upload.error;

  const { data, error } = await supabase
    .from('listings')
    .insert({
      title: input.title.trim(),
      price: input.price,
      category: input.category,
      condition: input.condition,
      location: input.location.trim(),
      description: input.description.trim(),
      contact: input.contact.trim(),
      photo_path: path,
    })
    .select(LISTING_SELECT)
    .single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
  return toListing(data as unknown as ListingRow);
}

export async function setListingSold(id: string, sold: boolean): Promise<void> {
  const { data, error } = await supabase
    .from('listings')
    .update({ status: sold ? 'sold' : 'active' })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('Only the seller can change this listing.');
}

export async function deleteListing(listing: Listing): Promise<void> {
  const { data, error } = await supabase.from('listings').delete().eq('id', listing.id).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('Only the seller can delete this listing.');
  await supabase.storage.from(BUCKET).remove([listing.photoPath]);
}
