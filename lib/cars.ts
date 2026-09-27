import type { BodyStyle, Stance } from '@/lib/carShapes';
import { BUCKET } from '@/lib/posts';
import { supabase } from '@/lib/supabase';

export const NICKNAME_MAX = 40;
export const MODS_MAX = 1000;

const CAR_SELECT =
  'id, owner_id, nickname, year, make, model, body_style, paint_color, wheel_color, stance, mods, photo_path, created_at';

type CarRow = {
  id: string;
  owner_id: string;
  nickname: string;
  year: number | null;
  make: string;
  model: string;
  body_style: BodyStyle;
  paint_color: string;
  wheel_color: string;
  stance: Stance;
  mods: string;
  photo_path: string | null;
  created_at: string;
};

export type Car = {
  id: string;
  ownerId: string;
  nickname: string;
  year: string;
  make: string;
  model: string;
  bodyStyle: BodyStyle;
  paint: string;
  wheels: string;
  stance: Stance;
  mods: string;
  photoPath: string | null;
  photoUri: string | null;
};

export type CarInput = Omit<Car, 'id' | 'ownerId' | 'photoPath' | 'photoUri'>;

function toCar(row: CarRow): Car {
  return {
    id: row.id,
    ownerId: row.owner_id,
    nickname: row.nickname,
    year: row.year ? String(row.year) : '',
    make: row.make,
    model: row.model,
    bodyStyle: row.body_style,
    paint: row.paint_color,
    wheels: row.wheel_color,
    stance: row.stance,
    mods: row.mods,
    photoPath: row.photo_path,
    photoUri: row.photo_path
      ? supabase.storage.from(BUCKET).getPublicUrl(row.photo_path).data.publicUrl
      : null,
  };
}

/** "2018 Honda Civic Type R" (or the nickname if nothing else is filled in). */
export function carTitle(car: Pick<Car, 'year' | 'make' | 'model' | 'nickname'>): string {
  return [car.year, car.make, car.model].filter(Boolean).join(' ') || car.nickname || 'My car';
}

export async function fetchCars(ownerId: string): Promise<Car[]> {
  const { data, error } = await supabase
    .from('cars')
    .select(CAR_SELECT)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as CarRow[]).map(toCar);
}

/** Every car owned by any of these users (e.g. everyone going to a meet). */
export async function fetchCarsForOwners(ownerIds: string[]): Promise<Car[]> {
  if (ownerIds.length === 0) return [];
  const { data, error } = await supabase
    .from('cars')
    .select(CAR_SELECT)
    .in('owner_id', ownerIds)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as CarRow[]).map(toCar);
}

export async function fetchCar(carId: string): Promise<Car | null> {
  const { data, error } = await supabase.from('cars').select(CAR_SELECT).eq('id', carId).maybeSingle();
  if (error) throw error;
  return data ? toCar(data as CarRow) : null;
}

type PhotoChange = { uri: string; mimeType?: string } | 'remove' | undefined;

async function uploadPhoto(ownerId: string, photo: { uri: string; mimeType?: string }) {
  const contentType = photo.mimeType ?? 'image/jpeg';
  const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  // Flat in the owner's folder so account deletion's folder cleanup catches it.
  const path = `${ownerId}/car-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const body = await (await fetch(photo.uri)).arrayBuffer();
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType });
  if (error) throw error;
  return path;
}

function toRow(input: CarInput) {
  const year = Number(input.year);
  return {
    nickname: input.nickname.trim(),
    year: Number.isInteger(year) && year >= 1900 ? year : null,
    make: input.make.trim(),
    model: input.model.trim(),
    body_style: input.bodyStyle,
    paint_color: input.paint,
    wheel_color: input.wheels,
    stance: input.stance,
    mods: input.mods.trim(),
  };
}

/** Creates or updates a car (pass `existing` to update). Handles the photo upload/removal. */
export async function saveCar(
  ownerId: string,
  input: CarInput,
  photo: PhotoChange,
  existing?: Car
): Promise<Car> {
  let photoPath = existing?.photoPath ?? null;
  const uploaded = photo && photo !== 'remove' ? await uploadPhoto(ownerId, photo) : null;
  if (uploaded) photoPath = uploaded;
  if (photo === 'remove') photoPath = null;

  const row = { ...toRow(input), photo_path: photoPath };
  const { data, error } = existing
    ? await supabase.from('cars').update(row).eq('id', existing.id).select(CAR_SELECT).maybeSingle()
    : await supabase.from('cars').insert(row).select(CAR_SELECT).single();
  if (error || !data) {
    if (uploaded) await supabase.storage.from(BUCKET).remove([uploaded]);
    throw error ?? new Error('The database did not allow this change.');
  }
  // Best effort: drop the replaced photo.
  if (existing?.photoPath && existing.photoPath !== photoPath) {
    await supabase.storage.from(BUCKET).remove([existing.photoPath]);
  }
  return toCar(data as CarRow);
}

export async function deleteCar(car: Car): Promise<void> {
  const { data, error } = await supabase.from('cars').delete().eq('id', car.id).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('Only the owner can delete this car.');
  if (car.photoPath) await supabase.storage.from(BUCKET).remove([car.photoPath]);
}
