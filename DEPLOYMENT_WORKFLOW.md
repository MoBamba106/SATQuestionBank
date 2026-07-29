# SAT Nexus Deployment Workflow

This guide details the complete workflow to deploy SAT Nexus using **Vercel** for hosting and **Supabase** for the PostgreSQL database. The application uses Drizzle ORM with automatic schema migrations.

## 1. Supabase Setup
1. Go to [Supabase](https://supabase.com) and create a new project.
2. Under your project settings, note down **two** connection strings:
   - the **Transaction pooler** string for runtime app traffic
   - a **Direct** or **Session pooler** string for migrations
3. The runtime connection string should look like this:
   `postgresql://postgres.[YOUR_PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
   - Use port `6543` for the runtime app connection on Vercel.
4. The migration connection string should look like one of these:
   - Direct: `postgresql://postgres:[PASSWORD]@db.[YOUR_PROJECT_REF].supabase.co:5432/postgres`
   - Session pooler: `postgresql://postgres.[YOUR_PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres`
   - Use this second URL for `DATABASE_MIGRATION_URL`.
   - If you omit `DATABASE_MIGRATION_URL` and `DATABASE_URL` is a Supabase `:6543` pooler URL, the repo will now auto-try the matching `:5432` session pooler during the build.

## 2. Vercel Deployment Setup
1. Push your code to a GitHub, GitLab, or Bitbucket repository.
2. Go to [Vercel](https://vercel.com) and create a **New Project**.
3. Import your Git repository.
4. Expand the **Environment Variables** section in the Vercel setup and add:
   - `DATABASE_URL` (Supabase transaction pooler URL, `postgresql://...:6543/postgres`)
   - `DATABASE_MIGRATION_URL` (Supabase direct or session-pooler URL, usually `postgresql://...:5432/postgres`)
   - `NEXT_PUBLIC_SUPABASE_URL` (Supabase API URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase anon key)
5. Ensure the **Build Command** is set to `npm run vercel-build`.
6. Click **Deploy**. Vercel will apply Drizzle migrations, seed the database, and then build the app.

> Important: the app creates tables through raw Postgres over `DATABASE_URL` / `DATABASE_MIGRATION_URL`, not through the Supabase JS client. `NEXT_PUBLIC_SUPABASE_URL` plus a public key is not enough to create the schema.

## 3. Local Development with Supabase
If you want to test against Supabase locally:
1. Update your local `.env.local` file with the Supabase connection strings:
   ```env
   DATABASE_URL="postgresql://postgres.[YOUR_PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
   DATABASE_MIGRATION_URL="postgresql://postgres.[YOUR_PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```

## 4. Supabase Features & Future Additions
- **Authentication**: You can use Supabase Auth for user management. This app is architected to seamlessly add Supabase Auth. 
- **Storage**: Use Supabase Storage for hosting question images.
- **Realtime**: In the future, multiplayer features or live leaderboards can leverage Supabase Realtime via the provided keys.
