-- Run this once in the Supabase SQL editor, after previous migrations.
-- Same shape as trash_logs, for the "sweep kitchen + living room" chore —
-- kept as its own table (rather than folded into trash_logs) so the two
-- chores rotate and log independently.

create table if not exists sweep_logs (
  id uuid primary key default gen_random_uuid(),
  roommate_id uuid not null references roommates (id) on delete restrict,
  taken_at timestamptz not null default now(),
  photo_url text,
  created_at timestamptz not null default now()
);

create index if not exists sweep_logs_taken_at_idx on sweep_logs (taken_at desc);

alter table sweep_logs enable row level security;

-- Public read-only access; all writes go through the server API using the service role key.
create policy "sweep logs are publicly readable" on sweep_logs
  for select using (true);

-- No insert/update/delete policies are defined, so the anon key can never
-- write to this table directly — only the service role key (server-side) can.

-- Storage bucket for optional proof photos, same pattern as trash-proof-photos.
insert into storage.buckets (id, name, public)
values ('sweep-proof-photos', 'sweep-proof-photos', true)
on conflict (id) do nothing;

create policy "sweep proof photos are publicly readable" on storage.objects
  for select using (bucket_id = 'sweep-proof-photos');
