import { cookies, headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { sql } from "drizzle-orm";
import { db, ensureDatabaseReady } from "@/db";
import { GUEST_USER, GUEST_USER_ID, type AuthUser } from "@/lib/auth/types";

const AUTH_COOKIE = "sat_nexus_access_token";

export type RequestUser = AuthUser;

function supabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      (
        process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
      ),
  );
}

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function userFromSupabasePayload(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  is_anonymous?: boolean;
}): AuthUser {
  const metadata = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? null,
    displayName:
      (typeof metadata.display_name === "string" && metadata.display_name) ||
      (typeof metadata.full_name === "string" && metadata.full_name) ||
      (typeof metadata.name === "string" && metadata.name) ||
      user.email ||
      "Student",
    avatarUrl:
      (typeof metadata.avatar_url === "string" && metadata.avatar_url) ||
      (typeof metadata.picture === "string" && metadata.picture) ||
      null,
    isGuest: Boolean(user.is_anonymous),
  };
}

/**
 * Resolve the current user for an API/route handler.
 * - Authorization: Bearer <token> (preferred)
 * - Cookie sat_nexus_access_token
 * - Falls back to guest when Supabase Auth is not configured or token is absent
 *   (guest mode keeps the app usable for demos / local dev).
 */
export async function getRequestUser(req?: Request): Promise<RequestUser> {
  await ensureDatabaseReady();

  const headerToken = req
    ? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim()
    : null;
  const headerStore = await headers();
  const cookieStore = await cookies();
  const token =
    headerToken ||
    headerStore.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    cookieStore.get(AUTH_COOKIE)?.value ||
    "";

  if (!token || !supabaseConfigured()) {
    await ensureUserRow(GUEST_USER);
    return GUEST_USER;
  }

  try {
    const verified = await verifySupabaseToken(token);
    if (!verified) {
      await ensureUserRow(GUEST_USER);
      return GUEST_USER;
    }
    await ensureUserRow(verified);
    return verified;
  } catch (error) {
    console.warn("[auth] token verification failed:", error instanceof Error ? error.message : error);
    await ensureUserRow(GUEST_USER);
    return GUEST_USER;
  }
}

async function verifySupabaseToken(accessToken: string): Promise<AuthUser | null> {
  const client = getSupabaseServerClient();
  if (!client) return null;

  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) return null;

  return userFromSupabasePayload({
    id: data.user.id,
    email: data.user.email,
    user_metadata: data.user.user_metadata,
    is_anonymous: (data.user as { is_anonymous?: boolean }).is_anonymous,
  });
}

export async function ensureUserRow(user: AuthUser): Promise<void> {
  await db.execute(sql`
    INSERT INTO users (id, email, display_name, avatar_url)
    VALUES (
      ${user.id},
      ${user.email},
      ${user.displayName},
      ${user.avatarUrl}
    )
    ON CONFLICT (id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, users.email),
      display_name = COALESCE(EXCLUDED.display_name, users.display_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
      updated_at = now()
  `);
}

export { AUTH_COOKIE, GUEST_USER_ID };
