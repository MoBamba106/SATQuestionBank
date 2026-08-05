import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getRequestUser, requireAdmin, AdminAuthError } from "@/lib/auth/server";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

/**
 * POST /api/presence -> record current user's heartbeat (last_seen = now)
 * Used by clients every ~30s to indicate they are online.
 */
export async function POST(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    if (user.id === "guest") {
      return NextResponse.json({ ok: true, guest: true });
    }
    await db.execute(sql`
      INSERT INTO user_presence (user_id, last_seen, updated_at)
      VALUES (${user.id}, now(), now())
      ON CONFLICT (user_id) DO UPDATE SET
        last_seen = now(),
        updated_at = now()
    `);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/presence] POST failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

/**
 * GET /api/presence -> admin can list presence, regular user gets own status
 */
export async function GET(req: Request) {
  try {
    await ensureSeeded();
    // If admin token, return all presence joined with users
    try {
      await requireAdmin(req);
      const res = await db.execute(sql`
        SELECT up.user_id as "userId", up.last_seen as "lastSeen", u.email, u.display_name as "displayName"
        FROM user_presence up
        LEFT JOIN users u ON u.id = up.user_id
        WHERE up.last_seen >= now() - interval '5 minutes'
        ORDER BY up.last_seen DESC
        LIMIT 500
      `);
      const rows = (res as { rows?: unknown[] }).rows ?? [];
      return NextResponse.json({ online: rows });
    } catch (err) {
      if (err instanceof AdminAuthError) {
        // not admin, fall through to own status
      } else {
        throw err;
      }
    }
    const user = await getRequestUser(req);
    if (user.id === "guest") return NextResponse.json({ online: [] });
    const res = await db.execute(sql`
      SELECT user_id as "userId", last_seen as "lastSeen"
      FROM user_presence WHERE user_id = ${user.id}
    `);
    const rows = (res as { rows?: unknown[] }).rows ?? [];
    return NextResponse.json({ presence: rows[0] ?? null });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: 403 });
    console.error("[api/presence] GET failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
