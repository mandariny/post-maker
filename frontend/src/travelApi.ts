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

type GroupKey = string;

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

  async uploadPhotos(trip: Trip, files: FileList): Promise<void> {
    const user = await requireUser();

    for (const file of Array.from(files)) {
      const exif = await extractExif(file);
      const placeName =
        exif.latitude !== null && exif.longitude !== null
          ? await guessPlaceName(exif.latitude, exif.longitude)
          : '위치 정보 없음';
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
        place_name: placeName
      });
      if (error) throw error;
    }

    await travelApi.rebuildPlaceGroups(trip);
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
    (photos ?? []).forEach((photo) => {
      const visitDate = toVisitDate(photo.taken_at, trip.start_date);
      const name = photo.place_name || '위치 정보 없음';
      const key = groupKey(visitDate, name);
      groups.set(key, [...(groups.get(key) ?? []), photo]);
    });

    const remove = await supabase.from('place_groups').delete().eq('trip_id', trip.id);
    if (remove.error) throw remove.error;
    if (groups.size === 0) return;

    const rows = Array.from(groups.entries()).map(([key, groupPhotos]) => {
      const [visitDate, name] = key.split('|');
      const firstWithGps = groupPhotos.find((photo) => photo.latitude !== null && photo.longitude !== null);
      const old = previous.get(key);
      return {
        trip_id: trip.id,
        user_id: trip.user_id,
        name,
        visit_date: visitDate,
        latitude: firstWithGps?.latitude ?? null,
        longitude: firstWithGps?.longitude ?? null,
        photo_count: groupPhotos.length,
        selected: old?.selected ?? true,
        user_memo: old?.user_memo ?? ''
      };
    });

    const insert = await supabase.from('place_groups').insert(rows);
    if (insert.error) throw insert.error;
  },

  async listPlaces(tripId: string): Promise<PlaceGroupWithPhotos[]> {
    const { data: places, error } = await supabase
      .from('place_groups')
      .select('*')
      .eq('trip_id', tripId)
      .order('visit_date', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw error;

    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('*')
      .eq('trip_id', tripId);
    if (photosError) throw photosError;

    const previewMap = await buildPhotoPreviewMap(photos ?? [], places ?? []);
    return (places ?? []).map((place) => ({
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

  async generateDraft(trip: Trip, places: PlaceGroup[]): Promise<BlogDraft> {
    const user = await requireUser();
    const selectedPlaces = places.filter((place) => place.selected);
    const { data, error } = await supabase.functions.invoke('generate-blog-draft', {
      body: { trip, places: selectedPlaces }
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

async function guessPlaceName(latitude: number, longitude: number): Promise<string> {
  const { data, error } = await supabase.functions.invoke('guess-place', {
    body: { latitude, longitude }
  });
  if (error) return formatFallback(latitude, longitude);
  return data?.placeName ?? formatFallback(latitude, longitude);
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

function formatFallback(latitude: number, longitude: number) {
  return `위치 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

async function buildPhotoPreviewMap(photos: Photo[], places: PlaceGroup[]) {
  const result = new Map<string, PhotoPreview[]>();

  for (const photo of photos) {
    const visitDate = toVisitDate(photo.taken_at, new Date(photo.created_at).toISOString().slice(0, 10));
    const name = photo.place_name || '위치 정보 없음';
    const place =
      places.find((candidate) => candidate.visit_date === visitDate && candidate.name === name) ??
      places.find((candidate) => candidate.name === name);
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
