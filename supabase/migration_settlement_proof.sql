-- Run this once in the Supabase SQL editor, after migration_expenses.sql.

alter table settlements add column if not exists proof_url text;

-- Storage bucket for optional payment proof screenshots, publicly readable,
-- uploads only via the server API (same pattern as trash-proof-photos).
insert into storage.buckets (id, name, public)
values ('payment-proof-photos', 'payment-proof-photos', true)
on conflict (id) do nothing;

create policy "payment proof photos are publicly readable" on storage.objects
  for select using (bucket_id = 'payment-proof-photos');
