-- Repair Auth users created before the profiles trigger existed. This is
-- intentionally idempotent and uses a neutral opening balance rather than
-- inferring historical money.
insert into public.profiles (id, full_name, opening_balance_cents)
select
  auth_user.id,
  nullif(btrim(auth_user.raw_user_meta_data ->> 'full_name'), ''),
  0
from auth.users as auth_user
where not exists (
  select 1
  from public.profiles as profile
  where profile.id = auth_user.id
)
on conflict (id) do nothing;
