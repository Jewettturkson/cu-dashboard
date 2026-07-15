-- ============================================================
-- Migration 004: Withdrawals with admin approval
-- Anyone (banker or admin) records a withdrawal REQUEST; money
-- only moves when an admin approves it. Approval is atomic and
-- balance-checked inside the database.
-- Run in the Supabase SQL editor.
-- ============================================================

create table if not exists withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id),
  requested_by uuid default auth.uid(),    -- auth user who recorded the request
  banker_id uuid references bankers(id),   -- set when a banker requested it
  amount numeric(12, 2) not null check (amount > 0),
  method text not null default 'cash' check (method in ('cash', 'momo')),
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid,                        -- admin who approved/rejected
  reviewed_at timestamptz,
  transaction_id uuid references transactions(id),  -- ledger entry, set on approval
  created_at timestamptz default now()
);

create index if not exists withdrawal_requests_status_idx
  on withdrawal_requests (status, created_at desc);

-- Balances can never go negative, whatever code path tries.
alter table accounts drop constraint if exists accounts_balance_non_negative;
alter table accounts add constraint accounts_balance_non_negative check (balance >= 0);

-- ── Extend audit coverage to withdrawal requests ─────────────
create or replace function log_audit()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_name  text;
  v_role  text;
  v_action text;
  v_details jsonb;
  v_verb text := case TG_OP when 'INSERT' then 'create' else 'update' end;
begin
  select full_name, role into v_name, v_role from profiles where id = v_actor;

  if TG_TABLE_NAME = 'transactions' then
    v_action := 'transaction.' || NEW.type;
    v_details := jsonb_build_object(
      'amount',      NEW.amount,
      'method',      NEW.method,
      'client_id',   NEW.client_id,
      'client_name', (select full_name from clients where id = NEW.client_id),
      'banker_id',   NEW.banker_id,
      'banker_name', (select full_name from bankers where id = NEW.banker_id),
      'notes',       NEW.notes
    );
  elsif TG_TABLE_NAME = 'withdrawal_requests' then
    v_action := 'withdrawal.' || case when TG_OP = 'INSERT' then 'requested' else NEW.status end;
    v_details := jsonb_build_object(
      'amount',      NEW.amount,
      'method',      NEW.method,
      'client_id',   NEW.client_id,
      'client_name', (select full_name from clients where id = NEW.client_id),
      'banker_name', (select full_name from bankers where id = NEW.banker_id),
      'status',      NEW.status
    );
  elsif TG_TABLE_NAME = 'clients' then
    v_action := 'client.' || v_verb;
    v_details := jsonb_build_object(
      'client_name',    NEW.full_name,
      'account_number', NEW.account_number,
      'is_active',      NEW.is_active
    );
  elsif TG_TABLE_NAME = 'bankers' then
    v_action := 'banker.' || v_verb;
    v_details := jsonb_build_object(
      'banker_name', NEW.full_name,
      'employee_id', NEW.employee_id,
      'is_active',   NEW.is_active
    );
  else
    v_action := TG_TABLE_NAME || '.' || v_verb;  -- safe fallback
  end if;

  insert into audit_log (actor_id, actor_name, actor_role, action, entity, entity_id, details)
  values (v_actor, coalesce(v_name, 'system'), coalesce(v_role, 'unknown'), v_action, TG_TABLE_NAME, NEW.id, v_details);

  return NEW;
end;
$$;

drop trigger if exists audit_withdrawal_requests on withdrawal_requests;
create trigger audit_withdrawal_requests after insert or update on withdrawal_requests
  for each row execute function log_audit();

-- ── Atomic approval: balance check + ledger entry + status ───
create or replace function approve_withdrawal(request_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  req withdrawal_requests%rowtype;
  bal numeric;
  txn_id uuid;
begin
  if not is_admin() then
    raise exception 'Only admins can approve withdrawals';
  end if;

  select * into req from withdrawal_requests where id = request_id for update;
  if not found then raise exception 'Withdrawal request not found'; end if;
  if req.status <> 'pending' then raise exception 'Request was already %', req.status; end if;

  select balance into bal from accounts where client_id = req.client_id;
  if coalesce(bal, 0) < req.amount then
    raise exception 'Insufficient balance: client has GHS % but requested GHS %', coalesce(bal, 0), req.amount;
  end if;

  -- Ledger entry — the balance trigger and audit trigger both fire
  insert into transactions (client_id, banker_id, amount, type, method, notes)
  values (req.client_id, req.banker_id, req.amount, 'withdrawal', req.method, req.notes)
  returning id into txn_id;

  update withdrawal_requests
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), transaction_id = txn_id
  where id = request_id;
end;
$$;

create or replace function reject_withdrawal(request_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  req withdrawal_requests%rowtype;
begin
  if not is_admin() then
    raise exception 'Only admins can reject withdrawals';
  end if;

  select * into req from withdrawal_requests where id = request_id for update;
  if not found then raise exception 'Withdrawal request not found'; end if;
  if req.status <> 'pending' then raise exception 'Request was already %', req.status; end if;

  update withdrawal_requests
  set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
  where id = request_id;
end;
$$;

-- ── RLS ──────────────────────────────────────────────────────
alter table withdrawal_requests enable row level security;

create policy "admins read withdrawal requests" on withdrawal_requests
  for select using (is_admin());
create policy "bankers read own withdrawal requests" on withdrawal_requests
  for select using (banker_id = my_banker_id());
create policy "admins insert withdrawal requests" on withdrawal_requests
  for insert with check (is_admin());
create policy "bankers insert own withdrawal requests" on withdrawal_requests
  for insert with check (banker_id = my_banker_id() and status = 'pending');
-- No update/delete policies: status changes happen only through
-- the approve/reject functions above.
