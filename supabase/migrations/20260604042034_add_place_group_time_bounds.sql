alter table public.place_groups
add column if not exists visit_order integer not null default 0,
add column if not exists started_at timestamptz,
add column if not exists ended_at timestamptz;

create index if not exists idx_place_groups_trip_id_visit_order
on public.place_groups(trip_id, visit_order);
