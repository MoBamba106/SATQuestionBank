import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getRequestUser } from "@/lib/auth/server";
import { GUEST_USER_ID } from "@/lib/auth/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getRequestUser(req);
    const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
    if (!q || q.length < 2) return NextResponse.json({ users: [] });

    const like = `%${q}%`;
    const res = await db.execute(sql`
      SELECT id, email, display_name AS "displayName"
      FROM users
      WHERE id <> ${GUEST_USER_ID}
        AND id <> ${user.id}
        AND (
          email ILIKE ${like}
          OR display_name ILIKE ${like}
        )
      ORDER BY display_name ASC NULLS LAST, email ASC
      LIMIT 12
    `);
    const users = (res as unknown as { rows?: unknown[] }).rows ?? [];
    return NextResponse.json({ users });
  } catch (e) {
    console.error("[api/users/search] failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
