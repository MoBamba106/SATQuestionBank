# SAT Nexus

Browser-first SAT question bank and practice app.

**Stack:** Next.js (App Router) · TypeScript · Tailwind · Vercel · Postgres · Supabase Auth · Resend (password reset)

---

## Architecture

```
Browser (React / Next.js)
    │  REST /api/*
    ▼
Next.js Route Handlers  ── Auth (Supabase token or guest)
    │
    ├── Postgres (Supabase)  → questions + per-user data
    ├── Supabase Auth        → accounts / recovery links
    └── Resend (optional)    → branded password-reset email
```

| Layer | Responsibility |
|-------|----------------|
| **UI** | App Router pages + reusable components under `src/components` |
| **API** | `src/app/api/**` route handlers |
| **DB** | Drizzle + Postgres in production; PGlite embedded for local zero-config |
| **Auth** | Supabase Auth (email/password); guest mode when unset |
| **Email** | Resend for forgot-password (falls back to Supabase mailer) |
| **Deploy** | Vercel (`vercel.json`) |

User-owned rows (favorites, notes, collections, sessions, attempts) are scoped by `user_id`.

> Runtime schema is applied by **Drizzle migrations** under `drizzle/` during `npm run vercel-build`.

All calendar times in the UI (admin presence, feedback, sessions, etc.) are shown in **America/Detroit (Eastern)**.

---

## Quick start (local)

```bash
npm install
npm run dev
# open http://localhost:3000
```

No cloud credentials required. Local mode uses embedded PGlite (`.sat-nexus-db/`) and a **Guest** identity.

---

## Full production setup (Vercel + Supabase + Resend)

Follow these sections in order the first time you ship.

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Open **Project Settings → API** and note:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY` on newer dashboards)
3. Open **Project Settings → Database** and copy connection strings:
   - **Transaction pooler** (port `6543`) → `POSTGRES_URL`
   - **Session pooler** or **Direct** (port `5432`) → `POSTGRES_URL_NON_POOLING`
4. **Authentication → Providers → Email**
   - Enable Email sign-in.
   - For instant login after sign-up, turn **Confirm email** off (or leave it on and require inbox confirmation).
5. **Authentication → URL configuration**
   - Site URL: your Vercel production URL (e.g. `https://sat-nexus.vercel.app`)
   - Redirect URLs: add `https://your-app.vercel.app/**` and `http://localhost:3000/**`

> This app does **not** create tables through the Supabase JS client. It talks to Postgres with Drizzle via `POSTGRES_URL` / `POSTGRES_URL_NON_POOLING`. Auth keys alone do not create schema.

### 2. Connect Supabase → Vercel (recommended)

In Supabase: **Project Settings → Integrations → Vercel** (or Vercel’s Supabase marketplace integration).

That typically injects names like:

| Supabase / Vercel name | Purpose |
|------------------------|---------|
| `POSTGRES_URL` | Runtime pooler URL |
| `POSTGRES_PRISMA_URL` | Alternate runtime URL |
| `POSTGRES_URL_NON_POOLING` | Direct / migration URL |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` | Server secret |
| `POSTGRES_USER` / `HOST` / `PASSWORD` / `DATABASE` | Connection parts (optional if full URLs exist) |

This app **prefers those Supabase names** and still accepts older manual aliases (`DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_*`, etc.).

### 3. Resend (password-reset emails)

1. Create an account at [resend.com](https://resend.com).
2. **API Keys → Create** → copy into `RESEND_API_KEY`.
3. Verify a sending domain (or use Resend’s onboarding address for tests).
4. Set `RESEND_FROM_EMAIL` to something like `SAT Nexus <noreply@yourdomain.com>`.
5. Ensure `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`) is set so the app can mint recovery links.
6. Set `NEXT_PUBLIC_SITE_URL` to your production origin so reset links redirect home.

Flow: user clicks **Forgot password?** → `POST /api/auth/forgot-password` → Supabase `generateLink({ type: "recovery" })` → Resend sends branded HTML. If Resend is missing, Supabase’s built-in mailer is used.

### 4. Vercel project

1. Push this repo to GitHub and import it in [Vercel](https://vercel.com).
2. **Settings → Environment Variables** — set the checklist below for **Production** (and Preview if you use it).
3. Deploy. Build command runs `npm run vercel-build` → migrate → seed → `next build`.
4. Hit `/api/health` and confirm `"ok": true`.

```bash
# or from the CLI
npx vercel
```

---

## Environment variables — keep vs delete

### ✅ Keep (recommended set)

| Variable | Required | Notes |
|----------|----------|--------|
| **`POSTGRES_URL`** | **Yes** | Supabase transaction pooler (`:6543`). Preferred over `DATABASE_URL`. |
| **`POSTGRES_URL_NON_POOLING`** | Strongly recommended | Direct/session URL for Drizzle migrations (`:5432`). Preferred over `DATABASE_MIGRATION_URL`. |
| **`POSTGRES_PRISMA_URL`** | Optional | Accepted as another runtime URL if `POSTGRES_URL` is absent. |
| **`NEXT_PUBLIC_SUPABASE_URL`** | **Yes for auth** | Or `SUPABASE_URL` from the integration. |
| **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** | **Yes for auth** | Or `SUPABASE_ANON_KEY` / publishable-key aliases. |
| **`SUPABASE_SERVICE_ROLE_KEY`** | Recommended | Or `SUPABASE_SECRET_KEY`. Server-only: admin delete, recovery links, token verify. |
| **`ADMIN_EMAILS`** | For admin UI | Comma-separated emails allowed into `/admin`. |
| **`NEXT_PUBLIC_SITE_URL`** | Recommended | Production origin for share links + password reset redirects. |
| **`RESEND_API_KEY`** | For branded reset mail | Without it, Supabase mailer is used. |
| **`RESEND_FROM_EMAIL`** | With Resend | e.g. `SAT Nexus <noreply@yourdomain.com>`. |
| `DATABASE_SSL` | Optional | Usually omit; defaults are fine for Supabase pooler. |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | Optional | Set `false` only if you see `SELF_SIGNED_CERT_IN_CHAIN`. |
| `FEEDBACK_GITHUB_TOKEN` / `FEEDBACK_GITHUB_REPO` | Optional | Auto-file feedback as GitHub issues. |
| `NEXT_PUBLIC_DESMOS_API_KEY` | Optional | Defaults to a public demo key. |

### ♻️ Safe to delete (duplicates / unused)

Delete these **if** the preferred Supabase name above is already set with the correct value:

| Delete | Prefer instead |
|--------|----------------|
| `DATABASE_URL` | `POSTGRES_URL` |
| `DATABASE_MIGRATION_URL` | `POSTGRES_URL_NON_POOLING` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY` (keep one public key) |
| `SUPABASE_PUBLISHABLE_KEY` | same as above |
| `SUPABASE_JWT_SECRET` | **Not used by this app** — delete |
| `POSTGRES_USER` | Not needed when full URLs exist |
| `POSTGRES_HOST` | Not needed when full URLs exist |
| `POSTGRES_PASSWORD` | Not needed when full URLs exist |
| `POSTGRES_DATABASE` | Not needed when full URLs exist |
| `DATABASE_MODE` | Only needed locally for PGlite (`embedded`); delete on Vercel |

**Priority rule:** when both a Supabase-integration name and a manual alias exist, **keep the Supabase one** and remove the manual duplicate so you don’t drift.

### Minimal Production checklist (copy/paste)

```env
# Database (from Supabase → Connect)
POSTGRES_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
POSTGRES_URL_NON_POOLING=postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres

# Auth (from Supabase → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://[REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon]
SUPABASE_SERVICE_ROLE_KEY=[service_role]

# App
ADMIN_EMAILS=you@example.com
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app

# Password reset (Resend)
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM_EMAIL=SAT Nexus <noreply@yourdomain.com>
```

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

---

## Project layout

```
src/
  app/                 # App Router pages + API routes
  components/          # UI (quiz, shell, settings, auth)
  db/                  # Drizzle schema + connection
  lib/
    auth/              # Supabase + guest auth (client/server)
    *.ts               # Domain helpers (scoring, categories, Detroit time, …)
  data/                # Question bank + vocabulary seed JSON
drizzle/               # Versioned SQL migrations
```

---

## Features worth knowing

- **Practice / exam quizzes** with Desmos, highlighter, shareable quiz links
- **Bluebook-style practice tests** with adaptive modules
- **Collections, favorites, mistakes, notes**
- **Share questions / collections / quizzes** with other signed-in students
- **Forgot password** via Resend + Supabase recovery links
- **Admin console** (`ADMIN_EMAILS`) — presence, analytics, impersonation, feedback
- **Guest mode** when Supabase Auth is not configured

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `/api/health` → database error | Confirm `POSTGRES_URL` is pooler `:6543` and `POSTGRES_URL_NON_POOLING` is `:5432` / direct |
| Build fails on migrate with `ENETUNREACH` | Use session pooler for `POSTGRES_URL_NON_POOLING`, not IPv6-only direct host |
| `SELF_SIGNED_CERT_IN_CHAIN` | Set `DATABASE_SSL_REJECT_UNAUTHORIZED=false` |
| Sign-in does nothing | Set `NEXT_PUBLIC_SUPABASE_URL` + anon key; check Email provider is enabled |
| Forgot password never arrives | Set `RESEND_API_KEY` + `RESEND_FROM_EMAIL` + service role key; check Resend domain |
| Admin page locked | Add your email to `ADMIN_EMAILS` (comma-separated, lowercase match) |
| Times look wrong in admin | Times are forced to **America/Detroit**; hard-refresh after deploy |

More detail on dual Postgres URLs: [`VERCEL_SUPABASE_SETUP.md`](./VERCEL_SUPABASE_SETUP.md).

---

## Extending

- **Analytics / email / payments / AI** — add route handlers under `src/app/api`; keep secrets in Vercel env vars only.
- **Multi-tenant data** — keyed by `users.id` from Supabase Auth.

---

## License / content

Question content follows College Board question-bank usage. See `VOCABULARY_ATTRIBUTION.md` for vocabulary sources.
