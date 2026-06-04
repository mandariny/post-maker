import exifr from 'exifr';
import { supabase } from './supabaseClient';
import { BlogDraft, Photo, PhotoPreview, PlaceGroup, PlaceGroupWithPhotos, Trip, TripForm } from './types';

type UserProfile = {
  id: string;
  email: string;
  name: string;
};

type ExifResult = {
  takenAt: string | null;
  latitude: number | null;
  longitude: number | null;
};

type UploadResult = {
  placeWarnings: string[];
};

type GuessPlaceResponse = {
  placeName?: string;
  diagnostic?: {
    source?: string;
    reason?: string;
    categoryAttempts?: Array<{
      category: string;
      ok: boolean;
      status?: number;
      count?: number;
      error?: string;
    }>;
  };
};

type GroupKey = string;

type DraftPlace = PlaceGroup & {
  first_taken_at: string | null;
  photos: Array<{
    original_file_name: string;
    taken_at: string | null;
  }>;
};

const NEEDS_PLACE_REVIEW = '장소명 확인 필요';
const NO_LOCATION = '위치 정보 없음';

export const travelApi = {
  async signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async currentUser(): Promise<UserProfile | null> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return {
      id: data.user.id,
      email: data.user.email ?? '',
      name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? data.user.email ?? '사용자'
    };
  },

  onAuthChange(callback: (user: UserProfile | null) => void) {
    return supabase.auth.onAuthStateChange(async () => {
      callback(await travelApi.currentUser());
    });
  },

  async listTrips(): Promise<Trip[]> {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async createTrip(form: TripForm): Promise<Trip> {
    const user = await requireUser();
    const { data, error } = await supabase
      .from('trips')
      .insert({ ...form, user_id: user.id })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async deleteTrip(tripId: string): Promise<void> {
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('storage_path')
      .eq('trip_id', tripId);
    if (photosError) throw photosError;

    const storagePaths = (photos ?? []).map((photo) => photo.storage_path).filter(Boolean);
    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage.from('trip-photos').remove(storagePaths);
      if (storageError) throw storageError;
    }

    const { error } = await supabase.from('trips').delete().eq('id', tripId);
    if (error) throw error;
  },

  async uploadPhotos(trip: Trip, files: FileList): Promise<UploadResult> {
    const user = await requireUser();
    const placeWarnings: string[] = [];
    const prepared = await Promise.all(
      Array.from(files).map(async (file, uploadIndex) => ({
        file,
        uploadIndex,
        exif: await extractExif(file)
      }))
    );

    const ordered = prepared.sort((a, b) => comparePhotoTime(a.exif.takenAt, b.exif.takenAt, a.uploadIndex, b.uploadIndex));

    for (const item of ordered) {
      const { file, exif } = item;
      const placeResult =
        exif.latitude !== null && exif.longitude !== null
          ? await guessPlaceName(exif.latitude, exif.longitude)
          : { placeName: NO_LOCATION, warning: `${file.name}: EXIF GPS 정보가 없습니다.` };

      if (placeResult.warning) {
        placeWarnings.push(placeResult.warning);
      }

      const storagePath = `${user.id}/${trip.id}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;

      const upload = await supabase.storage.from('trip-photos').upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false
      });
      if (upload.error) throw upload.error;

      const { error } = await supabase.from('photos').insert({
        trip_id: trip.id,
        user_id: user.id,
        storage_path: storagePath,
        original_file_name: file.name,
        taken_at: exif.takenAt,
        latitude: exif.latitude,
        longitude: exif.longitude,
        place_name: placeResult.placeName
      });
      if (error) throw error;
    }

    await travelApi.rebuildPlaceGroups(trip);
    return { placeWarnings };
  },

  async rebuildPlaceGroups(trip: Trip): Promise<void> {
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('*')
      .eq('trip_id', trip.id);
    if (photosError) throw photosError;

    const { data: existing, error: existingError } = await supabase
      .from('place_groups')
      .select('*')
      .eq('trip_id', trip.id);
    if (existingError) throw existingError;

    const previous = new Map<GroupKey, PlaceGroup>();
    (existing ?? []).forEach((group) => previous.set(groupKey(group.visit_date, group.name), group));

    const groups = new Map<GroupKey, Photo[]>();
    sortPhotosByTakenTime(photos ?? []).forEach((photo) => {
      const visitDate = toVisitDate(photo.taken_at, trip.start_date);
      const name = normalizePlaceName(photo.place_name);
      const key = groupKey(visitDate, name);
      groups.set(key, [...(groups.get(key) ?? []), photo]);
    });

    const remove = await supabase.from('place_groups').delete().eq('trip_id', trip.id);
    if (remove.error) throw remove.error;
    if (groups.size === 0) return;

    const rows = Array.from(groups.entries())
      .map(([key, groupPhotos]) => {
        const [visitDate, name] = key.split('|');
        const sortedGroupPhotos = sortPhotosByTakenTime(groupPhotos);
        const firstWithGps = sortedGroupPhotos.find((photo) => photo.latitude !== null && photo.longitude !== null);
        const old = previous.get(key);
        return {
          trip_id: trip.id,
          user_id: trip.user_id,
          name,
          visit_date: visitDate,
          latitude: firstWithGps?.latitude ?? null,
          longitude: firstWithGps?.longitude ?? null,
          photo_count: sortedGroupPhotos.length,
          selected: old?.selected ?? true,
          user_memo: old?.user_memo ?? '',
          firstTakenAt: firstPhotoTime(sortedGroupPhotos)
        };
      })
      .sort((a, b) => compareNullableDate(a.firstTakenAt, b.firstTakenAt) || a.name.localeCompare(b.name, 'ko'))
      .map(({ firstTakenAt: _firstTakenAt, ...row }) => row);

    const insert = await supabase.from('place_groups').insert(rows);
    if (insert.error) throw insert.error;
  },

  async listPlaces(tripId: string): Promise<PlaceGroupWithPhotos[]> {
    const { data: places, error } = await supabase
      .from('place_groups')
      .select('*')
      .eq('trip_id', tripId);
    if (error) throw error;

    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('*')
      .eq('trip_id', tripId);
    if (photosError) throw photosError;

    const sortedPhotos = sortPhotosByTakenTime(photos ?? []);
    const previewMap = await buildPhotoPreviewMap(sortedPhotos, places ?? []);
    return sortPlacesByPhotoTime(places ?? [], sortedPhotos).map((place) => ({
      ...place,
      photos: previewMap.get(place.id) ?? []
    }));
  },

  async updatePlace(place: PlaceGroup): Promise<PlaceGroup> {
    const { data, error } = await supabase
      .from('place_groups')
      .update({ selected: place.selected, user_memo: place.user_memo })
      .eq('id', place.id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async latestDraft(tripId: string): Promise<BlogDraft | null> {
    const { data, error } = await supabase
      .from('blog_drafts')
      .select('*')
      .eq('trip_id', tripId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async generateDraft(trip: Trip, places: PlaceGroupWithPhotos[]): Promise<BlogDraft> {
    const user = await requireUser();
    const selectedPlaces = places.filter((place) => place.selected);
    const draftPlaces = await buildDraftPlaces(trip.id, selectedPlaces);
    const { data, error } = await supabase.functions.invoke('generate-blog-draft', {
      body: { trip, places: draftPlaces }
    });
    if (error) throw error;

    const { data: draft, error: insertError } = await supabase
      .from('blog_drafts')
      .insert({
        trip_id: trip.id,
        user_id: user.id,
        title: data.title,
        content_markdown: data.contentMarkdown
      })
      .select('*')
      .single();
    if (insertError) throw insertError;
    return draft;
  },

  async updateDraft(draft: BlogDraft): Promise<BlogDraft> {
    const { data, error } = await supabase
      .from('blog_drafts')
      .update({
        title: draft.title,
        content_markdown: draft.content_markdown,
        updated_at: new Date().toISOString()
      })
      .eq('id', draft.id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }
};

async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('로그인이 필요합니다.');
  return data.user;
}

async function extractExif(file: File): Promise<ExifResult> {
  try {
    const tags = await exifr.parse(file, { gps: true, exif: true, tiff: true });
    const date = tags?.DateTimeOriginal ?? tags?.CreateDate ?? tags?.ModifyDate;
    return {
      takenAt: date instanceof Date ? date.toISOString() : null,
      latitude: typeof tags?.latitude === 'number' ? tags.latitude : null,
      longitude: typeof tags?.longitude === 'number' ? tags.longitude : null
    };
  } catch {
    return { takenAt: null, latitude: null, longitude: null };
  }
}

async function guessPlaceName(latitude: number, longitude: number): Promise<{ placeName: string; warning?: string }> {
  const { data, error } = await supabase.functions.invoke<GuessPlaceResponse>('guess-place', {
    body: { latitude, longitude }
  });

  if (error) {
    const warning = `Kakao 장소명 요청 실패: ${error.message}`;
    console.warn(warning);
    return { placeName: NEEDS_PLACE_REVIEW, warning };
  }

  const placeName = normalizePlaceName(data?.placeName);
  const reason = data?.diagnostic?.reason;
  if (placeName === NEEDS_PLACE_REVIEW || reason) {
    const warning = `Kakao 장소명 확인 필요: ${reason ?? 'no_exact_place'} (${latitude}, ${longitude})`;
    console.warn(warning, data?.diagnostic);
    return { placeName, warning };
  }

  return { placeName };
}

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, '_');
}

function toVisitDate(takenAt: string | null, fallback: string) {
  return takenAt ? new Date(takenAt).toISOString().slice(0, 10) : fallback;
}

function groupKey(visitDate: string, name: string) {
  return `${visitDate}|${name}`;
}

function normalizePlaceName(name: string | null | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) return NEEDS_PLACE_REVIEW;
  if (/위치\s*-?\d|\d+\.\d+/.test(trimmed)) return NEEDS_PLACE_REVIEW;
  return trimmed;
}

function comparePhotoTime(aTakenAt: string | null, bTakenAt: string | null, aIndex = 0, bIndex = 0) {
  const timeCompare = compareNullableDate(aTakenAt, bTakenAt);
  return timeCompare || aIndex - bIndex;
}

function compareNullableDate(a: string | null, b: string | null) {
  const aTime = a ? Date.parse(a) : Number.POSITIVE_INFINITY;
  const bTime = b ? Date.parse(b) : Number.POSITIVE_INFINITY;
  return aTime - bTime;
}

function sortPhotosByTakenTime(photos: Photo[]) {
  return [...photos].sort((a, b) => compareNullableDate(a.taken_at, b.taken_at) || a.created_at.localeCompare(b.created_at));
}

function firstPhotoTime(photos: Photo[]) {
  return sortPhotosByTakenTime(photos)[0]?.taken_at ?? null;
}

function sortPlacesByPhotoTime(places: PlaceGroup[], photos: Photo[]) {
  return [...places].sort((a, b) => {
    const aTime = firstPhotoTime(photosForPlace(a, photos));
    const bTime = firstPhotoTime(photosForPlace(b, photos));
    return compareNullableDate(aTime, bTime) || a.visit_date.localeCompare(b.visit_date) || a.name.localeCompare(b.name, 'ko');
  });
}

async function buildDraftPlaces(tripId: string, places: PlaceGroupWithPhotos[]): Promise<DraftPlace[]> {
  const { data: photos, error } = await supabase
    .from('photos')
    .select('*')
    .eq('trip_id', tripId);
  if (error) throw error;

  const sortedPhotos = sortPhotosByTakenTime(photos ?? []);
  return sortPlacesByPhotoTime(places, sortedPhotos).map((place) => {
    const placePhotos = photosForPlace(place, sortedPhotos);
    return {
      ...place,
      name: normalizePlaceName(place.name),
      first_taken_at: firstPhotoTime(placePhotos),
      photos: placePhotos.map((photo) => ({
        original_file_name: photo.original_file_name,
        taken_at: photo.taken_at
      }))
    };
  });
}

function photosForPlace(place: PlaceGroup, photos: Photo[]) {
  return photos.filter((photo) => {
    const visitDate = toVisitDate(photo.taken_at, place.visit_date);
    return visitDate === place.visit_date && normalizePlaceName(photo.place_name) === normalizePlaceName(place.name);
  });
}

async function buildPhotoPreviewMap(photos: Photo[], places: PlaceGroup[]) {
  const result = new Map<string, PhotoPreview[]>();

  for (const photo of photos) {
    const visitDate = toVisitDate(photo.taken_at, new Date(photo.created_at).toISOString().slice(0, 10));
    const name = normalizePlaceName(photo.place_name);
    const place =
      places.find((candidate) => candidate.visit_date === visitDate && normalizePlaceName(candidate.name) === name) ??
      places.find((candidate) => normalizePlaceName(candidate.name) === name);
    if (!place) continue;

    const { data } = await supabase.storage.from('trip-photos').createSignedUrl(photo.storage_path, 60 * 30);
    if (!data?.signedUrl) continue;

    const preview = {
      id: photo.id,
      original_file_name: photo.original_file_name,
      signed_url: data.signedUrl
    };
    result.set(place.id, [...(result.get(place.id) ?? []), preview]);
  }

  return result;
}
