-- Run this once in the Supabase SQL editor, BEFORE deploying the undo feature.
--
-- One row per wrong undo-code attempt. A 4-digit code is only 10,000
-- possibilities, so /api/undo refuses all attempts for a while after a few
-- wrong ones (see lib/undo-pin.ts). This has to live in the database: Vercel
-- functions don't share memory between requests.

create table if not exists undo_pin_failures (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now()
);

create index if not exists undo_pin_failures_created_at_idx on undo_pin_failures (created_at desc);

alter table undo_pin_failures enable row level security;

-- No policies: only the server (service role key, which bypasses RLS) reads
-- or writes this table.
