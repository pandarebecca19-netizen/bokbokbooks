-- Run this in the Supabase SQL Editor if you already created the
-- `books`/`profiles` tables from an earlier version of schema.sql.
-- Adds the "지식의 숲" (forest) aggregate stats to profiles, and a
-- trigger that keeps them correct from the books table automatically.

alter table public.profiles add column if not exists total_books_count integer not null default 0;
alter table public.profiles add column if not exists total_pages_read integer not null default 0;
alter table public.profiles add column if not exists points integer not null default 0;

-- Source of truth is always `books` — this recomputes one user's totals
-- from scratch rather than incrementing, so it stays correct no matter
-- how a book changed (completed, un-completed, page count edited,
-- deleted, genre changed, etc).
create or replace function public.recompute_forest_profile(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_books_count integer;
  v_pages_sum integer;
begin
  select count(*), coalesce(sum(pages), 0)
    into v_books_count, v_pages_sum
    from public.books
    where user_id = target_user_id and status = 'done';

  update public.profiles
    set total_books_count = v_books_count,
        total_pages_read = v_pages_sum,
        -- 완독 기본 100pt + 페이지당 0.5pt
        points = v_books_count * 100 + round(v_pages_sum * 0.5)
    where id = target_user_id;
end;
$$;

create or replace function public.handle_books_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform public.recompute_forest_profile(OLD.user_id);
    return OLD;
  end if;

  perform public.recompute_forest_profile(NEW.user_id);
  if TG_OP = 'UPDATE' and OLD.user_id <> NEW.user_id then
    perform public.recompute_forest_profile(OLD.user_id);
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_books_change on public.books;
create trigger on_books_change
  after insert or update or delete on public.books
  for each row execute procedure public.handle_books_change();

-- backfill existing accounts once, so people who already had completed
-- books before this migration don't show 0 until their next book change
select public.recompute_forest_profile(id) from public.profiles;
