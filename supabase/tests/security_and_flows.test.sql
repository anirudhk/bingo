-- Security + behaviour checks for the Supabase schema. Run with `npm run db:test`.
-- Every check prints PASS/FAIL; the runner fails if any FAIL appears.
-- Expects fixtures.sql and glicko_checks.sql (made by scripts/db-test-fixtures.ts) in the working dir.
\set QUIET on
\set ON_ERROR_STOP off
\i fixtures.sql
insert into auth.users(id, email) values
  ('11111111-1111-1111-1111-111111111111','a@x.test'),
  ('22222222-2222-2222-2222-222222222222','b@x.test');
create function pg_temp.check(label text, ok boolean, info text default '') returns void language plpgsql as $$
begin raise notice '% : %  %', case when ok then 'PASS' else 'FAIL' end, label, coalesce(info,''); end $$;
-- Runs stmt as a role/user; returns error text or null on success.
create function pg_temp.run(stmt text, as_role text, uid text) returns text language plpgsql as $$
declare err text;
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid,''), true);
  execute format('set local role %I', as_role);
  begin execute stmt; err := null;
  exception when others then err := sqlerrm; end;
  reset role;
  return err;
end $$;
create function pg_temp.blocked(label text, stmt text, as_role text, uid text) returns void language plpgsql as $$
declare e text := pg_temp.run(stmt, as_role, uid);
begin perform pg_temp.check('blocked: ' || label, e is not null, coalesce(e,'(statement succeeded)')); end $$;
\set A '11111111-1111-1111-1111-111111111111'
\set B '22222222-2222-2222-2222-222222222222'

begin;
-- ─── Attacks ───
select pg_temp.blocked('anon calls internal_mp_apply_elo', $q$select public.internal_mp_apply_elo('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222')$q$, 'anon', null);
select pg_temp.blocked('player calls internal_mp_apply_elo', $q$select public.internal_mp_apply_elo('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222')$q$, 'authenticated', :'A');
select pg_temp.blocked('apply_user_rating (removed)', $q$select public.apply_user_rating('daily',3000,30,0.06)$q$, 'authenticated', :'A');
select pg_temp.blocked('write user_ratings directly', $q$insert into public.user_ratings(user_id,mode,rating,rd,vol) values ('11111111-1111-1111-1111-111111111111','hard',2999,30,0.06)$q$, 'authenticated', :'A');
select pg_temp.blocked('insert 0-second leaderboard row', $q$insert into public.daily_leaderboard_entries(puzzle_utc_date,user_id,puzzle_id,seconds,wrong_attempts) values (current_date,'11111111-1111-1111-1111-111111111111','p-addition-only-easy-0000',0,0)$q$, 'authenticated', :'A');
select pg_temp.blocked('submit_daily_leaderboard (removed)', $q$select public.submit_daily_leaderboard(current_date,'x',0,0)$q$, 'authenticated', :'A');
select pg_temp.blocked('bump_server_daily_streak (removed)', $q$select public.bump_server_daily_streak(current_date)$q$, 'authenticated', :'A');
select pg_temp.blocked('read parent_email (column removed)', $q$select parent_email from public.profiles$q$, 'anon', null);
select pg_temp.blocked('set own streak via profile update', $q$update public.profiles set server_daily_streak_count = 999 where id = '11111111-1111-1111-1111-111111111111'$q$, 'authenticated', :'A');
select pg_temp.check('player can still edit display name', pg_temp.run($q$update public.profiles set display_name = 'Ann' where id = '11111111-1111-1111-1111-111111111111'$q$, 'authenticated', :'A') is null);
select pg_temp.blocked('insert own daily_attempts row', $q$insert into public.daily_attempts(user_id,utc_date,puzzle_id,started_at) values ('11111111-1111-1111-1111-111111111111',current_date,'p-addition-only-easy-0000',now()-interval '1 day')$q$, 'authenticated', :'A');
select pg_temp.blocked('insert mp_round_submissions directly', $q$insert into public.mp_round_submissions(session_id,round_number,user_id,solve_time_ms) values (gen_random_uuid(),1,'11111111-1111-1111-1111-111111111111',1)$q$, 'authenticated', :'A');
select pg_temp.blocked('anon reads client_errors', $q$select 1/count(*) from public.client_errors$q$, 'anon', null);
select pg_temp.blocked('anon calls start_daily_attempt', $q$select public.start_daily_attempt()$q$, 'anon', null);
select pg_temp.blocked('anon calls mp_submit_round', $q$select public.mp_submit_round(gen_random_uuid(),1,'{}',1,null,'{}','{}',0,'')$q$, 'anon', null);
select pg_temp.blocked('set_parent_email (removed)', $q$select public.set_parent_email('x@y.z')$q$, 'authenticated', :'A');
-- Every new internal helper must be off-limits to API roles.
select pg_temp.blocked('anon calls internal_mp_finish', $q$select public.internal_mp_finish(gen_random_uuid(), null)$q$, 'anon', null);
select pg_temp.blocked('player calls internal_mp_finish', $q$select public.internal_mp_finish(gen_random_uuid(), '11111111-1111-1111-1111-111111111111')$q$, 'authenticated', :'A');
select pg_temp.blocked('player calls internal_glicko2', $q$select public.internal_glicko2(1500,350,0.06,1500,350,1)$q$, 'authenticated', :'A');
select pg_temp.blocked('player calls internal_eval_path', $q$select public.internal_eval_path('{1}','{0}','{0}','{0}','{}','{+}',1)$q$, 'authenticated', :'A');
select pg_temp.blocked('player calls internal_mp_config', $q$select public.internal_mp_config('easy')$q$, 'authenticated', :'A');
select pg_temp.blocked('anon calls purge_deleted_accounts', $q$select public.purge_deleted_accounts()$q$, 'anon', null);
select pg_temp.blocked('anon calls handle_new_user', $q$select public.handle_new_user()$q$, 'anon', null);
-- Audit: list any public-schema function the API roles can still execute.
select pg_temp.check('only allow-listed functions are callable by anon/authenticated',
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))
      and p.proname <> all (array['get_puzzle_by_id','get_next_puzzle_by_theme','rpc_server_now','report_client_error',
        'request_account_deletion','export_my_data','start_daily_attempt','submit_daily_guess','mp_create_invite',
        'mp_join_invite','mp_peek_invite','mp_set_ready','mp_heartbeat','mp_submit_round','mp_claim_forfeit',
        'mp_enter_queue','mp_leave_queue','mp_poll_matchmaking','mp_create_rematch','mp_archive_session'])
  ),
  (select string_agg(p.proname, ', ') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))
      and p.proname <> all (array['get_puzzle_by_id','get_next_puzzle_by_theme','rpc_server_now','report_client_error',
        'request_account_deletion','export_my_data','start_daily_attempt','submit_daily_guess','mp_create_invite',
        'mp_join_invite','mp_peek_invite','mp_set_ready','mp_heartbeat','mp_submit_round','mp_claim_forfeit',
        'mp_enter_queue','mp_leave_queue','mp_poll_matchmaking','mp_create_rematch','mp_archive_session'])));
-- ─── Error reports: anon can write, nobody can read ───
select pg_temp.check('anon can file an error report', pg_temp.run($q$select public.report_client_error('{"message":"boom","source":"window","path":"/bingo/"}')$q$, 'anon', null) is null);
select pg_temp.check('error report stored', (select count(*) from public.client_errors) = 1);
commit;

-- ─── Glicko-2 matches the npm library the app used ───
\i glicko_checks.sql

-- ─── Daily flow ───
begin;
insert into public.daily_schedule values ((now() at time zone 'utc')::date, :'easy_id'), ((now() at time zone 'utc')::date + 1, 'p-addition-only-easy-0000');
commit;
select pg_temp.blocked('read tomorrow''s scheduled puzzle', $q$select 1/count(*) from public.daily_schedule where utc_date > (now() at time zone 'utc')::date$q$, 'authenticated', :'A');
select pg_temp.blocked('guess before starting', $q$select public.submit_daily_guess('{0,1}','{+}')$q$, 'authenticated', :'A');
select pg_temp.check('start daily attempt', pg_temp.run($q$select public.start_daily_attempt()$q$, 'authenticated', :'A') is null);
-- pretend the player started 42 seconds ago
update public.daily_attempts set started_at = now() - interval '42 seconds';
select pg_temp.check('restart keeps original start time', pg_temp.run($q$select public.start_daily_attempt()$q$, 'authenticated', :'A') is null and (select now() - started_at > interval '40 seconds' from public.daily_attempts));
do $$ declare r jsonb; begin
  perform set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false); set role authenticated;
  r := public.submit_daily_guess('{0,4}', '{+}');  -- diagonal: illegal path
  reset role; perform pg_temp.check('illegal (diagonal) path counts as wrong', (r->>'correct')::boolean = false and (r->>'wrong_attempts')::int = 1, r::text);
  set role authenticated; r := public.submit_daily_guess('{0,1}', '{*}');  -- operator not offered on this puzzle
  reset role; perform pg_temp.check('operator not offered counts as wrong', (r->>'correct')::boolean = false and (r->>'wrong_attempts')::int = 2, r::text);
end $$;
do $$ declare r jsonb; ids int[]; ops text[]; begin
  select array(select jsonb_array_elements_text(optimal_solution->'tileIds')::int), array(select jsonb_array_elements_text(optimal_solution->'operators')) into ids, ops from public.puzzles where id = 'p-addition-only-easy-0000';
  perform set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false); set role authenticated;
  r := public.submit_daily_guess(ids, ops);
  reset role;
  perform pg_temp.check('correct answer accepted, server-timed', (r->>'correct')::boolean and (r->>'seconds')::int between 41 and 45 and (r->>'wrong_attempts')::int = 2 and (r->>'streak')::int = 1, r::text);
  set role authenticated; r := public.submit_daily_guess(ids, ops); reset role;
  perform pg_temp.check('second solve does not re-score', (r->>'already_solved')::boolean, r::text);
end $$;
select pg_temp.check('exactly one leaderboard row, seconds from server', (select count(*) = 1 and min(seconds) between 41 and 45 and min(wrong_attempts) = 2 from public.daily_leaderboard_entries));
select pg_temp.check('daily rating written server-side', (select count(*) = 1 from public.user_ratings where mode = 'daily') and (select count(*) = 1 from public.rating_history where mode = 'daily'));
select pg_temp.check('streak written server-side', (select server_daily_streak_count = 1 from public.profiles where id = :'A'));

-- ─── Multiplayer ───
-- easy: 3x3 grid, 2 tiles, + and - only. Grid 1..9 in order; target 3 = tile0(1) + tile1(2).
insert into public.mp_sessions(id, invite_token, host_id, guest_id, state, difficulty, total_rounds, current_round, round_started_at, host_last_seen, guest_last_seen)
values
 ('aaaaaaaa-0000-0000-0000-000000000001','t1',:'A',:'B','active','easy',1,1, now() - interval '5 seconds', now(), now()),
 ('aaaaaaaa-0000-0000-0000-000000000002','t2',:'A',:'B','active','easy',1,1, now() - interval '5 seconds', now(), now()),
 ('aaaaaaaa-0000-0000-0000-000000000003','t3',:'A',:'B','active','easy',3,1, now() - interval '5 seconds', now(), now() - interval '2 minutes');
do $$ declare r jsonb; e text; begin
  perform set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false); set role authenticated;
  begin perform public.mp_submit_round('aaaaaaaa-0000-0000-0000-000000000001',1,'{1,2,3,4,5,6,7,8,9}',3,'{"h:0:0":["+"],"v:0:0":["-"],"h:0:1":["+"],"v:0:1":["-"],"v:0:2":["-"],"h:1:0":["+"],"v:1:0":["-"],"h:1:1":["+"],"v:1:1":["-"],"v:1:2":["-"],"h:2:0":["+"],"h:2:1":["+"]}'::jsonb,'{0,1}','{-}',0,''); e := null; exception when others then e := sqlerrm; end;
  reset role; perform pg_temp.check('wrong answer rejected', e like '%does not reach%', e);
  set role authenticated;
  r := public.mp_submit_round('aaaaaaaa-0000-0000-0000-000000000001',1,'{1,2,3,4,5,6,7,8,9}',3,'{"h:0:0":["+"],"v:0:0":["-"],"h:0:1":["+"],"v:0:1":["-"],"v:0:2":["-"],"h:1:0":["+"],"v:1:0":["-"],"h:1:1":["+"],"v:1:1":["-"],"v:1:2":["-"],"h:2:0":["+"],"h:2:1":["+"]}'::jsonb,'{0,1}','{+}',0,'');
  reset role; perform pg_temp.check('valid answer accepted; time from server (~5s)', (r->>'solve_ms')::int between 4900 and 7000, r::text);
  set role authenticated;
  begin perform public.mp_submit_round('aaaaaaaa-0000-0000-0000-000000000001',1,'{1,2,3,4,5,6,7,8,9}',3,'{"h:0:0":["+"],"v:0:0":["-"],"h:0:1":["+"],"v:0:1":["-"],"v:0:2":["-"],"h:1:0":["+"],"v:1:0":["-"],"h:1:1":["+"],"v:1:1":["-"],"v:1:2":["-"],"h:2:0":["+"],"h:2:1":["+"]}'::jsonb,'{0,1}','{+}',0,''); e := null; exception when others then e := sqlerrm; end;
  reset role; perform pg_temp.check('resubmitting the same round rejected', e like '%already submitted%', e);
end $$;
select pg_sleep(0.2);
do $$ declare r jsonb; begin
  perform set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false); set role authenticated;
  r := public.mp_submit_round('aaaaaaaa-0000-0000-0000-000000000001',1,'{1,2,3,4,5,6,7,8,9}',3,'{"h:0:0":["+"],"v:0:0":["-"],"h:0:1":["+"],"v:0:1":["-"],"v:0:2":["-"],"h:1:0":["+"],"v:1:0":["-"],"h:1:1":["+"],"v:1:1":["-"],"v:1:2":["-"],"h:2:0":["+"],"h:2:1":["+"]}'::jsonb,'{4,1}','{-}',0,'');
  reset role; perform pg_temp.check('second player completes the match', (r->>'finished')::boolean, r::text);
end $$;
select pg_temp.check('faster player (A) wins, ratings move', (select state = 'finished' and winner_user_id = '11111111-1111-1111-1111-111111111111' from public.mp_sessions where invite_token = 't1') and (select count(*) = 2 from public.user_ratings where mode = 'multiplayer'));
do $$ declare r jsonb; begin
  perform set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false); set role authenticated;
  r := public.mp_submit_round('aaaaaaaa-0000-0000-0000-000000000002',1,'{1,2,3,4,5,6,7,8,9}',3,'{"h:0:0":["+"],"v:0:0":["-"],"h:0:1":["+"],"v:0:1":["-"],"v:0:2":["-"],"h:1:0":["+"],"v:1:0":["-"],"h:1:1":["+"],"v:1:1":["-"],"v:1:2":["-"],"h:2:0":["+"],"h:2:1":["+"]}'::jsonb,'{0,1}','{+}',0,'');
  perform set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
  r := public.mp_submit_round('aaaaaaaa-0000-0000-0000-000000000002',1,'{9,9,9,9,9,9,9,9,9}',18,'{"h:0:0":["+"],"v:0:0":["-"],"h:0:1":["+"],"v:0:1":["-"],"v:0:2":["-"],"h:1:0":["+"],"v:1:0":["-"],"h:1:1":["+"],"v:1:1":["-"],"v:1:2":["-"],"h:2:0":["+"],"h:2:1":["+"]}'::jsonb,'{0,1}','{+}',0,'');
  reset role; perform pg_temp.check('mismatched grid voids the match', (r->>'voided')::boolean and (select state = 'finished' and winner_user_id is null from public.mp_sessions where invite_token = 't2'), r::text);
end $$;
do $$ declare ok boolean; begin
  perform set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false); set role authenticated;
  ok := public.mp_claim_forfeit('aaaaaaaa-0000-0000-0000-000000000003');  -- B's opponent A was seen just now
  reset role; perform pg_temp.check('cannot claim forfeit while opponent is present', not ok);
  perform set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false); set role authenticated;
  ok := public.mp_claim_forfeit('aaaaaaaa-0000-0000-0000-000000000003');  -- A's opponent B silent 2 min
  reset role; perform pg_temp.check('forfeit claimed after opponent left', ok and (select state = 'finished' and winner_user_id = '11111111-1111-1111-1111-111111111111' from public.mp_sessions where invite_token = 't3'));
end $$;

-- ─── Account deletion purge ───
insert into auth.users(id, email) values ('33333333-3333-3333-3333-333333333333','c@x.test');
select pg_temp.check('deletion request works', pg_temp.run($q$select public.request_account_deletion()$q$, 'authenticated', '33333333-3333-3333-3333-333333333333') is null);
select pg_temp.check('purge leaves accounts inside the 30-day window', public.purge_deleted_accounts() = 0 and exists (select 1 from auth.users where id = '33333333-3333-3333-3333-333333333333'));
update public.profiles set scheduled_hard_delete_at = now() - interval '1 minute' where id = '33333333-3333-3333-3333-333333333333';
create temp table purge_result as select public.purge_deleted_accounts() as n;
select pg_temp.check('purge removes login and profile after the window', (select n from purge_result) = 1 and not exists (select 1 from auth.users where id = '33333333-3333-3333-3333-333333333333') and not exists (select 1 from public.profiles where id = '33333333-3333-3333-3333-333333333333'));
select pg_temp.blocked('players cannot run the purge', $q$select public.purge_deleted_accounts()$q$, 'authenticated', :'A');

-- ─── Guests (anonymous sign-ins) ───
insert into auth.users(id, is_anonymous) values ('44444444-4444-4444-4444-444444444444', true);
insert into auth.users(id, is_anonymous, created_at) values ('55555555-5555-5555-5555-555555555555', true, now() - interval '40 days');
select pg_temp.check('guest gets a private guest_ profile',
  (select is_public = false and handle like 'guest\_%' from public.profiles where id = '44444444-4444-4444-4444-444444444444'));
select pg_temp.blocked('guest cannot start the leaderboard daily', $q$select public.start_daily_attempt()$q$, 'authenticated', '44444444-4444-4444-4444-444444444444');
select pg_temp.blocked('guest calls internal_is_guest', $q$select public.internal_is_guest('44444444-4444-4444-4444-444444444444')$q$, 'authenticated', '44444444-4444-4444-4444-444444444444');
create temp table ratings_before as select count(*) as n, coalesce(sum(rating), 0) as total from public.user_ratings where mode = 'multiplayer';
insert into public.mp_sessions(id, invite_token, host_id, guest_id, state, difficulty, total_rounds, current_round, round_started_at, host_last_seen, guest_last_seen)
values ('aaaaaaaa-0000-0000-0000-000000000004','t4',:'A','44444444-4444-4444-4444-444444444444','active','easy',1,1, now() - interval '5 seconds', now(), now());
do $$ declare r jsonb; begin
  perform set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444',false); set role authenticated;
  r := public.mp_submit_round('aaaaaaaa-0000-0000-0000-000000000004',1,'{1,2,3,4,5,6,7,8,9}',3,'{"h:0:0":["+"],"v:0:0":["-"],"h:0:1":["+"],"v:0:1":["-"],"v:0:2":["-"],"h:1:0":["+"],"v:1:0":["-"],"h:1:1":["+"],"v:1:1":["-"],"v:1:2":["-"],"h:2:0":["+"],"h:2:1":["+"]}'::jsonb,'{0,1}','{+}',0,'');
  reset role; perform pg_temp.check('guest can play a verified round', (r->>'waiting_for_opponent')::boolean, r::text);
end $$;
select pg_sleep(0.2);
do $$ declare r jsonb; begin
  perform set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false); set role authenticated;
  r := public.mp_submit_round('aaaaaaaa-0000-0000-0000-000000000004',1,'{1,2,3,4,5,6,7,8,9}',3,'{"h:0:0":["+"],"v:0:0":["-"],"h:0:1":["+"],"v:0:1":["-"],"v:0:2":["-"],"h:1:0":["+"],"v:1:0":["-"],"h:1:1":["+"],"v:1:1":["-"],"v:1:2":["-"],"h:2:0":["+"],"h:2:1":["+"]}'::jsonb,'{4,1}','{-}',0,'');
  reset role; perform pg_temp.check('match with a guest finishes', (r->>'finished')::boolean, r::text);
end $$;
select pg_temp.check('match with a guest has a winner but is unrated',
  (select winner_user_id = '44444444-4444-4444-4444-444444444444' from public.mp_sessions where invite_token = 't4')
  and (select count(*) = (select n from ratings_before) and coalesce(sum(rating), 0) = (select total from ratings_before) from public.user_ratings where mode = 'multiplayer'));
create temp table guest_purge as select public.purge_deleted_accounts() as n;
select pg_temp.check('purge removes guests idle 30+ days, keeps active ones',
  not exists (select 1 from auth.users where id = '55555555-5555-5555-5555-555555555555')
  and exists (select 1 from auth.users where id = '44444444-4444-4444-4444-444444444444'));

-- ─── Sign slots: each gap shows only some signs ───
insert into public.mp_sessions(id, invite_token, host_id, guest_id, state, difficulty, total_rounds, current_round, round_started_at, host_last_seen, guest_last_seen)
values ('aaaaaaaa-0000-0000-0000-000000000005','t5',:'A',:'B','active','easy',1,1, now() - interval '5 seconds', now(), now());
do $$ declare e text; begin
  perform set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false); set role authenticated;
  -- 2 × 1 = 2 would need × in gap h:0:0, which shows only +.
  begin perform public.mp_submit_round('aaaaaaaa-0000-0000-0000-000000000005',1,'{2,1,3,4,5,6,7,8,9}',2,'{"h:0:0":["+"],"v:0:0":["-"],"h:0:1":["+"],"v:0:1":["-"],"v:0:2":["-"],"h:1:0":["+"],"v:1:0":["-"],"h:1:1":["+"],"v:1:1":["-"],"v:1:2":["-"],"h:2:0":["+"],"h:2:1":["+"]}'::jsonb,'{0,1}','{*}',0,''); e := null; exception when others then e := sqlerrm; end;
  reset role; perform pg_temp.check('a sign the gap did not show is rejected', e like '%does not reach%', e);
  set role authenticated;
  begin perform public.mp_submit_round('aaaaaaaa-0000-0000-0000-000000000005',1,'{1,2,3,4,5,6,7,8,9}',3,null,'{0,1}','{+}',0,''); e := null; exception when others then e := sqlerrm; end;
  reset role; perform pg_temp.check('easy rounds must include gap signs', e like '%invalid gap signs%', e);
  set role authenticated;
  begin perform public.mp_submit_round('aaaaaaaa-0000-0000-0000-000000000005',1,'{1,2,3,4,5,6,7,8,9}',3,'{"h:0:0":["+","-"]}'::jsonb,'{0,1}','{+}',0,''); e := null; exception when others then e := sqlerrm; end;
  reset role; perform pg_temp.check('malformed gap signs are rejected', e like '%invalid gap signs%', e);
end $$;
select pg_temp.check('internal_valid_gaps accepts a well-formed easy board',
  public.internal_valid_gaps('{"h:0:0":["+"],"v:0:0":["-"],"h:0:1":["+"],"v:0:1":["-"],"v:0:2":["-"],"h:1:0":["+"],"v:1:0":["-"],"h:1:1":["+"],"v:1:1":["-"],"v:1:2":["-"],"h:2:0":["+"],"h:2:1":["+"]}'::jsonb, 3, 1, array['+','-','*']));
select pg_temp.blocked('player calls internal_valid_gaps', $q$select public.internal_valid_gaps(null, 3, 1, array['+'])$q$, 'authenticated', :'A');
