create table public.snapshot_likes (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  snapshot_id uuid not null,
  liked_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint snapshot_likes_pkey primary key (id),
  constraint snapshot_likes_user_snapshot_unique unique (user_id, snapshot_id),
  constraint snapshot_likes_snapshot_id_fkey foreign KEY (snapshot_id) references card_snapshots (id) on delete CASCADE,
  constraint snapshot_likes_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_snapshot_likes_user_id on public.snapshot_likes using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_snapshot_likes_snapshot_id on public.snapshot_likes using btree (snapshot_id) TABLESPACE pg_default;