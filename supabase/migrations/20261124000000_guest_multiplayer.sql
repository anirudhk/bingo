-- ═══════════════════════════════════════════════════════════════════════════
-- Guest multiplayer (Supabase anonymous sign-ins)
--
-- Guests get a real auth.users row with is_anonymous = true, so every existing
-- rule (auth.uid(), RLS, verified rounds) applies unchanged. On top of that:
--  * guest profiles are private and named guest_…;
--  * matches involving a guest are unrated (throwaway accounts can't farm or
--    feed ratings);
--  * the daily leaderboard stays for real accounts (guests play it offline);
--  * guests inactive for 30 days are deleted by the daily purge.
-- Requires: Authentication → Sign In / Providers → "Allow anonymous sign-ins".
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.internal_is_guest (p_user uuid) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select u.is_anonymous from auth.users u where u.id = p_user), false);
$$;

-- New guests: private profile with a guest_ handle.
create or replace function public.handle_new_user () returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  guest boolean := coalesce(new.is_anonymous, false);
begin
  insert into public.profiles (id, handle, display_name, is_public)
  values (
    new.id,
    case when guest then 'guest_' else 'user_' end || substr(replace(new.id::text, '-', ''), 1, 12),
    coalesce(new.raw_user_meta_data ->> 'full_name', case when guest then 'Guest' else 'Player' end),
    not guest
  );
  return new;
end;
$$;

-- Unrated when either player is a guest.
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

  if p_winner is not null
  and not public.internal_is_guest (s.host_id)
  and not public.internal_is_guest (s.guest_id) then
    perform public.internal_mp_apply_elo (
      p_winner,
      case when p_winner = s.host_id then s.guest_id else s.host_id end
    );
  end if;
end;
$$;

-- Daily leaderboard: accounts only.
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
  if public.internal_is_guest (uid) then
    raise exception 'create an account to join the daily leaderboard';
  end if;

  select ds.puzzle_id into scheduled from public.daily_schedule ds where ds.utc_date = today;
  if scheduled is null then
    raise exception 'no daily puzzle scheduled for %', today;
  end if;

  insert into public.daily_attempts (user_id, utc_date, puzzle_id)
  values (uid, today, scheduled)
  on conflict (user_id, utc_date) do nothing;

  return query
  select a.puzzle_id, a.started_at, a.solved_at is not null, a.wrong_attempts
  from public.daily_attempts a
  where a.user_id = uid and a.utc_date = today;
end;
$$;

-- Purge: deletion requests (unchanged) + guests idle for 30 days.
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

  delete from public.client_errors where created_at < now() - interval '90 days';
  return n + g;
end;
$$;

-- Internal helpers stay off-limits to API roles.
revoke execute on function public.internal_is_guest (uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user () from public, anon, authenticated;
revoke execute on function public.internal_mp_finish (uuid, uuid) from public, anon, authenticated;
revoke execute on function public.purge_deleted_accounts () from public, anon, authenticated;
