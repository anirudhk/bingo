-- Phase 4 — Multiplayer (excludes spectator EPIC-38 + chat EPIC-39 per product scope).
-- Requires Phase 3 profiles + user_ratings.

-- ─── Sessions ───────────────────────────────────────────────────────────────
create table if not exists public.mp_sessions (
  id uuid primary key default gen_random_uuid (),
  invite_token text not null,
  host_id uuid not null references public.profiles (id) on delete cascade,
  guest_id uuid references public.profiles (id) on delete cascade,
  state text not null default 'pending' check (
    state in ('pending', 'active', 'finished', 'archived')
  ),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  total_rounds int not null default 3 check (total_rounds >= 1 and total_rounds <= 10),
  time_control_sec int check (time_control_sec is null or time_control_sec > 0),
  current_round int not null default 1,
  round_seed text,
  host_round_wins int not null default 0,
  guest_round_wins int not null default 0,
  host_ready boolean not null default false,
  guest_ready boolean not null default false,
  winner_user_id uuid references public.profiles (id),
  rematch_of uuid references public.mp_sessions (id),
  rating_bracket_mu double precision,
  rating_bracket_half double precision,
  round_started_at timestamptz,
  finished_at timestamptz,
  archived_at timestamptz,
  host_last_seen timestamptz,
  guest_last_seen timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mp_sessions_token_unique unique (invite_token)
);

create index if not exists mp_sessions_state_idx on public.mp_sessions (state);

create table if not exists public.mp_round_submissions (
  session_id uuid not null references public.mp_sessions (id) on delete cascade,
  round_number int not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  solve_time_ms int not null check (solve_time_ms >= 0),
  wrong_attempts int not null default 0 check (wrong_attempts >= 0),
  timing_hash text,
  created_at timestamptz not null default now(),
  primary key (session_id, round_number, user_id)
);

-- ─── Matchmaking ───────────────────────────────────────────────────────────
create table if not exists public.matchmaking_queue (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  rating_mu double precision not null default 1500,
  rating_rd double precision not null default 350,
  bracket_half double precision not null default 150,
  joined_at timestamptz not null default now(),
  last_expand_at timestamptz not null default now()
);

-- ─── Open challenges (public lobby list) ──────────────────────────────────
create table if not exists public.mp_public_invites (
  session_id uuid primary key references public.mp_sessions (id) on delete cascade,
  listed_at timestamptz not null default now()
);

-- ─── Anti-cheat + moderation (EPIC-41) ─────────────────────────────────────
create table if not exists public.cheat_flags (
  id bigserial primary key,
  user_id uuid references public.profiles (id) on delete set null,
  session_id uuid references public.mp_sessions (id) on delete set null,
  flag_type text not null,
  detail jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text
);

create table if not exists public.moderator_queue (
  id bigserial primary key,
  flag_id bigint not null references public.cheat_flags (id) on delete cascade,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

-- ─── Realtime (Supabase) ───────────────────────────────────────────────────
alter table public.mp_sessions replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.mp_sessions;
exception
  when others then
    -- Publication missing or table already added — enable Realtime in dashboard if needed.
    null;
end
$$;

-- ─── RLS ───────────────────────────────────────────────────────────────────
alter table public.mp_sessions enable row level security;
alter table public.mp_round_submissions enable row level security;
alter table public.matchmaking_queue enable row level security;
alter table public.mp_public_invites enable row level security;
alter table public.cheat_flags enable row level security;
alter table public.moderator_queue enable row level security;

create policy mp_session_select on public.mp_sessions for
select
  using (
    auth.uid () = host_id
    or auth.uid () = guest_id
  );

-- Listed open challenges: anyone signed in can see pending host rows (for lobby browser).
create policy mp_session_public_pending on public.mp_sessions for
select
  using (
    state = 'pending'
    and guest_id is null
    and exists (
      select
        1
      from
        public.mp_public_invites p
      where
        p.session_id = mp_sessions.id
    )
  );

create policy mp_round_select on public.mp_round_submissions for
select
  using (
    exists (
      select
        1
      from
        public.mp_sessions s
      where
        s.id = mp_round_submissions.session_id
        and (
          auth.uid () = s.host_id
          or auth.uid () = s.guest_id
        )
    )
  );

create policy mp_queue_own on public.matchmaking_queue for all using (user_id = auth.uid ())
with
  check (user_id = auth.uid ());

create policy mp_public_read on public.mp_public_invites for
select
  using (true);

create policy mp_flags_no_public on public.cheat_flags for
select
  using (false);

create policy mp_mod_no_public on public.moderator_queue for
select
  using (false);

-- ─── Touch updated_at ──────────────────────────────────────────────────────
create or replace function public.touch_mp_session_updated_at () returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mp_sessions_touch on public.mp_sessions;

create trigger mp_sessions_touch
before update on public.mp_sessions for each row
execute function public.touch_mp_session_updated_at ();

-- ─── Server clock helper (EPIC-34.03) ──────────────────────────────────────
create or replace function public.rpc_server_now () returns timestamptz
language sql
stable
security invoker
set search_path = public
as $$
  select now();
$$;

grant execute on function public.rpc_server_now () to authenticated;

-- ─── Rating helpers (multiplayer ELO MVP — EPIC-40; swap for Glicko Edge fn later) ──
create or replace function public.internal_mp_get_mu (p_user uuid) returns double precision
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select
        rating
      from
        public.user_ratings
      where
        user_id = p_user
        and mode = 'multiplayer'
    ),
    1500::double precision
  );
$$;

create or replace function public.internal_mp_apply_elo (p_winner uuid, p_loser uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rw float;
  rl float;
  ew float;
  el float;
  k constant float := 32;
  nw float;
  nl float;
begin
  rw := internal_mp_get_mu (p_winner);
  rl := internal_mp_get_mu (p_loser);
  ew := 1 / (1 + power(10::double precision, (rl - rw) / 400));
  el := 1 / (1 + power(10::double precision, (rw - rl) / 400));
  nw := rw + k * (1 - ew);
  nl := rl + k * (0 - el);

  insert into public.user_ratings(user_id, mode, rating, rd, vol)
    values (p_winner, 'multiplayer', nw, 280, 0.06)
  on conflict (user_id, mode) do update
  set
    rating = excluded.rating,
    updated_at = now();

  insert into public.user_ratings(user_id, mode, rating, rd, vol)
    values (p_loser, 'multiplayer', nl, 280, 0.06)
  on conflict (user_id, mode) do update
  set
    rating = excluded.rating,
    updated_at = now();

  insert into public.rating_history(user_id, mode, rating, rd)
    values (p_winner, 'multiplayer', nw, 280),
(p_loser, 'multiplayer', nl, 280);
end;
$$;

-- ─── Create invite ──────────────────────────────────────────────────────────
create or replace function public.mp_create_invite (
  p_difficulty text,
  p_rounds int,
  p_time_sec int,
  p_public boolean,
  p_bracket_mu double precision default null,
  p_bracket_half double precision default null
) returns table (
  session_id uuid,
  token text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid ();
  tok text;
  sid uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  tok := encode(gen_random_bytes (9), 'hex');

  insert into public.mp_sessions (
    invite_token,
    host_id,
    difficulty,
    total_rounds,
    time_control_sec,
    rating_bracket_mu,
    rating_bracket_half
  )
  values (
    tok,
    uid,
    p_difficulty,
    least(greatest(p_rounds, 1), 10),
    p_time_sec,
    coalesce(p_bracket_mu, internal_mp_get_mu (uid)),
    coalesce(p_bracket_half, 150::double precision)
  )
  returning
    id,
    invite_token into sid,
    tok;

  if p_public then
    insert into public.mp_public_invites (session_id)
    values (sid);
  end if;

  return query
  select
    sid,
    tok;
end;
$$;

grant execute on function public.mp_create_invite (text, int, int, boolean, double precision, double precision) to authenticated;

-- ─── Join by token ──────────────────────────────────────────────────────────
create or replace function public.mp_join_invite (p_token text) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid ();
  sid uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  update public.mp_sessions s
  set
    guest_id = uid,
    updated_at = now()
  where
    s.invite_token = p_token
    and s.state = 'pending'
    and s.guest_id is null
    and s.host_id <> uid
  returning
    s.id into sid;

  if sid is null then
    raise exception 'invite invalid or full';
  end if;

  delete from public.mp_public_invites p
  where
    p.session_id = sid;

  return sid;
end;
$$;

grant execute on function public.mp_join_invite (text) to authenticated;

-- Peek pending invite (for join screen copy)
create or replace function public.mp_peek_invite (p_token text) returns table (
  session_id uuid,
  difficulty text,
  host_handle text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.difficulty,
    p.handle
  from
    public.mp_sessions s
    inner join public.profiles p on p.id = s.host_id
  where
    s.invite_token = p_token
    and s.state = 'pending'
    and s.guest_id is null;
$$;

grant execute on function public.mp_peek_invite (text) to authenticated;

-- ─── Ready toggle → active ──────────────────────────────────────────────────
create or replace function public.mp_set_ready (p_session uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid ();
  s public.mp_sessions%rowtype;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select
    * into strict s
  from
    public.mp_sessions
  where
    id = p_session
  for update;

  if s.host_id <> uid
  and s.guest_id <> uid then
    raise exception 'not a participant';
  end if;

  if s.host_id = uid then
    update public.mp_sessions
    set
      host_ready = true
    where
      id = p_session;
  else
    update public.mp_sessions
    set
      guest_ready = true
    where
      id = p_session;
  end if;

  select
    * into strict s
  from
    public.mp_sessions
  where
    id = p_session;

  if s.state = 'pending'
  and s.guest_id is not null
  and s.host_ready
  and s.guest_ready then
    update public.mp_sessions
    set
      state = 'active',
      round_started_at = now(),
      round_seed = id::text || '|1|' || floor(extract(epoch from now()))::text,
      current_round = 1
    where
      id = p_session;
  end if;
end;
$$;

grant execute on function public.mp_set_ready (uuid) to authenticated;

-- ─── Heartbeat / disconnect soft signal ────────────────────────────────────
create or replace function public.mp_heartbeat (p_session uuid) returns void
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

  update public.mp_sessions s
  set
    host_last_seen = case when uid = s.host_id then now() else s.host_last_seen end,
    guest_last_seen = case when uid = s.guest_id then now() else s.guest_last_seen end
  where
    s.id = p_session
    and (
      uid = s.host_id
      or uid = s.guest_id
    );
end;
$$;

grant execute on function public.mp_heartbeat (uuid) to authenticated;

-- ─── Submit round result ─────────────────────────────────────────────────────
create or replace function public.mp_submit_round (
  p_session uuid,
  p_round int,
  p_solve_ms int,
  p_wrong int,
  p_timing_hash text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid ();
  s public.mp_sessions%rowtype;
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

  select
    * into strict s
  from
    public.mp_sessions
  where
    id = p_session
  for update;

  if s.state <> 'active' then
    raise exception 'session not active';
  end if;

  if p_round <> s.current_round then
    raise exception 'stale round';
  end if;

  if uid <> s.host_id
  and uid <> s.guest_id then
    raise exception 'not a participant';
  end if;

  -- EPIC-41 heuristic: impossibly fast solves
  if p_solve_ms < 400 then
    insert into public.cheat_flags(user_id, session_id, flag_type, detail)
      values (uid, p_session, 'fast_solve', jsonb_build_object('ms', p_solve_ms));

    insert into public.moderator_queue(flag_id)
    select
      id
    from
      public.cheat_flags
    order by
      id desc
    limit 1;
  end if;

  insert into public.mp_round_submissions (
    session_id,
    round_number,
    user_id,
    solve_time_ms,
    wrong_attempts,
    timing_hash
  )
  values (
    p_session,
    p_round,
    uid,
    p_solve_ms,
    p_wrong,
    p_timing_hash
  )
  on conflict (session_id, round_number, user_id) do update
  set
    solve_time_ms = excluded.solve_time_ms,
    wrong_attempts = excluded.wrong_attempts,
    timing_hash = excluded.timing_hash;

  select
    count(*) into subs
  from
    public.mp_round_submissions r
  where
    r.session_id = p_session
    and r.round_number = p_round;

  if subs < 2 then
    return;
  end if;

  select
    r.solve_time_ms,
    r.wrong_attempts into host_ms,
    host_wr
  from
    public.mp_round_submissions r
  where
    r.session_id = p_session
    and r.round_number = p_round
    and r.user_id = s.host_id;

  select
    r.solve_time_ms,
    r.wrong_attempts into guest_ms,
    guest_wr
  from
    public.mp_round_submissions r
  where
    r.session_id = p_session
    and r.round_number = p_round
    and r.user_id = s.guest_id;

  if host_ms < guest_ms or (
    host_ms = guest_ms
    and host_wr < guest_wr
  ) then
    round_winner := s.host_id;
  elsif guest_ms < host_ms or (
    guest_ms = host_ms
    and guest_wr < host_wr
  ) then
    round_winner := s.guest_id;
  else
    round_winner := null;
  end if;

  hw := s.host_round_wins;
  gw := s.guest_round_wins;

  if round_winner = s.host_id then
    hw := hw + 1;
  elsif round_winner = s.guest_id then
    gw := gw + 1;
  end if;

  if p_round >= s.total_rounds then
    update public.mp_sessions
    set
      host_round_wins = hw,
      guest_round_wins = gw,
      state = 'finished',
      finished_at = now(),
      winner_user_id = case
        when hw > gw then s.host_id
        when gw > hw then s.guest_id
        else null
      end,
      round_seed = null,
      round_started_at = null
    where
      id = p_session;

    -- Ratings when decisive winner
    if hw <> gw then
      perform internal_mp_apply_elo (
        case
          when hw > gw then s.host_id
          else s.guest_id
        end,
        case
          when hw > gw then s.guest_id
          else s.host_id
        end
      );
    end if;

    return;
  end if;

  update public.mp_sessions
  set
    host_round_wins = hw,
    guest_round_wins = gw,
    current_round = p_round + 1,
    round_seed = id::text || '|' || (p_round + 1)::text || '|' || floor(extract(epoch from now()))::text,
    round_started_at = now(),
    updated_at = now()
  where
    id = p_session;

  delete from public.mp_round_submissions r
  where
    r.session_id = p_session
    and r.round_number = p_round;
end;
$$;

grant execute on function public.mp_submit_round (uuid, int, int, int, text) to authenticated;

-- ─── Matchmaking ───────────────────────────────────────────────────────────
create or replace function public.mp_enter_queue (p_difficulty text) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid ();
  mu double precision;
  rd double precision;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  mu := internal_mp_get_mu (uid);

  select
    coalesce(r.rd, 350::double precision) into rd
  from
    public.user_ratings r
  where
    r.user_id = uid
    and r.mode = 'multiplayer';

  if rd is null then
    rd := 350;
  end if;

  insert into public.matchmaking_queue(user_id, difficulty, rating_mu, rating_rd, bracket_half)
    values (uid, p_difficulty, mu, rd, 150)
  on conflict (user_id) do update
  set
    difficulty = excluded.difficulty,
    rating_mu = excluded.rating_mu,
    rating_rd = excluded.rating_rd,
    bracket_half = 150,
    joined_at = now(),
    last_expand_at = now();
end;
$$;

grant execute on function public.mp_enter_queue (text) to authenticated;

create or replace function public.mp_leave_queue () returns void
language sql
security definer
set search_path = public
as $$
  delete from public.matchmaking_queue q
  where
    q.user_id = auth.uid ();
$$;

grant execute on function public.mp_leave_queue () to authenticated;

create or replace function public.mp_poll_matchmaking () returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid ();
  me public.matchmaking_queue%rowtype;
  partner uuid;
  sid uuid;
  tok text;
  expanded_half double precision;
  pmu double precision;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select
    * into me
  from
    public.matchmaking_queue
  where
    user_id = uid
  for update;

  if not found then
    return null;
  end if;

  expanded_half := me.bracket_half + floor(extract(epoch from (now() - me.joined_at)) / 10)::double precision * 50;

  update public.matchmaking_queue
  set
    bracket_half = expanded_half,
    last_expand_at = now()
  where
    user_id = uid;

  select
    mq2.user_id into partner
  from
    public.matchmaking_queue mq2
  where
    mq2.user_id <> me.user_id
    and mq2.difficulty = me.difficulty
    and abs(mq2.rating_mu - me.rating_mu) <= expanded_half + mq2.bracket_half
  order by
    mq2.joined_at asc
  limit 1;

  if partner is null then
    return null;
  end if;

  select
    mq.rating_mu into pmu
  from
    public.matchmaking_queue mq
  where
    mq.user_id = partner;

  tok := encode(gen_random_bytes (9), 'hex');

  insert into public.mp_sessions (
    invite_token,
    host_id,
    guest_id,
    difficulty,
    total_rounds,
    rating_bracket_mu,
    rating_bracket_half,
    host_ready,
    guest_ready,
    state,
    round_started_at,
    round_seed,
    current_round
  )
  values (
    tok,
    case
      when uid::text < partner::text then uid
      else partner
    end,
    case
      when uid::text < partner::text then partner
      else uid
    end,
    me.difficulty,
    3,
    (me.rating_mu + coalesce(pmu, me.rating_mu)) / 2,
    expanded_half,
    true,
    true,
    'active',
    now(),
    'pending-seed',
    1
  )
  returning
    id into sid;

  update public.mp_sessions
  set
    round_seed = sid::text || '|1|' || floor(extract(epoch from now()))::text
  where
    id = sid;

  delete from public.matchmaking_queue
  where
    user_id in (uid, partner);

  return sid;
end;
$$;

grant execute on function public.mp_poll_matchmaking () to authenticated;

-- ─── Rematch ────────────────────────────────────────────────────────────────
create or replace function public.mp_create_rematch (p_prev uuid) returns table (
  session_id uuid,
  token text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid ();
  prev public.mp_sessions%rowtype;
  tok text;
  sid uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select
    * into strict prev
  from
    public.mp_sessions
  where
    id = p_prev;

  if prev.state <> 'finished' then
    raise exception 'previous session not finished';
  end if;

  if uid <> prev.host_id
  and uid <> prev.guest_id then
    raise exception 'not a participant';
  end if;

  tok := encode(gen_random_bytes (9), 'hex');

  insert into public.mp_sessions (
    invite_token,
    host_id,
    guest_id,
    difficulty,
    total_rounds,
    time_control_sec,
    rematch_of,
    rating_bracket_mu,
    rating_bracket_half,
    host_ready,
    guest_ready,
    state,
    round_started_at,
    round_seed,
    current_round
  )
  values (
    tok,
    prev.host_id,
    prev.guest_id,
    prev.difficulty,
    prev.total_rounds,
    prev.time_control_sec,
    p_prev,
    prev.rating_bracket_mu,
    prev.rating_bracket_half,
    true,
    true,
    'active',
    now(),
    gen_random_uuid ()::text || '|1|' || floor(extract(epoch from now()))::text,
    1
  )
  returning
    id,
    invite_token into sid,
    tok;

  return query
  select
    sid,
    tok;
end;
$$;

grant execute on function public.mp_create_rematch (uuid) to authenticated;

-- ─── Archive finished sessions (client or cron) ─────────────────────────────
create or replace function public.mp_archive_session (p_session uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid ();
begin
  update public.mp_sessions s
  set
    state = 'archived',
    archived_at = now()
  where
    s.id = p_session
    and s.state = 'finished'
    and (
      uid = s.host_id
      or uid = s.guest_id
    );
end;
$$;

grant execute on function public.mp_archive_session (uuid) to authenticated;
