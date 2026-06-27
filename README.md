# Rotaract KAHE — Team Dashboard RY 2026–27

A lightweight team tracker. See who's busy, who's free, and what every member is working on. Drag members onto projects to assign them.

---

## Tech stack
- **React + Vite** — frontend
- **Supabase** — database + real-time sync
- **Vercel** — hosting (free)

---

## Setup (15 minutes)

### Step 1 — Supabase (database)

1. Go to [supabase.com](https://supabase.com) → Create a new project
2. Once created, go to **SQL Editor** → **New query**
3. Paste the entire contents of `supabase-setup.sql` and run it
4. Go to **Settings → API** and copy:
   - `Project URL`
   - `anon` / `public` key

### Step 2 — Local setup

```bash
# Clone / unzip the project, then:
npm install

# Create your env file
cp .env.example .env.local
# Edit .env.local and paste your Supabase URL and anon key

# Run locally
npm run dev
```

Visit `http://localhost:5173` — the password is `rotaract2627`

> **Change the password**: open `src/components/AuthGate.jsx` and edit the `TEAM_PASSWORD` constant.

### Step 3 — Deploy to Vercel (free)

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → import your repo
3. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy — you'll get a live URL like `rotaract-kahe.vercel.app`

Share that URL with your team. That's it.

---

## How to use

| What you want | How |
|---|---|
| See who's free | Board members tab — green dot = available, blue = on a project |
| Assign someone to a project | Drag their card from Board members → drop on a project |
| Remove someone from a project | Projects tab → click ✕ next to their name |
| Add a new project | Projects tab → "Add project" button |
| Change project status | Not supported in UI yet — edit directly in Supabase dashboard |

---

## Project structure

```
src/
  components/
    AuthGate.jsx      ← shared password gate
    BoardTab.jsx      ← member grid with drag
    ProjectsTab.jsx   ← project cards with drop zones
  lib/
    members.js        ← all 33 members data (edit here to update roster)
    supabase.js       ← supabase client
  App.jsx             ← main logic, state, supabase calls
  index.css           ← all styles
```

---

## Updating the member list

Open `src/lib/members.js` — the `MEMBERS` array has every member. Add, edit, or remove entries there. The `id` field just needs to be a unique number — it determines the avatar color.

---

## Notes

- Real-time: when anyone assigns a member, all open browsers update within ~1 second
- The shared password lives in `src/components/AuthGate.jsx` — change `TEAM_PASSWORD`
- Member data is hardcoded (no database) — to update the roster you edit the JS file and redeploy
