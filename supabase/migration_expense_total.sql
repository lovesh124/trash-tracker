-- Run this once in the Supabase SQL editor, BEFORE deploying the code that
-- uses it (the app reads and writes this column, so it must exist first).
--
-- The full bill amount, including the payer's own share. expense_splits only
-- records what the *other* roommates owe, so the total can't be rebuilt from
-- them. Nullable: expenses entered before this existed (and custom-amount
-- expenses entered without a total) have none, and the app falls back to the
-- sum of what's owed.

alter table expenses
  add column if not exists total_cents integer check (total_cents is null or total_cents > 0);
