-- ============================================
-- User Engagement Schema Migration
-- ============================================
-- This migration creates the database schema for user engagement features:
-- - User profiles (extends auth.users)
-- - Movie ratings (1-5 stars)
-- - Watchlist (saved movies)
-- - Viewing history (implicit engagement signals)
--
-- Run this migration via:
-- 1. Supabase Dashboard -> SQL Editor -> paste and run
-- 2. OR via CLI: supabase db push
--
-- Source: https://supabase.com/docs/guides/auth/managing-user-data
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security
-- ============================================

-- ============================================
-- 1. CREATE TABLES
-- ============================================

create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (id)
);

create table public.ratings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id integer not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, movie_id)
);

create table public.watchlist (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id integer not null,
  created_at timestamptz default now(),
  unique(user_id, movie_id)
);

create table public.viewing_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id integer not null,
  action_type text not null,
  created_at timestamptz default now()
);

-- ============================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================

alter table public.profiles enable row level security;
alter table public.ratings enable row level security;
alter table public.watchlist enable row level security;
alter table public.viewing_history enable row level security;

-- ============================================
-- 3. CREATE RLS POLICIES
-- ============================================

-- Profiles: viewable by everyone, users can only update their own
create policy "Public profiles viewable by everyone"
  on public.profiles for select using ( true );

create policy "Users can update own profile"
  on public.profiles for update
  using ( (select auth.uid()) = id );

-- Ratings: users can CRUD only their own ratings
create policy "Users view own ratings"
  on public.ratings for select
  using ( (select auth.uid()) = user_id );

create policy "Users insert own ratings"
  on public.ratings for insert
  with check ( (select auth.uid()) = user_id );

create policy "Users update own ratings"
  on public.ratings for update
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "Users delete own ratings"
  on public.ratings for delete
  using ( (select auth.uid()) = user_id );

-- Watchlist: users can select/insert/delete only their own watchlist items
create policy "Users view own watchlist"
  on public.watchlist for select
  using ( (select auth.uid()) = user_id );

create policy "Users insert into own watchlist"
  on public.watchlist for insert
  with check ( (select auth.uid()) = user_id );

create policy "Users delete from own watchlist"
  on public.watchlist for delete
  using ( (select auth.uid()) = user_id );

-- Viewing history: users can select/insert only their own history
create policy "Users view own history"
  on public.viewing_history for select
  using ( (select auth.uid()) = user_id );

create policy "Users insert into own history"
  on public.viewing_history for insert
  with check ( (select auth.uid()) = user_id );

-- ============================================
-- 4. CREATE TRIGGER FOR AUTO PROFILE CREATION
-- ============================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 5. CREATE INDEXES (CRITICAL - NOT AUTO-CREATED)
-- ============================================
-- Supabase does NOT auto-create indexes on foreign key columns.
-- These indexes are essential for query performance.

create index idx_ratings_user_id on public.ratings(user_id);
create index idx_ratings_movie_id on public.ratings(movie_id);
create index idx_ratings_created_at on public.ratings(created_at desc);

create index idx_watchlist_user_id on public.watchlist(user_id);
create index idx_watchlist_movie_id on public.watchlist(movie_id);

create index idx_viewing_history_user_id on public.viewing_history(user_id);
create index idx_viewing_history_movie_id on public.viewing_history(movie_id);
create index idx_viewing_history_created_at on public.viewing_history(created_at desc);
create index idx_viewing_history_action_type on public.viewing_history(action_type);
