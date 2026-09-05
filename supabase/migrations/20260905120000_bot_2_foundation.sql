alter table public.bot_pending_confirmations
add column if not exists confirmed_transaction_id uuid
references public.transactions(id) on delete restrict;

create unique index if not exists bot_confirmations_transaction_unique
on public.bot_pending_confirmations(confirmed_transaction_id)
where confirmed_transaction_id is not null;

create table if not exists public.process_leases (
  lease_key text primary key,
  owner_id uuid not null,
  acquired_at timestamptz not null,
  heartbeat_at timestamptz not null,
  expires_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  constraint process_leases_key_check
    check (lease_key ~ '^[a-z0-9_]{3,80}$'),
  constraint process_leases_expiry_check
    check (expires_at > heartbeat_at),
  constraint process_leases_metadata_check
    check (jsonb_typeof(metadata) = 'object')
);

alter table public.process_leases enable row level security;
revoke all on public.process_leases from public, anon, authenticated;
grant select, insert, update, delete on public.process_leases to service_role;

create table if not exists public.notification_delivery_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  telegram_link_id uuid references public.telegram_links(id) on delete set null,
  notification_type text not null,
  dedupe_key text not null,
  status text not null,
  owner_id uuid,
  attempt_count integer not null default 1,
  processing_started_at timestamptz,
  processing_expires_at timestamptz,
  sent_at timestamptz,
  next_retry_at timestamptz,
  last_error text,
  reference_table text,
  reference_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_claims_identity_unique
    unique (user_id, notification_type, dedupe_key),
  constraint notification_claims_type_check
    check (notification_type ~ '^[a-z0-9_]+$'),
  constraint notification_claims_key_check
    check (char_length(trim(dedupe_key)) between 1 and 180),
  constraint notification_claims_status_check
    check (status in ('processing', 'sent', 'failed', 'ambiguous')),
  constraint notification_claims_attempt_check
    check (attempt_count between 1 and 20),
  constraint notification_claims_processing_check
    check (
      status <> 'processing'
      or (owner_id is not null and processing_started_at is not null
        and processing_expires_at is not null)
    )
);

create index if not exists notification_claims_retry_idx
on public.notification_delivery_claims(status, next_retry_at)
where status = 'failed';

alter table public.notification_delivery_claims enable row level security;
revoke all on public.notification_delivery_claims from public, anon, authenticated;
grant select, insert, update on public.notification_delivery_claims to service_role;

insert into public.notification_delivery_claims (
  user_id, telegram_link_id, notification_type, dedupe_key, status,
  attempt_count, sent_at, last_error, reference_table, reference_id,
  created_at, updated_at
)
select
  log.user_id,
  log.telegram_link_id,
  log.notification_type,
  log.dedupe_key,
  'sent',
  1,
  log.sent_at,
  null,
  log.reference_table,
  log.reference_id,
  log.created_at,
  log.created_at
from public.notification_logs log
where log.status = 'sent'
on conflict (user_id, notification_type, dedupe_key) do nothing;

create or replace function public.confirm_bot_transaction(
  p_confirmation_id uuid,
  p_telegram_user_id bigint
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_pending public.bot_pending_confirmations%rowtype;
  v_payload jsonb;
  v_type public.transaction_type;
  v_amount bigint;
  v_description text;
  v_category_id uuid;
  v_payment_method public.payment_method;
  v_transaction_date date;
  v_transaction_id uuid;
begin
  select * into v_pending
  from public.bot_pending_confirmations
  where id = p_confirmation_id
  for update;

  if v_pending.id is null then
    return jsonb_build_object('ok', false, 'code', 'confirmation_not_found');
  end if;

  if not exists (
    select 1 from public.telegram_links link
    where link.id = v_pending.telegram_link_id
      and link.user_id = v_pending.user_id
      and link.telegram_user_id = p_telegram_user_id
      and link.status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'code', 'active_link_not_found');
  end if;

  if v_pending.status = 'confirmed' then
    if v_pending.confirmed_transaction_id is null then
      return jsonb_build_object('ok', false, 'code', 'confirmation_inconsistent');
    end if;
    return jsonb_build_object(
      'ok', true,
      'already_confirmed', true,
      'transaction_id', v_pending.confirmed_transaction_id
    );
  end if;

  if v_pending.status <> 'pending' then
    return jsonb_build_object('ok', false, 'code', 'confirmation_not_pending');
  end if;

  if v_pending.expires_at <= now() then
    update public.bot_pending_confirmations
    set status = 'expired'
    where id = v_pending.id;
    return jsonb_build_object('ok', false, 'code', 'confirmation_expired');
  end if;

  v_payload := v_pending.parsed_payload;
  if v_payload ->> 'kind' <> 'transaction' then
    return jsonb_build_object('ok', false, 'code', 'unsupported_intent');
  end if;
  if v_payload ->> 'type' not in ('income', 'expense') then
    return jsonb_build_object('ok', false, 'code', 'invalid_transaction_type');
  end if;
  if jsonb_typeof(v_payload -> 'amount_cents') <> 'number'
    or (v_payload ->> 'amount_cents') !~ '^[0-9]+$' then
    return jsonb_build_object('ok', false, 'code', 'invalid_amount');
  end if;

  v_type := (v_payload ->> 'type')::public.transaction_type;
  v_amount := (v_payload ->> 'amount_cents')::bigint;
  v_description := trim(v_payload ->> 'description');
  v_payment_method := (v_payload ->> 'payment_method')::public.payment_method;
  v_transaction_date := (v_payload ->> 'transaction_date')::date;

  if v_amount <= 0 or v_amount > 100000000000000 then
    return jsonb_build_object('ok', false, 'code', 'invalid_amount');
  end if;
  if v_description is null or char_length(v_description) not between 1 and 180 then
    return jsonb_build_object('ok', false, 'code', 'invalid_description');
  end if;
  if v_payment_method not in ('cash', 'pix', 'debit_card', 'bank_transfer', 'other') then
    return jsonb_build_object('ok', false, 'code', 'unsupported_payment_method');
  end if;

  if nullif(v_payload ->> 'category_id', '') is not null then
    v_category_id := (v_payload ->> 'category_id')::uuid;
    if not exists (
      select 1 from public.categories category
      where category.id = v_category_id
        and category.user_id = v_pending.user_id
        and category.type in (v_type::text::public.category_type, 'both')
    ) then
      return jsonb_build_object('ok', false, 'code', 'category_not_owned');
    end if;
  end if;

  insert into public.transactions (
    user_id, type, amount_cents, description, category_id,
    payment_method, transaction_date, source
  ) values (
    v_pending.user_id, v_type, v_amount, v_description, v_category_id,
    v_payment_method, v_transaction_date, 'telegram'
  ) returning id into v_transaction_id;

  update public.bot_pending_confirmations
  set
    status = 'confirmed',
    confirmed_at = now(),
    confirmed_transaction_id = v_transaction_id
  where id = v_pending.id;

  return jsonb_build_object(
    'ok', true,
    'already_confirmed', false,
    'transaction_id', v_transaction_id
  );
exception
  when invalid_text_representation or datetime_field_overflow
    or numeric_value_out_of_range then
    return jsonb_build_object('ok', false, 'code', 'invalid_payload');
end;
$$;

create or replace function public.activate_telegram_link(
  p_token_hash text,
  p_telegram_user_id bigint,
  p_telegram_chat_id bigint,
  p_telegram_username text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_link public.telegram_links%rowtype;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'code', 'invalid_or_expired_token');
  end if;

  select * into v_link
  from public.telegram_links
  where link_token_hash = p_token_hash
  for update;

  if v_link.id is null or v_link.status <> 'pending'
    or v_link.link_token_expires_at is null
    or v_link.link_token_expires_at <= now() then
    return jsonb_build_object('ok', false, 'code', 'invalid_or_expired_token');
  end if;

  update public.telegram_links

  set status = 'revoked', revoked_at = now()
  where status = 'active'
    and (telegram_user_id = p_telegram_user_id or user_id = v_link.user_id);

  update public.telegram_links
  set
    telegram_user_id = p_telegram_user_id,
    telegram_chat_id = p_telegram_chat_id,
    telegram_username = nullif(left(trim(p_telegram_username), 64), ''),
    status = 'active',
    linked_at = now(),
    last_seen_at = now(),
    revoked_at = null,
    link_token_hash = null,
    link_token_expires_at = null
  where id = v_link.id;

  return jsonb_build_object('ok', true, 'link_id', v_link.id, 'user_id', v_link.user_id);
end;
$$;

create or replace function public.get_bot_current_balance(
  p_telegram_user_id bigint
)
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select profile.opening_balance_cents
    + coalesce((
      select sum(
        case when ledger.type = 'income'
          then ledger.amount_cents else -ledger.amount_cents end
      )
      from public.transactions ledger
      where ledger.user_id = profile.id
        and ledger.transaction_date <=
          (now() at time zone profile.timezone)::date
    ), 0)::bigint
  from public.telegram_links link
  join public.profiles profile on profile.id = link.user_id
  where link.telegram_user_id = p_telegram_user_id
    and link.status = 'active';
$$;

create or replace function public.acquire_process_lease(
  p_lease_key text,
  p_owner_id uuid,
  p_ttl_seconds integer,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_acquired boolean;
begin
  if p_ttl_seconds not between 15 and 3600
    or p_lease_key !~ '^[a-z0-9_]{3,80}$'
    or jsonb_typeof(p_metadata) <> 'object' then
    return false;
  end if;

  insert into public.process_leases (
    lease_key, owner_id, acquired_at, heartbeat_at, expires_at, metadata
  ) values (
    p_lease_key, p_owner_id, now(), now(),
    now() + make_interval(secs => p_ttl_seconds), p_metadata
  )
  on conflict (lease_key) do update
  set
    owner_id = excluded.owner_id,
    acquired_at = case
      when public.process_leases.owner_id = excluded.owner_id
        then public.process_leases.acquired_at
      else excluded.acquired_at
    end,
    heartbeat_at = excluded.heartbeat_at,
    expires_at = excluded.expires_at,
    metadata = excluded.metadata
  where public.process_leases.expires_at <= now()
    or public.process_leases.owner_id = excluded.owner_id
  returning true into v_acquired;

  return coalesce(v_acquired, false);
end;
$$;

create or replace function public.heartbeat_process_lease(
  p_lease_key text,
  p_owner_id uuid,
  p_ttl_seconds integer
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_ttl_seconds not between 15 and 3600 then
    return false;
  end if;
  update public.process_leases
  set heartbeat_at = now(), expires_at = now() + make_interval(secs => p_ttl_seconds)
  where lease_key = p_lease_key
    and owner_id = p_owner_id
    and expires_at > now();
  return found;
end;
$$;

create or replace function public.release_process_lease(
  p_lease_key text,
  p_owner_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.process_leases
  where lease_key = p_lease_key and owner_id = p_owner_id;
  return found;
end;
$$;

create or replace function public.reserve_notification_delivery(
  p_user_id uuid,
  p_telegram_link_id uuid,
  p_notification_type text,
  p_dedupe_key text,
  p_owner_id uuid,
  p_reservation_seconds integer,
  p_max_attempts integer,
  p_reference_table text default null,
  p_reference_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_claim public.notification_delivery_claims%rowtype;
begin
  if p_reservation_seconds not between 15 and 3600
    or p_max_attempts not between 1 and 20
    or p_notification_type !~ '^[a-z0-9_]+$'
    or char_length(trim(p_dedupe_key)) not between 1 and 180
    or not exists (
      select 1 from public.telegram_links link
      where link.id = p_telegram_link_id
        and link.user_id = p_user_id
        and link.status = 'active'
    ) then
    return jsonb_build_object('claimed', false, 'code', 'invalid_reservation');
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_user_id::text || ':' || p_notification_type || ':' || p_dedupe_key, 0)
  );

  select * into v_claim
  from public.notification_delivery_claims
  where user_id = p_user_id
    and notification_type = p_notification_type
    and dedupe_key = p_dedupe_key
  for update;

  if v_claim.id is null then
    insert into public.notification_delivery_claims (
      user_id, telegram_link_id, notification_type, dedupe_key, status,
      owner_id, attempt_count, processing_started_at, processing_expires_at,
      reference_table, reference_id
    ) values (
      p_user_id, p_telegram_link_id, p_notification_type, p_dedupe_key,
      'processing', p_owner_id, 1, now(),
      now() + make_interval(secs => p_reservation_seconds),
      p_reference_table, p_reference_id
    ) returning * into v_claim;
    return jsonb_build_object('claimed', true, 'claim_id', v_claim.id, 'attempt', 1);
  end if;

  if v_claim.status = 'sent' then
    return jsonb_build_object('claimed', false, 'code', 'already_sent', 'claim_id', v_claim.id);
  end if;
  if v_claim.status = 'ambiguous' then
    return jsonb_build_object('claimed', false, 'code', 'ambiguous_delivery', 'claim_id', v_claim.id);
  end if;
  if v_claim.status = 'processing' then
    if v_claim.processing_expires_at > now() then
      return jsonb_build_object('claimed', false, 'code', 'already_reserved', 'claim_id', v_claim.id);
    end if;
    update public.notification_delivery_claims
    set status = 'ambiguous', owner_id = null, updated_at = now(),
      last_error = 'Reservation expired before delivery outcome was recorded.'
    where id = v_claim.id;
    return jsonb_build_object('claimed', false, 'code', 'stale_delivery_ambiguous', 'claim_id', v_claim.id);
  end if;
  if v_claim.attempt_count >= p_max_attempts then
    return jsonb_build_object('claimed', false, 'code', 'max_attempts_reached', 'claim_id', v_claim.id);
  end if;
  if v_claim.next_retry_at is null or v_claim.next_retry_at > now() then
    return jsonb_build_object('claimed', false, 'code', 'retry_not_due', 'claim_id', v_claim.id);
  end if;

  update public.notification_delivery_claims
  set
    status = 'processing', owner_id = p_owner_id,
    attempt_count = attempt_count + 1,
    processing_started_at = now(),
    processing_expires_at = now() + make_interval(secs => p_reservation_seconds),
    next_retry_at = null, last_error = null, updated_at = now()
  where id = v_claim.id
  returning * into v_claim;

  return jsonb_build_object(
    'claimed', true, 'claim_id', v_claim.id, 'attempt', v_claim.attempt_count
  );
end;
$$;

create or replace function public.complete_notification_delivery(
  p_claim_id uuid,
  p_owner_id uuid,
  p_outcome text,
  p_error text default null,
  p_next_retry_at timestamptz default null
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_outcome not in ('sent', 'failed', 'ambiguous') then
    return false;
  end if;
  update public.notification_delivery_claims
  set
    status = p_outcome,
    owner_id = null,
    sent_at = case when p_outcome = 'sent' then now() else sent_at end,
    next_retry_at = case when p_outcome = 'failed' then p_next_retry_at else null end,
    last_error = case when p_outcome = 'sent' then null else left(p_error, 500) end,
    updated_at = now()
  where id = p_claim_id
    and owner_id = p_owner_id
    and status = 'processing';
  return found;
end;
$$;

revoke all on function public.confirm_bot_transaction(uuid, bigint) from public, anon, authenticated;
revoke all on function public.activate_telegram_link(text, bigint, bigint, text) from public, anon, authenticated;
revoke all on function public.get_bot_current_balance(bigint) from public, anon, authenticated;
revoke all on function public.acquire_process_lease(text, uuid, integer, jsonb) from public, anon, authenticated;
revoke all on function public.heartbeat_process_lease(text, uuid, integer) from public, anon, authenticated;
revoke all on function public.release_process_lease(text, uuid) from public, anon, authenticated;
revoke all on function public.reserve_notification_delivery(uuid, uuid, text, text, uuid, integer, integer, text, uuid) from public, anon, authenticated;
revoke all on function public.complete_notification_delivery(uuid, uuid, text, text, timestamptz) from public, anon, authenticated;

grant execute on function public.confirm_bot_transaction(uuid, bigint) to service_role;
grant execute on function public.activate_telegram_link(text, bigint, bigint, text) to service_role;
grant execute on function public.get_bot_current_balance(bigint) to service_role;
grant execute on function public.acquire_process_lease(text, uuid, integer, jsonb) to service_role;
grant execute on function public.heartbeat_process_lease(text, uuid, integer) to service_role;
grant execute on function public.release_process_lease(text, uuid) to service_role;
grant execute on function public.reserve_notification_delivery(uuid, uuid, text, text, uuid, integer, integer, text, uuid) to service_role;
grant execute on function public.complete_notification_delivery(uuid, uuid, text, text, timestamptz) to service_role;
