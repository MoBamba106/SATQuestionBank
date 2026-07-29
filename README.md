# SAT Nexus

Browser-first SAT question bank and practice app.

**Stack:** Next.js (App Router) · TypeScript · Tailwind · Vercel · Postgres · CloudBase Auth

---

## Architecture

```
Browser (React / Next.js)
    │  REST /api/*
    ▼
Next.js Route Handlers  ── Auth (CloudBase token or guest)
    │
    ├── Postgres (CloudBase RDB / Neon / any)  → questions + per-user data
    └── CloudBase Auth / Storage              → accounts, future uploads
```

| Layer | Responsibility |
|-------|----------------|
| **UI** | App Router pages + reusable components under `src/components` |
| **API** | `src/app/api/**` route handlers (no desktop shell) |
| **DB** | Drizzle + Postgres in production; PGlite embedded for local zero-config |
| **Auth** | CloudBase (email/password, anonymous); guest mode when unset |
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
| `DATABASE_MIGRATION_URL` | Strongly recommended | Migration URL for Drizzle. For Supabase, use a direct connection or the session pooler on port `5432`. If omitted, the app will auto-derive `5432` from a Supabase `DATABASE_URL` on `6543`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Supabase API URL for the JS client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Supabase anon key for the JS client |
| `NEXT_PUBLIC_CLOUDBASE_ENV_ID` | Recommended | Public CloudBase env id for client auth |
| `CLOUDBASE_ENV_ID` | Recommended | Same env id on the server |
| `CLOUDBASE_SECRET_ID` / `CLOUDBASE_SECRET_KEY` | Recommended | Server-side token verification |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | Optional | Set `false` only if your managed Postgres uses a private CA |

4. Deploy. Vercel now runs `npm run vercel-build`, which applies Drizzle migrations, seeds the question bank from `src/data/question-bank.json`, and then builds Next.js.

> Important: this app does **not** create tables through the Supabase JS client. It talks to Postgres directly through `DATABASE_URL` / `DATABASE_MIGRATION_URL`. `NEXT_PUBLIC_SUPABASE_URL` plus public keys do not create schema by themselves.

```bash
# or from the CLI
npx vercel
```

For copy-paste Vercel / Supabase values, see [`VERCEL_SUPABASE_SETUP.md`](./VERCEL_SUPABASE_SETUP.md).

---

## CloudBase setup

1. Create a CloudBase environment and enable **login methods** you want (email, anonymous).
2. Create / attach a **relational database** and copy its Postgres connection string into `DATABASE_URL`.
3. Put the env id in `NEXT_PUBLIC_CLOUDBASE_ENV_ID` and `CLOUDBASE_ENV_ID`.
4. (Optional) Create a storage bucket and set `NEXT_PUBLIC_CLOUDBASE_STORAGE_BUCKET` for future file uploads.

Until CloudBase is configured, the app stays fully usable as a **guest** (browser-local identity with server-side guest row).

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
    auth/              # CloudBase + guest auth (client/server)
    cloudbase/         # Storage helpers (extensible)
    *.ts               # Domain helpers (scoring, categories, …)
  data/                # Question bank + vocabulary seed JSON
```

---

## Extending

- **Analytics / email / payments / AI** — add route handlers under `src/app/api` and optional CloudBase cloud functions; keep secrets in Vercel env vars only.
- **Multi-tenant data** — already keyed by `users.id` from CloudBase.
- **File uploads** — `src/lib/cloudbase/storage.ts`.

---

## License / content

Question content follows College Board question-bank usage. See `VOCABULARY_ATTRIBUTION.md` for vocabulary sources.
