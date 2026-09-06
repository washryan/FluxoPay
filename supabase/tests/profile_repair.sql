begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '30000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'legacy-profile-test@fluxopay.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Legacy User"}'::jsonb,
  now(),
  now()
);

delete from public.profiles
where id = '30000000-0000-0000-0000-000000000003';

insert into public.profiles (id, full_name, opening_balance_cents)
select
  auth_user.id,
  nullif(btrim(auth_user.raw_user_meta_data ->> 'full_name'), ''),
  0
from auth.users as auth_user
where not exists (
  select 1 from public.profiles as profile where profile.id = auth_user.id
)
on conflict (id) do nothing;

select is(
  (select opening_balance_cents from public.profiles where id = '30000000-0000-0000-0000-000000000003'),
  0::bigint,
  'legacy profile repair uses a neutral opening balance'
);

select is(
  (select full_name from public.profiles where id = '30000000-0000-0000-0000-000000000003'),
  'Legacy User'::text,
  'legacy profile repair copies trustworthy Auth full_name metadata'
);

select lives_ok(
  $$
    insert into public.profiles (id, full_name, opening_balance_cents)
    select auth_user.id, nullif(btrim(auth_user.raw_user_meta_data ->> 'full_name'), ''), 0
    from auth.users as auth_user
    where not exists (
      select 1 from public.profiles as profile where profile.id = auth_user.id
    )
    on conflict (id) do nothing
  $$,
  'legacy profile repair is idempotent'
);

select * from finish();
rollback;
