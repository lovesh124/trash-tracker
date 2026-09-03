-- Run this once in the Supabase SQL editor, after migration.sql.
-- Money is stored as integer cents everywhere (no numeric/float amounts) to avoid
-- floating point rounding issues when values cross the JS <-> Postgres boundary.

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  payer_id uuid not null references roommates (id) on delete restrict,
  description text not null check (char_length(trim(description)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses (id) on delete cascade,
  roommate_id uuid not null references roommates (id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  unique (expense_id, roommate_id)
);

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  from_roommate_id uuid not null references roommates (id) on delete restrict, -- who paid (the ower)
  to_roommate_id uuid not null references roommates (id) on delete restrict,   -- who received (the creditor)
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now(),
  check (from_roommate_id <> to_roommate_id)
);

create index if not exists expenses_created_at_idx on expenses (created_at desc);
create index if not exists expense_splits_expense_id_idx on expense_splits (expense_id);
create index if not exists expense_splits_roommate_id_idx on expense_splits (roommate_id);
create index if not exists settlements_created_at_idx on settlements (created_at desc);
create index if not exists settlements_from_roommate_id_idx on settlements (from_roommate_id);
create index if not exists settlements_to_roommate_id_idx on settlements (to_roommate_id);

alter table expenses enable row level security;
alter table expense_splits enable row level security;
alter table settlements enable row level security;

-- Public read-only access; all writes go through the server API using the service role key.
create policy "expenses are publicly readable" on expenses
  for select using (true);

create policy "expense splits are publicly readable" on expense_splits
  for select using (true);

create policy "settlements are publicly readable" on settlements
  for select using (true);

-- No insert/update/delete policies are defined for any of these tables, so the anon key
-- can never write to them directly — only the service role key (server-side) can.
