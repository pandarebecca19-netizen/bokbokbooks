-- Run this in the Supabase SQL Editor to switch from email-login to
-- username-login. People sign up with 아이디(username) + 닉네임(nickname)
-- + email + password, but log in with just 아이디 + password. The
-- nickname (not the username) is what's shown as "OO님의 책장".

-- 1) a small public profile row per user
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  nickname text
);

alter table public.profiles enable row level security;

-- usernames/nicknames are treated like a public handle (no email here),
-- so it's fine for anyone to check whether one is already taken
create policy "profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 2) auto-create the profile row whenever someone signs up, reading
-- username/nickname out of the metadata passed to supabase.auth.signUp()
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

-- 3) a narrow, safe lookup: given a username, return the matching
-- email so the login page can sign in with supabase-js (which only
-- accepts email/password, not a username directly). This function
-- exposes nothing except that single email for an exact username match.
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
