create table public.snapshot_comments (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  snapshot_id uuid not null,
  parent_comment_id uuid null,
  comment_text text not null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint snapshot_comments_pkey primary key (id),
  constraint snapshot_comments_parent_comment_id_fkey foreign KEY (parent_comment_id) references snapshot_comments (id) on delete CASCADE,
  constraint snapshot_comments_snapshot_id_fkey foreign KEY (snapshot_id) references card_snapshots (id) on delete CASCADE,
  constraint snapshot_comments_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint snapshot_comments_comment_text_check check ((char_length(comment_text) > 0))
) TABLESPACE pg_default;

create index IF not exists idx_snapshot_comments_user_id on public.snapshot_comments using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_snapshot_comments_snapshot_id on public.snapshot_comments using btree (snapshot_id) TABLESPACE pg_default;

create index IF not exists idx_snapshot_comments_parent_comment_id on public.snapshot_comments using btree (parent_comment_id) TABLESPACE pg_default;