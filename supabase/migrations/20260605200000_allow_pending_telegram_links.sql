alter table public.telegram_links
alter column telegram_user_id drop not null;

alter table public.telegram_links
add column if not exists link_token_expires_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'telegram_links_active_requires_telegram_user'
      and conrelid = 'public.telegram_links'::regclass
  ) then
    alter table public.telegram_links
    add constraint telegram_links_active_requires_telegram_user
    check (status <> 'active' or telegram_user_id is not null);
  end if;
end $$;

create index if not exists telegram_links_pending_token_hash_idx
on public.telegram_links(link_token_hash)
where status = 'pending' and link_token_hash is not null;
