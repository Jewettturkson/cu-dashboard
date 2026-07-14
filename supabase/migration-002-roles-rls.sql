-- ============================================================
-- Migration 002: Roles + Row-Level Security
-- Run in the Supabase SQL editor AFTER deploying the matching
-- app code (pages must use the session-aware server client).
-- ============================================================

-- ── 1. Profiles: one row per auth user, carries the role ────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'banker' check (role in ('admin', 'banker')),
  banker_id uuid references bankers(id),   -- set for banker users; null for admins
  full_name text,
  created_at timestamptz default now()
);

-- ── 2. Role helper functions ─────────────────────────────────
-- SECURITY DEFINER so they can read profiles without tripping
-- profiles' own RLS (avoids infinite recursion in policies).
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.my_banker_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select banker_id from profiles where id = auth.uid();
$$;

-- ── 3. Balance trigger must bypass RLS ───────────────────────
-- Bankers can insert transactions but cannot touch accounts;
-- the trigger does it on their behalf.
create or replace function update_account_balance()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if NEW.type = 'deposit' then
    insert into accounts (client_id, balance, last_updated)
    values (NEW.client_id, NEW.amount, now())
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

-- ── 4. Enable RLS everywhere (deny by default) ───────────────
alter table profiles     enable row level security;
alter table clients      enable row level security;
alter table bankers      enable row level security;
alter table accounts     enable row level security;
alter table transactions enable row level security;

-- ── 5. Policies ──────────────────────────────────────────────

-- profiles: users read their own row; admins read all
create policy "read own profile"   on profiles for select using (auth.uid() = id);
create policy "admins read all profiles" on profiles for select using (is_admin());

-- clients: any signed-in staff can read (bankers need the list
-- to collect); only admins create/update. No deletes.
create policy "staff read clients"   on clients for select using (auth.role() = 'authenticated');
create policy "admins insert clients" on clients for insert with check (is_admin());
create policy "admins update clients" on clients for update using (is_admin());

-- bankers: staff read; admins write
create policy "staff read bankers"   on bankers for select using (auth.role() = 'authenticated');
create policy "admins insert bankers" on bankers for insert with check (is_admin());
create policy "admins update bankers" on bankers for update using (is_admin());

-- accounts: admins only (bankers never see balances). Balance
-- updates happen exclusively via the security-definer trigger.
create policy "admins read accounts" on accounts for select using (is_admin());

-- transactions: append-only ledger.
--   admins read everything; bankers read only their own rows
--   admins insert anything; bankers insert only deposits
--   attributed to themselves. No update/delete policies exist
--   on purpose: corrections are reversal transactions.
create policy "admins read transactions" on transactions for select using (is_admin());
create policy "bankers read own transactions" on transactions
  for select using (banker_id = my_banker_id());
create policy "admins insert transactions" on transactions
  for insert with check (is_admin());
create policy "bankers insert own deposits" on transactions
  for insert with check (
    type = 'deposit' and banker_id = my_banker_id()
  );

-- ============================================================
-- ONE-TIME SETUP (edit before running)
-- ============================================================

-- (a) Make YOUR existing login an admin:
-- insert into profiles (id, role, full_name)
-- select id, 'admin', 'Admin' from auth.users
-- where email = 'YOUR_LOGIN_EMAIL_HERE'
-- on conflict (id) do update set role = 'admin';

-- (b) For each banker: first create the user in
-- Authentication → Users → Add user (email like bnk-001@yourcu.app,
-- autoconfirm ON), then link them to their bankers row:
-- insert into profiles (id, role, banker_id, full_name)
-- select u.id, 'banker', b.id, b.full_name
-- from auth.users u, bankers b
-- where u.email = 'bnk-001@yourcu.app' and b.employee_id = 'BNK-001'
-- on conflict (id) do update set role = 'banker', banker_id = excluded.banker_id;
