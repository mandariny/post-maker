export type Trip = {
  id: string;
  user_id: string;
  title: string;
  region: string;
  start_date: string;
  end_date: string;
  created_at: string;
};

export type Photo = {
  id: string;
  trip_id: string;
  user_id: string;
  storage_path: string;
  original_file_name: string;
  taken_at: string | null;
  latitude: number | null;
  longitude: number | null;
  place_name: string | null;
  created_at: string;
};

export type PlaceGroup = {
  id: string;
  trip_id: string;
  user_id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  visit_date: string;
  visit_order: number;
  started_at: string | null;
  ended_at: string | null;
  photo_count: number;
  selected: boolean;
  user_memo: string;
};

export type PhotoPreview = {
  id: string;
  original_file_name: string;
  signed_url: string;
};

export type PlaceGroupWithPhotos = PlaceGroup & {
  photos: PhotoPreview[];
};

export type BlogDraft = {
  id: string;
  trip_id: string;
  user_id: string;
  title: string;
  content_markdown: string;
  created_at: string;
  updated_at: string;
};

export type TripForm = {
  title: string;
};
