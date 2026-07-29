# SAT Nexus

Browser-first SAT question bank and practice app.

**Stack:** Next.js (App Router) · TypeScript · Tailwind · Vercel · Postgres · Supabase Auth

---

## Architecture

```
Browser (React / Next.js)
    │  REST /api/*
    ▼
Next.js Route Handlers  ── Auth (Supabase token or guest)
    │
    ├── Postgres (Supabase / Neon / any Postgres) → questions + per-user data
    └── Supabase Auth                             → accounts
```

| Layer | Responsibility |
|-------|----------------|
| **UI** | App Router pages + reusable components under `src/components` |
| **API** | `src/app/api/**` route handlers |
| **DB** | Drizzle + Postgres in production; PGlite embedded for local zero-config |
| **Auth** | Supabase Auth (email/password); guest mode when unset |
| **Deploy** | Vercel (`vercel.json`) |

User-owned rows (favorites, notes, collections, sessions, attempts) are scoped by `user_id`.

> Runtime database setup is driven by **Drizzle migrations** under `drizzle/`.

---

## Quick start (local)

```bash
npm install
npm run dev
# open http://localhost:3000
```

No cloud credentials required. Local mode uses embedded PGlite (`.sat-nexus-db/`) and a **Guest** identity.

---

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Set environment variables (Project → Settings → Environment Variables):

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | **Yes** | Runtime Postgres URL. For Supabase on Vercel, use the transaction pooler on port `6543`. |
| `DATABASE_MIGRATION_URL` | Strongly recommended | Migration URL for Drizzle. For Supabase, use the session pooler on port `5432`. If omitted, the app will auto-derive `5432` from a Supabase `DATABASE_URL` on `6543`. |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes for auth** | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes for auth** | Supabase anon key for browser auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Recommended for server-side token verification |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | Optional | Set `false` if your managed Postgres uses a private or self-signed CA, or if Vercel logs show `SELF_SIGNED_CERT_IN_CHAIN` |

4. Deploy. Vercel runs `npm run vercel-build`, which applies Drizzle migrations, seeds the question bank from `src/data/question-bank.json`, and then builds Next.js.

> Important: this app does **not** create tables through the Supabase JS client. It talks to Postgres directly through `DATABASE_URL` / `DATABASE_MIGRATION_URL`. `NEXT_PUBLIC_SUPABASE_URL` plus keys do not create schema by themselves.

```bash
# or from the CLI
npx vercel
```

For copy-paste Vercel / Supabase values, see [`VERCEL_SUPABASE_SETUP.md`](./VERCEL_SUPABASE_SETUP.md).

---

## Supabase Auth setup

1. In Supabase, open **Authentication → Providers → Email**.
2. Enable **Email** sign-in.
3. If you want users to log in immediately after sign-up, disable **Confirm email**. Otherwise, keep it on and users must confirm via email before signing in.
4. Copy these values into Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]
```

Until Supabase Auth is configured, the app stays fully usable as a **guest** (browser-local identity with server-side guest row).

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local Next.js dev server |
| `npm run build` | Production build |
| `npm run vercel-build` | Vercel build: migrate, seed, then build |
| `npm run db:generate` | Generate a new Drizzle migration from `src/db/schema.ts` |
| `npm run db:migrate` | Apply Drizzle migrations |
| `npm run db:seed` | Seed questions + practice tests |
| `npm run db:setup` | Migrate and seed in one command |
| `npm run start` | Run production server |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

Desktop packaging (Electron / Tauri) has been **removed**.

---

## Project layout

```
src/
  app/                 # App Router pages + API routes
  components/          # UI (quiz, shell, settings, auth)
  db/                  # Drizzle schema + connection
  lib/
    auth/              # Supabase + guest auth (client/server)
    *.ts               # Domain helpers (scoring, categories, …)
  data/                # Question bank + vocabulary seed JSON
```

---

## Extending

- **Analytics / email / payments / AI** — add route handlers under `src/app/api`; keep secrets in Vercel env vars only.
- **Multi-tenant data** — keyed by `users.id` from Supabase Auth.

---

## License / content

Question content follows College Board question-bank usage. See `VOCABULARY_ATTRIBUTION.md` for vocabulary sources.
