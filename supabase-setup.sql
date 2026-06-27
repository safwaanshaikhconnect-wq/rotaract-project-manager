-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- It creates the projects table and enables real-time updates

-- 1. Create the projects table
create table if not exists projects (
  id           bigserial primary key,
  name         text        not null,
  status       text        not null default 'planning'
                           check (status in ('planning', 'active', 'done')),
  avenue       text,
  project_date date,
  description  text,
  assigned_ids integer[]   not null default '{}',
  created_at   timestamptz not null default now()
);

-- 2. Enable Row Level Security (RLS) but allow all reads/writes for authenticated users
--    Since you're using a shared password on the frontend, anon access is fine
alter table projects enable row level security;

create policy "Allow all for anon"
  on projects for all
  to anon
  using (true)
  with check (true);

-- 3. Enable real-time for the projects table
--    Go to: Supabase Dashboard → Database → Replication → enable projects table
--    OR run:
alter publication supabase_realtime add table projects;

-- 4. (Optional) Seed with your first few projects
insert into projects (name, status, assigned_ids) values
  ('Blood Donor Camp',              'active',   '{4, 16}'),
  ('International Service Exchange','planning', '{20, 21}'),
  ('Professional Dev Workshop',     'planning', '{24}');
