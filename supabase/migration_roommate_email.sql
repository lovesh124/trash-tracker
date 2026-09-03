-- Run this once in the Supabase SQL editor, after previous migrations.

alter table roommates add column if not exists email text;

-- Fill in each roommate's real email address, then run the updates you need.
-- A roommate with no email set here simply won't receive turn-reminder emails.
-- update roommates set email = 'name@example.com' where name = 'Daksh';
-- update roommates set email = 'name@example.com' where name = 'Ash';
-- update roommates set email = 'name@example.com' where name = 'Arsh';
-- update roommates set email = 'name@example.com' where name = 'Laksh';
-- update roommates set email = 'name@example.com' where name = 'Lovesh';
-- update roommates set email = 'name@example.com' where name = 'Rakshit';
-- update roommates set email = 'name@example.com' where name = 'Adyhan';
