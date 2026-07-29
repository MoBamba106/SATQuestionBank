export async function register() {
  // Migrations and seeding run explicitly in the Vercel build via
  // `npm run vercel-build`, with runtime route handlers keeping an idempotent
  // fallback through ensureSeeded(). Avoid eager DB work during cold start.
}
