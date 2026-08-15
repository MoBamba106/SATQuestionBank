import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getRequestUser, requireAdmin, AdminAuthError } from "@/lib/auth/server";
import { isLocalGuestId } from "@/lib/auth/types";
import { ensureSeeded } from "@/lib/seed";
import { touchPresence } from "@/lib/presence";

export const dynamic = "force-dynamic";

/**
 * POST /api/presence -> record current user's heartbeat (last_seen = now)
 * Used by clients every ~60s to indicate they are online.
 *
 * `getRequestUser` already records presence for every authenticated request
 * (throttled), so this endpoint mainly keeps an *idle* tab marked online. The
 * heartbeat is no longer the only source of "last active" — see
 * `@/lib/presence`.
 */
export async function POST(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    if (user.isGuest || isLocalGuestId(user.id)) {
      // A Bearer token was sent but could not be verified (expired/invalid).
      // Surface that instead of silently dropping the heartbeat — silent
      // drops are what left "last online" stuck on "Never".
      const hadToken = Boolean(req.headers.get("authorization"));
      if (hadToken) {
        return NextResponse.json({ ok: false, error: "Invalid or expired session token" }, { status: 401 });
      }
      return NextResponse.json({ ok: true, guest: true, recorded: false });
    }
    await touchPresence(user.id);
    return NextResponse.json({ ok: true, recorded: true });
  } catch (e) {
    console.error("[api/presence] POST failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

/**
 * GET /api/presence -> admin can list presence, regular user gets own status
 *
 * All timestamps are returned as UTC ISO strings; the UI converts them to
 * America/Detroit for display.
 */
export async function GET(req: Request) {
  try {
    await ensureSeeded();
    // If admin token, return all presence joined with users
    try {
      await requireAdmin(req);
      const res = await db.execute(sql`
        SELECT up.user_id as "userId",
               (up.last_seen AT TIME ZONE 'UTC') as "lastSeen",
               u.email, u.display_name as "displayName"
        FROM user_presence up
        LEFT JOIN users u ON u.id = up.user_id
        WHERE up.last_seen >= timezone('utc', now()) - interval '5 minutes'
        ORDER BY up.last_seen DESC
        LIMIT 500
      `);
      const rows = (res as unknown as { rows?: unknown[] }).rows ?? [];
      return NextResponse.json({ online: rows });
    } catch (err) {
      if (err instanceof AdminAuthError) {
        // not admin, fall through to own status
      } else {
        throw err;
      }
    }
    const user = await getRequestUser(req);
    if (user.isGuest || isLocalGuestId(user.id)) return NextResponse.json({ online: [] });
    const res = await db.execute(sql`
      SELECT user_id as "userId", (last_seen AT TIME ZONE 'UTC') as "lastSeen"
      FROM user_presence WHERE user_id = ${user.id}
    `);
    const rows = (res as unknown as { rows?: unknown[] }).rows ?? [];
    return NextResponse.json({ presence: rows[0] ?? null });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: 403 });
    console.error("[api/presence] GET failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
