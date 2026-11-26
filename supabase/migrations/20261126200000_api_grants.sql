-- ═══════════════════════════════════════════════════════════════════════════
-- Explicit API grants
--
-- This project's default privileges give the API roles (anon, authenticated)
-- no SELECT/INSERT/UPDATE/DELETE on new tables — only TRUNCATE, REFERENCES
-- and TRIGGER. So every table the app reads directly was unreadable. Grant
-- exactly what the app uses; row-level security still decides which rows.
-- Also take away TRUNCATE / REFERENCES / TRIGGER, which the API never needs.
-- ═══════════════════════════════════════════════════════════════════════════

-- No stray privileges on any public table (TRUNCATE ignores RLS).
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke truncate, references, trigger on public.%I from anon, authenticated', t.tablename);
  end loop;
end;
$$;

alter default privileges in schema public revoke truncate, references, trigger on tables from anon, authenticated;

-- Public data (signed in or not). RLS: puzzles/themes readable by all;
-- profiles only public ones (or your own); schedule only today and earlier.
grant select on public.puzzles, public.puzzle_themes, public.themes to anon, authenticated;
grant select on public.daily_schedule, public.daily_leaderboard_entries to anon, authenticated;
grant select on public.profiles to anon, authenticated;

-- Signed-in players (own rows / rooms they're in — enforced by RLS).
grant select on public.user_ratings, public.rating_history, public.daily_attempts to authenticated;
grant select, insert, update on public.user_progress to authenticated;
grant select on public.mp_sessions, public.mp_round_submissions, public.mp_public_invites to authenticated;
grant select on public.matchmaking_queue to authenticated;
grant select on public.class_rooms, public.class_players to authenticated;

-- Profile edits stay limited to cosmetic columns.
grant update (handle, display_name, avatar_url, country_code, bio, is_public) on public.profiles to authenticated;

-- Everything else (cheat_flags, moderator_queue, client_errors, mp_round_grids,
-- class_boards, reserved_handles, _gg_migrations) is reachable only through
-- security-definer functions.
