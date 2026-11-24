# Rotaract KAHE — Team Dashboard RY 2026–27

A team project, availability, analytics, reporting, and Code Red blood donor management dashboard for the Rotaract Club of Karpagam Academy of Higher Education (RID 3206).

---

## Tech stack
- **React + Vite** — frontend
- **Supabase Auth + PostgreSQL + Realtime** — email/password authentication, Row Level Security (RLS), database, and real-time sync
- **Vercel** — hosting

---

## Authentication & Security Architecture

- **Supabase Auth (Email + Password):** Board members sign in with individual Supabase Auth accounts (`supabase.auth.signInWithPassword`). No shared password, default PINs, or credentials are stored in frontend code.
- **Database Authorization (`public.board_members`):** Authenticated sessions are verified against `public.board_members` via `SECURITY DEFINER` PostgreSQL helpers (`public.is_authorized_member()`, `public.is_board_admin()`, and `public.claim_board_member_profile()`).
- **Row Level Security (RLS):** Unauthenticated (`anon`) access to `projects`, `blood_donors`, `blood_donations`, `board_members`, and legacy `member_accounts` is denied. Only confirmed, active board members can read or modify dashboard data.
- **Zero `service_role` Exposure:** Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are used on the frontend; `src/lib/supabase.js` explicitly rejects `service_role` / secret keys if accidentally configured.

---

## Setup

### Step 1 — Supabase Database & RLS Setup

1. Open your project in the [Supabase Dashboard](https://supabase.com).
2. Go to **SQL Editor → New query**.
3. Choose the SQL script that matches your database state:
   - **Existing database (preserves all existing records):** run `supabase-auth-rls-migration.sql`
   - **Brand-new Supabase project:** run `supabase-setup.sql`, then `blood-donors-setup.sql`, then `blood-donations-log-setup.sql`

### Step 2 — Supabase Dashboard Auth Configuration (Required)

1. **Disable public sign-ups** (prevents unauthorized outsiders from creating accounts):
   - Go to **Authentication → Sign In / Providers** (or **Authentication → Settings → User Signups**).
   - Turn **Allow new users to sign up** **OFF** (keep **Email** provider **ON**).
2. **Map board member emails in `public.board_members`**:
   - In **SQL Editor**, assign each active board member's real email address (matching the email you will invite/create in Supabase Auth):
     ```sql
     update public.board_members set email = 'president@example.com' where member_id = 1;
     update public.board_members set email = 'secretary@example.com' where member_id = 2;
     -- Repeat for each active board member
     ```
   - Alternatively, insert/update rows in **Table Editor → `board_members`**.
3. **Create or invite board member accounts**:
   - Go to **Authentication → Users → Add user** (or **Invite user**).
   - If creating a user directly, check **Auto Confirm User** and provide a strong temporary password (or send an invite / password reset link so the member sets their own password).
   - On first sign-in, `claim_board_member_profile()` automatically binds `auth_user_id` to the matching confirmed email in `public.board_members`.
4. **Configure URL settings for Password Reset**:
   - Go to **Authentication → URL Configuration**.
   - Set **Site URL** to your production URL (e.g. `https://rotaract-kahe.vercel.app`) and add `http://localhost:5173` under **Redirect URLs**.
5. **Verify RLS enforcement**:
   - Confirm an unauthenticated `anon` request to `/rest/v1/projects?select=*` returns HTTP `401`/`403` (or empty/denied permission error) with zero rows exposed.

### Step 3 — Local Environment Setup

```bash
npm install

# Create your local env file (gitignored)
cp .env.example .env.local
```

Edit `.env.local` with values from **Supabase Dashboard → Project Settings → API**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (public `anon` key only — never `service_role`)

Run locally:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

### Step 4 — Deploy to Vercel

1. Push this repository to GitHub (never commit `.env.local`).
2. Import the repository in [Vercel](https://vercel.com).
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel Project Settings → Environment Variables.
4. Deploy and verify the production URL is added to Supabase **Authentication → URL Configuration → Redirect URLs**.

---

## How to use

| What you want | How |
|---|---|
| Sign in / reset password | Enter your board email & password on the login screen (or use **Forgot password?**) |
| View workload & availability | **Board members** tab — green = available, amber = active project count |
| Manage projects & assignments | **Projects** tab — create/delete projects, toggle status, set Event Chair & Supportive Members |
| View analytics & generate PDFs | **Analytics** and **Report** tabs |
| Blood donor registry & logs | **Code Red** tab |
| Change password / sign out | **My Account** tab |

---

## Project structure

```text
src/
  components/
    AccountTab.jsx    ← profile summary, password update, sign out
    AnalyticsTab.jsx  ← project & involvement metrics
    AuthGate.jsx      ← Supabase email/password sign-in & password recovery UI
    BoardTab.jsx      ← board member availability & chaired projects grid
    CodeRedTab.jsx    ← blood donor registry & master donation log
    ProjectsTab.jsx   ← project creation, filtering, chair & supportive assignments
    ReportTab.jsx     ← monthly PDF report generator (jsPDF)
    SplashIntro.jsx   ← opening splash overlay
  lib/
    auth.js           ← Supabase Auth session, sign-in/out, password reset, profile claim
    members.js        ← board roster metadata & avatar helpers
    supabase.js       ← Supabase client with service_role guard
  App.jsx             ← session guard, auth state listener, project sync
  index.css           ← application styles
supabase-auth-rls-migration.sql  ← idempotent migration for existing Supabase DBs
supabase-setup.sql               ← fresh DB setup for projects & board_members
blood-donors-setup.sql           ← fresh DB setup for blood_donors
blood-donations-log-setup.sql    ← fresh DB setup for blood_donations
member-accounts-setup.sql        ← deprecated legacy table lockdown
```

---

## Security note on Git history

Earlier commits in this repository contained a legacy shared password (`TEAM_PASSWORD` / `MASTER_PASSWORD`) and plaintext PIN setup files. Even though all hardcoded credentials have been removed from the codebase, if this repository was ever public or shared externally, rotate any previously used credentials and consider purging sensitive commit history if required.
