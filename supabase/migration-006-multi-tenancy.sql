-- ============================================================
-- Migration 006: Multi-tenancy
-- One database, many credit unions. Every domain row carries
-- org_id; RLS scopes every read and write to the caller's org;
-- BEFORE INSERT triggers stamp org_id so app code never has to
-- pass it; SECURITY DEFINER functions get explicit org guards
-- (they bypass RLS, so they must check themselves).
-- Run in the Supabase SQL editor. Safe on existing data: all
-- current rows are backfilled into the default (pilot) org.
-- ============================================================

-- ── 1. Organizations ─────────────────────────────────────────
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Deterministic id for the pilot org so this migration is idempotent
insert into organizations (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Pilot Credit Union')
on conflict (id) do nothing;

-- ── 2. org_id on every domain table + backfill ───────────────
alter table profiles            add column if not exists org_id uuid references organizations(id);
alter table clients             add column if not exists org_id uuid references organizations(id);
alter table bankers             add column if not exists org_id uuid references organizations(id);
alter table accounts            add column if not exists org_id uuid references organizations(id);
alter table transactions        add column if not exists org_id uuid references organizations(id);
alter table withdrawal_requests add column if not exists org_id uuid references organizations(id);
alter table audit_log           add column if not exists org_id uuid references organizations(id);

update profiles            set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
update clients             set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
update bankers             set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
update accounts            set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
update transactions        set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
update withdrawal_requests set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;
update audit_log           set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null;

alter table profiles            alter column org_id set not null;
alter table clients             alter column org_id set not null;
alter table bankers             alter column org_id set not null;
alter table accounts            alter column org_id set not null;
alter table transactions        alter column org_id set not null;
alter table withdrawal_requests alter column org_id set not null;

create index if not exists clients_org_idx             on clients (org_id);
create index if not exists bankers_org_idx             on bankers (org_id);
create index if not exists accounts_org_idx            on accounts (org_id);
create index if not exists transactions_org_idx        on transactions (org_id, created_at desc);
create index if not exists withdrawal_requests_org_idx on withdrawal_requests (org_id, status);
create index if not exists audit_log_org_idx           on audit_log (org_id, created_at desc);

-- ── 3. Org context helper ────────────────────────────────────
create or replace function public.my_org_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select org_id from profiles where id = auth.uid();
$$;

-- ── 4. Stamp org_id on insert + cross-org referential guards ─
-- App code never passes org_id; this trigger fills it from the
-- caller's profile and refuses rows that point at another org's
-- clients or bankers.
create or replace function stamp_org_id()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if NEW.org_id is null then
    NEW.org_id := my_org_id();
  end if;
  if NEW.org_id is null then
    raise exception 'No organization context for this insert';
  end if;

  if TG_TABLE_NAME in ('transactions', 'withdrawal_requests', 'accounts') then
    if (select org_id from clients where id = NEW.client_id) is distinct from NEW.org_id then
      raise exception 'Client belongs to a different organization';
    end if;
  end if;

  if TG_TABLE_NAME in ('transactions', 'withdrawal_requests') and NEW.banker_id is not null then
    if (select org_id from bankers where id = NEW.banker_id) is distinct from NEW.org_id then
      raise exception 'Banker belongs to a different organization';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists stamp_org_clients on clients;
create trigger stamp_org_clients before insert on clients
  for each row execute function stamp_org_id();
drop trigger if exists stamp_org_bankers on bankers;
create trigger stamp_org_bankers before insert on bankers
  for each row execute function stamp_org_id();
drop trigger if exists stamp_org_accounts on accounts;
create trigger stamp_org_accounts before insert on accounts
  for each row execute function stamp_org_id();
drop trigger if exists stamp_org_transactions on transactions;
create trigger stamp_org_transactions before insert on transactions
  for each row execute function stamp_org_id();
drop trigger if exists stamp_org_withdrawal_requests on withdrawal_requests;
create trigger stamp_org_withdrawal_requests before insert on withdrawal_requests
  for each row execute function stamp_org_id();

-- ── 5. Update SECURITY DEFINER functions (they bypass RLS) ───

-- Balance trigger: carry the transaction's org onto new accounts
create or replace function update_account_balance()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if NEW.type = 'deposit' then
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

-- Audit trigger: record the org of the affected row
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
      'amount', NEW.amount, 'method', NEW.method,
      'client_id', NEW.client_id,
      'client_name', (select full_name from clients where id = NEW.client_id),
      'banker_id', NEW.banker_id,
      'banker_name', (select full_name from bankers where id = NEW.banker_id),
      'notes', NEW.notes
    );
  elsif TG_TABLE_NAME = 'withdrawal_requests' then
    v_action := 'withdrawal.' || case when TG_OP = 'INSERT' then 'requested' else NEW.status end;
    v_details := jsonb_build_object(
      'amount', NEW.amount, 'method', NEW.method,
      'client_id', NEW.client_id,
      'client_name', (select full_name from clients where id = NEW.client_id),
      'banker_name', (select full_name from bankers where id = NEW.banker_id),
      'status', NEW.status
    );
  elsif TG_TABLE_NAME = 'clients' then
    v_action := 'client.' || v_verb;
    v_details := jsonb_build_object(
      'client_name', NEW.full_name, 'account_number', NEW.account_number, 'is_active', NEW.is_active
    );
  elsif TG_TABLE_NAME = 'bankers' then
    v_action := 'banker.' || v_verb;
    v_details := jsonb_build_object(
      'banker_name', NEW.full_name, 'employee_id', NEW.employee_id, 'is_active', NEW.is_active
    );
  else
    v_action := TG_TABLE_NAME || '.' || v_verb;
  end if;

  insert into audit_log (actor_id, actor_name, actor_role, action, entity, entity_id, details, org_id)
  values (v_actor, coalesce(v_name, 'system'), coalesce(v_role, 'unknown'), v_action, TG_TABLE_NAME, NEW.id, v_details, NEW.org_id);

  return NEW;
end;
$$;

-- Withdrawal approval/rejection: explicit same-org guard
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
  if not is_admin() then raise exception 'Only admins can approve withdrawals'; end if;

  select * into req from withdrawal_requests where id = request_id for update;
  if not found then raise exception 'Withdrawal request not found'; end if;
  if req.org_id is distinct from my_org_id() then raise exception 'Request belongs to a different organization'; end if;
  if req.status <> 'pending' then raise exception 'Request was already %', req.status; end if;

  select balance into bal from accounts where client_id = req.client_id;
  if coalesce(bal, 0) < req.amount then
    raise exception 'Insufficient balance: client has GHS % but requested GHS %', coalesce(bal, 0), req.amount;
  end if;

  insert into transactions (client_id, banker_id, org_id, amount, type, method, notes)
  values (req.client_id, req.banker_id, req.org_id, req.amount, 'withdrawal', req.method, req.notes)
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
  if not is_admin() then raise exception 'Only admins can reject withdrawals'; end if;

  select * into req from withdrawal_requests where id = request_id for update;
  if not found then raise exception 'Withdrawal request not found'; end if;
  if req.org_id is distinct from my_org_id() then raise exception 'Request belongs to a different organization'; end if;
  if req.status <> 'pending' then raise exception 'Request was already %', req.status; end if;

  update withdrawal_requests
  set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
  where id = request_id;
end;
$$;

-- Balance lookup: only within the caller's org
create or replace function get_client_balance(p_client_id uuid)
returns numeric
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select balance from accounts where client_id = p_client_id and org_id = my_org_id()),
    0
  );
$$;

-- ── 6. Org-scoped RLS policies (drop + recreate) ─────────────
alter table organizations enable row level security;
drop policy if exists "members read own org" on organizations;
create policy "members read own org" on organizations
  for select using (id = my_org_id());

drop policy if exists "read own profile" on profiles;
create policy "read own profile" on profiles for select using (auth.uid() = id);
drop policy if exists "admins read all profiles" on profiles;
create policy "admins read org profiles" on profiles
  for select using (is_admin() and org_id = my_org_id());

drop policy if exists "staff read clients" on clients;
create policy "staff read clients" on clients
  for select using (auth.role() = 'authenticated' and org_id = my_org_id());
drop policy if exists "admins insert clients" on clients;
create policy "admins insert clients" on clients
  for insert with check (is_admin() and org_id = my_org_id());
drop policy if exists "admins update clients" on clients;
create policy "admins update clients" on clients
  for update using (is_admin() and org_id = my_org_id());

drop policy if exists "staff read bankers" on bankers;
create policy "staff read bankers" on bankers
  for select using (auth.role() = 'authenticated' and org_id = my_org_id());
drop policy if exists "admins insert bankers" on bankers;
create policy "admins insert bankers" on bankers
  for insert with check (is_admin() and org_id = my_org_id());
drop policy if exists "admins update bankers" on bankers;
create policy "admins update bankers" on bankers
  for update using (is_admin() and org_id = my_org_id());

drop policy if exists "admins read accounts" on accounts;
create policy "admins read accounts" on accounts
  for select using (is_admin() and org_id = my_org_id());

drop policy if exists "admins read transactions" on transactions;
create policy "admins read transactions" on transactions
  for select using (is_admin() and org_id = my_org_id());
drop policy if exists "bankers read own transactions" on transactions;
create policy "bankers read own transactions" on transactions
  for select using (banker_id = my_banker_id() and org_id = my_org_id());
drop policy if exists "admins insert transactions" on transactions;
create policy "admins insert transactions" on transactions
  for insert with check (is_admin() and org_id = my_org_id());
drop policy if exists "bankers insert own deposits" on transactions;
create policy "bankers insert own deposits" on transactions
  for insert with check (type = 'deposit' and banker_id = my_banker_id() and org_id = my_org_id());

drop policy if exists "admins read withdrawal requests" on withdrawal_requests;
create policy "admins read withdrawal requests" on withdrawal_requests
  for select using (is_admin() and org_id = my_org_id());
drop policy if exists "bankers read own withdrawal requests" on withdrawal_requests;
create policy "bankers read own withdrawal requests" on withdrawal_requests
  for select using (banker_id = my_banker_id() and org_id = my_org_id());
drop policy if exists "admins insert withdrawal requests" on withdrawal_requests;
create policy "admins insert withdrawal requests" on withdrawal_requests
  for insert with check (is_admin() and org_id = my_org_id());
drop policy if exists "bankers insert own withdrawal requests" on withdrawal_requests;
create policy "bankers insert own withdrawal requests" on withdrawal_requests
  for insert with check (banker_id = my_banker_id() and status = 'pending' and org_id = my_org_id());

drop policy if exists "admins read audit log" on audit_log;
create policy "admins read audit log" on audit_log
  for select using (is_admin() and org_id = my_org_id());

-- ============================================================
-- RUNBOOK: onboarding credit union #2 (until the wizard exists)
-- ============================================================
-- 1. insert into organizations (name) values ('Union Name') returning id;
-- 2. Authentication → Add user (admin email, autoconfirm)
-- 3. insert into profiles (id, role, full_name, org_id)
--    select id, 'admin', 'Admin Name', '<ORG_ID>' from auth.users where email = '<ADMIN_EMAIL>';
-- 4. Create their bankers rows + banker logins as before, with org_id = '<ORG_ID>'.
