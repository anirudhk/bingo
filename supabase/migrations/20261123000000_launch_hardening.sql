-- ═══════════════════════════════════════════════════════════════════════════
-- Launch hardening (docs/LAUNCH_CHECKLIST.md §2–§4)
--
--  1. Function execution locked down: nothing is callable by the API roles
--     unless explicitly granted. (Postgres grants EXECUTE to PUBLIC by
--     default, so anonymous visitors could call internal helpers such as
--     internal_mp_apply_elo and rewrite anyone's rating.)
--  2. Kids accounts removed: accounts are general-audience (13+, enforced by
--     the sign-up confirmation in the app); children play as guests.
--  3. Profiles: users may edit only cosmetic columns (no self-set streaks).
--  4. Ratings: no direct writes and no client-supplied ratings. Glicko-2 now
--     runs inside the database.
--  5. Daily leaderboard is server-authoritative: the server picks the puzzle
--     (daily_schedule), records when the attempt started, checks every
--     guess, counts wrong tries and computes the time itself.
--  6. Multiplayer: server-timed rounds, answers verified against the grid
--     both players must agree on, one submission per round, forfeit when an
--     opponent disappears.
--  7. Client error reports stored in client_errors (write-only from the app).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Lock down function execution ────────────────────────────────────────
-- (The blanket revoke runs at the end, after every function below exists.)
-- Postgres grants EXECUTE to PUBLIC on every new function. A per-schema
-- default can only *add* privileges, so this one must be global.
alter default privileges revoke execute on functions from public;

alter default privileges in schema public revoke execute on functions from anon, authenticated;

-- ─── 2. Remove kids accounts ────────────────────────────────────────────────
drop function if exists public.set_parent_email (text);

drop policy if exists "profiles_select_public_or_own" on public.profiles;

create policy "profiles_select_public_or_own" on public.profiles for
select
  using (
    (
      is_public
      and deleted_at is null
    )
    or (id = (select auth.uid ()))
  );

alter table public.profiles
drop column if exists is_kids_account,
drop column if exists parent_email,
drop column if exists parent_verified_at;

-- ─── 3. Profiles: only cosmetic columns are user-editable ───────────────────
revoke insert, update on public.profiles from anon, authenticated;

grant update (handle, display_name, avatar_url, country_code, bio, is_public) on public.profiles to authenticated;

-- Rows are created by the on_auth_user_created trigger, never by clients.
drop policy if exists "profiles_insert_own" on public.profiles;

-- ─── 4. Ratings: server-only writes ─────────────────────────────────────────
drop policy if exists "user_ratings_write_own" on public.user_ratings;

drop policy if exists "user_ratings_update_own" on public.user_ratings;

revoke insert, update, delete on public.user_ratings from anon, authenticated;

revoke insert, update, delete on public.rating_history from anon, authenticated;

drop function if exists public.apply_user_rating (text, double precision, double precision, double precision);

-- One Glicko-2 rating period with a single game (Glickman 2012), matching the
-- `glicko2` npm package the app used before (tau = 0.5).
create or replace function public.internal_glicko2 (
  p_rating double precision,
  p_rd double precision,
  p_vol double precision,
  p_opp_rating double precision,
  p_opp_rd double precision,
  p_score double precision,
  p_tau double precision default 0.5,
  out rating double precision,
  out rd double precision,
  out vol double precision
)
language plpgsql
immutable
as $$
declare
  scale constant double precision := 173.7178;
  eps constant double precision := 0.000001;
  mu double precision := (p_rating - 1500) / scale;
  phi double precision := p_rd / scale;
  mu_j double precision := (p_opp_rating - 1500) / scale;
  phi_j double precision := p_opp_rd / scale;
  g double precision;
  e double precision;
  v double precision;
  delta double precision;
  a double precision;
  big_a double precision;
  big_b double precision;
  big_c double precision;
  f_a double precision;
  f_b double precision;
  f_c double precision;
  k int;
  new_vol double precision;
  phi_star double precision;
  new_phi double precision;
  new_mu double precision;
begin
  g := 1 / sqrt(1 + 3 * phi_j ^ 2 / pi() ^ 2);
  e := 1 / (1 + exp(-g * (mu - mu_j)));
  v := 1 / (g ^ 2 * e * (1 - e));
  delta := v * g * (p_score - e);
  a := ln(p_vol ^ 2);

  big_a := a;
  if delta ^ 2 > phi ^ 2 + v then
    big_b := ln(delta ^ 2 - phi ^ 2 - v);
  else
    k := 1;
    while (
      exp(a - k * p_tau) * (delta ^ 2 - phi ^ 2 - v - exp(a - k * p_tau)) / (2 * (phi ^ 2 + v + exp(a - k * p_tau)) ^ 2)
      - ((a - k * p_tau) - a) / p_tau ^ 2
    ) < 0 loop
      k := k + 1;
    end loop;
    big_b := a - k * p_tau;
  end if;

  f_a := exp(big_a) * (delta ^ 2 - phi ^ 2 - v - exp(big_a)) / (2 * (phi ^ 2 + v + exp(big_a)) ^ 2) - (big_a - a) / p_tau ^ 2;
  f_b := exp(big_b) * (delta ^ 2 - phi ^ 2 - v - exp(big_b)) / (2 * (phi ^ 2 + v + exp(big_b)) ^ 2) - (big_b - a) / p_tau ^ 2;

  while abs(big_b - big_a) > eps loop
    big_c := big_a + (big_a - big_b) * f_a / (f_b - f_a);
    f_c := exp(big_c) * (delta ^ 2 - phi ^ 2 - v - exp(big_c)) / (2 * (phi ^ 2 + v + exp(big_c)) ^ 2) - (big_c - a) / p_tau ^ 2;
    if f_c * f_b < 0 then
      big_a := big_b;
      f_a := f_b;
    else
      f_a := f_a / 2;
    end if;
    big_b := big_c;
    f_b := f_c;
  end loop;

  new_vol := exp(big_a / 2);
  phi_star := sqrt(phi ^ 2 + new_vol ^ 2);
  new_phi := 1 / sqrt(1 / phi_star ^ 2 + 1 / v);
  new_mu := mu + new_phi ^ 2 * g * (p_score - e);

  rating := scale * new_mu + 1500;
  rd := scale * new_phi;
  vol := new_vol;
end;
$$;

-- ─── Shared answer checker ──────────────────────────────────────────────────
-- Returns the left-to-right value of a path, or null if the path is not a
-- legal move: wrong length, repeated or out-of-range tiles, not a straight
-- adjacent line, or an operator that isn't allowed.
-- Tiles are given as parallel arrays indexed by tile id (1-based: id 0 → [1]).
create or replace function public.internal_eval_path (
  p_values int[],
  p_rows int[],
  p_cols int[],
  p_tile_ids int[],
  p_operators text[],
  p_allowed_operators text[],
  p_tiles_count int
) returns int
language plpgsql
immutable
as $$
declare
  n int := coalesce(array_length(p_tile_ids, 1), 0);
  tile_total int := coalesce(array_length(p_values, 1), 0);
  dr int;
  dc int;
  step_r int;
  step_c int;
  result int;
  id int;
  i int;
begin
  if n <> p_tiles_count or coalesce(array_length(p_operators, 1), 0) <> n - 1 then
    return null;
  end if;

  if (select count(distinct x) from unnest(p_tile_ids) as x) <> n then
    return null;
  end if;

  for i in 1..n loop
    id := p_tile_ids[i];
    if id is null or id < 0 or id >= tile_total then
      return null;
    end if;
  end loop;

  for i in 1..n - 1 loop
    dr := p_rows[p_tile_ids[i + 1] + 1] - p_rows[p_tile_ids[i] + 1];
    dc := p_cols[p_tile_ids[i + 1] + 1] - p_cols[p_tile_ids[i] + 1];
    if abs(dr) + abs(dc) <> 1 then
      return null;
    end if;
    if i = 1 then
      step_r := dr;
      step_c := dc;
    elsif dr <> step_r or dc <> step_c then
      return null;
    end if;
  end loop;

  result := p_values[p_tile_ids[1] + 1];
  for i in 1..n - 1 loop
    if not (p_operators[i] = any (p_allowed_operators)) then
      return null;
    end if;
    case p_operators[i]
      when '+' then result := result + p_values[p_tile_ids[i + 1] + 1];
      when '-' then result := result - p_values[p_tile_ids[i + 1] + 1];
      when '*' then result := result * p_values[p_tile_ids[i + 1] + 1];
      else return null;
    end case;
  end loop;

  return result;
end;
$$;

-- ─── 5. Server-authoritative daily puzzle ───────────────────────────────────
alter table public.puzzles
add column if not exists available_operators text[] not null default array['+', '-', '*'];

-- Which puzzle is "today's". Filled by `npm run puzzles:import-db` using the
-- same weekly-difficulty picker the app uses offline, so both always agree.
create table if not exists public.daily_schedule (
  utc_date date primary key,
  puzzle_id text not null references public.puzzles (id)
);

alter table public.daily_schedule enable row level security;

drop policy if exists "daily_schedule_read_past" on public.daily_schedule;

-- Today and earlier only: no peeking at future puzzles.
create policy "daily_schedule_read_past" on public.daily_schedule for
select
  using (utc_date <= (now() at time zone 'utc')::date);

create table if not exists public.daily_attempts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  utc_date date not null,
  puzzle_id text not null references public.puzzles (id),
  started_at timestamptz not null default now(),
  solved_at timestamptz,
  wrong_attempts int not null default 0,
  primary key (user_id, utc_date)
);

alter table public.daily_attempts enable row level security;

drop policy if exists "daily_attempts_own" on public.daily_attempts;

create policy "daily_attempts_own" on public.daily_attempts for
select
  using (user_id = (select auth.uid ()));

revoke insert, update, delete on public.daily_attempts from anon, authenticated;

-- Leaderboard rows are written only by submit_daily_guess.
drop policy if exists "daily_lb_insert_own" on public.daily_leaderboard_entries;

drop policy if exists "daily_lb_update_own" on public.daily_leaderboard_entries;

revoke insert, update, delete on public.daily_leaderboard_entries from anon, authenticated;

drop function if exists public.submit_daily_leaderboard (date, text, int, int);

drop function if exists public.bump_server_daily_streak (date);

alter table public.cheat_flags
add column if not exists puzzle_utc_date date;

create or replace function public.start_daily_attempt () returns table (
  puzzle_id text,
  started_at timestamptz,
  solved boolean,
  wrong_attempts int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid ();
  today date := (now() at time zone 'utc')::date;
  scheduled text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select ds.puzzle_id into scheduled from public.daily_schedule ds where ds.utc_date = today;
  if scheduled is null then
    raise exception 'no daily puzzle scheduled for %', today;
  end if;

  -- Re-opening the daily keeps the original start time.
  insert into public.daily_attempts (user_id, utc_date, puzzle_id)
  values (uid, today, scheduled)
  on conflict (user_id, utc_date) do nothing;

  return query
  select a.puzzle_id, a.started_at, a.solved_at is not null, a.wrong_attempts
  from public.daily_attempts a
  where a.user_id = uid and a.utc_date = today;
end;
$$;

create or replace function public.submit_daily_guess (p_tile_ids int[], p_operators text[]) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid ();
  today date := (now() at time zone 'utc')::date;
  att public.daily_attempts%rowtype;
  pz public.puzzles%rowtype;
  vals int[];
  rws int[];
  cls int[];
  answer int;
  secs int;
  score double precision;
  cur_rating double precision := 1500;
  cur_rd double precision := 350;
  cur_vol double precision := 0.06;
  g record;
  last_d date;
  prev_count int;
  streak int;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into att from public.daily_attempts a where a.user_id = uid and a.utc_date = today for update;
  if not found then
    raise exception 'start the daily puzzle first';
  end if;

  if att.solved_at is not null then
    return jsonb_build_object(
      'correct', true,
      'already_solved', true,
      'seconds', floor(extract(epoch from att.solved_at - att.started_at))::int,
      'wrong_attempts', att.wrong_attempts
    );
  end if;

  select * into strict pz from public.puzzles p where p.id = att.puzzle_id;

  select
    array_agg((t ->> 'value')::int order by (t ->> 'id')::int),
    array_agg((t -> 'position' ->> 'row')::int order by (t ->> 'id')::int),
    array_agg((t -> 'position' ->> 'col')::int order by (t ->> 'id')::int)
  into vals, rws, cls
  from jsonb_array_elements(pz.tiles) as t;

  answer := public.internal_eval_path (
    vals, rws, cls, p_tile_ids, p_operators, pz.available_operators,
    jsonb_array_length(pz.optimal_solution -> 'tileIds')
  );

  if answer is distinct from pz.target then
    update public.daily_attempts a
    set wrong_attempts = a.wrong_attempts + 1
    where a.user_id = uid and a.utc_date = today
    returning a.wrong_attempts into att.wrong_attempts;
    return jsonb_build_object('correct', false, 'wrong_attempts', att.wrong_attempts);
  end if;

  -- Solved. Time comes from the server's own clock.
  secs := greatest(0, floor(extract(epoch from now() - att.started_at)))::int;

  update public.daily_attempts a set solved_at = now() where a.user_id = uid and a.utc_date = today;

  insert into public.daily_leaderboard_entries (puzzle_utc_date, user_id, puzzle_id, seconds, wrong_attempts)
  values (today, uid, att.puzzle_id, secs, att.wrong_attempts)
  on conflict do nothing;

  -- Solving from a memorised answer or a script is possible; flag the
  -- implausibly fast ones for review rather than silently ranking them.
  if secs < 3 then
    insert into public.cheat_flags (user_id, flag_type, detail, puzzle_utc_date)
    values (uid, 'daily_fast_solve', jsonb_build_object('seconds', secs, 'puzzle_id', att.puzzle_id), today);
    insert into public.moderator_queue (flag_id) values (currval(pg_get_serial_sequence('public.cheat_flags', 'id')));
  end if;

  -- Server-side streak (same rules as before, but the date is the server's).
  select server_daily_streak_last_utc_date, server_daily_streak_count
  into last_d, prev_count
  from public.profiles where id = uid for update;
  streak := case
    when last_d is null then 1
    when last_d = today then prev_count
    when today - last_d = 1 then prev_count + 1
    else 1
  end;
  update public.profiles
  set server_daily_streak_count = streak, server_daily_streak_last_utc_date = today
  where id = uid;

  -- Daily rating vs the puzzle as the "opponent".
  score := case when att.wrong_attempts = 0 then 1 when att.wrong_attempts <= 2 then 0.5 else 0 end;
  select r.rating, r.rd, r.vol into cur_rating, cur_rd, cur_vol
  from public.user_ratings r where r.user_id = uid and r.mode = 'daily';
  if not found then
    cur_rating := 1500;
    cur_rd := 350;
    cur_vol := 0.06;
  end if;
  select * into g from public.internal_glicko2 (cur_rating, cur_rd, cur_vol, pz.rating, pz.rating_rd, score);

  insert into public.user_ratings (user_id, mode, rating, rd, vol)
  values (uid, 'daily', g.rating, g.rd, g.vol)
  on conflict (user_id, mode) do update
  set rating = excluded.rating, rd = excluded.rd, vol = excluded.vol, updated_at = now();

  insert into public.rating_history (user_id, mode, rating, rd) values (uid, 'daily', g.rating, g.rd);

  return jsonb_build_object(
    'correct', true,
    'seconds', secs,
    'wrong_attempts', att.wrong_attempts,
    'streak', streak,
    'rating', round(g.rating)
  );
end;
$$;

-- ─── 6. Multiplayer: verified, server-timed rounds ──────────────────────────
-- Mirrors DIFFICULTY_CONFIGS in src/constants/game.ts.
create or replace function public.internal_mp_config (
  p_difficulty text,
  out grid_size int,
  out tiles_count int,
  out allowed_operators text[]
)
language sql
immutable
as $$
  select
    case p_difficulty when 'easy' then 3 else 4 end,
    case p_difficulty when 'easy' then 2 else 3 end,
    case p_difficulty when 'easy' then array['+', '-'] else array['+', '-', '*'] end;
$$;

-- The grid each round was played on. Both clients derive it from the shared
-- seed; the first submission records it and the second must match.
create table if not exists public.mp_round_grids (
  session_id uuid not null references public.mp_sessions (id) on delete cascade,
  round_number int not null,
  grid int[] not null,
  target int not null,
  primary key (session_id, round_number)
);

alter table public.mp_round_grids enable row level security;

revoke all on public.mp_round_grids from anon, authenticated;

-- Submissions are only ever written by mp_submit_round.
revoke insert, update, delete on public.mp_round_submissions from anon, authenticated;

drop function if exists public.mp_submit_round (uuid, int, int, int, text);

-- Shared end-of-match bookkeeping.
create or replace function public.internal_mp_finish (p_session uuid, p_winner uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.mp_sessions%rowtype;
begin
  select * into strict s from public.mp_sessions where id = p_session;
  update public.mp_sessions
  set
    state = 'finished',
    finished_at = now(),
    winner_user_id = p_winner,
    round_seed = null,
    round_started_at = null
  where id = p_session;

  if p_winner is not null then
    perform public.internal_mp_apply_elo (
      p_winner,
      case when p_winner = s.host_id then s.guest_id else s.host_id end
    );
  end if;
end;
$$;

create or replace function public.mp_submit_round (
  p_session uuid,
  p_round int,
  p_grid int[],
  p_target int,
  p_tile_ids int[],
  p_operators text[],
  p_wrong int,
  p_timing_hash text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid ();
  s public.mp_sessions%rowtype;
  cfg record;
  stored public.mp_round_grids%rowtype;
  rws int[];
  cls int[];
  answer int;
  solve_ms int;
  subs int;
  host_ms int;
  guest_ms int;
  host_wr int;
  guest_wr int;
  hw int;
  gw int;
  round_winner uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into strict s from public.mp_sessions where id = p_session for update;

  if uid <> s.host_id and uid is distinct from s.guest_id then
    raise exception 'not a participant';
  end if;
  if s.state <> 'active' then
    raise exception 'session not active';
  end if;
  if p_round <> s.current_round then
    raise exception 'stale round';
  end if;
  if exists (
    select 1 from public.mp_round_submissions r
    where r.session_id = p_session and r.round_number = p_round and r.user_id = uid
  ) then
    raise exception 'already submitted this round';
  end if;

  select * into cfg from public.internal_mp_config (s.difficulty);
  if coalesce(array_length(p_grid, 1), 0) <> cfg.grid_size * cfg.grid_size
  or exists (select 1 from unnest(p_grid) v where v < 1 or v > 9) then
    raise exception 'invalid grid';
  end if;

  -- Both players must have been shown the same board.
  select * into stored from public.mp_round_grids g where g.session_id = p_session and g.round_number = p_round;
  if not found then
    insert into public.mp_round_grids (session_id, round_number, grid, target)
    values (p_session, p_round, p_grid, p_target);
  elsif stored.grid <> p_grid or stored.target <> p_target then
    insert into public.cheat_flags (user_id, session_id, flag_type, detail)
    values
      (s.host_id, p_session, 'grid_mismatch', jsonb_build_object('round', p_round)),
      (s.guest_id, p_session, 'grid_mismatch', jsonb_build_object('round', p_round));
    -- Can't tell who tampered: void the match, no rating change.
    perform public.internal_mp_finish (p_session, null);
    return jsonb_build_object('voided', true);
  end if;

  select
    array_agg((i - 1) / cfg.grid_size order by i),
    array_agg((i - 1) % cfg.grid_size order by i)
  into rws, cls
  from generate_series(1, cfg.grid_size * cfg.grid_size) as i;

  answer := public.internal_eval_path (p_grid, rws, cls, p_tile_ids, p_operators, cfg.allowed_operators, cfg.tiles_count);
  if answer is distinct from p_target then
    raise exception 'answer does not reach the target';
  end if;

  -- Time comes from the server's round start, not the client.
  solve_ms := greatest(0, floor(extract(epoch from now() - s.round_started_at) * 1000))::int;

  if solve_ms < 400 then
    insert into public.cheat_flags (user_id, session_id, flag_type, detail)
    values (uid, p_session, 'fast_solve', jsonb_build_object('ms', solve_ms));
    insert into public.moderator_queue (flag_id) values (currval(pg_get_serial_sequence('public.cheat_flags', 'id')));
  end if;

  insert into public.mp_round_submissions (session_id, round_number, user_id, solve_time_ms, wrong_attempts, timing_hash)
  values (p_session, p_round, uid, solve_ms, greatest(0, coalesce(p_wrong, 0)), p_timing_hash);

  select count(*) into subs from public.mp_round_submissions r where r.session_id = p_session and r.round_number = p_round;
  if subs < 2 then
    return jsonb_build_object('solve_ms', solve_ms, 'waiting_for_opponent', true);
  end if;

  select r.solve_time_ms, r.wrong_attempts into host_ms, host_wr
  from public.mp_round_submissions r
  where r.session_id = p_session and r.round_number = p_round and r.user_id = s.host_id;
  select r.solve_time_ms, r.wrong_attempts into guest_ms, guest_wr
  from public.mp_round_submissions r
  where r.session_id = p_session and r.round_number = p_round and r.user_id = s.guest_id;

  if host_ms < guest_ms or (host_ms = guest_ms and host_wr < guest_wr) then
    round_winner := s.host_id;
  elsif guest_ms < host_ms or (guest_ms = host_ms and guest_wr < host_wr) then
    round_winner := s.guest_id;
  end if;

  hw := s.host_round_wins + case when round_winner = s.host_id then 1 else 0 end;
  gw := s.guest_round_wins + case when round_winner = s.guest_id then 1 else 0 end;

  update public.mp_sessions set host_round_wins = hw, guest_round_wins = gw where id = p_session;

  if p_round >= s.total_rounds then
    perform public.internal_mp_finish (
      p_session,
      case when hw > gw then s.host_id when gw > hw then s.guest_id else null end
    );
    return jsonb_build_object('solve_ms', solve_ms, 'finished', true);
  end if;

  update public.mp_sessions
  set
    current_round = p_round + 1,
    round_seed = id::text || '|' || (p_round + 1)::text || '|' || floor(extract(epoch from now()))::text,
    round_started_at = now(),
    updated_at = now()
  where id = p_session;

  delete from public.mp_round_submissions r where r.session_id = p_session and r.round_number = p_round;
  delete from public.mp_round_grids g where g.session_id = p_session and g.round_number = p_round;

  return jsonb_build_object('solve_ms', solve_ms, 'next_round', p_round + 1);
end;
$$;

-- An opponent silent for this long has left: the remaining player may claim
-- the win. (Heartbeats arrive every few seconds while a match page is open.)
create or replace function public.mp_claim_forfeit (p_session uuid) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid ();
  s public.mp_sessions%rowtype;
  opp_seen timestamptz;
  grace constant interval := interval '45 seconds';
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into strict s from public.mp_sessions where id = p_session for update;
  if uid <> s.host_id and uid is distinct from s.guest_id then
    raise exception 'not a participant';
  end if;
  if s.state <> 'active' then
    return false;
  end if;

  opp_seen := case when uid = s.host_id then s.guest_last_seen else s.host_last_seen end;
  if coalesce(opp_seen, s.round_started_at, s.updated_at) > now() - grace then
    return false;
  end if;

  insert into public.cheat_flags (user_id, session_id, flag_type, detail)
  values (
    case when uid = s.host_id then s.guest_id else s.host_id end,
    p_session,
    'forfeit_disconnect',
    jsonb_build_object('last_seen', opp_seen)
  );
  perform public.internal_mp_finish (p_session, uid);
  return true;
end;
$$;

-- ─── 7. Client error reports ────────────────────────────────────────────────
create table if not exists public.client_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source text,
  message text not null,
  stack text,
  component_stack text,
  path text,
  app_version text,
  user_agent text
);

alter table public.client_errors enable row level security;

revoke all on public.client_errors from anon, authenticated;

create index if not exists client_errors_created_idx on public.client_errors (created_at desc);

create or replace function public.report_client_error (p_report jsonb) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Crude global brake so a crash loop or abuse can't flood the table.
  if (select count(*) from public.client_errors where created_at > now() - interval '1 minute') >= 300 then
    return;
  end if;

  -- Deliberately not linked to the account: reports are for fixing bugs only.
  insert into public.client_errors (source, message, stack, component_stack, path, app_version, user_agent)
  values (
    left(p_report ->> 'source', 20),
    left(coalesce(p_report ->> 'message', '(no message)'), 500),
    left(p_report ->> 'stack', 4000),
    left(p_report ->> 'componentStack', 4000),
    left(p_report ->> 'path', 200),
    left(p_report ->> 'version', 40),
    left(p_report ->> 'userAgent', 300)
  );
end;
$$;

-- ─── 8. Account deletion actually deletes ───────────────────────────────────
-- request_account_deletion() hides the profile and schedules hard deletion in
-- 30 days; this removes the login itself, which cascades to every table
-- keyed on the user (profile, progress, ratings, daily results, matches).
-- Old error reports go too.
create or replace function public.purge_deleted_accounts () returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  with gone as (
    delete from auth.users u
    using public.profiles p
    where p.id = u.id and p.scheduled_hard_delete_at is not null and p.scheduled_hard_delete_at <= now()
    returning u.id
  )
  select count(*) into n from gone;

  delete from public.client_errors where created_at < now() - interval '90 days';
  return n;
end;
$$;

-- Run it daily with pg_cron where available (Supabase: Database → Extensions).
-- Elsewhere, run `select public.purge_deleted_accounts();` from a scheduler.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('gg-purge-deleted-accounts', '17 3 * * *', 'select public.purge_deleted_accounts()');
exception when others then
  raise notice 'pg_cron not available (%): schedule public.purge_deleted_accounts() another way', sqlerrm;
end;
$$;

-- ─── Grants: exactly what the app calls ─────────────────────────────────────
-- First take EXECUTE away from everything in public (old and new functions),
-- then hand back only the entry points the app uses.
revoke execute on all functions in schema public from public, anon, authenticated;

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (array[
        'get_puzzle_by_id', 'get_next_puzzle_by_theme', 'rpc_server_now', 'report_client_error'
      ])
  loop
    execute format('grant execute on function %s to anon, authenticated', f.sig);
  end loop;

  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (array[
        'request_account_deletion', 'export_my_data',
        'start_daily_attempt', 'submit_daily_guess',
        'mp_create_invite', 'mp_join_invite', 'mp_peek_invite', 'mp_set_ready', 'mp_heartbeat',
        'mp_submit_round', 'mp_claim_forfeit', 'mp_enter_queue', 'mp_leave_queue',
        'mp_poll_matchmaking', 'mp_create_rematch', 'mp_archive_session'
      ])
  loop
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end;
$$;
