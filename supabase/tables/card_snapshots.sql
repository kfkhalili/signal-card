create table public.card_snapshots (
  id uuid not null default extensions.uuid_generate_v4 (),
  state_hash text not null,
  card_type text not null,
  symbol text not null,
  company_name text null,
  logo_url text null,
  card_data_snapshot jsonb not null,
  rarity_level text null,
  rarity_reason text null,
  first_seen_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint card_snapshots_pkey primary key (id),
  constraint card_snapshots_state_hash_key unique (state_hash)
) TABLESPACE pg_default;

create index IF not exists idx_card_snapshots_state_hash on public.card_snapshots using hash (state_hash) TABLESPACE pg_default;

create index IF not exists idx_card_snapshots_symbol_type on public.card_snapshots using btree (symbol, card_type) TABLESPACE pg_default;