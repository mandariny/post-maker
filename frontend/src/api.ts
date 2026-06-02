export type Trip = {
  id: number;
  title: string;
  region: string;
  startDate: string;
  endDate: string;
};

export type PlaceGroup = {
  id: number;
  name: string;
  latitude?: number;
  longitude?: number;
  visitDate: string;
  photoCount: number;
  selected: boolean;
  userMemo: string;
};

export type BlogDraft = {
  id: number;
  tripId: number;
  title: string;
  contentMarkdown: string;
};

const jsonHeaders = { 'Content-Type': 'application/json' };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: 'include', ...init });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  loginUrl: '/oauth2/authorization/google',
  me: () => request<{ email: string; name: string }>('/api/me'),
  listTrips: () => request<Trip[]>('/api/trips'),
  createTrip: (trip: Omit<Trip, 'id'>) =>
    request<Trip>('/api/trips', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(trip) }),
  uploadPhotos: (tripId: number, files: FileList) => {
    const body = new FormData();
    Array.from(files).forEach((file) => body.append('files', file));
    return request(`/api/trips/${tripId}/photos`, { method: 'POST', body });
  },
  listPlaces: (tripId: number) => request<PlaceGroup[]>(`/api/trips/${tripId}/places`),
  updatePlace: (tripId: number, place: PlaceGroup) =>
    request<PlaceGroup>(`/api/trips/${tripId}/places/${place.id}`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ selected: place.selected, userMemo: place.userMemo })
    }),
  generateDraft: (tripId: number) =>
    request<BlogDraft>(`/api/trips/${tripId}/drafts/generate`, { method: 'POST' }),
  updateDraft: (draft: BlogDraft) =>
    request<BlogDraft>(`/api/drafts/${draft.id}`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ title: draft.title, contentMarkdown: draft.contentMarkdown })
    })
};
