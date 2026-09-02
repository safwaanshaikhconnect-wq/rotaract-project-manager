-- CODE RED: Master Blood Donations Log
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Create the blood_donations table
create table if not exists blood_donations (
  id              bigserial primary key,
  donor_name      text        not null,
  donation_type   text        not null default 'Regular'
                              check (donation_type in ('Emergency', 'Regular')),
  hospital_name   text        not null,
  donation_date   date        not null default current_date,
  notes           text,
  created_at      timestamptz not null default now()
);

-- 2. Enable Row Level Security (RLS)
alter table blood_donations enable row level security;

create policy "Allow all for anon"
  on blood_donations for all
  to anon
  using (true)
  with check (true);

-- 3. Enable real-time for blood_donations
alter publication supabase_realtime add table blood_donations;

-- 4. (Optional) Seed with sample donation
-- insert into blood_donations (donor_name, donation_type, hospital_name, donation_date) values
--   ('Rtr. Mohammed Safwaan', 'Emergency', 'KMCH Coimbatore', '2026-08-12');
