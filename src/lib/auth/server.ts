import { cookies, headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db, ensureDatabaseReady } from "@/db";
import { GUEST_USER, GUEST_USER_ID, type AuthUser } from "@/lib/auth/types";

const AUTH_COOKIE = "sat_nexus_access_token";

export type RequestUser = AuthUser;

function cloudbaseConfigured() {
  return Boolean(process.env.CLOUDBASE_ENV_ID?.trim());
}

/**
 * Resolve the current user for an API/route handler.
 * - Authorization: Bearer <token> (preferred)
 * - Cookie sat_nexus_access_token
 * - Falls back to guest when CloudBase is not configured or token is absent
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

  if (!token || !cloudbaseConfigured()) {
    await ensureUserRow(GUEST_USER);
    return GUEST_USER;
  }

  try {
    const verified = await verifyCloudBaseToken(token);
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

async function verifyCloudBaseToken(accessToken: string): Promise<AuthUser | null> {
  // Lazy-load so local/dev without CloudBase deps still builds.
  let tcb: any;
  try {
    tcb = await import("@cloudbase/node-sdk");
  } catch {
    return null;
  }

  const env = process.env.CLOUDBASE_ENV_ID!.trim();
  const secretId = process.env.CLOUDBASE_SECRET_ID?.trim();
  const secretKey = process.env.CLOUDBASE_SECRET_KEY?.trim();

  const app = tcb.default.init({
    env,
    ...(secretId && secretKey ? { secretId, secretKey } : {}),
  });

  const auth = app.auth();
  const info: Record<string, unknown> =
    (await auth.getUserInfo?.({ accessToken })) ??
    (await auth.getEndUserInfo?.(accessToken)) ??
    {};

  const nested = (info.userInfo as Record<string, unknown> | undefined) ?? {};
  const data = (info.data as Record<string, unknown> | undefined) ?? {};
  const uid = info.uid || nested.uid || data.uid || info.openId;
  if (!uid) return null;

  return {
    id: String(uid),
    email: (info.email || nested.email || null) as string | null,
    displayName: (info.nickName || nested.nickName || info.email || nested.email || null) as string | null,
    avatarUrl: (info.avatarUrl || nested.avatarUrl || null) as string | null,
    isGuest: false,
  };
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
