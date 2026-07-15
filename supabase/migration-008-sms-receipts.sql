-- ============================================================
-- Migration 008: SMS receipts (infrastructure, off by default)
-- After every deposit/withdrawal, the CLIENT's phone gets an SMS
-- with the amount and new balance — the core anti-fraud feature.
-- Sent from a database trigger via pg_net so no code path can
-- skip it. Per-org config; does nothing until enabled with an
-- Arkesel API key. SMS failure NEVER blocks a money record.
-- ============================================================

create extension if not exists pg_net;

-- Config lives in its own table with RLS on and ZERO policies:
-- nothing can read the API key through the API; only the
-- SECURITY DEFINER trigger below touches it.
create table if not exists org_sms_config (
  org_id uuid primary key references organizations(id) on delete cascade,
  enabled boolean not null default false,
  api_key text,
  sender_id text default 'CUDash',   -- Arkesel-approved sender name, max 11 chars
  created_at timestamptz default now()
);
alter table org_sms_config enable row level security;

create or replace function send_sms_receipt()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  cfg org_sms_config%rowtype;
  v_phone text;
  v_bal numeric;
  v_org_name text;
  v_msg text;
begin
  if NEW.type not in ('deposit', 'withdrawal') then return NEW; end if;

  select * into cfg from org_sms_config where org_id = NEW.org_id and enabled = true;
  if not found or cfg.api_key is null then return NEW; end if;

  select coalesce(momo_number, phone) into v_phone from clients where id = NEW.client_id;
  if v_phone is null or v_phone = '' then return NEW; end if;
  -- Local format 024xxxxxxx → international 23324xxxxxxx
  if left(v_phone, 1) = '0' then v_phone := '233' || substr(v_phone, 2); end if;

  -- Runs after the balance trigger (alphabetical order), so this is the NEW balance
  select balance into v_bal from accounts where client_id = NEW.client_id;
  select name into v_org_name from organizations where id = NEW.org_id;

  v_msg := case
    when NEW.type = 'deposit' then 'Deposit of GHS ' || NEW.amount || ' received.'
    else 'Withdrawal of GHS ' || NEW.amount || ' paid out.'
  end || ' New balance: GHS ' || coalesce(v_bal, 0) || '. - ' || coalesce(v_org_name, 'Credit Union');

  begin
    perform net.http_post(
      url := 'https://sms.arkesel.com/api/v2/sms/send',
      headers := jsonb_build_object('api-key', cfg.api_key, 'Content-Type', 'application/json'),
      body := jsonb_build_object(
        'sender', coalesce(cfg.sender_id, 'CUDash'),
        'message', v_msg,
        'recipients', jsonb_build_array(v_phone)
      )
    );
  exception when others then
    null;  -- receipts are best-effort; the ledger entry always stands
  end;

  return NEW;
end;
$$;

drop trigger if exists zz_sms_receipt on transactions;
create trigger zz_sms_receipt after insert on transactions
  for each row execute function send_sms_receipt();

-- ============================================================
-- TO ENABLE (once you have an Arkesel account + API key):
-- insert into org_sms_config (org_id, enabled, api_key, sender_id)
-- values ('<ORG_ID>', true, '<ARKESEL_API_KEY>', 'YourCUName')
-- on conflict (org_id) do update set enabled = true, api_key = excluded.api_key, sender_id = excluded.sender_id;
-- ============================================================
