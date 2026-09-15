-- Run this once in the Supabase SQL editor, after previous migrations.
-- Tracks the last time a turn-reminder email went out for a given chore, so
-- the periodic cron reminder (see /api/cron/sweep-reminder) can space nudges
-- out by a real elapsed-time gap instead of relying on a fixed calendar cron
-- schedule, which can't express "every N days" precisely across month
-- boundaries (e.g. "*/5" on day-of-month drifts at the end of the month).

create table if not exists chore_reminders (
  chore text primary key,
  last_sent_at timestamptz not null default now()
);

alter table chore_reminders enable row level security;

-- No policies are defined at all — this table is internal bookkeeping, never
-- read or written from the client. The server (service role key) bypasses
-- RLS entirely, so no policy is needed; the anon/authenticated keys get zero
-- access to it by default.
