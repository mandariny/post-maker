create table if not exists users (
    id bigserial primary key,
    email varchar(255) not null unique,
    name varchar(255) not null,
    provider varchar(255) not null
);

create table if not exists trip (
    id bigserial primary key,
    user_id bigint not null references users(id),
    title varchar(255) not null,
    region varchar(255) not null,
    start_date date not null,
    end_date date not null,
    created_at timestamptz not null
);

create table if not exists photo (
    id bigserial primary key,
    trip_id bigint not null references trip(id),
    file_path varchar(255) not null,
    original_file_name varchar(255) not null,
    taken_at timestamptz,
    latitude double precision,
    longitude double precision,
    place_name varchar(255),
    created_at timestamptz not null
);

create table if not exists place_group (
    id bigserial primary key,
    trip_id bigint not null references trip(id),
    name varchar(255) not null,
    latitude double precision,
    longitude double precision,
    visit_date date not null,
    photo_count integer not null,
    selected boolean not null,
    user_memo varchar(2000)
);

create table if not exists blog_draft (
    id bigserial primary key,
    trip_id bigint not null references trip(id),
    title varchar(255) not null,
    content_markdown varchar(20000) not null,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create index if not exists idx_trip_user_id on trip(user_id);
create index if not exists idx_photo_trip_id on photo(trip_id);
create index if not exists idx_place_group_trip_id on place_group(trip_id);
create index if not exists idx_blog_draft_trip_id_updated_at on blog_draft(trip_id, updated_at desc);
