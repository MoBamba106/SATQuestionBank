import {
  databaseConnectionInfo,
  databaseKind,
  databaseMigrationConnectionInfo,
  db,
  ensureDatabaseReady,
} from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabaseReady();
    await db.execute(sql`select 1`);
    return Response.json({
      ok: true,
      database: databaseKind,
      databaseConnection: databaseConnectionInfo,
      migrationConnection: databaseMigrationConnectionInfo,
      supabaseAuth: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
          (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      ),
      runtime: process.env.VERCEL ? "vercel" : "node",
    });
  } catch (error) {
    console.error("[api/health] database check failed:", error);
    return Response.json(
      {
        ok: false,
        database: databaseKind,
        databaseConnection: databaseConnectionInfo,
        migrationConnection: databaseMigrationConnectionInfo,
        error: error instanceof Error ? error.message : "Database unavailable",
      },
      { status: 500 },
    );
  }
}
