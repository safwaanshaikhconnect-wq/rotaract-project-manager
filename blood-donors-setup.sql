-- CODE RED: Blood Donor Registry
-- Run this in your Supabase SQL Editor AFTER supabase-setup.sql / supabase-auth-rls-migration.sql

-- 1. Create the blood_donors table
create table if not exists public.blood_donors (
  id              bigserial primary key,
  name            text        not null,
  blood_group     text        not null
                  check (blood_group in ('A+','A-','B+','B-','O+','O-','AB+','AB-')),
  phone           text,
  donation_dates  date[]      not null default '{}',  -- full history of every donation
  notes           text,
  created_at      timestamptz not null default now()
);

-- 2. Enable Row Level Security — authenticated authorized board members only
alter table public.blood_donors enable row level security;

drop policy if exists "Allow all for anon" on public.blood_donors;
drop policy if exists "Authorized members can select blood_donors" on public.blood_donors;
drop policy if exists "Authorized members can insert blood_donors" on public.blood_donors;
drop policy if exists "Authorized members can update blood_donors" on public.blood_donors;
drop policy if exists "Authorized members can delete blood_donors" on public.blood_donors;

revoke all on table public.blood_donors from public, anon;
grant select, insert, update, delete on table public.blood_donors to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create policy "Authorized members can select blood_donors"
  on public.blood_donors for select
  to authenticated
  using (public.is_authorized_member());

create policy "Authorized members can insert blood_donors"
  on public.blood_donors for insert
  to authenticated
  with check (public.is_authorized_member());

create policy "Authorized members can update blood_donors"
  on public.blood_donors for update
  to authenticated
  using (public.is_authorized_member())
  with check (public.is_authorized_member());

create policy "Authorized members can delete blood_donors"
  on public.blood_donors for delete
  to authenticated
  using (public.is_authorized_member());

-- 3. Enable real-time for the blood_donors table
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'blood_donors'
  ) then
    alter publication supabase_realtime add table public.blood_donors;
  end if;
end $$;
