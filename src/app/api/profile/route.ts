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
      SELECT hide_leaderboard AS "hideLeaderboard", display_name AS "displayName", email FROM users WHERE id = ${user.id}
    `);
    const row = ((res as unknown as { rows?: { hideLeaderboard: boolean; displayName: string | null; email: string | null }[] }).rows ?? [])[0];
    return NextResponse.json({
      hideLeaderboard: Boolean(row?.hideLeaderboard),
      displayName: row?.displayName ?? user.displayName ?? null,
      email: row?.email ?? user.email ?? null,
    });
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
    const updates: string[] = [];
    if (typeof body?.hideLeaderboard === "boolean") {
      await db.execute(sql`
        UPDATE users SET hide_leaderboard = ${body.hideLeaderboard}, updated_at = now() WHERE id = ${user.id}
      `);
      updates.push("hideLeaderboard");
    }
    if (typeof body?.displayName === "string") {
      const displayName = body.displayName.trim();
      if (displayName.length < 3 || displayName.length > 32) {
        return NextResponse.json({ error: "Username must be 3-32 characters." }, { status: 400 });
      }
      if (!/^[a-zA-Z0-9_.-]+$/.test(displayName)) {
        return NextResponse.json({ error: "Username can only use letters, numbers, underscores, dots, and dashes." }, { status: 400 });
      }
      await db.execute(sql`
        UPDATE users SET display_name = ${displayName}, updated_at = now() WHERE id = ${user.id}
      `);
      updates.push("displayName");
    }
    return NextResponse.json({ ok: true, updated: updates });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to update profile" }, { status: 500 });
  }
}
