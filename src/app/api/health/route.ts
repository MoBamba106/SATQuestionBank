import { databaseKind, db, ensureDatabaseReady } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabaseReady();
    await db.execute(sql`select 1`);
    return Response.json({
      ok: true,
      database: databaseKind,
      cloudbase: Boolean(process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID),
      runtime: process.env.VERCEL ? "vercel" : "node",
    });
  } catch (error) {
    console.error("[api/health] database check failed:", error);
    return Response.json(
      {
        ok: false,
        database: databaseKind,
        error: error instanceof Error ? error.message : "Database unavailable",
      },
      { status: 500 },
    );
  }
}
