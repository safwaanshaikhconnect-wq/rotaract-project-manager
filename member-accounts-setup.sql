-- ============================================================================
-- DEPRECATED: Legacy member_accounts (plaintext PIN) table
-- Plaintext PIN authentication has been removed and replaced with Supabase Auth
-- backed by public.board_members + Row Level Security (RLS).
--
-- Use supabase-auth-rls-migration.sql instead.
-- Running this script safely locks down any legacy member_accounts table
-- without deleting existing records.
-- ============================================================================

do $$
begin
  if to_regclass('public.member_accounts') is not null then
    execute 'alter table public.member_accounts enable row level security';
    execute 'drop policy if exists "Allow all for anon" on public.member_accounts';
    execute 'revoke all on table public.member_accounts from public, anon, authenticated';
  end if;
end $$;
