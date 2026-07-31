-- Run this in the Supabase SQL Editor if you already created the
-- `books` table from an earlier version of schema.sql.
-- It adds the new genre columns and removes the old ribbon-band column.

alter table public.books add column if not exists genre text;
alter table public.books add column if not exists genre_color text;
alter table public.books drop column if exists band_color_key;
