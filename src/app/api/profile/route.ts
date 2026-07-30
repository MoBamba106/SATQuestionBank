import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { getRequestUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

/** Read/update the signed-in user's profile preferences (e.g. leaderboard opt-out). */
export async function GET(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    const res = await db.execute(sql`
      SELECT hide_leaderboard AS "hideLeaderboard" FROM users WHERE id = ${user.id}
    `);
    const row = ((res as unknown as { rows?: { hideLeaderboard: boolean }[] }).rows ?? [])[0];
    return NextResponse.json({ hideLeaderboard: Boolean(row?.hideLeaderboard) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load profile" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    if (user.isGuest) return NextResponse.json({ error: "Sign in to change profile settings" }, { status: 401 });
    const body = await req.json();
    if (typeof body?.hideLeaderboard === "boolean") {
      await db.execute(sql`
        UPDATE users SET hide_leaderboard = ${body.hideLeaderboard}, updated_at = now() WHERE id = ${user.id}
      `);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to update profile" }, { status: 500 });
  }
}
