import { databaseKind, db, ensureDatabaseReady } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabaseReady();
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, database: databaseKind });
  } catch (error) {
    console.error("[api/health] database check failed:", error);
    return Response.json(
      { ok: false, database: databaseKind, error: error instanceof Error ? error.message : "Database unavailable" },
      { status: 500 },
    );
  }
}
