import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request) {
  try {
    await ensureSeeded();
    const scope = new URL(req.url).searchParams.get("scope") === "all" ? "all" : "progress";

    // Attempts must be removed before sessions because of the foreign key.
    await db.transaction(async (tx) => {
      await tx.execute(sql`DELETE FROM attempts`);
      await tx.execute(sql`DELETE FROM quiz_sessions`);
      if (scope === "all") {
        await tx.execute(sql`DELETE FROM collection_items`);
        await tx.execute(sql`DELETE FROM collections`);
        await tx.execute(sql`DELETE FROM favorites`);
        await tx.execute(sql`DELETE FROM notes`);
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
