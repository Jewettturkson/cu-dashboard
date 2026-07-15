-- ============================================================
-- Migration 003: Audit log
-- Append-only record of every meaningful action, captured by
-- database triggers so it cannot be bypassed by client code.
-- Run in the Supabase SQL editor.
-- ============================================================

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,                -- auth user who performed the action
  actor_name text,
  actor_role text,              -- admin / banker at time of action
  action text not null,         -- e.g. transaction.deposit, client.create
  entity text not null,         -- source table
  entity_id uuid,
  details jsonb,                -- denormalized context (names, amounts)
  created_at timestamptz default now()
);

create index if not exists audit_log_created_at_idx on audit_log (created_at desc);
create index if not exists audit_log_actor_idx on audit_log (actor_id, created_at desc);

-- ── Trigger: writes an audit row for inserts/updates ─────────
-- SECURITY DEFINER: bankers can't read audit_log or profiles,
-- but the trigger still needs to write on their behalf.
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
  end if;

  insert into audit_log (actor_id, actor_name, actor_role, action, entity, entity_id, details)
  values (v_actor, coalesce(v_name, 'system'), coalesce(v_role, 'unknown'), v_action, TG_TABLE_NAME, NEW.id, v_details);

  return NEW;
end;
$$;

drop trigger if exists audit_transactions on transactions;
create trigger audit_transactions after insert on transactions
  for each row execute function log_audit();

drop trigger if exists audit_clients on clients;
create trigger audit_clients after insert or update on clients
  for each row execute function log_audit();

drop trigger if exists audit_bankers on bankers;
create trigger audit_bankers after insert or update on bankers
  for each row execute function log_audit();

-- ── RLS: admins read; nobody updates or deletes, ever ────────
alter table audit_log enable row level security;

create policy "admins read audit log" on audit_log
  for select using (is_admin());
-- No insert policy (trigger is security definer), no update, no
-- delete — the log is append-only by construction.
