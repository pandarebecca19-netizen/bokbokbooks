-- 1) books table -------------------------------------------------
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  title text not null,
  author text,
  pages integer,
  status text not null default 'reading',
  color_key text,
  genre text,
  genre_color text,
  cover_url text,
  rating integer default 0,
  note text default '',
  start_date date,
  finish_date date,
  price numeric,
  current_page integer,
  created_at timestamptz default now()
);

alter table public.books enable row level security;

create policy "Users can view own books"
  on public.books for select
  using (auth.uid() = user_id);

create policy "Users can insert own books"
  on public.books for insert
  with check (auth.uid() = user_id);

create policy "Users can update own books"
  on public.books for update
  using (auth.uid() = user_id);

create policy "Users can delete own books"
  on public.books for delete
  using (auth.uid() = user_id);

-- 2) storage bucket for cover images ------------------------------
-- Create the bucket first from the Supabase dashboard:
--   Storage → New bucket → name: "covers" → Public bucket: ON
-- Then run the policies below (Storage → Policies → New policy,
-- or just run this SQL in the SQL editor).

create policy "Public read covers"
  on storage.objects for select
  using (bucket_id = 'covers');

create policy "Users upload own covers"
  on storage.objects for insert
  with check (
    bucket_id = 'covers'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users update own covers"
  on storage.objects for update
  using (
    bucket_id = 'covers'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own covers"
  on storage.objects for delete
  using (
    bucket_id = 'covers'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3) username-based login + nickname --------------------------------
-- See migration_username_login.sql for detailed comments; this sets up
-- the same profiles table + trigger + lookup function for fresh installs.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  nickname text,
  total_books_count integer not null default 0,
  total_pages_read integer not null default 0,
  points integer not null default 0
);

alter table public.profiles enable row level security;

create policy "profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, nickname)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    coalesce(new.raw_user_meta_data->>'nickname', new.raw_user_meta_data->>'username')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.get_email_for_username(uname text)
returns text
language sql
security definer
set search_path = public
as $$
  select u.email
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.username = uname
  limit 1;
$$;

grant execute on function public.get_email_for_username(text) to anon, authenticated;

-- 4) "지식의 숲" forest stats -----------------------------------------
-- See migration_forest.sql for detailed comments; keeps profiles.
-- total_books_count / total_pages_read / points correct by recomputing
-- them from `books` whenever a book is added, changed, or removed.

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
