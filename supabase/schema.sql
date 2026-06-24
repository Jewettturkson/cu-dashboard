-- ============================================================
-- Credit Union Dashboard - Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Clients: people who save with the credit union
create table clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  momo_number text,                     -- MTN MoMo number (may differ from phone)
  account_number text unique,           -- internal credit union account number
  address text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Bankers: mobile field officers who collect savings
create table bankers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  employee_id text unique,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Accounts: each client has one savings account
create table accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  balance numeric(12, 2) default 0,
  last_updated timestamptz default now(),
  unique(client_id)
);

-- Transactions: every deposit or withdrawal
create table transactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  banker_id uuid references bankers(id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  type text not null check (type in ('deposit', 'withdrawal')),
  method text not null check (method in ('cash', 'momo')),   -- how money moved
  notes text,
  created_at timestamptz default now()
);

-- Auto-update account balance on each transaction
create or replace function update_account_balance()
returns trigger as $$
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
$$ language plpgsql;

create trigger on_transaction_insert
after insert on transactions
for each row execute function update_account_balance();

-- Seed some demo data so the dashboard isn't empty on first load
insert into bankers (full_name, phone, employee_id) values
  ('Kofi Mensah', '0244000001', 'BNK-001'),
  ('Ama Serwaa', '0244000002', 'BNK-002');

insert into clients (full_name, phone, momo_number, account_number, address) values
  ('Abena Boateng', '0200000001', '0200000001', 'ACC-0001', 'Kumasi Central'),
  ('Kwame Asante', '0200000002', '0200000002', 'ACC-0002', 'Adum, Kumasi'),
  ('Akua Frimpong', '0200000003', null, 'ACC-0003', 'Suame, Kumasi'),
  ('Yaw Darko', '0200000004', '0200000004', 'ACC-0004', 'Bantama, Kumasi'),
  ('Adwoa Osei', '0200000005', '0200000005', 'ACC-0005', 'Nhyiaeso, Kumasi');
