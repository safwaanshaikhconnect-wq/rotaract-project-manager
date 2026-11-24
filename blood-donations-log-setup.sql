-- CODE RED: Master Blood Donations Log
-- Run this in your Supabase SQL Editor AFTER supabase-setup.sql / supabase-auth-rls-migration.sql

-- 1. Create the blood_donations table
create table if not exists public.blood_donations (
  id              bigserial primary key,
  donor_name      text        not null,
  donation_type   text        not null default 'Regular'
                              check (donation_type in ('Emergency', 'Regular')),
  hospital_name   text        not null,
  donation_date   date        not null default current_date,
  notes           text,
  created_at      timestamptz not null default now()
);

-- 2. Enable Row Level Security (RLS) — authenticated authorized board members only
alter table public.blood_donations enable row level security;

drop policy if exists "Allow all for anon" on public.blood_donations;
drop policy if exists "Authorized members can select blood_donations" on public.blood_donations;
drop policy if exists "Authorized members can insert blood_donations" on public.blood_donations;
drop policy if exists "Authorized members can update blood_donations" on public.blood_donations;
drop policy if exists "Authorized members can delete blood_donations" on public.blood_donations;

revoke all on table public.blood_donations from public, anon;
grant select, insert, update, delete on table public.blood_donations to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create policy "Authorized members can select blood_donations"
  on public.blood_donations for select
  to authenticated
  using (public.is_authorized_member());

create policy "Authorized members can insert blood_donations"
  on public.blood_donations for insert
  to authenticated
  with check (public.is_authorized_member());

create policy "Authorized members can update blood_donations"
  on public.blood_donations for update
  to authenticated
  using (public.is_authorized_member())
  with check (public.is_authorized_member());

create policy "Authorized members can delete blood_donations"
  on public.blood_donations for delete
  to authenticated
  using (public.is_authorized_member());

-- 3. Enable real-time for blood_donations
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'blood_donations'
  ) then
    alter publication supabase_realtime add table public.blood_donations;
  end if;
end $$;
