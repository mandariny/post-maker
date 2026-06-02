create extension if not exists pgcrypto;

create table if not exists public.trips (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    region text not null,
    start_date date not null,
    end_date date not null,
    created_at timestamptz not null default now()
);

create table if not exists public.photos (
    id uuid primary key default gen_random_uuid(),
    trip_id uuid not null references public.trips(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    storage_path text not null,
    original_file_name text not null,
    taken_at timestamptz,
    latitude double precision,
    longitude double precision,
    place_name text,
    created_at timestamptz not null default now()
);

create table if not exists public.place_groups (
    id uuid primary key default gen_random_uuid(),
    trip_id uuid not null references public.trips(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    latitude double precision,
    longitude double precision,
    visit_date date not null,
    photo_count integer not null default 0,
    selected boolean not null default true,
    user_memo text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.blog_drafts (
    id uuid primary key default gen_random_uuid(),
    trip_id uuid not null references public.trips(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    content_markdown text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_trips_user_id_created_at on public.trips(user_id, created_at desc);
create index if not exists idx_photos_trip_id on public.photos(trip_id);
create index if not exists idx_place_groups_trip_id_visit_date on public.place_groups(trip_id, visit_date, name);
create index if not exists idx_blog_drafts_trip_id_updated_at on public.blog_drafts(trip_id, updated_at desc);

alter table public.trips enable row level security;
alter table public.photos enable row level security;
alter table public.place_groups enable row level security;
alter table public.blog_drafts enable row level security;

drop policy if exists "trips_select_own" on public.trips;
drop policy if exists "trips_insert_own" on public.trips;
drop policy if exists "trips_update_own" on public.trips;
drop policy if exists "trips_delete_own" on public.trips;
create policy "trips_select_own" on public.trips for select to authenticated using (auth.uid() = user_id);
create policy "trips_insert_own" on public.trips for insert to authenticated with check (auth.uid() = user_id);
create policy "trips_update_own" on public.trips for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "trips_delete_own" on public.trips for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "photos_select_own" on public.photos;
drop policy if exists "photos_insert_own" on public.photos;
drop policy if exists "photos_update_own" on public.photos;
drop policy if exists "photos_delete_own" on public.photos;
create policy "photos_select_own" on public.photos for select to authenticated using (auth.uid() = user_id);
create policy "photos_insert_own" on public.photos for insert to authenticated with check (auth.uid() = user_id);
create policy "photos_update_own" on public.photos for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "photos_delete_own" on public.photos for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "place_groups_select_own" on public.place_groups;
drop policy if exists "place_groups_insert_own" on public.place_groups;
drop policy if exists "place_groups_update_own" on public.place_groups;
drop policy if exists "place_groups_delete_own" on public.place_groups;
create policy "place_groups_select_own" on public.place_groups for select to authenticated using (auth.uid() = user_id);
create policy "place_groups_insert_own" on public.place_groups for insert to authenticated with check (auth.uid() = user_id);
create policy "place_groups_update_own" on public.place_groups for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "place_groups_delete_own" on public.place_groups for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "blog_drafts_select_own" on public.blog_drafts;
drop policy if exists "blog_drafts_insert_own" on public.blog_drafts;
drop policy if exists "blog_drafts_update_own" on public.blog_drafts;
drop policy if exists "blog_drafts_delete_own" on public.blog_drafts;
create policy "blog_drafts_select_own" on public.blog_drafts for select to authenticated using (auth.uid() = user_id);
create policy "blog_drafts_insert_own" on public.blog_drafts for insert to authenticated with check (auth.uid() = user_id);
create policy "blog_drafts_update_own" on public.blog_drafts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "blog_drafts_delete_own" on public.blog_drafts for delete to authenticated using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('trip-photos', 'trip-photos', false)
on conflict (id) do nothing;

drop policy if exists "trip_photos_select_own" on storage.objects;
drop policy if exists "trip_photos_insert_own" on storage.objects;
drop policy if exists "trip_photos_update_own" on storage.objects;
drop policy if exists "trip_photos_delete_own" on storage.objects;
create policy "trip_photos_select_own" on storage.objects
for select to authenticated
using (bucket_id = 'trip-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "trip_photos_insert_own" on storage.objects
for insert to authenticated
with check (bucket_id = 'trip-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "trip_photos_update_own" on storage.objects
for update to authenticated
using (bucket_id = 'trip-photos' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'trip-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "trip_photos_delete_own" on storage.objects
for delete to authenticated
using (bucket_id = 'trip-photos' and auth.uid()::text = (storage.foldername(name))[1]);
