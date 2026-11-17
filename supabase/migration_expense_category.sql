-- Run this once in the Supabase SQL editor, BEFORE deploying the code that
-- uses it (the app reads and writes this column, so it must exist first).
--
-- Which bucket an expense belongs to, for per-category tracking. Existing
-- expenses become 'other' via the default. The allowed values must match
-- lib/categories.ts; to add a category, add it there and to this check.

alter table expenses
  add column if not exists category text not null default 'other'
  check (category in ('electricity', 'walmart', 'other'));

create index if not exists expenses_category_created_at_idx on expenses (category, created_at desc);
