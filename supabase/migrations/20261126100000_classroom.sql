-- ═══════════════════════════════════════════════════════════════════════════
-- Classroom live mode
--
-- A teacher opens a room (6-letter code), students join with a nickname as
-- guests (anonymous sign-in: no email, no personal data), everyone races the
-- same sequence of boards for a few minutes, and a live leaderboard shows on
-- the projector.
--
-- Boards come from a shared seed (`<room seed>|<index>`), generated on the
-- client like multiplayer rounds. The first answer for each board index
-- registers that board; every later answer must match it, and every answer is
-- checked (path, signs, target) before it scores. The server keeps time.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.class_rooms (
  id uuid primary key default gen_random_uuid (),
  code text not null unique,
  host_id uuid not null references auth.users (id) on delete cascade,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  duration_sec int not null check (duration_sec between 60 and 1200),
  state text not null default 'lobby' check (state in ('lobby', 'live', 'finished')),
  seed text not null default md5(random()::text || clock_timestamp()::text),
  started_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.class_players (
  room_id uuid not null references public.class_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  nickname text not null,
  score int not null default 0,
  solved int not null default 0,
  last_solved_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id),
  constraint class_players_nickname_unique unique (room_id, nickname)
);

create table if not exists public.class_boards (
  room_id uuid not null references public.class_rooms (id) on delete cascade,
  board_index int not null,
  grid int[] not null,
  target int not null,
  gaps jsonb,
  primary key (room_id, board_index)
);

alter table public.class_rooms enable row level security;
alter table public.class_players enable row level security;
alter table public.class_boards enable row level security;

revoke insert, update, delete on public.class_rooms, public.class_players from anon, authenticated;
revoke all on public.class_boards from anon, authenticated;

-- Members (host or players) can see their room and its leaderboard.
create or replace function public.internal_class_member (p_room uuid) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.class_rooms r where r.id = p_room and r.host_id = auth.uid ())
      or exists (select 1 from public.class_players p where p.room_id = p_room and p.user_id = auth.uid ());
$$;

drop policy if exists class_rooms_members on public.class_rooms;
create policy class_rooms_members on public.class_rooms for
select
  using (public.internal_class_member (id));

drop policy if exists class_players_members on public.class_players;
create policy class_players_members on public.class_players for
select
  using (public.internal_class_member (room_id));

-- Live updates for the projector leaderboard and room state.
do $$
begin
  alter publication supabase_realtime add table public.class_rooms;
exception when others then null;
end;
$$;
do $$
begin
  alter publication supabase_realtime add table public.class_players;
exception when others then null;
end;
$$;

-- Nickname: 2–16 letters, digits or spaces, not on the blocklist.
create or replace function public.internal_clean_nickname (p_name text) returns text
language plpgsql
immutable
as $$
declare
  n text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  squashed text;
  bad text;
begin
  if length(n) < 2 or length(n) > 16 or n !~ '^[A-Za-z0-9 ]+$' then
    return null;
  end if;
  squashed := lower(regexp_replace(n, '[^A-Za-z]', '', 'g'));
  foreach bad in array array[
    'fuck', 'shit', 'bitch', 'cunt', 'dick', 'pussy', 'penis', 'vagina', 'sex',
    'porn', 'nazi', 'hitler', 'nigg', 'fag', 'slut', 'whore', 'rape'
  ] loop
    if position(bad in squashed) > 0 then
      return null;
    end if;
  end loop;
  return n;
end;
$$;

create or replace function public.class_create_room (p_difficulty text, p_duration_sec int) returns table (
  room_id uuid,
  code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid ();
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  c text;
  i int;
  rid uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_difficulty not in ('easy', 'medium', 'hard') then
    raise exception 'invalid difficulty';
  end if;
  if p_duration_sec not in (180, 300, 600) then
    raise exception 'invalid duration';
  end if;
  -- One open room per host at a time.
  update public.class_rooms set state = 'finished' where host_id = uid and state <> 'finished';

  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.class_rooms r where r.code = c);
  end loop;

  insert into public.class_rooms (code, host_id, difficulty, duration_sec)
  values (c, uid, p_difficulty, p_duration_sec)
  returning id into rid;

  return query select rid, c;
end;
$$;

create or replace function public.class_join (p_code text, p_nickname text) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid ();
  r public.class_rooms%rowtype;
  nick text := public.internal_clean_nickname (p_nickname);
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select * into r from public.class_rooms where code = upper(btrim(p_code));
  if not found then
    raise exception 'no room with that code';
  end if;
  if r.state = 'finished' then
    raise exception 'that game has finished';
  end if;
  if nick is null then
    raise exception 'please pick a different nickname';
  end if;
  if exists (select 1 from public.class_players p where p.room_id = r.id and p.user_id = uid) then
    update public.class_players set nickname = nick where room_id = r.id and user_id = uid;
    return r.id;
  end if;
  if exists (select 1 from public.class_players p where p.room_id = r.id and lower(p.nickname) = lower(nick)) then
    raise exception 'that nickname is taken in this room';
  end if;
  if (select count(*) from public.class_players p where p.room_id = r.id) >= 60 then
    raise exception 'this room is full';
  end if;
  insert into public.class_players (room_id, user_id, nickname) values (r.id, uid, nick);
  return r.id;
end;
$$;

create or replace function public.class_start (p_room uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.class_rooms
  set state = 'live', started_at = now(), ends_at = now() + make_interval(secs => duration_sec)
  where id = p_room and host_id = auth.uid () and state = 'lobby';
  if not found then
    raise exception 'only the host can start a waiting room';
  end if;
end;
$$;

create or replace function public.class_end (p_room uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.class_rooms
  set state = 'finished', ends_at = least(coalesce(ends_at, now()), now())
  where id = p_room and host_id = auth.uid () and state <> 'finished';
end;
$$;

create or replace function public.class_submit (
  p_room uuid,
  p_index int,
  p_grid int[],
  p_target int,
  p_gaps jsonb,
  p_tile_ids int[],
  p_operators text[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid ();
  r public.class_rooms%rowtype;
  me public.class_players%rowtype;
  cfg record;
  stored public.class_boards%rowtype;
  rws int[];
  cls int[];
  answer int;
  points int;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select * into r from public.class_rooms where id = p_room;
  if not found or r.state <> 'live' or now() > r.ends_at then
    raise exception 'the game is not running';
  end if;
  select * into me from public.class_players where room_id = p_room and user_id = uid for update;
  if not found then
    raise exception 'join the room first';
  end if;
  -- Boards are solved in order; an index other than the next one is stale.
  if p_index <> me.solved then
    raise exception 'stale board';
  end if;

  select * into cfg from public.internal_mp_config (r.difficulty);
  if coalesce(array_length(p_grid, 1), 0) <> cfg.grid_size * cfg.grid_size
  or exists (select 1 from unnest(p_grid) v where v < 1 or v > 9) then
    raise exception 'invalid grid';
  end if;
  if not public.internal_valid_gaps (p_gaps, cfg.grid_size, cfg.signs_per_gap, cfg.allowed_operators) then
    raise exception 'invalid gap signs';
  end if;

  select * into stored from public.class_boards b where b.room_id = p_room and b.board_index = p_index;
  if not found then
    insert into public.class_boards (room_id, board_index, grid, target, gaps)
    values (p_room, p_index, p_grid, p_target, p_gaps)
    on conflict do nothing;
  elsif stored.grid <> p_grid or stored.target <> p_target or stored.gaps is distinct from p_gaps then
    raise exception 'board does not match';
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

  points := case r.difficulty when 'easy' then 10 when 'medium' then 15 else 20 end;
  update public.class_players
  set solved = solved + 1, score = score + points, last_solved_at = now()
  where room_id = p_room and user_id = uid;

  return jsonb_build_object('solved', me.solved + 1, 'score', me.score + points);
end;
$$;

-- Old rooms are cleaned up by the daily purge.
create or replace function public.purge_deleted_accounts () returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
  g int;
begin
  with gone as (
    delete from auth.users u
    using public.profiles p
    where p.id = u.id and p.scheduled_hard_delete_at is not null and p.scheduled_hard_delete_at <= now()
    returning u.id
  )
  select count(*) into n from gone;

  with idle_guests as (
    delete from auth.users u
    where u.is_anonymous
      and greatest(
        u.created_at,
        coalesce(u.last_sign_in_at, u.created_at),
        coalesce(
          (select max(s.updated_at) from public.mp_sessions s where s.host_id = u.id or s.guest_id = u.id),
          u.created_at
        )
      ) < now() - interval '30 days'
    returning u.id
  )
  select count(*) into g from idle_guests;

  delete from public.class_rooms where created_at < now() - interval '7 days';
  delete from public.client_errors where created_at < now() - interval '90 days';
  return n + g;
end;
$$;

-- Policies run as the querying user, so members need EXECUTE on the helper
-- (it only answers "am I in this room?" for the caller).
revoke execute on function public.internal_class_member (uuid) from public, anon;
grant execute on function public.internal_class_member (uuid) to authenticated;
revoke execute on function public.internal_clean_nickname (text) from public, anon, authenticated;
revoke execute on function public.purge_deleted_accounts () from public, anon, authenticated;
revoke execute on function public.class_create_room (text, int) from public, anon;
revoke execute on function public.class_join (text, text) from public, anon;
revoke execute on function public.class_start (uuid) from public, anon;
revoke execute on function public.class_end (uuid) from public, anon;
revoke execute on function public.class_submit (uuid, int, int[], int, jsonb, int[], text[]) from public, anon;
grant execute on function public.class_create_room (text, int) to authenticated;
grant execute on function public.class_join (text, text) to authenticated;
grant execute on function public.class_start (uuid) to authenticated;
grant execute on function public.class_end (uuid) to authenticated;
grant execute on function public.class_submit (uuid, int, int[], int, jsonb, int[], text[]) to authenticated;
