-- Run this in the Supabase SQL Editor to undo migration_forest.sql
-- (the "지식의 숲" forest/points feature has been removed from the app).

drop trigger if exists on_books_change on public.books;
drop function if exists public.handle_books_change();
drop function if exists public.recompute_forest_profile(uuid);

alter table public.profiles drop column if exists total_books_count;
alter table public.profiles drop column if exists total_pages_read;
alter table public.profiles drop column if exists points;
