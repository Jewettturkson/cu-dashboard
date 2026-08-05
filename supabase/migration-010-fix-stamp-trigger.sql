-- ============================================================
-- Migration 010: Fix stamp_org_id trigger
-- Bug: the banker-org guard used a compound condition
--   `TG_TABLE_NAME in (...) and NEW.banker_id is not null`
-- Postgres does not guarantee short-circuit evaluation, so on
-- tables without a banker_id column (bankers, clients) the
-- expression itself failed with:
--   record "new" has no field "banker_id"
-- breaking Add Banker and Add Client since migration 006.
-- Fix: nested IF statements — plpgsql only evaluates the body
-- of a taken branch, so NEW.<field> references are now reached
-- only for tables that actually have that field.
-- ============================================================

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

  if TG_TABLE_NAME in ('transactions', 'withdrawal_requests') then
    if NEW.banker_id is not null then
      if (select org_id from bankers where id = NEW.banker_id) is distinct from NEW.org_id then
        raise exception 'Banker belongs to a different organization';
      end if;
    end if;
  end if;

  return NEW;
end;
$$;
