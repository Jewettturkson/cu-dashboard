-- ============================================================
-- Migration 007: Opening balances (data migration support)
-- New transaction type 'opening' — used once per client when a
-- union migrates from paper/Excel books. Credits the account
-- like a deposit but is excluded from collection stats and the
-- daily reconciliation (it isn't money a banker handled today).
-- Only admins can insert it (banker policy allows 'deposit' only).
-- ============================================================

alter table transactions drop constraint if exists transactions_type_check;
alter table transactions add constraint transactions_type_check
  check (type in ('deposit', 'withdrawal', 'opening'));

create or replace function update_account_balance()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if NEW.type in ('deposit', 'opening') then
    insert into accounts (client_id, org_id, balance, last_updated)
    values (NEW.client_id, NEW.org_id, NEW.amount, now())
    on conflict (client_id)
    do update set balance = accounts.balance + NEW.amount, last_updated = now();
  elsif NEW.type = 'withdrawal' then
    update accounts
    set balance = balance - NEW.amount, last_updated = now()
    where client_id = NEW.client_id;
  end if;
  return NEW;
end;
$$;
-- log_audit already handles this generically: action = 'transaction.opening'
