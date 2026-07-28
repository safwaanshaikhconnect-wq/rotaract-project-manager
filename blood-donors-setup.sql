-- CODE RED: Blood Donor Registry
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Create the blood_donors table
create table if not exists blood_donors (
  id              bigserial primary key,
  name            text        not null,
  blood_group     text        not null
                  check (blood_group in ('A+','A-','B+','B-','O+','O-','AB+','AB-')),
  phone           text,
  donation_dates  date[]      not null default '{}',  -- full history of every donation
  notes           text,
  created_at      timestamptz not null default now()
);

-- 2. Enable Row Level Security — allow anon reads/writes (same as projects table)
alter table blood_donors enable row level security;

create policy "Allow all for anon"
  on blood_donors for all
  to anon
  using (true)
  with check (true);

-- 3. Enable real-time for the blood_donors table
alter publication supabase_realtime add table blood_donors;

-- 4. If you already ran this script earlier, just add the phone column:
-- alter table blood_donors add column if not exists phone text;

-- 5. (Optional) Seed with a few sample donors
-- insert into blood_donors (name, blood_group, phone, donation_dates) values
--   ('Safwaan Shaikh', 'O+', '+91 98765 43210', '{}'),
--   ('Bharani Krishna', 'B+', null, '{2026-04-15}');
