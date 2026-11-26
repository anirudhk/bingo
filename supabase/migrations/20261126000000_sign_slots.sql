-- ═══════════════════════════════════════════════════════════════════════════
-- Sign slots: each gap shows only some signs (Play-mode difficulty ladder)
--
--   easy:   3×3, 2 numbers, 1 sign per gap (+ − ×)
--   medium: 4×4, 2 numbers, 2 signs per gap
--   hard:   4×4, 3 numbers, 2 signs per gap
-- Mirrors DIFFICULTY_CONFIGS in src/constants/game.ts. Multiplayer rounds now
-- carry the gap signs; both players' boards (signs included) must match, and
-- every sign in an answer must be one its gap actually showed.
-- ═══════════════════════════════════════════════════════════════════════════

drop function if exists public.internal_mp_config (text);

create or replace function public.internal_mp_config (
  p_difficulty text,
  out grid_size int,
  out tiles_count int,
  out allowed_operators text[],
  out signs_per_gap int
)
language sql
immutable
as $$
  select
    case p_difficulty when 'easy' then 3 else 4 end,
    case p_difficulty when 'hard' then 3 else 2 end,
    array['+', '-', '*'],
    case p_difficulty when 'easy' then 1 else 2 end;
$$;

-- Gap signs must cover every gap of the board with exactly k distinct,
-- allowed signs. (k = all signs means the client may send null.)
create or replace function public.internal_valid_gaps (
  p_gaps jsonb,
  p_grid_size int,
  p_signs int,
  p_allowed text[]
) returns boolean
language plpgsql
immutable
as $$
declare
  r int;
  c int;
  keys text[] := array[]::text[];
  k text;
  signs jsonb;
begin
  if p_signs >= coalesce(array_length(p_allowed, 1), 0) and p_gaps is null then
    return true;
  end if;
  if p_gaps is null or jsonb_typeof(p_gaps) <> 'object' then
    return false;
  end if;
  for r in 0..p_grid_size - 1 loop
    for c in 0..p_grid_size - 1 loop
      if c < p_grid_size - 1 then keys := keys || ('h:' || r || ':' || c); end if;
      if r < p_grid_size - 1 then keys := keys || ('v:' || r || ':' || c); end if;
    end loop;
  end loop;
  if (select count(*) from jsonb_object_keys(p_gaps)) <> coalesce(array_length(keys, 1), 0) then
    return false;
  end if;
  foreach k in array keys loop
    signs := p_gaps -> k;
    if signs is null or jsonb_typeof(signs) <> 'array' or jsonb_array_length(signs) <> p_signs then
      return false;
    end if;
    if (select count(distinct v) from jsonb_array_elements_text(signs) v) <> p_signs
    or exists (select 1 from jsonb_array_elements_text(signs) v where not (v = any (p_allowed))) then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

-- Answer checker learns per-gap signs (old 7-argument version replaced).
drop function if exists public.internal_eval_path (int[], int[], int[], int[], text[], text[], int);

create or replace function public.internal_eval_path (
  p_values int[],
  p_rows int[],
  p_cols int[],
  p_tile_ids int[],
  p_operators text[],
  p_allowed_operators text[],
  p_tiles_count int,
  p_gap_ops jsonb default null
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
  gap text;
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
    -- When the board shows only some signs per gap, the sign must be one of them.
    if p_gap_ops is not null then
      if p_rows[p_tile_ids[i] + 1] = p_rows[p_tile_ids[i + 1] + 1] then
        gap := 'h:' || p_rows[p_tile_ids[i] + 1] || ':' || least(p_cols[p_tile_ids[i] + 1], p_cols[p_tile_ids[i + 1] + 1]);
      else
        gap := 'v:' || least(p_rows[p_tile_ids[i] + 1], p_rows[p_tile_ids[i + 1] + 1]) || ':' || p_cols[p_tile_ids[i] + 1];
      end if;
      if not coalesce((p_gap_ops -> gap) ? p_operators[i], false) then
        return null;
      end if;
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

alter table public.mp_round_grids
add column if not exists gaps jsonb;

drop function if exists public.mp_submit_round (uuid, int, int[], int, int[], text[], int, text);

create or replace function public.mp_submit_round (
  p_session uuid,
  p_round int,
  p_grid int[],
  p_target int,
  p_gaps jsonb,
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
  if not public.internal_valid_gaps (p_gaps, cfg.grid_size, cfg.signs_per_gap, cfg.allowed_operators) then
    raise exception 'invalid gap signs';
  end if;

  -- Both players must have been shown the same board.
  select * into stored from public.mp_round_grids g where g.session_id = p_session and g.round_number = p_round;
  if not found then
    insert into public.mp_round_grids (session_id, round_number, grid, target, gaps)
    values (p_session, p_round, p_grid, p_target, p_gaps);
  elsif stored.grid <> p_grid or stored.target <> p_target or stored.gaps is distinct from p_gaps then
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

  answer := public.internal_eval_path (p_grid, rws, cls, p_tile_ids, p_operators, cfg.allowed_operators, cfg.tiles_count, p_gaps);
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

revoke execute on function public.internal_mp_config (text) from public, anon, authenticated;
revoke execute on function public.internal_valid_gaps (jsonb, int, int, text[]) from public, anon, authenticated;
revoke execute on function public.internal_eval_path (int[], int[], int[], int[], text[], text[], int, jsonb) from public, anon, authenticated;
revoke execute on function public.mp_submit_round (uuid, int, int[], int, jsonb, int[], text[], int, text) from public, anon;
grant execute on function public.mp_submit_round (uuid, int, int[], int, jsonb, int[], text[], int, text) to authenticated;
