-- New enum value must be committed before it can be cast/used (PostgreSQL 55P04).
-- This file is intentionally only the ADD VALUE so the next migration file runs in a new transaction.

do $$ begin
  alter type public.user_role add value 'employee';
exception
  when duplicate_object then null;
end $$;
