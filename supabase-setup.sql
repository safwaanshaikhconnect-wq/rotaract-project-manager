-- Run this in your Supabase SQL editor (Dashboard -> SQL Editor -> New query)
-- Sets up the projects table, board_members authorization table, RLS policies,
-- and real-time replication for a fresh project.
-- For existing databases with data, use supabase-auth-rls-migration.sql instead.

-- 1. Create the projects table
create table if not exists public.projects (
  id           bigserial primary key,
  name         text        not null,
  status       text        not null default 'planning'
                           check (status in ('planning', 'active', 'done')),
  avenue       text,
  project_date date,
  description  text,
  assigned_ids integer[]   not null default '{}',
  chair_id     integer,
  created_at   timestamptz not null default now()
);

alter table public.projects
  add column if not exists chair_id integer;

-- 2. Create board_members table linking Supabase Auth users to board member IDs
create table if not exists public.board_members (
  member_id    integer primary key,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email        text unique,
  full_name    text not null,
  role         text not null,
  member_group text not null,
  is_admin     boolean not null default false,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_board_members_email_lower
  on public.board_members (lower(email));

-- Seed the 24 board member slots (set each member's email before inviting/creating Auth users)
insert into public.board_members (member_id, full_name, role, member_group, is_admin) values
  (1,  'Mohammed Safwaan',      'President',                                     'Secretariat',                  true),
  (2,  'Bharani Krishna',       'Secretary',                                     'Secretariat',                  true),
  (5,  'Karthick Chandrasekar', 'Immediate Past President',                      'Secretariat',                  false),
  (3,  'Rineesha A',            'Joint Secretary',                               'Secretariat',                  false),
  (4,  'Giri S',                'Vice President',                                'Secretariat',                  false),
  (6,  'Vishnu Prasath',        'President''s Special Aide & Chair – Membership','Secretariat',                  false),
  (7,  'Roshitha B',            'Treasurer',                                     'Special Portfolios',           false),
  (8,  'L Mohammed Sajad',      'Sergeant-at-Arms',                              'Special Portfolios',           false),
  (9,  'S. Shahinthaneem',      'Chair – All Avenues',                           'Special Portfolios',           false),
  (11, 'Sudeep K',              'Chair – Club Service',                          'Club Service',                 false),
  (12, 'Akshita',               'Director – Club Service',                       'Club Service',                 false),
  (16, 'Akhash Ram N',          'Chair – Community Service',                     'Community Service',            false),
  (35, 'A. Udit',               'Director – Community Service',                  'Community Service',            false),
  (20, 'Mohamed Jamseeth',      'Chair – International Service',                 'International Service',        false),
  (21, 'Ann Thomas',            'Director – International Service',              'International Service',        false),
  (24, 'Anu Lakshmi S',         'Chair – Professional Development',              'Professional Development',     false),
  (17, 'Meenakshi K',           'Director – Professional Service',               'Professional Development',     false),
  (10, 'Vishal',                'Chair – District Priority Project',             'District Priority Projects',   false),
  (28, 'Kiruthik M N',          'Director – District Priority Projects',         'District Priority Projects',   false),
  (27, 'V Aakash',              'Chair – Social Media & Editor',                 'Media & PR',                   false),
  (29, 'Deepak',                'Chair – Web Service & TRF',                     'Media & PR',                   false),
  (30, 'Yokesh B R',            'Chair – Public Relations',                      'Media & PR',                   false),
  (34, 'Vikas',                 'Chair – Blood Donar Wing',                      'Blood Donor Wing',             false),
  (14, 'Assmitha B',            'Chair – Campus Engagement & Outreach',          'Campus Engagement & Outreach', false)
on conflict (member_id) do update
  set full_name    = excluded.full_name,
      role         = excluded.role,
      member_group = excluded.member_group,
      updated_at   = now();

-- 3. Authorization helpers (SECURITY DEFINER, fail-closed)
create or replace function public.is_authorized_member()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.board_members bm
    join auth.users u on u.id = auth.uid()
    where bm.is_active = true
      and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until <= now())
      and (
        bm.auth_user_id = u.id
        or (
          bm.auth_user_id is null
          and bm.email is not null
          and lower(bm.email) = lower(u.email)
        )
      )
  );
$$;

create or replace function public.is_board_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.board_members bm
    join auth.users u on u.id = auth.uid()
    where bm.is_active = true
      and bm.is_admin = true
      and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until <= now())
      and (
        bm.auth_user_id = u.id
        or (
          bm.auth_user_id is null
          and bm.email is not null
          and lower(bm.email) = lower(u.email)
        )
      )
  );
$$;

create or replace function public.claim_board_member_profile()
returns setof public.board_members
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid       uuid := auth.uid();
  v_email     text;
  v_confirmed timestamptz;
  v_banned    timestamptz;
begin
  if v_uid is null then
    return;
  end if;

  select u.email, u.email_confirmed_at, u.banned_until
    into v_email, v_confirmed, v_banned
  from auth.users u
  where u.id = v_uid;

  if v_confirmed is null or (v_banned is not null and v_banned > now()) then
    return;
  end if;

  update public.board_members bm
     set auth_user_id = v_uid,
         updated_at   = now()
   where bm.auth_user_id is null
     and bm.is_active = true
     and bm.email is not null
     and lower(bm.email) = lower(v_email);

  return query
  select bm.*
    from public.board_members bm
   where bm.auth_user_id = v_uid
     and bm.is_active = true
   limit 1;
end;
$$;

revoke all on function public.is_authorized_member() from public, anon;
grant execute on function public.is_authorized_member() to authenticated;

revoke all on function public.is_board_admin() from public, anon;
grant execute on function public.is_board_admin() to authenticated;

revoke all on function public.claim_board_member_profile() from public, anon;
grant execute on function public.claim_board_member_profile() to authenticated;

-- 4. Enable Row Level Security (RLS) — authenticated authorized board members only
alter table public.board_members enable row level security;
drop policy if exists "Authorized members can view board members" on public.board_members;
drop policy if exists "Admins can insert board members" on public.board_members;
drop policy if exists "Admins can update board members" on public.board_members;
drop policy if exists "Admins can delete board members" on public.board_members;

revoke all on table public.board_members from public, anon;
grant select, insert, update, delete on table public.board_members to authenticated;

create policy "Authorized members can view board members"
  on public.board_members for select
  to authenticated
  using (public.is_authorized_member());

create policy "Admins can insert board members"
  on public.board_members for insert
  to authenticated
  with check (public.is_board_admin());

create policy "Admins can update board members"
  on public.board_members for update
  to authenticated
  using (public.is_board_admin())
  with check (public.is_board_admin());

create policy "Admins can delete board members"
  on public.board_members for delete
  to authenticated
  using (public.is_board_admin());

alter table public.projects enable row level security;
drop policy if exists "Allow all for anon" on public.projects;
drop policy if exists "Authorized members can select projects" on public.projects;
drop policy if exists "Authorized members can insert projects" on public.projects;
drop policy if exists "Authorized members can update projects" on public.projects;
drop policy if exists "Authorized members can delete projects" on public.projects;

revoke all on table public.projects from public, anon;
grant select, insert, update, delete on table public.projects to authenticated;

create policy "Authorized members can select projects"
  on public.projects for select
  to authenticated
  using (public.is_authorized_member());

create policy "Authorized members can insert projects"
  on public.projects for insert
  to authenticated
  with check (public.is_authorized_member());

create policy "Authorized members can update projects"
  on public.projects for update
  to authenticated
  using (public.is_authorized_member())
  with check (public.is_authorized_member());

create policy "Authorized members can delete projects"
  on public.projects for delete
  to authenticated
  using (public.is_authorized_member());

revoke all on all sequences in schema public from public, anon;
grant usage, select on all sequences in schema public to authenticated;

-- 5. Enable real-time for the projects table
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'projects'
  ) then
    alter publication supabase_realtime add table public.projects;
  end if;
end $$;
