import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { getRequestUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    const scope = new URL(req.url).searchParams.get("scope") === "all" ? "all" : "progress";

    await db.transaction(async (tx) => {
      await tx.execute(sql`
        DELETE FROM attempts
        WHERE session_id IN (SELECT id FROM quiz_sessions WHERE user_id = ${user.id})
      `);
      await tx.execute(sql`DELETE FROM quiz_sessions WHERE user_id = ${user.id}`);
      if (scope === "all") {
        await tx.execute(sql`
          DELETE FROM collection_items
          WHERE collection_id IN (SELECT id FROM collections WHERE user_id = ${user.id})
        `);
        await tx.execute(sql`DELETE FROM collections WHERE user_id = ${user.id}`);
        await tx.execute(sql`DELETE FROM favorites WHERE user_id = ${user.id}`);
        await tx.execute(sql`DELETE FROM notes WHERE user_id = ${user.id}`);
      }
    });

    return NextResponse.json({ ok: true, scope });
  } catch (error) {
    console.error("[api/user-data] DELETE failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to erase user data" },
      { status: 500 },
    );
  }
}
