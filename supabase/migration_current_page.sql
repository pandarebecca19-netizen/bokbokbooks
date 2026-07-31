-- Run this in the Supabase SQL Editor if you already created the
-- `books` table from an earlier version of schema.sql.
-- Adds current_page (progress while reading), used for the
-- reading-progress bar on "읽는 중" books.

alter table public.books add column if not exists current_page integer;
