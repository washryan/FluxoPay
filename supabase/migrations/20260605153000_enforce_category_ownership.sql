create or replace function public.ensure_category_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  category_owner uuid;
begin
  if new.category_id is null then
    return new;
  end if;

  select user_id into category_owner
  from public.categories
  where id = new.category_id;

  if category_owner is null or category_owner <> new.user_id then
    raise exception 'Category does not belong to this user';
  end if;

  return new;
end;
$$;

drop trigger if exists transactions_category_owner on public.transactions;
create trigger transactions_category_owner
before insert or update of category_id, user_id on public.transactions
for each row execute function public.ensure_category_owner();

drop trigger if exists bills_category_owner on public.bills;
create trigger bills_category_owner
before insert or update of category_id, user_id on public.bills
for each row execute function public.ensure_category_owner();

drop trigger if exists credit_card_purchases_category_owner on public.credit_card_purchases;
create trigger credit_card_purchases_category_owner
before insert or update of category_id, user_id on public.credit_card_purchases
for each row execute function public.ensure_category_owner();
