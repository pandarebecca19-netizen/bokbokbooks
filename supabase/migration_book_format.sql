-- Run this in the Supabase SQL Editor if you already created the
-- `books` table from an earlier version of schema.sql.
-- Adds format ("paper" 종이책 / "ebook" 전자책 — 전자책이면 쪽수 대신
-- 진행률(%)로 입력한다).

alter table public.books add column if not exists format text;
