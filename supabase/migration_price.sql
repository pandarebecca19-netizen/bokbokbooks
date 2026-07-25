-- Run this in the Supabase SQL Editor if you already created the
-- `books` table from an earlier version of schema.sql.
-- Adds an optional price (in KRW) per book, used for reading-cost stats.

alter table public.books add column if not exists price numeric;
