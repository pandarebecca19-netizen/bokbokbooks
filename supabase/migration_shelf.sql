-- Run this in the Supabase SQL Editor if you already created the
-- `books` table from an earlier version of schema.sql.
-- Adds an optional custom-shelf name per book (e.g. "세계문학전집").
-- Books with no shelf just live in the default shelf.

alter table public.books add column if not exists shelf text;
