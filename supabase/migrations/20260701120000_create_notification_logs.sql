create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  telegram_link_id uuid references public.telegram_links(id) on delete set null,
  notification_type text not null,
  dedupe_key text not null,
  channel text not null default 'telegram',
  status text not null default 'sent',
  reference_table text,
  reference_id uuid,
  sent_at timestamptz not null default now(),
  error_message text,
  created_at timestamptz not null default now(),
  constraint notification_logs_type_check check (notification_type ~ '^[a-z0-9_]+$'),
  constraint notification_logs_channel_check check (channel in ('telegram')),
  constraint notification_logs_status_check check (status in ('sent', 'failed')),
  constraint notification_logs_dedupe_key_check check (char_length(trim(dedupe_key)) between 1 and 180)
);

create unique index if not exists notification_logs_user_type_key_unique
  on public.notification_logs(user_id, notification_type, dedupe_key)
  where status = 'sent';

create index if not exists notification_logs_user_sent_idx
  on public.notification_logs(user_id, sent_at desc);

alter table public.notification_logs enable row level security;

drop policy if exists "Notification logs are readable by owner" on public.notification_logs;
create policy "Notification logs are readable by owner"
on public.notification_logs for select
to authenticated
using ((select auth.uid()) = user_id);
