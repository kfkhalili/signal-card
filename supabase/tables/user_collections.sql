create table public.user_collections (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  snapshot_id uuid not null,
  captured_at timestamp with time zone not null default timezone ('utc'::text, now()),
  user_notes text null,
  constraint user_collections_pkey primary key (id),
  constraint user_collections_user_snapshot_unique unique (user_id, snapshot_id),
  constraint user_collections_snapshot_id_fkey foreign KEY (snapshot_id) references card_snapshots (id) on delete CASCADE,
  constraint user_collections_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_user_collections_user_id on public.user_collections using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_user_collections_snapshot_id on public.user_collections using btree (snapshot_id) TABLESPACE pg_default;