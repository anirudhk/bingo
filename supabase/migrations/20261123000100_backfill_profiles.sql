-- Profiles are created by the on_auth_user_created trigger, but users who
-- signed up before the trigger existed have none, and daily attempts,
-- ratings and matches all need a profile row. Idempotent.
insert into public.profiles (id, handle, display_name)
select
  u.id,
  'user_' || substr(replace(u.id::text, '-', ''), 1, 12),
  coalesce(u.raw_user_meta_data ->> 'full_name', 'Player')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict do nothing;
