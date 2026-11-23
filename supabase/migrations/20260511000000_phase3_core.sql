-- Phase 3 — accounts, puzzles DB, leaderboards, ratings, compliance primitives.
-- Apply with Supabase CLI (`supabase db push`) or `npm run db:migrate` when DATABASE_URL is set.

-- ─── profiles ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle varchar(32) not null,
  display_name text not null default 'Player',
  avatar_url text,
  country_code char(2),
  bio text,
  is_public boolean not null default true,
  is_kids_account boolean not null default false,
  parent_email text,
  parent_verified_at timestamptz,
  deleted_at timestamptz,
  scheduled_hard_delete_at timestamptz,
  server_daily_streak_count int not null default 0,
  server_daily_streak_last_utc_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_handle_unique unique (handle)
);

create table if not exists public.reserved_handles (
  handle varchar(32) primary key,
  reason text
);

-- ─── cloud progress (guest upgrade merge target) ───────────────────────────
create table if not exists public.user_progress (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- ─── puzzle pillar (migrated from static JSON) ─────────────────────────────
create table if not exists public.themes (
  id uuid primary key default gen_random_uuid (),
  slug varchar(64) not null,
  name text not null,
  constraint themes_slug_unique unique (slug)
);

create table if not exists public.puzzles (
  id text primary key,
  tiles jsonb not null,
  target int not null,
  difficulty varchar(16) not null,
  rating double precision not null default 1500,
  rating_rd double precision not null default 350,
  rating_vol double precision not null default 0.06,
  optimal_solution jsonb not null,
  retired_at timestamptz
);

create table if not exists public.puzzle_themes (
  puzzle_id text not null references public.puzzles (id) on delete cascade,
  theme_id uuid not null references public.themes (id) on delete cascade,
  primary key (puzzle_id, theme_id)
);

-- ─── Glicko-2 state per user per mode ─────────────────────────────────────
create table if not exists public.user_ratings (
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode varchar(32) not null,
  rating double precision not null,
  rd double precision not null,
  vol double precision not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, mode)
);

create table if not exists public.rating_history (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode varchar(32) not null,
  rating double precision not null,
  rd double precision not null,
  recorded_at timestamptz not null default now()
);

create index if not exists rating_history_user_mode_idx on public.rating_history (user_id, mode, recorded_at desc);

-- ─── daily leaderboard ────────────────────────────────────────────────────
create table if not exists public.daily_leaderboard_entries (
  puzzle_utc_date date not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  puzzle_id text not null,
  seconds int not null,
  wrong_attempts int not null,
  created_at timestamptz not null default now(),
  primary key (puzzle_utc_date, user_id)
);

create index if not exists daily_lb_date_time_idx
  on public.daily_leaderboard_entries (puzzle_utc_date, seconds asc, wrong_attempts asc);

-- ─── RLS ─────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.themes enable row level security;
alter table public.puzzles enable row level security;
alter table public.puzzle_themes enable row level security;
alter table public.user_ratings enable row level security;
alter table public.rating_history enable row level security;
alter table public.daily_leaderboard_entries enable row level security;
alter table public.reserved_handles enable row level security;

-- profiles: public read for non-kids public profiles; always read/update own
create policy "profiles_select_public_or_own" on public.profiles for
select
  using (
    (
      not is_kids_account
      and is_public
      and deleted_at is null
    )
    or (id = (select auth.uid ()))
  );

create policy "profiles_update_own" on public.profiles for
update using (id = (select auth.uid ()))
with
  check (id = (select auth.uid ()));

create policy "profiles_insert_own" on public.profiles for insert
with
  check (id = (select auth.uid ()));

-- user_progress
create policy "user_progress_own" on public.user_progress for all using (user_id = (select auth.uid ()))
with
  check (user_id = (select auth.uid ()));

-- themes / puzzles: world-readable
create policy "themes_read" on public.themes for
select
  using (true);

create policy "puzzles_read" on public.puzzles for
select
  using (retired_at is null);

create policy "puzzle_themes_read" on public.puzzle_themes for
select
  using (true);

-- reserved handles: no public access
create policy "reserved_handles_deny" on public.reserved_handles for
select
  using (false);

-- user ratings: own only
create policy "user_ratings_select_own" on public.user_ratings for
select
  using (user_id = (select auth.uid ()));

create policy "user_ratings_write_own" on public.user_ratings for insert
with
  check (user_id = (select auth.uid ()));

create policy "user_ratings_update_own" on public.user_ratings for
update using (user_id = (select auth.uid ()))
with
  check (user_id = (select auth.uid ()));

-- rating history: own read; inserts via RPC only (service / definer) — deny direct insert
create policy "rating_history_select_own" on public.rating_history for
select
  using (user_id = (select auth.uid ()));

-- daily leaderboard: anyone authenticated can read; users insert/update own row via RPC
create policy "daily_lb_select" on public.daily_leaderboard_entries for
select
  using (true);

create policy "daily_lb_insert_own" on public.daily_leaderboard_entries for insert
with
  check (user_id = (select auth.uid ()));

create policy "daily_lb_update_own" on public.daily_leaderboard_entries for
update using (user_id = (select auth.uid ()))
with
  check (user_id = (select auth.uid ()));

-- ─── New user → profile row ───────────────────────────────────────────────
create or replace function public.handle_new_user () returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, handle, display_name)
  values (
    new.id,
    'user_' || substr(replace(new.id::text, '-', ''), 1, 12),
    coalesce(new.raw_user_meta_data->>'full_name', 'Player')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users for each row
execute function public.handle_new_user ();

-- Keep updated_at fresh
create or replace function public.touch_profile_updated_at () returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;

create trigger profiles_touch
before update on public.profiles for each row
execute function public.touch_profile_updated_at ();

-- ─── RPC: fetch puzzle ─────────────────────────────────────────────────────
create or replace function public.get_puzzle_by_id (p_id text) returns public.puzzles
language sql
stable
security invoker
set search_path = public
as $$
  select *
  from public.puzzles
  where
    id = p_id
    and retired_at is null;
$$;

-- Pick a pseudo-random next puzzle in a theme + rough rating band (client supplies seed for stability)
create or replace function public.get_next_puzzle_by_theme (
  p_theme_slug text,
  p_rating_min double precision,
  p_rating_max double precision,
  p_seed int
) returns public.puzzles
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  t_id uuid;
  r public.puzzles%rowtype;
begin
  select id into t_id
  from public.themes
  where
    slug = p_theme_slug
  limit 1;

  if t_id is null then
    return null;
  end if;

  select p.* into r
  from public.puzzles p
  inner join public.puzzle_themes pt on pt.puzzle_id = p.id
  where
    pt.theme_id = t_id
    and p.retired_at is null
    and p.rating between p_rating_min and p_rating_max
  order by
    md5(p.id || p_seed::text)
  limit 1;

  return r;
end;
$$;

-- Best-of upsert: lower seconds wins; tie-break fewer wrong attempts
create or replace function public.submit_daily_leaderboard (
  p_puzzle_utc_date date,
  p_puzzle_id text,
  p_seconds int,
  p_wrong_attempts int
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid ();
  cur_seconds int;
  cur_wrong int;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if p_seconds < 0 or p_wrong_attempts < 0 then
    raise exception 'invalid input';
  end if;

  select e.seconds, e.wrong_attempts
  into cur_seconds, cur_wrong
  from public.daily_leaderboard_entries e
  where
    e.puzzle_utc_date = p_puzzle_utc_date
    and e.user_id = uid;

  if not found then
    insert into public.daily_leaderboard_entries (
      puzzle_utc_date,
      user_id,
      puzzle_id,
      seconds,
      wrong_attempts
    )
    values (
      p_puzzle_utc_date,
      uid,
      p_puzzle_id,
      p_seconds,
      p_wrong_attempts
    );
  else
    if p_seconds < cur_seconds or (
      p_seconds = cur_seconds
      and p_wrong_attempts < cur_wrong
    ) then
      update public.daily_leaderboard_entries
      set
        puzzle_id = p_puzzle_id,
        seconds = p_seconds,
        wrong_attempts = p_wrong_attempts,
        created_at = now()
      where
        puzzle_utc_date = p_puzzle_utc_date
        and user_id = uid;
    end if;
  end if;
end;
$$;

grant execute on function public.submit_daily_leaderboard (date, text, int, int) to authenticated;

-- Append rating history + upsert user_ratings (called from Edge Function or trusted path)
create or replace function public.apply_user_rating (
  p_mode text,
  p_rating double precision,
  p_rd double precision,
  p_vol double precision
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid ();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.user_ratings (user_id, mode, rating, rd, vol)
  values (uid, p_mode, p_rating, p_rd, p_vol)
  on conflict (user_id, mode) do update
  set
    rating = excluded.rating,
    rd = excluded.rd,
    vol = excluded.vol,
    updated_at = now();

  insert into public.rating_history (user_id, mode, rating, rd)
  values (uid, p_mode, p_rating, p_rd);
end;
$$;

grant execute on function public.apply_user_rating (text, double precision, double precision, double precision) to authenticated;

-- COPPA: begin parent verification (sends email in production via Auth hook or Edge — store only here)
create or replace function public.set_parent_email (p_email text) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    parent_email = p_email,
    is_kids_account = true,
    is_public = false
  where
    id = auth.uid ();
end;
$$;

grant execute on function public.set_parent_email (text) to authenticated;

-- Account delete request (soft)
create or replace function public.request_account_deletion () returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    deleted_at = now(),
    scheduled_hard_delete_at = now() + interval '30 days',
    is_public = false
  where
    id = auth.uid ();
end;
$$;

grant execute on function public.request_account_deletion () to authenticated;

-- Data export
create or replace function public.export_my_data () returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid ();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  return jsonb_build_object(
    'profile',
    (
      select
        to_jsonb (p.*)
      from
        public.profiles p
      where
        p.id = uid
    ),
    'progress',
    (
      select
        to_jsonb (u.*)
      from
        public.user_progress u
      where
        u.user_id = uid
    ),
    'ratings',
    (
      select
        coalesce(jsonb_agg(to_jsonb (r.*)), '[]'::jsonb)
      from
        public.user_ratings r
      where
        r.user_id = uid
    ),
    'rating_history',
    (
      select
        coalesce(jsonb_agg(to_jsonb (h.*)), '[]'::jsonb)
      from
        public.rating_history h
      where
        h.user_id = uid
    ),
    'daily_scores',
    (
      select
        coalesce(jsonb_agg(to_jsonb (d.*)), '[]'::jsonb)
      from
        public.daily_leaderboard_entries d
      where
        d.user_id = uid
    )
  );
end;
$$;

grant execute on function public.export_my_data () to authenticated;

-- Server-side daily streak (EPIC-31.02)
create or replace function public.bump_server_daily_streak (p_utc_date date) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid ();
  new_count int;
  last_d date;
  prev_count int;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select server_daily_streak_last_utc_date, server_daily_streak_count
  into last_d, prev_count
  from public.profiles
  where
    id = uid
  for update;

  if not found then
    raise exception 'profile missing';
  end if;

  if last_d is null then
    new_count := 1;
  elsif p_utc_date = last_d then
    new_count := prev_count;
  elsif p_utc_date - last_d = 1 then
    new_count := prev_count + 1;
  else
    new_count := 1;
  end if;

  update public.profiles
  set
    server_daily_streak_count = new_count,
    server_daily_streak_last_utc_date = p_utc_date
  where
    id = uid;

  return new_count;
end;
$$;

grant execute on function public.bump_server_daily_streak (date) to authenticated;
