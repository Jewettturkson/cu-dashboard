-- ============================================================
-- Migration 005: Balance check at withdrawal REQUEST time
-- 1. Requests exceeding the client's balance are rejected at
--    creation (database trigger — can't be bypassed).
-- 2. get_client_balance() lets the collect screen show a single
--    client's available balance in withdrawal mode, without
--    opening up the accounts table to bankers.
-- Run in the Supabase SQL editor.
-- ============================================================

-- Single-client balance lookup for the withdrawal flow.
-- SECURITY DEFINER: bankers have no select on accounts, but may
-- learn ONE client's balance at the moment of a withdrawal —
-- the same information the client's own susu book shows them.
create or replace function get_client_balance(p_client_id uuid)
returns numeric
language sql stable security definer
set search_path = public
as $$
  select coalesce((select balance from accounts where client_id = p_client_id), 0);
$$;

-- Block impossible requests at the door.
create or replace function check_withdrawal_balance()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  bal numeric;
begin
  select coalesce(balance, 0) into bal from accounts where client_id = NEW.client_id;
  if bal is null then bal := 0; end if;
  if NEW.amount > bal then
    raise exception 'Insufficient balance: available GHS %', bal;
  end if;
  return NEW;
end;
$$;

drop trigger if exists withdrawal_balance_check on withdrawal_requests;
create trigger withdrawal_balance_check
  before insert on withdrawal_requests
  for each row execute function check_withdrawal_balance();
