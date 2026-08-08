# Vercel + Supabase setup

Prefer the **names Supabase’s Vercel integration** injects. Manual aliases still work.

## Postgres: two URLs

1. **Runtime (pooler)** — serverless queries  
   - Preferred: `POSTGRES_URL` (transaction pooler, port `6543`)  
   - Also accepted: `POSTGRES_PRISMA_URL`, `DATABASE_URL`
2. **Migrations (direct / session)** — Drizzle schema changes  
   - Preferred: `POSTGRES_URL_NON_POOLING` (port `5432` or direct host)  
   - Also accepted: `DATABASE_MIGRATION_URL`

Why two URLs?

- Runtime should use the **transaction pooler** (`6543`) for Vercel serverless.
- Migrations should use a **direct** connection or the **session pooler** (`5432`).

Build path:

```bash
npm run vercel-build
# → npm run db:migrate && npm run db:seed && next build
```

If `POSTGRES_URL_NON_POOLING` / `DATABASE_MIGRATION_URL` is unset and the runtime URL is a Supabase `pooler.supabase.com:6543` string, the app auto-derives the matching `:5432` session URL.

### Migration URL options

#### Option A — Supabase direct

```env
POSTGRES_URL_NON_POOLING=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

If Vercel shows `ENETUNREACH` on an IPv6 address, use Option B.

#### Option B — Session pooler

```env
POSTGRES_URL_NON_POOLING=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

### Optional SSL flags

```env
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
```

For `SELF_SIGNED_CERT_IN_CHAIN`:

```env
DATABASE_SSL_REJECT_UNAUTHORIZED=false
```

## Auth values

```env
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
# or SUPABASE_URL from the integration

NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon]
# or SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / SUPABASE_PUBLISHABLE_KEY

SUPABASE_SERVICE_ROLE_KEY=[service_role]
# or SUPABASE_SECRET_KEY
```

## What to delete on Vercel

If Supabase integration already set the preferred names, remove manual duplicates so values cannot drift:

| Safe to remove | Keep |
|----------------|------|
| `DATABASE_URL` | `POSTGRES_URL` |
| `DATABASE_MIGRATION_URL` | `POSTGRES_URL_NON_POOLING` |
| Extra publishable/anon duplicates | One public key only |
| `SUPABASE_JWT_SECRET` | (unused by this app) |
| `POSTGRES_USER` / `HOST` / `PASSWORD` / `DATABASE` | (optional when full URLs exist) |
| `DATABASE_MODE` | (local PGlite only) |

## Health check

`GET /api/health` should look like:

```json
{
  "ok": true,
  "database": "postgres",
  "databaseConnection": {
    "provider": "supabase",
    "connectionMode": "transaction-pooler"
  },
  "migrationConnection": {
    "provider": "supabase",
    "connectionMode": "session-pooler"
  },
  "supabaseAuth": true
}
```

## Security

If a real database password was ever committed to `.env`, rotate it in Supabase, update `POSTGRES_URL` + `POSTGRES_URL_NON_POOLING`, and redeploy.
