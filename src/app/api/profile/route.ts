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

import { z } from "zod";
import { sanitizeString } from "@/lib/validation";

const profileUpdateSchema = z.object({
  hideLeaderboard: z.boolean().optional(),
  displayName: sanitizeString.pipe(
    z.string().min(3, "Username must be 3-32 characters.").max(32).regex(/^[a-zA-Z0-9_.-]+$/, "Username can only use letters, numbers, underscores, dots, and dashes.")
  ).optional(),
});

export async function PATCH(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    if (user.isGuest) return NextResponse.json({ error: "Sign in to change profile settings" }, { status: 401 });
    const body = await req.json();
    
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const updates: string[] = [];
    if (parsed.data.hideLeaderboard !== undefined) {
      await db.execute(sql`
        UPDATE users SET hide_leaderboard = ${parsed.data.hideLeaderboard}, updated_at = now() WHERE id = ${user.id}
      `);
      updates.push("hideLeaderboard");
    }
    if (parsed.data.displayName !== undefined) {
      await db.execute(sql`
        UPDATE users SET display_name = ${parsed.data.displayName}, updated_at = now() WHERE id = ${user.id}
      `);
      updates.push("displayName");
    }
    return NextResponse.json({ ok: true, updated: updates });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to update profile" }, { status: 500 });
  }
}
