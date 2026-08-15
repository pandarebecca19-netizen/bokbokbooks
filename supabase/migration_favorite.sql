-- Run this in the Supabase SQL Editor if you already created the
-- `books` table from an earlier version of schema.sql.
-- Adds is_favorite (하트로 즐겨찾기 표시한 책).

alter table public.books add column if not exists is_favorite boolean not null default false;
