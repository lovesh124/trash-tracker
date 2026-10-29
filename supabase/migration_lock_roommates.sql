-- Run this once in the Supabase SQL editor, after previous migrations.
-- The roommates table now holds email addresses (migration_roommate_email.sql),
-- so it shouldn't be readable with the public anon key. The app never reads it
-- that way: every query goes through the server's service role key, which
-- bypasses RLS. With RLS still enabled and no policies left, the anon and
-- authenticated keys simply get no access to this table.

drop policy if exists "roommates are publicly readable" on roommates;
