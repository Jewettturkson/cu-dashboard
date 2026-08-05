-- ============================================================
-- Migration 009: Security pass
-- 1. get_client_balance now writes an audit entry whenever a
--    BANKER looks up a balance ('balance.viewed'). Decision:
--    audit-on-call rather than context restriction — a
--    "withdrawal context" cannot be proven server-side before
--    the request exists, so restriction would be theater.
--    Visibility is this system's fraud model; lookup patterns
--    become admin-visible signals in the existing audit feed.
--    (Admin lookups are not logged — admins can already read
--    accounts directly.)
-- 2. Auto-provision profiles for auth users created with org
--    metadata (the banker-management API sets this), so an
--    invited user can never land without a profile row.
-- Run in the Supabase SQL editor.
-- ============================================================

create or replace function get_client_balance(p_client_id uuid)
returns numeric
language plpgsql security definer
set search_path = public
as $$
declare
  v_bal  numeric;
  v_role text;
  v_name text;
  v_org  uuid := my_org_id();
begin
  select coalesce(balance, 0) into v_bal
  from accounts where client_id = p_client_id and org_id = v_org;
  v_bal := coalesce(v_bal, 0);

  select role, full_name into v_role, v_name from profiles where id = auth.uid();

  if v_role = 'banker' then
    insert into audit_log (actor_id, actor_name, actor_role, action, entity, entity_id, details, org_id)
    values (
      auth.uid(), coalesce(v_name, 'unknown'), v_role,
      'balance.viewed', 'accounts', p_client_id,
      jsonb_build_object(
        'client_id', p_client_id,
        'client_name', (select full_name from clients where id = p_client_id and org_id = v_org),
        'balance', v_bal
      ),
      v_org
    );
  end if;

  return v_bal;
end;
$$;

-- ── Profile auto-provisioning ────────────────────────────────
-- The banker-management API creates auth users with
-- user_metadata { org_id, role, full_name, banker_id }.
-- This trigger turns that metadata into a profiles row at
-- signup time, atomically. Users created WITHOUT org metadata
-- get no profile — middleware treats them as unprovisioned and
-- sends them to /login with a clear message (deny by default).
create or replace function handle_new_auth_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if NEW.raw_user_meta_data ? 'org_id' then
    insert into profiles (id, role, org_id, full_name, banker_id)
    values (
      NEW.id,
      coalesce(NEW.raw_user_meta_data->>'role', 'banker'),
      (NEW.raw_user_meta_data->>'org_id')::uuid,
      NEW.raw_user_meta_data->>'full_name',
      nullif(NEW.raw_user_meta_data->>'banker_id', '')::uuid
    )
    on conflict (id) do nothing;
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
