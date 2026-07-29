# SAT Nexus Deployment Workflow

This guide details the complete workflow to deploy SAT Nexus using **Vercel** for hosting and **Supabase** for the PostgreSQL database. The application uses Drizzle ORM with automatic schema migrations.

## 1. Supabase Setup
1. Go to [Supabase](https://supabase.com) and create a new project.
2. Under your project settings, navigate to **Database** and note down the **Transaction pooler string** (for standard connections).
3. The connection string looks like this:
   `postgresql://postgres.[YOUR_PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
   - Use port `6543` for the connection pooler (ideal for serverless like Vercel). Ensure you append `?pgbouncer=true` if using Prisma, but for Drizzle it should work as a standard connection string.

## 2. Vercel Deployment Setup
1. Push your code to a GitHub, GitLab, or Bitbucket repository.
2. Go to [Vercel](https://vercel.com) and create a **New Project**.
3. Import your Git repository.
4. Expand the **Environment Variables** section in the Vercel setup and add:
   - `DATABASE_URL` (Supabase connection pooler URL, e.g., `postgresql://...:6543/postgres`)
   - `NEXT_PUBLIC_SUPABASE_URL` (Supabase API URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase Anon Key)
5. Ensure the **Build Command** is set to `next build` (Vercel will detect Next.js automatically).
6. Click **Deploy**. Vercel will build the application. Upon the first API request, the app will automatically run Drizzle schema migrations and seed the database against Supabase.

## 3. Local Development with Supabase
If you want to test against Supabase locally:
1. Update your local `.env` file with the Supabase connection string:
   ```env
   DATABASE_URL="postgresql://postgres.[YOUR_PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
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
