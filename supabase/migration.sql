-- Run this once in the Supabase SQL editor for your project.

create table if not exists roommates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  order_index smallint not null unique
);

create table if not exists trash_logs (
  id uuid primary key default gen_random_uuid(),
  roommate_id uuid not null references roommates (id) on delete restrict,
  taken_at timestamptz not null default now(),
  photo_url text,
  created_at timestamptz not null default now()
);

create index if not exists trash_logs_taken_at_idx on trash_logs (taken_at desc);

insert into roommates (name, order_index) values
  ('Daksh', 0),
  ('Ash', 1),
  ('Arsh', 2),
  ('Laksh', 3),
  ('Lovesh', 4),
  ('Rakshit', 5),
  ('Adyhan', 6)
on conflict (name) do nothing;

alter table roommates enable row level security;
alter table trash_logs enable row level security;

-- Public read-only access; all writes to trash_logs go through the server API using the service role key.
create policy "roommates are publicly readable" on roommates
  for select using (true);

create policy "trash logs are publicly readable" on trash_logs
  for select using (true);

-- No insert/update/delete policies are defined for either table, so the anon key
-- can never write to them directly — only the service role key (server-side) can.

-- Storage bucket for optional proof photos, publicly readable, uploads only via server API.
insert into storage.buckets (id, name, public)
values ('trash-proof-photos', 'trash-proof-photos', true)
on conflict (id) do nothing;

create policy "trash proof photos are publicly readable" on storage.objects
  for select using (bucket_id = 'trash-proof-photos');
