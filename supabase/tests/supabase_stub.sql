-- Stand-in for what a Supabase project provides before user migrations run
-- (auth schema, API roles, default grants, realtime publication). Test use only.
-- Minimal stand-in for what Supabase provides before user migrations run.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}',
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz
);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.role() to anon, authenticated;
-- Mirror this project's real default privileges: new tables give the API
-- roles only TRUNCATE / REFERENCES / TRIGGER (no SELECT etc.), so every read
-- the app needs must be granted explicitly by a migration.
alter default privileges in schema public grant truncate, references, trigger on tables to anon, authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
create publication supabase_realtime;
