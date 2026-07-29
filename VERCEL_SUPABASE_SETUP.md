# Vercel + Supabase setup

Use **two** Postgres connection strings in Vercel:

1. `DATABASE_URL` for normal app queries
2. `DATABASE_MIGRATION_URL` for Drizzle migrations

Why two URLs?

- `DATABASE_URL` should use the **Supabase transaction pooler** on port `6543` for serverless app traffic.
- `DATABASE_MIGRATION_URL` should use a **direct** connection or the **session pooler** on port `5432` for schema changes.

This app now runs versioned Drizzle migrations during the Vercel build via:

```bash
npm run vercel-build
```

That command runs:

```bash
npm run db:migrate && npm run db:seed && next build
```

## Exact Vercel environment variables

### Required

```env
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### Strongly recommended for migrations

Use **one** of these for `DATABASE_MIGRATION_URL`:

If you leave `DATABASE_MIGRATION_URL` unset and `DATABASE_URL` is a Supabase
`pooler.supabase.com:6543` URL, this repo now auto-derives the matching
`pooler.supabase.com:5432` session-pooler URL during the build. Explicitly
setting `DATABASE_MIGRATION_URL` is still safer and clearer.

#### Option A — Supabase direct connection
Best when your build environment can reach the direct database host.

If Vercel logs show `ENETUNREACH` with an IPv6 address on port `5432`, the direct host is not reachable from that environment. In that case, switch to **Option B** below.

```env
DATABASE_MIGRATION_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

#### Option B — Supabase session pooler
Best fallback when you want IPv4-friendly connectivity from hosted builders.

```env
DATABASE_MIGRATION_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

### Optional SSL flags

```env
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
```

If Vercel logs show `SELF_SIGNED_CERT_IN_CHAIN`, set:

```env
DATABASE_SSL_REJECT_UNAUTHORIZED=false
```

This repo also retries migrations automatically with `rejectUnauthorized=false` when it detects that certificate-chain error, but setting the env var explicitly makes the behavior deterministic.

### Optional Supabase JS client values
These do **not** create tables. They are only for the Supabase client SDK.

```env
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
```

This repo also accepts:

```env
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[YOUR_PUBLISHABLE_KEY]
```

but `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the preferred standard name.

## Vercel project settings checklist

1. Add the env vars above in **Project → Settings → Environment Variables**.
2. Make sure each environment points at the correct database:
   - Production → production database
   - Preview → preview / staging database
   - Development → local or dev database
3. Redeploy.
4. Check `/api/health`.

A healthy response should show something like:

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
  }
}
```

## Security cleanup note

If a real database password was ever committed to `.env`, treat it as exposed:

1. Rotate the Supabase database password
2. Update `DATABASE_URL`
3. Update `DATABASE_MIGRATION_URL`
4. Redeploy

Removing `.env` from the current branch does **not** erase old secrets from git history.
