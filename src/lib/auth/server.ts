import { cookies, headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { sql } from "drizzle-orm";
import { db, ensureDatabaseReady } from "@/db";
import {
  GUEST_USER,
  GUEST_USER_ID,
  isLocalGuestId,
  makeLocalGuestUser,
  type AuthUser,
} from "@/lib/auth/types";
import {
  resolveSupabaseAnonKey,
  resolveSupabaseServiceRoleKey,
  resolveSupabaseUrl,
} from "@/lib/supabase";

const AUTH_COOKIE = "sat_nexus_access_token";
const GUEST_COOKIE = "sat_nexus_guest_id";
const GUEST_HEADER = "x-sat-guest-id";
/** Header an admin can send to act on behalf of another user ("go into their account"). */
const IMPERSONATE_HEADER = "x-admin-impersonate";

export type RequestUser = AuthUser;

/** Emails allowed to use the admin console. Comma-separated in ADMIN_EMAILS. */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

function supabaseConfigured() {
  return Boolean(resolveSupabaseUrl() && (resolveSupabaseServiceRoleKey() || resolveSupabaseAnonKey()));
}

function getSupabaseServerClient() {
  const url = resolveSupabaseUrl();
  const key = resolveSupabaseServiceRoleKey() || resolveSupabaseAnonKey();

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

function resolveLocalGuest(req?: Request, headerStore?: Headers, cookieStore?: Awaited<ReturnType<typeof cookies>>): AuthUser {
  const fromHeader =
    req?.headers.get(GUEST_HEADER)?.trim() ||
    headerStore?.get(GUEST_HEADER)?.trim() ||
    "";
  const fromCookie = cookieStore?.get(GUEST_COOKIE)?.value?.trim() || "";
  const candidate = fromHeader || fromCookie;
  // Never fall back to the shared legacy "guest" id for new traffic.
  if (candidate && isLocalGuestId(candidate) && candidate !== GUEST_USER_ID) {
    return makeLocalGuestUser(candidate);
  }
  // No client id yet (first request / SSR) — use a throwaway row so we don't
  // pollute the shared legacy guest. The browser will send a stable id next.
  return makeLocalGuestUser(`${GUEST_USER_ID}_ephemeral`);
}

/**
 * Resolve the current user for an API/route handler.
 * - Authorization: Bearer <token> (preferred)
 * - Cookie sat_nexus_access_token
 * - Per-browser guest via x-sat-guest-id / sat_nexus_guest_id cookie
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
    const guest = resolveLocalGuest(req, headerStore, cookieStore);
    await ensureUserRow(guest);
    return guest;
  }

  try {
    const verified = await verifySupabaseToken(token);
    if (!verified) {
      const guest = resolveLocalGuest(req, headerStore, cookieStore);
      await ensureUserRow(guest);
      return guest;
    }
    verified.isAdmin = isAdminEmail(verified.email);
    await ensureUserRow(verified);

    // Admin impersonation: act as another user for API reads/writes.
    if (verified.isAdmin) {
      const impersonateId =
        req?.headers.get(IMPERSONATE_HEADER)?.trim() ||
        headerStore.get(IMPERSONATE_HEADER)?.trim() ||
        "";
      if (impersonateId && impersonateId !== verified.id) {
        const target = await findUserRow(impersonateId);
        if (target) {
          return { ...target, isGuest: false, isAdmin: false };
        }
      }
    }

    return verified;
  } catch (error) {
    console.warn("[auth] token verification failed:", error instanceof Error ? error.message : error);
    const guest = resolveLocalGuest(req, headerStore, cookieStore);
    await ensureUserRow(guest);
    return guest;
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

/** Look up a mirrored user row by id (used for admin impersonation). */
export async function findUserRow(id: string): Promise<AuthUser | null> {
  const res = await db.execute(sql`
    SELECT id, email, display_name AS "displayName", avatar_url AS "avatarUrl"
    FROM users WHERE id = ${id} LIMIT 1
  `);
  const row = ((res as unknown as { rows?: Record<string, unknown>[] }).rows ?? [])[0];
  if (!row) return null;
  return {
    id: String(row.id),
    email: (row.email as string | null) ?? null,
    displayName: (row.displayName as string | null) ?? null,
    avatarUrl: (row.avatarUrl as string | null) ?? null,
    isGuest: isLocalGuestId(String(row.id)),
  };
}

/** Resolve the REAL signed-in user (no impersonation) and require admin. Throws on failure. */
export async function requireAdmin(req?: Request): Promise<AuthUser> {
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
  if (!token || !supabaseConfigured()) throw new AdminAuthError("Admin access requires signing in.");
  const verified = await verifySupabaseToken(token);
  if (!verified || !isAdminEmail(verified.email)) {
    throw new AdminAuthError("This account does not have admin access.");
  }
  verified.isAdmin = true;
  return verified;
}

export class AdminAuthError extends Error {}

export { AUTH_COOKIE, GUEST_USER_ID };
