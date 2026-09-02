-- MEMBER ACCOUNTS SETUP: Per-member login accounts with personal PINs
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Create the member_accounts table
create table if not exists member_accounts (
  member_id   integer primary key,         -- Matches ID from MEMBERS list (1, 2, 3...)
  pin_code    text not null,               -- Personal PIN / password
  is_admin    boolean not null default false,
  updated_at  timestamptz not null default now()
);

-- 2. Enable Row Level Security (RLS) — allow anon reads & updates
alter table member_accounts enable row level security;

create policy "Allow all for anon"
  on member_accounts for all
  to anon
  using (true)
  with check (true);

-- 3. Enable real-time replication for member_accounts
alter publication supabase_realtime add table member_accounts;

-- 4. Seed initial accounts for all 24 board members with default PIN (first 3 letters of name + 123)
insert into member_accounts (member_id, pin_code, is_admin) values
  (1,  'moh123', true),   -- Mohammed Safwaan (President / Admin)
  (2,  'bha123', true),   -- Bharani Krishna (Secretary / Admin)
  (5,  'kar123', false),  -- Karthick Chandrasekar
  (3,  'rin123', false),  -- Rineesha A
  (4,  'gir123', false),  -- Giri S
  (6,  'vis123', false),  -- Vishnu Prasath
  (7,  'ros123', false),  -- Roshitha B
  (8,  'lmo123', false),  -- L Mohammed Sajad
  (9,  'sha123', false),  -- S. Shahinthaneem
  (11, 'sud123', false),  -- Sudeep K
  (12, 'aks123', false),  -- Akshita
  (16, 'akh123', false),  -- Akhash Ram N
  (35, 'udi123', false),  -- A. Udit
  (20, 'moh123', false),  -- Mohamed Jamseeth
  (21, 'ann123', false),  -- Ann Thomas
  (24, 'anu123', false),  -- Anu Lakshmi S
  (17, 'mee123', false),  -- Meenakshi K
  (10, 'vis123', false),  -- Vishal
  (28, 'kir123', false),  -- Kiruthik M N
  (27, 'aak123', false),  -- V Aakash
  (29, 'dee123', false),  -- Deepak
  (30, 'yok123', false),  -- Yokesh B R
  (34, 'vik123', false),  -- Vikas
  (14, 'ass123', false)   -- Assmitha B
on conflict (member_id) do update
  set is_admin = excluded.is_admin;
